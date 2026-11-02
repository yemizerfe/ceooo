// server/services/integrationFetcherAirtable.ts
//
// Airtable: bases (via personal access token), table schemas, and records.

import { fetchWithRetry, sanitize } from './integrationFetcherUtils.js';
import type { FetcherResult, FetchOptions } from './integrationFetcher.service.js';

export async function fetchAirtable(credentials: Record<string, string>, options: FetchOptions): Promise<FetcherResult> {
  const accessToken = credentials.accessToken;
  if (!accessToken) {
    return { success: false, data: [], count: 0, metadata: options.metadata || {}, error: 'No Airtable personal access token' };
  }
  const { dataType = 'bases', cursor, limit = 100 } = options;
  if (dataType === 'bases') return airtableBases(accessToken, limit);
  if (dataType === 'records') {
    const baseId = options.spreadsheetId || credentials.baseId || credentials.base_id;
    if (!baseId) {
      return { success: false, data: [], count: 0, metadata: { provider: 'airtable' }, error: 'No Airtable base id. Data types: bases, records (with baseId)' };
    }
    return airtableRecords(accessToken, baseId, cursor, limit);
  }
  return {
    success: false,
    data: [],
    count: 0,
    metadata: { provider: 'airtable', dataType },
    error: `Unsupported Airtable dataType "${dataType}". Use bases or records.`,
  };
}

async function airtableBases(accessToken: string, limit = 100): Promise<FetcherResult> {
  const res = await fetchWithRetry({ url: 'https://api.airtable.com/v0/meta/bases', headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: {}, error: `Airtable returned HTTP ${res.status}` };
  const json: any = await res.json();
  const bases = (json.bases || []).map((b: Record<string, unknown>) => sanitize({ id: b.id, name: b.name, permissionLevel: b.permission_level || null, createdTime: b.created_time || null }));
  return { success: true, data: bases, count: bases.length, metadata: { provider: 'airtable' }, nextCursor: null };
}

async function airtableRecords(accessToken: string, baseId: string, cursor: string | null, limit = 100): Promise<FetcherResult> {
  const url = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/records?maxRecords=${Math.min(limit, 100)}${cursor ? `&offset=${encodeURIComponent(cursor)}` : ''}`;
  const res = await fetchWithRetry({ url, headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: { provider: 'airtable', baseId }, error: `Airtable records returned HTTP ${res.status}` };
  const json: any = await res.json();
  const items = (json.records || []).map((r: Record<string, unknown>) => {
    const fields = r.fields as Record<string, unknown> || {};
    return sanitize({ id: r.id, fields, createdTime: r.created_time, status: (r.id && '' + r.id).length ? fields.__airtable_status : null });
  });
  const nextCursor = typeof json.offset === 'string' ? json.offset : null;
  return {
    success: true,
    data: items,
    count: items.length,
    metadata: { provider: 'airtable', baseId },
    nextCursor,
  };
}
