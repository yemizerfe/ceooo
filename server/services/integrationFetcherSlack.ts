// server/services/integrationFetcherSlack.ts
//
// Slack: workspace identity, channels, and users for a connected team. Read-
// only scopes by default; channels.read + chat:write when granted.

import { fetchWithRetry, sanitize } from './integrationFetcherUtils.js';
import type { FetcherResult, FetchOptions } from './integrationFetcher.service.js';

export async function fetchSlack(credentials: Record<string, string>, options: FetchOptions): Promise<FetcherResult> {
  // OAuth installs store the workspace bot token as the connection's access
  // token; older API-key style rows carry it as `botToken`.
  const botToken = credentials.botToken || credentials.accessToken || '';
  if (!botToken) {
    return { success: false, data: [], count: 0, metadata: options.metadata || {}, error: 'No Slack bot token' };
  }
  const { dataType = 'channels', cursor, limit = 200 } = options;
  if (dataType === 'channels') return slackChannels(botToken, cursor, limit);
  if (dataType === 'users') return slackUsers(botToken, limit);
  return {
    success: false,
    data: [],
    count: 0,
    metadata: { provider: 'slack', dataType },
    error: `Unsupported Slack dataType "${dataType}". Use channels or users.`,
  };
}

async function slackChannels(botToken: string, cursor: string | null, limit = 200): Promise<FetcherResult> {
  const url = `https://slack.com/api/conversations.list?types=public_channel&limit=${Math.min(limit, 200)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
  const res = await fetchWithRetry({ url, headers: { Authorization: `Bearer ${botToken}` } });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: {}, error: `Slack returned HTTP ${res.status}` };
  const json: any = await res.json();
  if (!json.ok) return { success: false, data: [], count: 0, metadata: {}, error: `Slack returned ${json.error}` };
  const items = (json.channels || []).map((c) => sanitize({ id: c.id, name: c.name, topic: c.topic?.value || null, purpose: c.purpose?.value || null, memberCount: c.num_members ?? 0 }));
  return {
    success: true,
    data: items,
    count: items.length,
    metadata: { provider: 'slack' },
    nextCursor: json.response_metadata?.next_cursor || null,
  };
}

async function slackUsers(botToken: string, limit = 200): Promise<FetcherResult> {
  const res = await fetchWithRetry({ url: `https://slack.com/api/users.list?limit=${Math.min(limit, 200)}`, headers: { Authorization: `Bearer ${botToken}` } });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: {}, error: `Slack returned HTTP ${res.status}` };
  const json: any = await res.json();
  if (!json.ok) return { success: false, data: [], count: 0, metadata: {}, error: `Slack returned ${json.error}` };
  const items = (json.members || []).map((u) => sanitize({ id: u.id, name: u.name, email: u.profile?.email || null, isAdmin: u.is_admin, isOwner: u.is_owner ?? false }));
  return { success: true, data: items, count: items.length, metadata: { provider: 'slack' }, nextCursor: null };
}
