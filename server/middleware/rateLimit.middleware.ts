// middleware/rateLimit.middleware.ts
// Small in-memory rate limiter used to protect sensitive endpoints
// (admin writes and authentication) from brute-force / abuse.
//
// Deliberately dependency free and process-local: CEOOO runs a single API
// process per deployment, and limits are a defense-in-depth layer on top of
// authentication + authorization.
import type { NextFunction, Request, Response } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number, windowMs: number): void {
  if (now - lastSweep < windowMs) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  // When provided, the limit is applied per key returned by this function.
  keyGenerator?: (req: Request) => string;
}

export function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded) && forwarded.length) return String(forwarded[0]).trim();
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, message = 'Too many requests. Please try again later.' } = options;
  const keyFor = options.keyGenerator ?? clientIp;

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    sweep(now, windowMs);

    const key = `${req.method}:${req.path}:${keyFor(req)}`;
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;

    if (bucket.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({
        success: false,
        message,
        retryAfterSeconds,
      });
      return;
    }

    next();
  };
}

/** Login protection: throttles attempts per IP + email pair. */
export function loginRateLimit(options: { windowMs: number; max: number }) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: 'Too many login attempts. Please wait and try again.',
    keyGenerator: (req) => {
      const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : 'unknown';
      return `${clientIp(req)}:${email}`;
    },
  });
}

/** Admin write operations: generous, but stops runaway scripts. */
export const adminWriteRateLimit = rateLimit({ windowMs: 60_000, max: 120 });
