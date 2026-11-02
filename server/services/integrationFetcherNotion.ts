// server/services/integrationFetcherNotion.ts
//
// Notion: workspaces, pages, and databases. The Notion API requires the
// Notion-Version header (2022-06-28) and a bearer token returned by its OAuth
// flow.

import { fetchWithRetry, sanitize } from './integrationFetcherUtils.js';
import type { FetcherResult, FetchOptions } from './integrationFetcher.service.js';

export async function fetchNotion(credentials: Record<string, string>, options: FetchOptions): Promise<FetcherResult> {
  const accessToken = credentials.accessToken;
  if (!accessToken) {
    return { success: false, data: [], count: 0, metadata: options.metadata || {}, error: 'No Notion OAuth access token' };
  }
  const { dataType = 'search', cursor, limit = 100 } = options;
  if (dataType === 'search' || dataType === 'pages') {
    return notionSearch(accessToken, cursor, limit);
  }
  if (dataType === 'databases') {
    return notionDatabases(accessToken, cursor, limit);
  }
  return {
    success: false,
    data: [],
    count: 0,
    metadata: { provider: 'notion', dataType },
    error: `Unsupported Notion dataType "${dataType}". Use search or databases.`,
  };
}

async function notionSearch(accessToken: string, cursor: string | null, limit = 100): Promise<FetcherResult> {
  const url = `https://api.notion.com/v1/search?page_size=${Math.min(limit, 100)}${cursor ? `&start_cursor=${encodeURIComponent(cursor)}` : ''}`;
  const res = await fetchWithRetry({ url, headers: { Authorization: `Bearer ${accessToken}`, 'Notion-Version': '2022-06-28' } });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: {}, error: `Notion search returned HTTP ${res.status}` };
  const json: any = await res.json();
  const items = (json.results || []).map((r) => {
    const properties = (r.properties || {}) as Record<string, any>;
    const titleProperty = Object.values(properties).find((p: any) => p?.type === 'title');
    const title =
      (titleProperty as any)?.title?.map((t: any) => t?.plain_text).filter(Boolean).join('') ||
      r.child_page?.title ||
      r.title ||
      null;
    const obj = { id: r.id, object: r.object, title, url: r.url || null, created_time: r.created_time, last_edited_time: r.last_edited_time, icon: r.icon || null, cover: r.cover || null, databaseId: null, parentPageId: null };
    if (r.parent?.type === 'database') obj.databaseId = r.parent.database_id;
    if (r.parent?.type === 'page') obj.parentPageId = r.parent.page_id;
    return sanitize(obj);
  });
  return {
    success: true,
    data: items,
    count: items.length,
    metadata: { provider: 'notion' },
    nextCursor: json.next_cursor || null,
  };
}

async function notionDatabases(accessToken: string, cursor: string | null, limit = 100): Promise<FetcherResult> {
  const url = `https://api.notion.com/v1/search?page_size=${Math.min(limit, 100)}&filter={property:object,value:database}${cursor ? `&start_cursor=${encodeURIComponent(cursor)}` : ''}`;
  const res = await fetchWithRetry({ url, headers: { Authorization: `Bearer ${accessToken}`, 'Notion-Version': '2022-06-28' } });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: {}, error: `Notion databases returned HTTP ${res.status}` };
  const json: any = await res.json();
  const items = (json.results || []).map((r) => sanitize({ id: r.id, title: (((r.properties as any) && (Object.entries(r.properties as any)[0]?.[1] as any)?.title?.rich_text) || [])[0]?.plain_text || (r as any).title || null, parent: r.parent, url: r.url || null }));
  return {
    success: true,
    data: items,
    count: items.length,
    metadata: { provider: 'notion' },
    nextCursor: json.next_cursor || null,
  };
}
