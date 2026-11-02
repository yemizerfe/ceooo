// lib/tokenRevocation.ts
// CEOOO issues stateless JWT access tokens. "Reset access" therefore works by
// recording a cutoff timestamp on the user (`User.accessResetAt`): any token
// issued BEFORE the cutoff is rejected, forcing a fresh sign-in.
//
// The lookup is cached in-process for a short window so normal authenticated
// traffic does not hit the database on every request.
import { prisma } from './prisma.ts';

const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  revokedBefore: number; // epoch ms, 0 when nothing is revoked
  at: number;
}

const cache = new Map<string, CacheEntry>();

export function invalidateRevocationCache(userId?: string): void {
  if (userId) cache.delete(userId);
  else cache.clear();
}

/** Records a revocation cutoff and refreshes the cache. */
export async function revokeUserTokens(userId: string, at: Date = new Date()): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { accessResetAt: at } });
  cache.set(userId, { revokedBefore: at.getTime(), at: Date.now() });
}

async function revokedBeforeFor(userId: string): Promise<number> {
  const cached = cache.get(userId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.revokedBefore;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accessResetAt: true },
    });
    const revokedBefore = user?.accessResetAt ? user.accessResetAt.getTime() : 0;
    cache.set(userId, { revokedBefore, at: Date.now() });
    return revokedBefore;
  } catch (error) {
    console.error('Failed to check token revocation:', error);
    // Fail open for availability; authorization middleware still protects routes.
    return 0;
  }
}

/**
 * Returns true when the JWT (identified by its `iat` claim, in seconds)
 * was issued before the user's revocation cutoff.
 */
export async function isTokenRevoked(
  userId: string,
  issuedAtSeconds: number | undefined
): Promise<boolean> {
  if (!issuedAtSeconds) return false;
  const revokedBefore = await revokedBeforeFor(userId);
  if (!revokedBefore) return false;
  // `iat` has second precision, so compare against the cutoff in seconds.
  return issuedAtSeconds * 1000 < revokedBefore;
}
