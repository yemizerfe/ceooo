// routes/auth.routes.ts
import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import passport from 'passport';
import { signup, login, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import { signupValidation, loginValidation } from '../validation/auth.validation.js';
import { validate, validateZod } from '../middleware/validate.middleware.js';
import { forgotPasswordSchema, resetPasswordSchema } from '../validation/schemas.js';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { IntegrationController } from '../controllers/integration.controller.js';
import { googleOAuthConfigured } from '../config/passport.js';
import { logger } from '../lib/logger.js';
import { getPlatformSettings } from '../services/platformSettings.service.js';

const router = Router();
const OAUTH_HANDOFF_COOKIE = 'ceooo.oauth_handoff';
const OAUTH_STATE_COOKIE = 'ceooo.oauth_state';
const OAUTH_EXCHANGE_PATH = '/api/auth/oauth/exchange';
const IS_PROD = process.env.NODE_ENV === 'production';

function oauthStateCookieOptions() {
  return {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax' as const,
    path: '/api/auth',
  };
}

function oauthCookieOptions() {
  return {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? 'none' as const : 'lax' as const,
    path: OAUTH_EXCHANGE_PATH,
  };
}

function frontendBaseUrl(): string {
  return (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
}

/**
 * Only same-site absolute paths are allowed as an OAuth return target, so a
 * crafted `?returnTo=` can never turn the callback into an open redirect.
 */
function safeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/dashboard';
  }
  try {
    const destination = new URL(value, frontendBaseUrl());
    if (destination.origin !== new URL(frontendBaseUrl()).origin) return '/dashboard';
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return '/dashboard';
  }
}

/** Signed `state` carrying where the browser should land after the handshake. */
function signLoginState(returnTo: unknown): string {
  return jwt.sign(
    {
      purpose: 'login-oauth',
      returnTo: safeReturnTo(returnTo),
      nonce: randomBytes(32).toString('base64url'),
    },
    process.env.JWT_SECRET!,
    { expiresIn: '10m' },
  );
}

function setLoginStateCookie(res: any, state: string): void {
  res.cookie(OAUTH_STATE_COOKIE, state, {
    ...oauthStateCookieOptions(),
    maxAge: 10 * 60 * 1000,
  });
}

function clearLoginStateCookie(res: any): void {
  res.clearCookie(OAUTH_STATE_COOKIE, oauthStateCookieOptions());
}

function isLoginStateBoundToRequest(req: any): boolean {
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const cookie = req.headers.cookie
    ?.split(';')
    .map((part: string) => part.trim())
    .find((part: string) => part.startsWith(`${OAUTH_STATE_COOKIE}=`))
    ?.slice(OAUTH_STATE_COOKIE.length + 1);
  if (!state || cookie !== state) return false;
  try {
    const decoded = jwt.verify(state, process.env.JWT_SECRET!) as { purpose?: string; nonce?: string };
    return decoded.purpose === 'login-oauth' && typeof decoded.nonce === 'string';
  } catch {
    return false;
  }
}

function readLoginState(state: unknown): { returnTo: string } {
  if (typeof state !== 'string' || !state) return { returnTo: '/dashboard' };
  try {
    const decoded = jwt.verify(state, process.env.JWT_SECRET!) as {
      purpose?: string;
      returnTo?: string;
      nonce?: string;
    };
    if (decoded.purpose !== 'login-oauth' || typeof decoded.nonce !== 'string') {
      return { returnTo: '/dashboard' };
    }
    return { returnTo: safeReturnTo(decoded.returnTo) };
  } catch {
    return { returnTo: '/dashboard' };
  }
}

/**
 * Cancelling a consent screen is a normal choice, not a failure. Send the user
 * back to the page they started from with a neutral flag instead of dropping
 * them on an error page.
 */
function sendOAuthResult(
  res: any,
  state: unknown,
  outcome: 'cancelled' | 'failed',
  reason?: string,
) {
  const { returnTo } = readLoginState(state);
  const destination = new URL(returnTo, frontendBaseUrl());
  destination.searchParams.set('oauth', outcome);
  if (reason) destination.searchParams.set('reason', reason);
  return res.redirect(destination.toString());
}

export function sanitizeOAuthAvatarUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? value : null;
  } catch {
    return null;
  }
}

