// server/services/integrationFetcherUtils.ts
//
// Shared utilities for the integration data-access layer.

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function sanitize(value: unknown, path: string = ''): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.length > 4000 ? `${value.slice(0, 4000)}…` : value;
  if (Array.isArray(value)) return value.map((v, i) => sanitize(v, `${path}[${i}]`));
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const key = k.toLowerCase();
      if (/password|secret|token|auth|api[_-]?key|apikey|credential|ssn|credit[_-]?card|cvv|cvc|account[_-]?number|routing_number/i.test(key)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = sanitize(v, path ? `${path}.${k}` : k);
      }
    }
    return out;
  }
  return value;
}

export function redactError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  return msg
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer [REDACTED]')
    .replace(/Authorization:\s*\S+/g, 'Authorization: [REDACTED]')
    .replace(/"(access_token|refresh_token|api_key|secret)"\s*:/g, '"$1": "[REDACTED]"');
}

export interface RequestOpts {
  url: string;
  headers?: Record<string, string>;
  method?: string;
  body?: string;
  maxRetries?: number;
}

export async function fetchWithRetry(opts: RequestOpts): Promise<Response> {
  const { url, headers = {}, method = 'GET', body, maxRetries = 2 } = opts;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    try {
      const res = await fetch(url, { headers, method, body, signal: ctrl.signal });
      clearTimeout(timer);
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get('retry-after') || 1);
        await sleep(retryAfter * (2 ** attempt) * 1000);
        continue;
      }
      if (!res.ok && (res.status >= 500 || res.status === 429)) {
        await sleep(1000 * (2 ** attempt) + Math.random() * 500);
        continue;
      }
      return res;
    } catch (err: unknown) {
      clearTimeout(timer);
      if (attempt === maxRetries) throw err;
      await sleep(1000 * (2 ** attempt) + Math.random() * 500);
    }
  }
  throw new Error('Request failed after retries');
}

import { getProvider } from '../integrations/providers.js';

export function getOAuthClientConfig(providerId: string): { clientId: string; clientSecret: string } | null {
  const provider = getProvider(providerId);
  if (!provider?.oauth) return null;
  return { clientId: process.env[provider.oauth.clientIdEnv] || '', clientSecret: process.env[provider.oauth.clientSecretEnv] || '' };
}

export function resolvePayPalBase(env: string): string {
  return (process.env.PAYPAL_ENVIRONMENT || 'sandbox').trim().toLowerCase() === 'live' ? 'api.paypal.com' : 'api.sandbox.paypal.com';
}
