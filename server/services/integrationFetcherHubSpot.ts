// server/services/integrationFetcherHubSpot.ts
//
// HubSpot: contacts, deals, and a sales pipeline summary. Uses HubSpot's
// v3 CRM objects API with pagination.

import { fetchWithRetry, sanitize } from './integrationFetcherUtils.js';
import type { FetcherResult, FetchOptions } from './integrationFetcher.service.js';

export async function fetchHubSpot(credentials: Record<string, string>, options: FetchOptions): Promise<FetcherResult> {
  const accessToken = credentials.accessToken;
  if (!accessToken) {
    return { success: false, data: [], count: 0, metadata: options.metadata || {}, error: 'No HubSpot OAuth access token' };
  }
  const { dataType = 'pipeline', limit = 100 } = options;
  if (dataType === 'contacts') return hubSpotContacts(accessToken, limit);
  if (dataType === 'deals') return hubSpotDeals(accessToken, limit);
  // default: pipeline summary (deal stages + counts + total amount for open deals)
  return hubSpotPipelineSummary(accessToken);
}

async function hubSpotContacts(accessToken: string, limit = 100): Promise<FetcherResult> {
  const url = `https://api.hubapi.com/crm/v3/objects/contacts?limit=${Math.min(limit, 100)}&properties=email,firstname,lastname,company,hs_last_stage_changed_at&archived=false&properties=json`;
  const res = await fetchWithRetry({ url, headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: {}, error: `HubSpot contacts returned HTTP ${res.status}` };
  const json: any = await res.json();
  const items = (json.results || []).map((r) => sanitize({ id: r.id, email: (r.properties?.email as string) || null, firstname: (r.properties?.firstname as string) || null, lastname: (r.properties?.lastname as string) || null, company: (r.properties?.company as string) || null }));
  return { success: true, data: items, count: items.length, metadata: { provider: 'hubspot' }, nextCursor: null };
}

async function hubSpotDeals(accessToken: string, limit = 100): Promise<FetcherResult> {
  const url = `https://api.hubapi.com/crm/v3/objects/deals?limit=${Math.min(limit, 100)}&properties=dealname,amount,stageLabel,closedate&archived=false&properties=json`;
  const res = await fetchWithRetry({ url, headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: {}, error: `HubSpot deals returned HTTP ${res.status}` };
  const json: any = await res.json();
  const items = (json.results || []).map((r) => sanitize({ id: r.id, dealname: (r.properties?.dealname as string) || null, amount: Number((r.properties?.amount as string) || 0), stageLabel: (r.properties?.stageLabel as string) || null, closedate: (r.properties?.closedate as string) || null }));
  return { success: true, data: items, count: items.length, metadata: { provider: 'hubspot' }, nextCursor: null };
}

async function hubSpotPipelineSummary(accessToken: string): Promise<FetcherResult> {
  // Aggregate the first page of open deals by stage to present a pipeline summary.
  const deals = await hubSpotDeals(accessToken, 100);
  if (!deals.success) return deals;
  const stages: Record<string, number> = {};
  let openAmount = 0;
  for (const d of deals.data) {
    const stage = d.stageLabel || 'Unknown';
    stages[stage] = (stages[stage] || 0) + 1;
    if (d.amount && d.amount > 0) openAmount += d.amount;
  }
  return {
    success: true,
    data: { stages, openAmount, totalDeals: deals.data.length, currency: 'USD' },
    count: 0,
    metadata: { provider: 'hubspot', dataType: 'pipeline' },
    nextCursor: null,
  };
}
