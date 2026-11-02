// server/services/integrationFetcherQuickBooks.ts
//
// QuickBooks: company metadata, customers, invoices, and a financial summary.
// OAuth access token + company realm; read-only QBO endpoints.

import { fetchWithRetry, sanitize } from './integrationFetcherUtils.js';
import type { FetcherResult, FetchOptions } from './integrationFetcher.service.js';

export async function fetchQuickBooks(credentials: Record<string, string>, options: FetchOptions): Promise<FetcherResult> {
  const accessToken = credentials.accessToken;
  if (!accessToken) {
    return { success: false, data: [], count: 0, metadata: options.metadata || {}, error: 'No QuickBooks OAuth access token' };
  }
  const { dataType = 'dashboard', limit = 100 } = options;
  const realm = credentials.realmId || credentials.realm_id;
  const base = realm ? `https://quickbooks.accounting.intuit.com/v3/company/${encodeURIComponent(realm)}` : null;
  if (!base) {
    return { success: false, data: [], count: 0, metadata: { provider: 'quickbooks' }, error: 'QuickBooks company realm not available. Reconnect to retrieve the company id.' };
  }
  if (dataType === 'company') {
    return quickBooksCompany(base, accessToken);
  }
  if (dataType === 'customers') return quickBooksQuery(base, accessToken, 'SELECT Id,GivenName,LastName,DisplayName,Email,PrimaryPhone,Balance FROM Customer ORDER BY GivenName LIMIT 100');
  if (dataType === 'invoices') return quickBooksQuery(base, accessToken, 'SELECT Id,DocNumber,CustomerRef,TotalAmt,Balance,PaymentDueDate FROM Invoice ORDER BY TxnDate DESC LIMIT 100');
  // default: quick financial dashboard
  const [customersRes, invoicesRes] = await Promise.all([quickBooksQuery(base, accessToken, 'SELECT Id,GivenName,LastName,DisplayName,Email,PrimaryPhone,Balance,Sum(Amount) AS Total FROM Transaction GROUP BY GivenName LIMIT 100'), quickBooksQuery(base, accessToken, 'SELECT Id,CustomerRef,TotalAmt,Balance,PaymentDueDate FROM Invoice ORDER BY TxnDate DESC LIMIT 50')]);
  const customersData = (customersRes?.data ?? []) as Record<string, unknown>[];
  const invoicesData = (invoicesRes?.data ?? []) as Record<string, unknown>[];
  return {
    success: true,
    data: {
      customers: customersData,
      invoices: invoicesData,
      totalInvoices: invoicesData.length,
      totalBalance: invoicesData.reduce((s: number, i: Record<string, unknown>) => s + (Number(i.Balance || 0)), 0),
      totalCustomers: customersData.length,
    },
    count: invoicesData.length + customersData.length,
    metadata: { provider: 'quickbooks', realm },
    nextCursor: null,
  };
}

async function quickBooksCompany(base: string, accessToken: string): Promise<FetcherResult> {
  const res = await fetchWithRetry({ url: `${base}/company?minorversion=75`, headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: {}, error: `QuickBooks returned HTTP ${res.status}` };
  return { success: true, data: await res.json(), count: 0, metadata: { provider: 'quickbooks' } };
}

async function quickBooksQuery(base: string, accessToken: string, query: string): Promise<FetcherResult> {
  const res = await fetchWithRetry({ url: `${base}/Query?query=${encodeURIComponent(query)}&minorversion=75`, headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: {}, error: `QuickBooks query returned HTTP ${res.status}` };
  const json: any = await res.json();
  const items = Array.isArray(json.QueryResponse) ? json.QueryResponse : [];
  for (const item of items) {
    if (item.Errors) {
      return { success: false, data: [], count: 0, metadata: {}, error: `QuickBooks query error: ${(item.Errors as Record<string, unknown>[])[0]?.Message || 'unknown'}` };
    }
  }
  return { success: true, data: items.map((i: Record<string, unknown>) => sanitize({ id: i.Id, name: (i.DisplayName || i.GivenName || '') as string, email: (i.Email || null) as string | null, balance: Number(i.Balance || 0), amount: Number((i.TotalAmt || 0)) })), count: items.length, metadata: { provider: 'quickbooks' } };
}
