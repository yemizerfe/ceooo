// server/services/integrationFetcherGitHub.ts
//
// GitHub: repositories, issues, and pull requests for the authorized user.
// Respects rate limits and returns paginated results.

import { fetchWithRetry, sanitize } from './integrationFetcherUtils.js';
import type { FetcherResult, FetchOptions } from './integrationFetcher.service.js';

export async function fetchGitHub(credentials: Record<string, string>, options: FetchOptions): Promise<FetcherResult> {
  const token = credentials.accessToken;
  if (!token) {
    return { success: false, data: [], count: 0, metadata: options.metadata || {}, error: 'No GitHub OAuth access token' };
  }
  const { dataType = 'repos', cursor, limit = 100 } = options;
  if (dataType === 'repos') return listGitHubRepos(token, cursor, limit);
  if (dataType === 'issues') return listGitHubIssues(token, cursor, limit);
  if (dataType === 'pulls') return listGitHubPulls(token, cursor, limit);
  return {
    success: false,
    data: [],
    count: 0,
    metadata: { provider: 'github', dataType },
    error: `Unsupported GitHub dataType "${dataType}". Use repos, issues, or pulls.`,
  };
}

async function listGitHubRepos(token: string, cursor: string | null, limit = 100): Promise<FetcherResult> {
  const page = cursor ? Math.max(Number(cursor), 1) : 1;
  const url = `https://api.github.com/user/repos?per_page=${Math.min(limit, 100)}&sort=updated&direction=desc&page=${page}`;
  const res = await fetchWithRetry({ url, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: {}, error: `GitHub returned HTTP ${res.status}` };
  const json: any = await res.json();
  const items = Array.isArray(json) ? json : [];
  return {
    success: true,
    data: items.map((r) => sanitize({ name: r.name, full_name: r.full_name, description: r.description || null, private: r.private, html_url: r.html_url, language: r.language || null, updated_at: r.updated_at })),
    count: items.length,
    metadata: { provider: 'github', page },
    nextCursor: String(page + 1),
  };
}

async function listGitHubIssues(token: string, cursor: string | null, limit = 100): Promise<FetcherResult> {
  const page = cursor ? Math.max(Number(cursor), 1) : 1;
  const url = `https://api.github.com/user/issues?state=all&per_page=${Math.min(limit, 100)}&page=${page}`;
  const res = await fetchWithRetry({ url, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: {}, error: `GitHub returned HTTP ${res.status}` };
  const json: any = await res.json();
  const items = Array.isArray(json) ? json : [];
  return {
    success: true,
    data: items.map((r) => sanitize({ id: r.id, title: r.title, state: r.state, assignee: r.assignee?.login || null, html_url: r.html_url, labels: (r.labels || []).map((l) => l.name), repo: typeof r.repository_url === 'string' ? r.repository_url.split('/').slice(-2).join('/') : null, updated_at: r.updated_at || null })),
    count: items.length,
    metadata: { provider: 'github', page },
    nextCursor: String(page + 1),
  };
}

async function listGitHubPulls(token: string, cursor: string | null, limit = 100): Promise<FetcherResult> {
  const page = cursor ? Math.max(Number(cursor), 1) : 1;
  const url = `https://api.github.com/user/pulls?state=open&per_page=${Math.min(limit, 100)}&page=${page}`;
  const res = await fetchWithRetry({ url, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: {}, error: `GitHub returned HTTP ${res.status}` };
  const json: any = await res.json();
  const items = Array.isArray(json) ? json : [];
  return {
    success: true,
    data: items.map((r) => sanitize({ id: r.id, title: r.title, state: r.state, assignee: r.assignee?.login || null, html_url: r.html_url, head: r.head?.ref || null, repo: r.base?.repo?.full_name || null, updated_at: r.updated_at || null })),
    count: items.length,
    metadata: { provider: 'github', page },
    nextCursor: String(page + 1),
  };
}
