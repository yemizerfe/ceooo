// server/services/integrationFetcherDropbox.ts
//
// Dropbox: file metadata listing via the Dropbox API v2. OAuth 2.0 access token
// returned by the provider's authorize flow.

import { fetchWithRetry, sanitize } from './integrationFetcherUtils.js';
import type { FetcherResult, FetchOptions } from './integrationFetcher.service.js';

export async function fetchDropbox(credentials: Record<string, string>, options: FetchOptions): Promise<FetcherResult> {
  const accessToken = credentials.accessToken;
  if (!accessToken) {
    return { success: false, data: [], count: 0, metadata: options.metadata || {}, error: 'No Dropbox access token' };
  }
  const { dataType = 'files', cursor, limit = 100 } = options;
  if (dataType === 'files') return dropboxListFiles(accessToken, cursor, limit);
  return {
    success: false,
    data: [],
    count: 0,
    metadata: { provider: 'dropbox', dataType },
    error: `Unsupported Dropbox dataType "${dataType}". Use files.`,
  };
}

async function dropboxListFiles(accessToken: string, cursor: string | null, limit = 100): Promise<FetcherResult> {
  const res = await fetchWithRetry({
    url: 'https://api.dropboxapi.com/2/files/list_folder',
    method: 'POST',
    body: JSON.stringify({ path: '', limit: Math.min(limit, 100), include_deleted: false, include_has_explicit_shared_members: false }),
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: {}, error: `Dropbox returned HTTP ${res.status}` };
  const json: any = await res.json();
  const items = (json.entries || []).map((e) => sanitize({
    id: e.id,
    name: e.name,
    path: e.path_display || e.path || null,
    is_dir: e.is_dir ?? false,
    size: e.size ?? null,
    mime: e.mime_type || null,
    modified: e.server_modified ? new Date(e.server_modified).toISOString() : null,
  }));
  return {
    success: true,
    data: items,
    count: items.length,
    metadata: { provider: 'dropbox' },
    nextCursor: json.cursor || null,
  };
}
