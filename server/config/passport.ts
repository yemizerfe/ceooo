// src/config/passport.ts
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../lib/prisma.ts';
import { isAdminRole } from '../services/rbac.service.ts';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { logger } from '../lib/logger.ts';
import { getPlatformSettings } from '../services/platformSettings.service.ts';
// Bun already loads .env; keep dotenv's banner out of the console.
dotenv.config({ quiet: true });

const backendBaseUrl = (process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5010}`).replace(/\/$/, '');
const googleCallbackUrl =
  process.env.GOOGLE_CALLBACK_URL || `${backendBaseUrl}/api/auth/google/callback`;

export const googleOAuthConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

if (googleOAuthConfigured) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: googleCallbackUrl,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.find((entry) => entry.verified)?.value?.trim().toLowerCase();
          const name = profile.displayName;

          if (!email) {
            return done(new Error('Google did not provide a verified email address'), undefined);
          }

          let user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
          });
          let isNewUser = false;
          const googleAvatar = profile.photos?.[0]?.value || null;

          if (user && !user.isActive) {
            return done(new Error('Account suspended'), undefined);
          }

          if (!user) {
            const settings = await getPlatformSettings();
            if (!settings.allowRegistration) {
              return done(new Error('Registration is currently disabled'), undefined);
            }
            logger.info('Google sign-in created a new account');
            user = await prisma.user.create({
              data: {
                email,
                passwordHash: null,
                name: name || email.split('@')[0],
                avatarUrl: googleAvatar,
                accessRole: 'CEO',
                isVerified: true,
                linkedAccounts: [
                  {
                    provider: 'google',
                    providerId: profile.id,
                    email,
                    linkedAt: new Date().toISOString(),
                  },
                ],
              },
            });
            isNewUser = true;
          } else if (!user.avatarUrl && googleAvatar) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { avatarUrl: googleAvatar },
            });
          }

          const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET!,
            { expiresIn: '7d' },
          );

          return done(null, {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              accessRole: user.accessRole,
              isAdmin: isAdminRole(user.accessRole),
              hasCompletedOnboarding: user.hasCompletedOnboarding,
              avatarUrl: user.avatarUrl,
              companyName: user.companyName,
              industry: user.industry,
              companySize: user.companySize,
              aiUsageCount: user.aiUsageCount || 0,
              subscriptionPlan: user.subscriptionPlan || 'free',
              isVerified: user.isVerified || false,
              createdAt: user.createdAt,
            },
            token,
            isNewUser,
          });
        } catch (error) {
          logger.error('Google OAuth strategy failed', {
            error: error instanceof Error ? error.message : 'unknown error',
          });
          return done(error as Error, undefined);
        }
      },
    ),
  );
}

logger.info('Passport: Google OAuth configuration', {
  configured: googleOAuthConfigured,
  callbackUrl: googleCallbackUrl,
});

passport.serializeUser((data: any, done) => {
  done(null, data);
});

passport.deserializeUser((data: any, done) => {
  done(null, data);
});

export default passport;