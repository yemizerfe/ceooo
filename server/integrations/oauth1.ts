// server/integrations/oauth1.ts
//
// Minimal, self-contained OAuth 1.0a (three-legged) client, used by the one
// provider in the catalog that never shipped OAuth 2.0 (Trello). The user is
// still sent to the vendor's own "authorise this app" screen — only the
// signature scheme differs.
//
// Signing follows RFC 5849: HMAC-SHA1 over the normalised request, which is
// what Trello's request-token / access-token endpoints require.

import { createHmac, randomBytes } from 'node:crypto';

export interface OAuth1TemporaryToken {
  token: string;
  secret: string;
}

export interface OAuth1Consumer {
  consumerKey: string;
  consumerSecret: string;
}

/** RFC 3986 percent-encoding (stricter than encodeURIComponent). */
export function oauth1Encode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function nonce(): string {
  return randomBytes(16).toString('hex');
}

function signatureBaseString(method: string, url: string, params: Record<string, string>): string {
  const parsed = new URL(url);
  const baseUri = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  const encoded = Object.entries(params)
    .map(([key, value]) => [oauth1Encode(key), oauth1Encode(value)] as const)
    .sort(([aKey, aValue], [bKey, bValue]) =>
      aKey === bKey ? (aValue < bValue ? -1 : aValue > bValue ? 1 : 0) : aKey < bKey ? -1 : 1,
    )
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return `${method.toUpperCase()}&${oauth1Encode(baseUri)}&${oauth1Encode(encoded)}`;
}

/**
 * Builds the `Authorization: OAuth …` header for one request.
 * `extra` holds any query/form parameters that also take part in the signature.
 */
export function oauth1AuthorizationHeader(options: {
  method: string;
  url: string;
  consumer: OAuth1Consumer;
  token?: string;
  tokenSecret?: string;
  extra?: Record<string, string>;
}): string {
  const { method, url, consumer, token, tokenSecret, extra } = options;
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumer.consumerKey,
    oauth_nonce: nonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_version: '1.0',
  };
  if (token) oauthParams.oauth_token = token;

  const signingParams: Record<string, string> = { ...(extra || {}), ...oauthParams };
  const signature = createHmac(
    'sha1',
    `${oauth1Encode(consumer.consumerSecret)}&${oauth1Encode(tokenSecret || '')}`,
  )
    .update(signatureBaseString(method, url, signingParams))
    .digest('base64');

  const headerParams: Record<string, string> = { ...oauthParams, oauth_signature: signature };
  return `OAuth ${Object.entries(headerParams)
    .map(([key, value]) => `${oauth1Encode(key)}="${oauth1Encode(value)}"`)
    .join(', ')}`;
}

function parseFormEncoding(body: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(body));
}

async function oauth1Post(
  url: string,
  consumer: OAuth1Consumer,
  token?: OAuth1TemporaryToken,
  extra?: Record<string, string>,
): Promise<Record<string, string>> {
  const header = oauth1AuthorizationHeader({
    method: 'POST',
    url,
    consumer,
    token: token?.token,
    tokenSecret: token?.secret,
    extra,
  });
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: header,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/x-www-form-urlencoded, application/json',
    },
    body: (extra ? new URLSearchParams(extra).toString() : ''),
  });
  const text = await res.text();
  if (!res.ok) {
    // Vendors explain the refusal in the body (Trello answers "App not found"
    // for a key that has no app behind it), so keep a short, tag-free excerpt
    // for the caller to show the user.
    const snippet = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
    throw new Error(
      `OAuth 1.0a request to ${new URL(url).host} failed with HTTP ${res.status}${snippet ? `: ${snippet}` : ''}`,
    );
  }
  let parsed: Record<string, string>;
  try {
    parsed = JSON.parse(text) as Record<string, string>;
  } catch {
    parsed = parseFormEncoding(text);
  }
  if (!parsed.oauth_token) {
    throw new Error(`OAuth 1.0a response from ${new URL(url).host} carried no token`);
  }
  return parsed;
}

/** Step 1: obtain the temporary (request) token. */
export async function oauth1RequestToken(
  requestTokenUrl: string,
  consumer: OAuth1Consumer,
  callbackUrl: string,
): Promise<OAuth1TemporaryToken> {
  const parsed = await oauth1Post(requestTokenUrl, consumer, undefined, {
    oauth_callback: callbackUrl,
  });
  return { token: parsed.oauth_token!, secret: parsed.oauth_token_secret || '' };
}

/** Step 2: the vendor URL that shows the “allow access?” screen. */
export function oauth1AuthorizeUrl(
  authorizeUrl: string,
  requestToken: string,
  options: { appName: string; scope?: string; expiration?: string },
): string {
  const url = new URL(authorizeUrl);
  url.searchParams.set('oauth_token', requestToken);
  url.searchParams.set('name', options.appName);
  url.searchParams.set('scope', options.scope || 'read');
  url.searchParams.set('expiration', options.expiration || 'never');
  return url.toString();
}

/** Step 3: exchange the verified request token for the long-lived user token. */
export async function oauth1AccessToken(
  accessTokenUrl: string,
  consumer: OAuth1Consumer,
  temporaryToken: OAuth1TemporaryToken,
  verifier: string,
): Promise<OAuth1TemporaryToken> {
  const parsed = await oauth1Post(accessTokenUrl, consumer, temporaryToken, {
    oauth_verifier: verifier,
  });
  return { token: parsed.oauth_token!, secret: parsed.oauth_token_secret || '' };
}
