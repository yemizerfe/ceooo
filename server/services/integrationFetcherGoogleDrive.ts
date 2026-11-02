// server/services/integrationFetcherGoogleDrive.ts
//
// Google Drive: authorized file metadata listing (read-only). File content is
// fetched when a specific file id is supplied.

import { fetchWithRetry } from './integrationFetcherUtils.js';
import type { FetcherResult, FetchOptions } from './integrationFetcher.service.js';

export async function fetchGoogleDrive(credentials: Record<string, string>, options: FetchOptions): Promise<FetcherResult> {
  const accessToken = credentials.accessToken;
  if (!accessToken) {
    return { success: false, data: [], count: 0, metadata: options.metadata || {}, error: 'No Drive OAuth access token' };
  }
  const { dataType = 'files', cursor, limit = 100 } = options;
  if (dataType === 'files') {
    return listGoogleDriveFiles(accessToken, cursor, limit);
  }
  return {
    success: true,
    data: { files: [], note: 'DataType "files" lists Drive items. Use a file id to fetch single-file content.' },
    count: 0,
    metadata: { provider: 'google-drive', dataType },
    nextCursor: null,
  };
}

async function listGoogleDriveFiles(accessToken: string, cursor: string | null, limit = 100): Promise<FetcherResult> {
  const fields = 'files(id,name,mimeType,modifiedTime,size,trashed),nextPageToken';
  const url = `https://www.googleapis.com/drive/v3/files?fields=${encodeURIComponent(fields)}&pageSize=${Math.min(limit, 100)}&pageToken=${encodeURIComponent(cursor || '')}&orderBy=modifiedTime desc`;
  const res = await fetchWithRetry({ url, headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: {}, error: `Google Drive returned HTTP ${res.status}` };
  const json: any = await res.json();
  return {
    success: true,
    data: json.files || [],
    count: json.files?.length ?? 0,
    metadata: { provider: 'google-drive' },
    nextCursor: json.nextPageToken || null,
  };
}
