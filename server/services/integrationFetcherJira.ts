// server/services/integrationFetcherJira.ts
//
// Jira: projects, issues, and activity. Supports the classic API (Basic auth:
// email + API token) and Atlassian OAuth 2.0 (Bearer access token).

import { fetchWithRetry, sanitize } from './integrationFetcherUtils.js';
import type { FetcherResult, FetchOptions } from './integrationFetcher.service.js';

export async function fetchJira(credentials: Record<string, string>, options: FetchOptions): Promise<FetcherResult> {
  const baseUrl = credentials.baseUrl;
  const email = credentials.email;
  const apiToken = credentials.apiToken;
  const accessToken = credentials.accessToken;
  const cloudId = credentials.cloudId;
  const oauthConnected = Boolean(accessToken && cloudId);
  if (!oauthConnected && (!baseUrl || !email || !apiToken)) {
    return { success: false, data: [], count: 0, metadata: options.metadata || {}, error: 'Missing Jira baseUrl, email, or apiToken. Reconnect the integration.' };
  }
  const { dataType = 'projects', cursor, limit = 100 } = options;
  const apiBaseUrl = oauthConnected
    ? `https://api.atlassian.com/ex/jira/${encodeURIComponent(cloudId!)}`
    : baseUrl!.replace(/\/+$/, '');
  const authorization = oauthConnected
    ? `Bearer ${accessToken}`
    : `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`;
  if (dataType === 'projects') return jiraProjects(apiBaseUrl, authorization, limit);
  if (dataType === 'issues') return jiraIssues(apiBaseUrl, authorization, cursor, limit);
  return {
    success: true,
    data: [],
    count: 0,
    metadata: { provider: 'jira', dataType },
  };
}

async function jiraProjects(baseUrl: string, authorization: string, limit = 100): Promise<FetcherResult> {
  const res = await fetchWithRetry({
    url: `${baseUrl}/rest/api/3/project/search?maxResults=${Math.min(limit, 100)}&startAt=0`,
    headers: { Authorization: authorization, Accept: 'application/json' },
  });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: { provider: 'jira' }, error: `Jira projects returned HTTP ${res.status}` };
  const json: any = await res.json();
  const projects = (json.values || json.projects || []).map((p) => sanitize({ id: p.id, key: p.key, name: p.name, projectTypeKey: p.projectTypeKey || null, status: p.self ? 'active' : null }));
  return { success: true, data: projects, count: projects.length, metadata: { provider: 'jira' }, nextCursor: null };
}

async function jiraIssues(baseUrl: string, authorization: string, cursor: string | null, limit = 100): Promise<FetcherResult> {
  const page = cursor ? Math.max(Number(cursor), 0) : 0;
  const jql = 'assignee=currentUser() AND status NOT IN (Closed, Done) ORDER BY priority DESC, created ASC';
  const res = await fetchWithRetry({ url: `${baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=${Math.min(limit, 100)}&startAt=${page}`, headers: { Authorization: authorization, Accept: 'application/json' } });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: { provider: 'jira' }, error: `Jira issues returned HTTP ${res.status}` };
  const json: any = await res.json();
  const issues = (json.issues || []).map((i) => {
    const fields = i.fields as Record<string, unknown> || {};
    return sanitize({ id: i.id, key: i.key, summary: fields.summary || null, status: (fields.status as Record<string, unknown>)?.name || null, assignee: (fields.assignee as Record<string, unknown>)?.displayName || null, type: (fields.issuetype as Record<string, unknown>)?.name || null, priority: (fields.priority as Record<string, unknown>)?.name || null, estimate: fields.timeestimate ?? null, project: (fields.project as Record<string, unknown>)?.key || (fields.project as Record<string, unknown>)?.name || null, dueDate: fields.duedate || null, updated: fields.updated || null });
  });
  return {
    success: true,
    data: issues,
    count: issues.length,
    metadata: { provider: 'jira', page },
    nextCursor: String(page + 1),
  };
}
