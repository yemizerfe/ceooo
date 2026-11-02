// server/services/integrationFetcherPayPal.ts
//
// PayPal: transaction and reporting data. Sandbox by default; switch to live by
// setting PAYPAL_ENVIRONMENT=live (keeps sandbox and live credentials separate).

import { fetchWithRetry, sanitize, resolvePayPalBase } from './integrationFetcherUtils.js';
import type { FetcherResult, FetchOptions } from './integrationFetcher.service.js';

export async function fetchPayPal(credentials: Record<string, string>, options: FetchOptions): Promise<FetcherResult> {
  const accessToken = credentials.accessToken;
  if (!accessToken) {
    return { success: false, data: [], count: 0, metadata: options.metadata || {}, error: 'No PayPal OAuth access token' };
  }
  const base = resolvePayPalBase('sandbox');
  const { dataType = 'transactions', cursor, limit = 100 } = options;
  if (dataType === 'balance') return payPalBalanceSnapshot(accessToken, base);
  if (dataType === 'transactions') return payPalTransactions(accessToken, base, cursor, limit);
  return {
    success: false,
    data: [],
    count: 0,
    metadata: { provider: 'paypal', dataType },
    error: `Unsupported PayPal dataType "${dataType}". Use balance or transactions.`,
  };
}

async function payPalBalanceSnapshot(accessToken: string, base: string): Promise<FetcherResult> {
  const res = await fetchWithRetry({ url: `https://${base}/v1/accounting/balance-snapshot`, headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: {}, error: `PayPal returned HTTP ${res.status}` };
  const json: any = await res.json();
  const snapshot: Record<string, unknown> = { account: json.account_id || null, balance: Number(json.balance || 0), pending_balance: Number(json.pending_balance || 0), currency: json.currency || null };
  return { success: true, data: snapshot, count: 1, metadata: { provider: 'paypal' }, nextCursor: null };
}

async function payPalTransactions(accessToken: string, base: string, cursor: string | null, limit = 100): Promise<FetcherResult> {
  const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const page = cursor ? Math.max(Number(cursor), 1) : 1;
  const url = `https://${base}/v1/reporting/transactions?start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(new Date().toISOString().slice(0, 10))}&page=${page}&page_size=${Math.min(limit, 100)}`;
  const res = await fetchWithRetry({ url, headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: {}, error: `PayPal returned HTTP ${res.status}` };
  const json: any = await res.json();
  const items = (Array.isArray(json.items) ? json.items : []).map((t) => sanitize({ id: t.id, description: t.description || null, date: t.date || null, amount: Number(t.amount || 0), currency: t.currency || null, status: t.status || null, type: t.processor_response_code?.name || t.type || null }));
  return {
    success: true,
    data: items,
    count: items.length,
    metadata: { provider: 'paypal', page },
    nextCursor: String(page + 1),
  };
}
