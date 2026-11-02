// server/services/integrationFetcherGoogleSheets.ts
//
// Google Sheets: spreadsheet metadata + cell values.

import { fetchWithRetry } from './integrationFetcherUtils.js';
import type { FetcherResult, FetchOptions } from './integrationFetcher.service.js';

export async function fetchGoogleSheets(credentials: Record<string, string>, options: FetchOptions): Promise<FetcherResult> {
  const accessToken = credentials.accessToken;
  if (!accessToken) {
    return { success: false, data: [], count: 0, metadata: options.metadata || {}, error: 'No Sheets OAuth access token' };
  }
  const spreadsheets = await listGoogleSheets(accessToken, options.limit);
  if (!spreadsheets.success) return spreadsheets;
  const spreadsheetId = options.spreadsheetId || (spreadsheets.data?.spreadsheets?.[0]?.id ?? null);
  const values: FetcherResult = spreadsheetId
    ? await getGoogleSheetValues(accessToken, spreadsheetId, options.range || 'A1:Z1000', options.limit)
    : { success: true, data: { values: [] }, count: 0, metadata: { note: 'No spreadsheet selected' }, nextCursor: null };
  if (!values.success) return values;
  if (options.dataType === 'spreadsheets') {
    return { success: true, data: spreadsheets.data, count: spreadsheets.data?.spreadsheets?.length ?? 0, metadata: { provider: 'google-sheets', dataType: options.dataType }, nextCursor: null };
  }
  return {
    success: true,
    data: { spreadsheets: spreadsheets.data?.spreadsheets || [], values: values.data?.values || [], selectedSpreadsheetId: spreadsheetId || null },
    count: (values.data?.values?.length ?? 0) + (spreadsheets.data?.spreadsheets?.length ?? 0),
    metadata: { provider: 'google-sheets', dataType: options.dataType || 'all', selectedSpreadsheetId: spreadsheetId || null },
    nextCursor: null,
  };
}

async function listGoogleSheets(accessToken: string, limit = 100): Promise<FetcherResult> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets?fields=spreadsheets(id,title,properties(title,createdTime,modifiedTime),sheets(properties(sheetId,title)))&pageSize=${Math.min(limit, 100)}&orderBy=modifiedTime desc`;
  const res = await fetchWithRetry({ url, headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: {}, error: `Google Sheets returned HTTP ${res.status}` };
  return { success: true, data: await res.json(), count: 0, metadata: { provider: 'google-sheets' } };
}

async function getGoogleSheetValues(accessToken: string, spreadsheetId: string, range: string, limit = 100): Promise<FetcherResult> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range.replace(':', '!'))}?alt=json&maxResults=${Math.min(limit, 100)}`;
  const res = await fetchWithRetry({ url, headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: {}, error: `Google Sheets values returned HTTP ${res.status}` };
  return { success: true, data: await res.json(), count: 0, metadata: { provider: 'google-sheets' } };
}
