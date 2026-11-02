// Trello: boards and cards, accessed with a server-side API key and token.

import { fetchWithRetry, sanitize } from './integrationFetcherUtils.js';
import type { FetcherResult, FetchOptions } from './integrationFetcher.service.js';

export async function fetchTrello(
  credentials: Record<string, string>,
  options: FetchOptions,
): Promise<FetcherResult> {
  // OAuth 1.0a connections store the long-lived user token as the access
  // token; the app key is public and is kept with the connection metadata.
  const apiKey = credentials.apiKey || process.env.TRELLO_CLIENT_ID || '';
  const token = credentials.token || credentials.accessToken;
  if (!apiKey || !token) {
    return {
      success: false,
      data: [],
      count: 0,
      metadata: options.metadata || {},
      error: 'Missing Trello app key or user token. Reconnect the integration.',
    };
  }

  const dataType = options.dataType || 'boards';
  const params = new URLSearchParams({ key: apiKey, token });
  if (dataType === 'cards') {
    const boardId = options.spreadsheetId;
    if (!boardId) {
      return {
        success: false,
        data: [],
        count: 0,
        metadata: { provider: 'trello', dataType },
        error: 'A Trello board ID is required to fetch cards.',
      };
    }
    params.set('fields', 'id,name,desc,due,idList,closed,url');
    return fetchTrelloItems(
      `https://api.trello.com/1/boards/${encodeURIComponent(boardId)}/cards?${params}`,
      dataType,
    );
  }

  if (dataType !== 'boards') {
    return {
      success: false,
      data: [],
      count: 0,
      metadata: { provider: 'trello', dataType },
      error: `Unsupported Trello data type "${dataType}". Use boards or cards.`,
    };
  }

  params.set('fields', 'id,name,desc,url,closed,dateLastActivity');
  params.set('filter', 'open');
  return fetchTrelloItems(`https://api.trello.com/1/members/me/boards?${params}`, dataType);
}

async function fetchTrelloItems(url: string, dataType: string): Promise<FetcherResult> {
  const res = await fetchWithRetry({ url, headers: { Accept: 'application/json' } });
  if (!res.ok) {
    return {
      success: false,
      data: [],
      count: 0,
      metadata: { provider: 'trello', dataType },
      error: `Trello returned HTTP ${res.status}`,
    };
  }

  const json: any = await res.json();
  if (!Array.isArray(json)) {
    return {
      success: false,
      data: [],
      count: 0,
      metadata: { provider: 'trello', dataType },
      error: 'Trello returned an unexpected response.',
    };
  }

  const items = json.map((item) => sanitize(item));
  return {
    success: true,
    data: items,
    count: items.length,
    metadata: { provider: 'trello', dataType },
    nextCursor: null,
  };
}
