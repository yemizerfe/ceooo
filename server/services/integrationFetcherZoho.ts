// server/services/integrationFetcherZoho.ts
//
// Zoho CRM: contacts, accounts, and deals from the multi-tenant CRM API.
// Zoho accounts live in different data centres (.com, .eu, .in, .com.au, .jp).
// The OAuth token response returns the correct base URL as `api_domain`; we
// persist it with the connection and target it here. Falling back to .com
// keeps older connections working.

import { fetchWithRetry, sanitize } from './integrationFetcherUtils.js';
import type { FetcherResult, FetchOptions } from './integrationFetcher.service.js';

const DEFAULT_ZOHO_DOMAIN = 'www.zohoapis.com';

function zohoBase(credentials: Record<string, string>): string {
  const apiDomain = (credentials.apiDomain || '').trim();
  if (!apiDomain) return `https://${DEFAULT_ZOHO_DOMAIN}/crm/v2`;
  const host = apiDomain.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  return `https://${host}/crm/v2`;
}

export async function fetchZoho(credentials: Record<string, string>, options: FetchOptions): Promise<FetcherResult> {
  const accessToken = credentials.accessToken;
  if (!accessToken) {
    return { success: false, data: [], count: 0, metadata: options.metadata || {}, error: 'No Zoho access token' };
  }
  const base = zohoBase(credentials);
  const { dataType = 'all', limit = 100 } = options;
  const fetchers: Record<string, (token: string, base: string, lim: number) => Promise<FetcherResult>> = {
    contacts: zohoContacts,
    accounts: zohoAccounts,
    deals: zohoDeals,
  };
  if (dataType in fetchers) {
    const fn = fetchers[dataType];
    return fn(accessToken, base, Math.min(limit, 200));
  }
  const [contacts, accounts, deals] = await Promise.all([
    zohoContacts(accessToken, base, Math.min(limit, 200)),
    zohoAccounts(accessToken, base, Math.min(limit, 200)),
    zohoDeals(accessToken, base, Math.min(limit, 200)),
  ]);
  return {
    success: contacts.success || accounts.success || deals.success,
    data: { contacts, accounts, deals },
    count: contacts.count + accounts.count + deals.count,
    metadata: { provider: 'zoho' },
    nextCursor: null,
    error: [contacts, accounts, deals]
      .map((r) => ('error' in r ? (r as { error?: string }).error : undefined))
      .find(Boolean),
  };
}

function zohoError(status: number, body: unknown): string {
  const code =
    body && typeof body === 'object' && 'code' in (body as Record<string, unknown>)
      ? String((body as Record<string, unknown>).code)
      : '';
  if (status === 401) return 'Zoho rejected the access token (401) — reconnect Zoho CRM';
  if (code === 'NO_PERMISSION' || code === 'INVALID_SCOPE') {
    return `Zoho denied access (${code}) — the account has no Zoho CRM module or the CRM scopes were not granted`;
  }
  return `Zoho returned HTTP ${status}${code ? ` (${code})` : ''}`;
}

async function zohoContacts(token: string, base: string, limit = 200): Promise<FetcherResult> {
  const res = await fetchWithRetry({ url: `${base}/contacts?limit=${Math.min(limit, 200)}&page=1`, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
  if (!res.ok) {
    const body: any = await res.json().catch(() => null);
    return { success: false, data: [], count: 0, metadata: {}, error: zohoError(res.status, body) };
  }
  const json: any = await res.json();
  const items = (json.data || []).map((r: Record<string, unknown>) => sanitize({ id: String(r.ZGId), fullName: r.FullName || null, email: r.Email || null, phone: r.Phone || null, accountId: r.AccountId || null }));
  return { success: true, data: items, count: items.length, metadata: { provider: 'zoho' }, nextCursor: json.nextPage?.page ? String(json.nextPage.page + 1) : null };
}

async function zohoAccounts(token: string, base: string, limit = 200): Promise<FetcherResult> {
  const res = await fetchWithRetry({ url: `${base}/accounts?limit=${Math.min(limit, 200)}&page=1`, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
  if (!res.ok) {
    const body: any = await res.json().catch(() => null);
    return { success: false, data: [], count: 0, metadata: {}, error: zohoError(res.status, body) };
  }
  const json: any = await res.json();
  const items = (json.data || []).map((r: Record<string, unknown>) => sanitize({ id: String(r.ZGId), name: r.Name || null, type: r.Type || null, industry: r.Industry || null, annualRevenue: Number(r.AnnualRevenue || 0) }));
  return { success: true, data: items, count: items.length, metadata: { provider: 'zoho' }, nextCursor: json.nextPage?.page ? String(json.nextPage.page + 1) : null };
}

async function zohoDeals(token: string, base: string, limit = 200): Promise<FetcherResult> {
  const res = await fetchWithRetry({ url: `${base}/deals?limit=${Math.min(limit, 200)}&page=1`, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
  if (!res.ok) {
    const body: any = await res.json().catch(() => null);
    return { success: false, data: [], count: 0, metadata: {}, error: zohoError(res.status, body) };
  }
  const json: any = await res.json();
  const items = (json.data || []).map((r: Record<string, unknown>) => sanitize({ id: String(r.ZGId), dealname: r.DealName || null, amount: Number(r.Amount || 0), stage: r.Stage || null, closedDate: r.ClosedDate || null }));
  return { success: true, data: items, count: items.length, metadata: { provider: 'zoho' }, nextCursor: json.nextPage?.page ? String(json.nextPage.page + 1) : null };
}
