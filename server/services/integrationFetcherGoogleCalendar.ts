// server/services/integrationFetcherGoogleCalendar.ts
//
// Google Calendar: upcoming events from the primary calendar.

import { fetchWithRetry, sanitize } from './integrationFetcherUtils.js';
import type { FetcherResult, FetchOptions } from './integrationFetcher.service.js';

export async function fetchGoogleCalendar(credentials: Record<string, string>, options: FetchOptions): Promise<FetcherResult> {
  const accessToken = credentials.accessToken;
  if (!accessToken) {
    return { success: false, data: [], count: 0, metadata: options.metadata || {}, error: 'No Calendar OAuth access token' };
  }
  const { cursor, limit = 100 } = options;
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=${Math.min(limit, 100)}&pageToken=${encodeURIComponent(cursor || '')}`;
  const res = await fetchWithRetry({ url, headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: {}, error: `Google Calendar returned HTTP ${res.status}` };
  const json: any = await res.json();
  const items = (json.items || []).map((e) => sanitize({
    id: e.id,
    title: e.summary || 'Untitled event',
    start: e.start?.dateTime || e.start?.date || null,
    end: e.end?.dateTime || e.end?.date || null,
    location: e.location || null,
    status: e.status || null,
    htmlLink: e.htmlLink || null,
  }));
  return {
    success: true,
    data: items,
    count: items.length,
    metadata: { provider: 'google-calendar', calendar: 'primary' },
    nextCursor: json.nextPageToken || null,
  };
}
