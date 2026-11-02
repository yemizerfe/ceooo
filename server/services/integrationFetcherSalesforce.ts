// server/services/integrationFetcherSalesforce.ts
//
// Salesforce: contacts, accounts, and opportunities via the standard REST API.
// The OAuth access token is a session id; the REST base URL comes from the
// token response's instance_url (stored in the connection metadata).

import { fetchWithRetry, sanitize } from './integrationFetcherUtils.js';
import type { FetcherResult, FetchOptions } from './integrationFetcher.service.js';

export async function fetchSalesforce(credentials: Record<string, string>, options: FetchOptions): Promise<FetcherResult> {
  const sessionId = credentials.accessToken;
  const instanceUrl = credentials.instanceUrl;
  if (!sessionId) {
    return { success: false, data: [], count: 0, metadata: options.metadata || {}, error: 'No Salesforce OAuth session id' };
  }
  if (!instanceUrl) {
    return { success: false, data: [], count: 0, metadata: options.metadata || {}, error: 'Salesforce instance URL is not available. Reconnect the integration.' };
  }
  const version = process.env.SALESFORCE_API_VERSION || 'v62.0';
  const queries: Array<{ key: string; q: string }> = [
    { key: 'contacts', q: 'SELECT Id,Name,Email,Phone,AccountId,Title FROM Contact ORDER BY CreatedDate DESC LIMIT 100' },
    { key: 'accounts', q: 'SELECT Id,Name,Type,Rating FROM Account ORDER BY CreatedDate DESC LIMIT 100' },
    { key: 'opportunities', q: 'SELECT Id,Name,AccountId,Amount,StageName,CloseDate FROM Opportunity ORDER BY CreatedDate DESC LIMIT 100' },
  ];
  const results: Record<string, unknown[]> = {};
  for (const q of queries) {
    const res = await fetchWithRetry({ url: `${instanceUrl}/services/data/${version}/query?q=${encodeURIComponent(q.q)}`, headers: { Authorization: `Bearer ${sessionId}`, Accept: 'application/json' } });
    if (!res.ok) return { success: false, data: [], count: 0, metadata: { provider: 'salesforce', version }, error: `Salesforce returned HTTP ${res.status}` };
    const json: any = await res.json();
    const records = Array.isArray(json.records) ? json.records : [];
    results[q.key] = records.map((r: Record<string, unknown>) => sanitize({ id: r.Id, name: r.Name, email: r.Email || null, phone: r.Phone || null, accountId: r.AccountId || null, title: r.Title || null }));
  }
  let total = 0;
  for (const k of Object.keys(results)) total += Array.isArray(results[k]) ? results[k].length : 0;
  return {
    success: true,
    data: results,
    count: total,
    metadata: { provider: 'salesforce', version, instanceUrl },
    nextCursor: null,
  };
}
