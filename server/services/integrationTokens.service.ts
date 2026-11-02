// server/services/integrationTokens.service.ts
//
// Access tokens for most providers expire within the hour (Salesforce 2h,
// Google 1h, HubSpot 30m, Zoho 1h, QuickBooks 1h, Dropbox 4h, Jira 1h). Without
// a refresh step a connection works once and then quietly starts returning 401s,
// which looks like a broken integration. This keeps the stored token fresh.

import { prisma } from '../lib/prisma.js';
import { decryptSecret, encryptSecret } from '../lib/crypto.js';
import { getProvider, resolveOAuthUrls } from '../integrations/providers.js';
import { logger } from '../lib/logger.js';

/** Refresh this far ahead of expiry so a slow sync never races the deadline. */
const REFRESH_WINDOW_MS = 2 * 60 * 1000;

/**
 * Returns the connection row for a provider, refreshed first when its access
 * token is about to expire. Never throws: a failed refresh returns the existing
 * row so the caller can still attempt the request and report a truthful error.
 */
export async function loadFreshConnection(userId: string, providerId: string) {
  const conn = await prisma.integrationConnection.findUnique({
    where: { userId_name: { userId, name: providerId } },
  });
  if (!conn) return null;

  const provider = getProvider(providerId);
  const oauth = provider?.oauth;
  // OAuth 1.0a user tokens (Trello) and API-key connections do not expire, and
  // a token with no expiry recorded was issued as long-lived.
  if (!oauth || !conn.refreshToken || !conn.tokenExpiry) return conn;
  if (conn.tokenExpiry.getTime() - Date.now() > REFRESH_WINDOW_MS) return conn;

  const refreshToken = decryptSecret(conn.refreshToken);
  const clientId = process.env[oauth.clientIdEnv];
  const clientSecret = process.env[oauth.clientSecretEnv];
  const urls = resolveOAuthUrls(provider!);
  if (!refreshToken || !clientId || !clientSecret || !urls) return conn;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (oauth.useBasicAuth) {
    headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
  } else {
    body.set('client_id', clientId);
    body.set('client_secret', clientSecret);
  }

  try {
    const res = await fetch(urls.tokenUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': oauth.useJsonTokenRequest
          ? 'application/json'
          : 'application/x-www-form-urlencoded',
      },
      body: oauth.useJsonTokenRequest ? JSON.stringify(Object.fromEntries(body)) : body.toString(),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || typeof json.access_token !== 'string' || !json.access_token) {
      logger.warn('Integration token refresh was rejected', {
        provider: providerId,
        status: res.status,
        error: typeof json.error === 'string' ? json.error : undefined,
      });
      return conn;
    }

    const expiresIn = Number(json.expires_in) || null;
    return await prisma.integrationConnection.update({
      where: { userId_name: { userId, name: providerId } },
      data: {
        accessToken: encryptSecret(json.access_token),
        // Providers may rotate the refresh token; keep the new one when they do.
        ...(typeof json.refresh_token === 'string' && json.refresh_token
          ? { refreshToken: encryptSecret(json.refresh_token) }
          : {}),
        tokenExpiry: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
      },
    });
  } catch (error) {
    logger.warn('Integration token refresh request failed', {
      provider: providerId,
      error: error instanceof Error ? error.message : 'unknown error',
    });
    return conn;
  }
}
