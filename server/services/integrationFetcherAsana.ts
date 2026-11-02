// server/services/integrationFetcherAsana.ts
//
// Asana: workspaces, projects, and tasks. Offset-based pagination.

import { fetchWithRetry, sanitize } from './integrationFetcherUtils.js';
import type { FetcherResult, FetchOptions } from './integrationFetcher.service.js';

export async function fetchAsana(credentials: Record<string, string>, options: FetchOptions): Promise<FetcherResult> {
  const accessToken = credentials.accessToken;
  if (!accessToken) {
    return { success: false, data: [], count: 0, metadata: options.metadata || {}, error: 'No Asana access token' };
  }
  const { dataType = 'workspaces', limit = 100 } = options;
  if (dataType === 'workspaces') return asanaWorkspaces(accessToken, limit);
  if (dataType === 'projects') return asanaProjects(accessToken, limit);
  if (dataType === 'tasks') return asanaTasks(accessToken, limit);
  return {
    success: false,
    data: [],
    count: 0,
    metadata: { provider: 'asana', dataType },
    error: `Unsupported Asana dataType "${dataType}". Use workspaces, projects, or tasks.`,
  };
}

async function asanaWorkspaces(accessToken: string, limit = 100): Promise<FetcherResult> {
  const res = await fetchWithRetry({ url: 'https://app.asana.com/api/1.0/workspaces', headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: {}, error: `Asana returned HTTP ${res.status}` };
  const json: any = await res.json();
  const items = (json.data || []).map((w) => sanitize({ id: w.id, name: w.name, is_organization: w.is_organization }));
  return { success: true, data: items, count: items.length, metadata: { provider: 'asana' }, nextCursor: null };
}

async function asanaProjects(accessToken: string, limit = 100): Promise<FetcherResult> {
  const res = await fetchWithRetry({ url: `https://app.asana.com/api/1.0/projects?limit=${Math.min(limit, 100)}`, headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: {}, error: `Asana returned HTTP ${res.status}` };
  const json: any = await res.json();
  const items = (json.data || []).map((p) => sanitize({ id: p.id, name: p.name, workspace: p.workspace?.name || null, num_members: p.num_members ?? 0, completed: p.completed ?? false }));
  return { success: true, data: items, count: items.length, metadata: { provider: 'asana' }, nextCursor: null };
}

async function asanaTasks(accessToken: string, limit = 100): Promise<FetcherResult> {
  const res = await fetchWithRetry({ url: `https://app.asana.com/api/1.0/tasks?limit=${Math.min(limit, 100)}&opt_expand=tasks.project,name,assignee`, headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: {}, error: `Asana returned HTTP ${res.status}` };
  const json: any = await res.json();
  const items = (json.data || []).map((t) => sanitize({ id: t.id, name: t.name || null, completed: t.completed ?? false, project: (t.project as Record<string, unknown>)?.name || null, assignee: (t.assignee as Record<string, unknown>)?.name || null, due_on: t.due_on || null }));
  return { success: true, data: items, count: items.length, metadata: { provider: 'asana' }, nextCursor: null };
}