function completeOAuthLogin(res: any, state: unknown, token: string, user: unknown) {
  const profile = user as Record<string, unknown>;
  const handoff = jwt.sign(
    {
      purpose: 'oauth-handoff',
      token,
      user: { ...profile, avatarUrl: sanitizeOAuthAvatarUrl(profile.avatarUrl) },
    },
    process.env.JWT_SECRET!,
    { expiresIn: '60s' },
  );
  if (Buffer.byteLength(handoff, 'utf8') > 3500) {
    logger.error('OAuth handoff exceeds the safe cookie size');
    return sendOAuthResult(res, state, 'failed', 'oauth_profile_too_large');
  }
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.cookie(OAUTH_HANDOFF_COOKIE, handoff, { ...oauthCookieOptions(), maxAge: 60_000 });
  const { returnTo } = readLoginState(state);
  const destination = new URL('/auth/callback', frontendBaseUrl());
  destination.searchParams.set('returnTo', returnTo);
  return res.redirect(destination.toString());
}

router.get('/google', (req, res, next) => {
  if (!googleOAuthConfigured) {
    return res.status(503).json({
      success: false,
      message: 'Google login is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
    });
  }
  const state = signLoginState(req.query.returnTo);
  setLoginStateCookie(res, state);
  return passport.authenticate('google', {
    scope: ['profile', 'email'],
    state,
  })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  const state = typeof req.query.state === 'string' ? jwt.decode(req.query.state) : null;
  if (
    state &&
    typeof state === 'object' &&
    'purpose' in state &&
    state.purpose === 'integration-oauth' &&
    'provider' in state &&
    typeof state.provider === 'string'
  ) {
    req.params = { provider: state.provider };
    return new IntegrationController().oauthCallback(req, res);
  }

  if (req.query.error) {
    clearLoginStateCookie(res);
    const reason = String(req.query.error);
    return sendOAuthResult(
      res,
      req.query.state,
      reason === 'access_denied' ? 'cancelled' : 'failed',
      reason,
    );
  }
  if (!googleOAuthConfigured) {
    return sendOAuthResult(res, req.query.state, 'failed', 'google_not_configured');
  }
  if (!isLoginStateBoundToRequest(req)) {
    clearLoginStateCookie(res);
    return sendOAuthResult(res, req.query.state, 'failed', 'invalid_oauth_state');
  }
  clearLoginStateCookie(res);
  return next();
});

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (error: unknown, result: any) => {
    if (error || !result) {
      return sendOAuthResult(res, req.query.state, 'failed', 'google_oauth_failed');
    }
    if (typeof result.token !== 'string' || !result.user) {
      return sendOAuthResult(res, req.query.state, 'failed', 'google_oauth_failed');
    }
    return completeOAuthLogin(res, req.query.state, result.token, result.user);
  })(req, res, next);
});

// Regular email/password routes (only email + password)
router.post('/signup', signupValidation, validate, signup);
router.post('/login', loginValidation, validate, login);
router.post('/oauth/exchange', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const cookie = req.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${OAUTH_HANDOFF_COOKIE}=`))
    ?.slice(OAUTH_HANDOFF_COOKIE.length + 1);
  res.clearCookie(OAUTH_HANDOFF_COOKIE, oauthCookieOptions());

  if (!cookie) {
    return res.status(401).json({ success: false, message: 'OAuth sign-in has expired. Please try again.' });
  }

  try {
    const handoff = jwt.verify(
      decodeURIComponent(cookie),
      process.env.JWT_SECRET!,
    ) as jwt.JwtPayload & { purpose?: string; token?: string; user?: unknown };
    if (
      handoff.purpose !== 'oauth-handoff' ||
      typeof handoff.token !== 'string' ||
      !handoff.user ||
      typeof handoff.user !== 'object'
    ) {
      return res.status(401).json({ success: false, message: 'OAuth sign-in is invalid. Please try again.' });
    }

    return res.json({
      success: true,
      data: { token: handoff.token, user: handoff.user },
    });
  } catch {
    return res.status(401).json({ success: false, message: 'OAuth sign-in has expired. Please try again.' });
  }
});

// Auth Task 3: Password reset flow
router.post('/forgot-password', validateZod(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validateZod(resetPasswordSchema), resetPassword);



export default router;
