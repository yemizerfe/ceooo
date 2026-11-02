// lib/loginGuard.ts
// Failed-login tracking backed by the platform security settings.
//
// Defense-in-depth only: passwords are still bcrypt-verified and JWTs are
// still required. This guard throttles brute-force attempts per email+IP.
//
// In-memory and process-local on purpose — CEOOO runs a single API process,
// and the guard resets on restart (never locks anyone out permanently).
import { getPlatformSettings } from '../services/platformSettings.service.ts';

interface AttemptBucket {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const buckets = new Map<string, AttemptBucket>();
let lastSweep = 0;

function bucketKey(email: string, ip: string): string {
  return `${email.toLowerCase()}|${ip}`;
}

function sweep(now: number): void {
  if (now - lastSweep < WINDOW_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/** Returns true when this identity has exhausted its failed-attempt budget. */
export async function isLoginBlocked(email: string, ip: string): Promise<boolean> {
  const settings = await getPlatformSettings();
  if (!settings.maxLoginAttempts) return false; // 0 disables the guard

  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(bucketKey(email, ip));
  if (!bucket || bucket.resetAt <= now) return false;
  return bucket.count >= settings.maxLoginAttempts;
}

/** Records a failed attempt. Returns the remaining budget (0 = now blocked). */
export async function recordLoginFailure(email: string, ip: string): Promise<number> {
  const settings = await getPlatformSettings();
  if (!settings.maxLoginAttempts) return Number.MAX_SAFE_INTEGER;

  const now = Date.now();
  sweep(now);

  const key = bucketKey(email, ip);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return settings.maxLoginAttempts - 1;
  }

  bucket.count += 1;
  return Math.max(0, settings.maxLoginAttempts - bucket.count);
}

/** Clears failures after a successful authentication. */
export function clearLoginFailures(email: string, ip: string): void {
  buckets.delete(bucketKey(email, ip));
}
