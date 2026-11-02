// server/lib/crypto.ts
//
// Symmetric encryption for third-party credentials at rest (OAuth access /
// refresh tokens, pasted API keys). AES-256-GCM with a key derived from
// INTEGRATION_ENCRYPTION_KEY (falls back to JWT_SECRET, then a dev constant).
//
// Ciphertext is self-describing: `v1.<iv>.<tag>.<data>` (all base64). Values
// without the `v1.` prefix are returned unchanged so legacy plaintext rows keep
// working; re-saving them upgrades them in place.

import crypto from 'crypto';

const PREFIX = 'v1';

function key(): Buffer {
  const secret =
    process.env.INTEGRATION_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'ceoapp-dev-integration-key';
  return crypto.scryptSync(secret, 'ceoapp-integrations', 32);
}

export function encryptSecret(plain: string | null | undefined): string | null {
  if (plain == null || plain === '') return null;
  if (isEncrypted(plain)) return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
}

export function decryptSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!isEncrypted(stored)) return stored;
  try {
    const [, ivB64, tagB64, dataB64] = stored.split('.');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    // Wrong key (e.g. JWT_SECRET rotated) — surface as "not connected" rather
    // than crashing the request.
    return null;
  }
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(`${PREFIX}.`);
}

/**
 * Reads a stored credential blob regardless of which writer produced it.
 *
 * Two on-disk shapes exist in the wild: a JSON object of indivdually encrypted
 * values (`{"accessToken":"v1.…"}`), and an earlier double-encrypted form
 * where that JSON was encrypted again as one string. Both decode here, so a
 * rotation of the writer does not orphan existing connections.
 */
export function readCredentialBlob(stored: string | null | undefined): Record<string, string> {
  if (!stored) return {};
  const json = decryptSecret(stored);
  if (!json) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value !== 'string' || !value) continue;
    if (!isEncrypted(value)) {
      out[key] = value;
      continue;
    }
    // Undecryptable (rotated key) values are dropped: passing ciphertext to a
    // provider would only produce a confusing 401.
    const plain = decryptSecret(value);
    if (plain) out[key] = plain;
  }
  return out;
}

/** Encrypt every value of a credential object (skips empty values). */
export function encryptCredentials(creds: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(creds)) {
    if (v == null || v === '') continue;
    out[k] = encryptSecret(String(v))!;
  }
  return out;
}
