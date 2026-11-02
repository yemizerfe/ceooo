// controllers/auth.controller.ts
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { prisma } from '../lib/prisma.ts';
import { isAdminRole } from '../services/rbac.service.ts';
import { getPlatformSettings, passwordPolicyError } from '../services/platformSettings.service.ts';
import { clearLoginFailures, isLoginBlocked, recordLoginFailure } from '../lib/loginGuard.ts';
import { revokeUserTokens } from '../lib/tokenRevocation.ts';
import { logger } from '../lib/logger.ts';

// Provider-registered accounts without a password are handled as NO_PASSWORD_SET.
function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded) && forwarded.length) return String(forwarded[0]).trim();
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/** Token lifetime honours the Admin-configured session timeout (minutes). */
function sessionExpirySeconds(sessionTimeoutMinutes: number): number {
  return Math.max(60, sessionTimeoutMinutes) * 60;
}

/**
 * Provider that registered an account which has no password stored, if any.
 * Used to point email/password attempts at the right sign-in method.
 */


export const signup = async (req: Request, res: Response) => {
  try {
    const email = String(req.body.email).trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const settings = await getPlatformSettings();

    // Admin-configured registration switch (default: enabled).
    if (!settings.allowRegistration) {
      return res.status(403).json({
        success: false,
        message: 'Registration is currently disabled'
      });
    }

    // Admin-configured password policy (default: strong passwords required).
    const policyError = passwordPolicyError(password, settings.requireStrongPassword);
    if (policyError) {
      return res.status(400).json({
        success: false,
        message: policyError
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {

      return res.status(409).json({
        success: false,
        code: 'ACCOUNT_EXISTS',
        needsLogin: true,
        message: 'User already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const tempName = email.split('@')[0];

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,  // ← Using passwordHash (matches schema)
        name: tempName,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        accessRole: true,
        hasCompletedOnboarding: true,
        avatarUrl: true,
        companyName: true,
        industry: true,
        companySize: true,
        aiUsageCount: true,
        subscriptionPlan: true,
        isVerified: true,
        createdAt: true,
      }
    });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: sessionExpirySeconds(settings.sessionTimeoutMinutes) }
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { user, token }
    });

  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      return res.status(409).json({
        success: false,
        code: 'ACCOUNT_EXISTS',
        needsLogin: true,
        message: 'User already exists'
      });
    }
    console.error('Signup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const email = String(req.body.email).trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const settings = await getPlatformSettings();
    const ip = clientIp(req);

    // Brute-force protection driven by the maxLoginAttempts security setting.
    if (await isLoginBlocked(email, ip)) {
      return res.status(429).json({
        success: false,
        message: 'Too many failed sign-in attempts. Please try again later.'
      });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      await recordLoginFailure(email, ip);
      // Nothing is registered for this address: the client sends them to signup
      // rather than leaving them stuck on a login form.
      return res.status(401).json({
        success: false,
        code: 'ACCOUNT_NOT_FOUND',
        needsSignup: true,
        message: 'No account found for this email address. Create one to continue.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_SUSPENDED',
        message: 'This account is currently suspended. Contact your administrator.'
      });
    }

    if (!user.passwordHash) {
      return res.status(401).json({
        success: false,
        code: 'NO_PASSWORD_SET',
        message: 'This account does not have a password set. Use the password reset flow to create one, or sign in with the provider used to create the account.'
      });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      await recordLoginFailure(email, ip);
      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      });
    }

    clearLoginFailures(email, ip);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: sessionExpirySeconds(settings.sessionTimeoutMinutes) }
    );

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          // RBAC key. The client uses this (not the job title `role`) to decide
          // whether to route to the admin area.
          accessRole: user.accessRole,
          isAdmin: isAdminRole(user.accessRole),
          hasCompletedOnboarding: user.hasCompletedOnboarding,
          avatarUrl: user.avatarUrl,
          companyName: user.companyName,
          industry: user.industry,
          companySize: user.companySize,
          aiUsageCount: user.aiUsageCount || 0,
          subscriptionPlan: user.subscriptionPlan || "free",
          isVerified: user.isVerified || false,
          createdAt: user.createdAt,
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (user) {
      const token = jwt.sign(
        { sub: user.id, purpose: 'reset' },
        process.env.JWT_SECRET!,
        { expiresIn: '15m' }
      );

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`;

      // A reset link is a bearer credential: it is never written to production
      // logs, and the development hint deliberately omits the address and token.
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Password reset link generated (development only)');
      }

      const smtpHost = process.env.SMTP_HOST;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpFrom = process.env.SMTP_FROM;

      if (smtpHost && smtpUser && smtpPass && smtpFrom) {
        try {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          });

          await transporter.sendMail({
            from: smtpFrom,
            to: email,
            subject: 'Password Reset Request',
            text: `Click the following link to reset your password: ${resetUrl}\n\nThis link expires in 15 minutes.`,
            html: `<p>Click the following link to reset your password:</p><a href="${resetUrl}">${resetUrl}</a><p>This link expires in 15 minutes.</p>`,
          });
        } catch (smtpError) {
          console.error('SMTP send failed (forgot password):', smtpError);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and password are required'
      });
    }

    const settings = await getPlatformSettings();
    const policyError = passwordPolicyError(password, settings.requireStrongPassword);
    if (policyError) {
      return res.status(400).json({
        success: false,
        message: policyError
      });
    }

    let decoded: { sub: string; purpose: string };
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string; purpose: string };
    } catch (jwtError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    if (!decoded || decoded.purpose !== 'reset' || !decoded.sub) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        accessResetAt: new Date()
      }
    });

    await revokeUserTokens(user.id);

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};