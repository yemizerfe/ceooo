// server/services/integrationFetcherMonday.ts
//
// Monday.com: boards, items, and workspaces. The Monday API is a single base
// URL (https://api.monday.com/v2) with cursor/limit pagination.

import { fetchWithRetry, sanitize } from './integrationFetcherUtils.js';
import type { FetcherResult, FetchOptions } from './integrationFetcher.service.js';

export async function fetchMonday(credentials: Record<string, string>, options: FetchOptions): Promise<FetcherResult> {
  const accessToken = credentials.accessToken;
  if (!accessToken) {
    return { success: false, data: [], count: 0, metadata: options.metadata || {}, error: 'No Monday.com API token' };
  }
  const { dataType = 'boards', limit = 100 } = options;
  if (dataType === 'boards') return mondayBoards(accessToken, limit);
  if (dataType === 'items') return mondayItems(accessToken, options.spreadsheetId, limit);
  return {
    success: false,
    data: [],
    count: 0,
    metadata: { provider: 'monday', dataType },
    error: `Unsupported Monday.com dataType "${dataType}". Use boards or items.`,
  };
}

async function mondayBoards(accessToken: string, limit = 100): Promise<FetcherResult> {
  const query = `query { boards(limit: ${Math.min(Math.max(limit, 1), 100)}) { id name description } }`;
  const res = await fetchWithRetry({
    url: 'https://api.monday.com/v2',
    method: 'POST',
    headers: { Authorization: accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: {}, error: `Monday.com returned HTTP ${res.status}` };
  const json: any = await res.json();
  if (json.errors?.length) {
    return { success: false, data: [], count: 0, metadata: { provider: 'monday' }, error: 'Monday.com rejected the boards query. Check the app permissions.' };
  }
  const boards = (json.data?.boards || []).map((b) => sanitize({ id: b.id, name: b.name, description: b.description || null }));
  return { success: true, data: boards, count: boards.length, metadata: { provider: 'monday' }, nextCursor: null };
}

async function mondayItems(accessToken: string, boardId?: string | null, limit = 100): Promise<FetcherResult> {
  if (!boardId) {
    return {
      success: false,
      data: [],
      count: 0,
      metadata: { provider: 'monday', dataType: 'items' },
      error: 'A Monday.com board ID is required to fetch items.',
    };
  }
  const query = `query { boards(ids: [${JSON.stringify(boardId)}]) { items_page(limit: ${Math.min(Math.max(limit, 1), 100)}) { items { id name } } } }`;
  const res = await fetchWithRetry({
    url: 'https://api.monday.com/v2',
    method: 'POST',
    headers: { Authorization: accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: {}, error: `Monday.com returned HTTP ${res.status}` };
  const json: any = await res.json();
  if (json.errors?.length) {
    return { success: false, data: [], count: 0, metadata: { provider: 'monday' }, error: 'Monday.com rejected the items query. Check the app permissions and board ID.' };
  }
  const items = (json.data?.boards?.[0]?.items_page?.items || []).map((i) => sanitize({ id: i.id, name: i.name || null }));
  return { success: true, data: items, count: items.length, metadata: { provider: 'monday' }, nextCursor: null };
}
