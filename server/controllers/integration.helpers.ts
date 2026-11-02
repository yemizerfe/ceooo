// integration.helpers.ts
// Shared utilities used across all integration controller modules.

import { createHmac } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { decryptSecret, readCredentialBlob } from '../lib/crypto.js';
import type { Provider } from '../integrations/providers.js';

// ── URL helpers ──────────────────────────────────────────────────────────────

export function apiBaseUrl(): string {
  return (
    process.env.INTEGRATIONS_REDIRECT_BASE ||
    process.env.API_PUBLIC_URL ||
    process.env.BACKEND_URL ||
    `http://localhost:${process.env.PORT || 5010}`
  ).replace(/\/$/, '');
}

export function frontendUrl(): string {
  return (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export function safeFrontendReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value) return '/dashboard/integrations';
  try {
    const baseUrl = frontendUrl();
    const url = new URL(value, baseUrl);
    if (url.origin !== new URL(baseUrl).origin) return '/dashboard/integrations';
    url.searchParams.delete('oauth');
    url.searchParams.delete('provider');
    url.searchParams.delete('reason');
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/dashboard/integrations';
  }
}

export function oauthRedirectUri(provider: Provider): string {
  const redirectUriEnv = provider.oauth?.redirectUriEnv || provider.oauth1?.redirectUriEnv;
  const providerOverride = redirectUriEnv ? process.env[redirectUriEnv] : undefined;
  const envKey = `${provider.id.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_REDIRECT_URI`;
  const callbackOverride = process.env[`${provider.id.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_CALLBACK_URL`];
  const envOverride = process.env[envKey];
  const redirectUri =
    providerOverride ||
    envOverride ||
    callbackOverride ||
    `${apiBaseUrl()}/api/integrations/${provider.id}/callback`;

  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    throw new Error(`OAuth callback URL for ${provider.name} must be an absolute URL.`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`OAuth callback URL for ${provider.name} must use HTTP or HTTPS.`);
  }
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error(`OAuth callback URL for ${provider.name} must use HTTPS in production.`);
  }
  return url.toString().replace(/\/+$/, '');
}

// ── PKCE ─────────────────────────────────────────────────────────────────────

export function pkceVerifier(providerId: string, userId: string, nonce: string): string {
  return createHmac('sha256', process.env.JWT_SECRET!)
    .update(`${providerId}:${userId}:${nonce}`)
    .digest('base64url');
}

// ── Integration state (User.integrations JSON column) ────────────────────────

export function readIntegrations(raw: unknown): Record<string, any> {
  let parsed: any = raw;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed || '{}'); } catch { parsed = {}; }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  return { ...parsed };
}

export async function loadState(userId: string): Promise<Record<string, any>> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { integrations: true } });
  return readIntegrations(user?.integrations);
}

export async function saveState(userId: string, state: Record<string, any>) {
  await prisma.user.update({ where: { id: userId }, data: { integrations: state } });
}

// ── Credential decryption ─────────────────────────────────────────────────────

export async function getProviderCredentials(
  userId: string,
  providerId: string,
): Promise<Record<string, string> | null> {
  const conn = await prisma.integrationConnection.findUnique({
    where: { userId_name: { userId, name: providerId } },
  });
  if (!conn) return null;

  const out: Record<string, string> = {};
  if (conn.accessToken) out.accessToken = decryptSecret(conn.accessToken) || '';
  if (conn.refreshToken) out.refreshToken = decryptSecret(conn.refreshToken) || '';
  if (conn.encryptedCredentials) {
    Object.assign(out, readCredentialBlob(conn.encryptedCredentials));
  }
  if (conn.metadata && typeof conn.metadata === 'object') {
    const meta = conn.metadata as Record<string, unknown>;
    const pick = ['instanceUrl','baseUrl','apiDomain','tenantId','cloudId','email','apiToken','apiKey',
                  'accessToken','secretKey','clientId','secret','botToken','realm_id','realmId',
                  'stripeUserId'] as const;
    for (const k of pick) {
      if (typeof meta[k] === 'string') out[k] = meta[k] as string;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

// ── JWT state type ────────────────────────────────────────────────────────────

export interface OAuthStatePayload {
  userId?: string;
  provider?: string;
  purpose?: string;
  pkceNonce?: string;
  returnTo?: string;
}

export function verifyOAuthState(state: string): OAuthStatePayload {
  return jwt.verify(state, process.env.JWT_SECRET!) as OAuthStatePayload;
}
