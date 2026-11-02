// server/services/integrationFetcherStripe.ts
//
// Stripe: payment history, customers, and revenue trends (test mode first).
// Read-only; no live payments or refunds are initiated.

import { fetchWithRetry, sanitize } from './integrationFetcherUtils.js';
import type { FetcherResult, FetchOptions } from './integrationFetcher.service.js';

export async function fetchStripe(credentials: Record<string, string>, options: FetchOptions): Promise<FetcherResult> {
  // Stripe Connect returns an account-scoped secret key for the OAuth flow;
  // the stored `secretKey` field is the fallback for older connections.
  const secretKey = credentials.accessToken || credentials.secretKey;
  if (!secretKey) {
    return { success: false, data: [], count: 0, metadata: options.metadata || {}, error: 'No Stripe access token' };
  }
  const { dataType = 'revenue', limit = 100 } = options;
  if (dataType === 'charges') return stripeCharges(secretKey, limit);
  if (dataType === 'customers') return stripeCustomers(secretKey, limit);
  if (dataType === 'paymentMethods') return stripePaymentMethods(secretKey, limit);
  // default: revenue dashboard
  const [chargesRes, customersRes] = await Promise.all([stripeCharges(secretKey, Math.min(limit, 100)), stripeCustomers(secretKey, Math.min(limit, 100))]);
  const charges = chargesRes.data;
  const customers = customersRes.data;
  const revenue = charges.reduce((s: number, c: Record<string, unknown>) => s + Number(c.amount || 0), 0);
  return {
    success: true,
    data: { charges, customers, revenue, refundTotal: 0, feeTotal: 0, count: charges.length + customers.length },
    count: charges.length + customers.length,
    metadata: { provider: 'stripe' },
    nextCursor: null,
  };
}

async function stripeCharges(secretKey: string, limit = 100): Promise<FetcherResult> {
  const res = await fetchWithRetry({ url: `https://api.stripe.com/v1/charges?limit=${Math.min(limit, 100)}`, headers: { Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}` } });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: {}, error: `Stripe returned HTTP ${res.status}` };
  const json: any = await res.json();
  const items = (json.data || []).map((c) => sanitize({ id: c.id, amount: Number(c.amount || 0), currency: c.currency || null, status: c.status || null, customer: c.customer?.id || null, description: c.description || null, createdAt: c.created ? new Date(Number(c.created) * 1000).toISOString() : null }));
  return { success: true, data: items, count: items.length, metadata: { provider: 'stripe' }, nextCursor: null };
}

async function stripeCustomers(secretKey: string, limit = 100): Promise<FetcherResult> {
  const res = await fetchWithRetry({ url: `https://api.stripe.com/v1/customers?limit=${Math.min(limit, 100)}`, headers: { Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}` } });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: {}, error: `Stripe returned HTTP ${res.status}` };
  const json: any = await res.json();
  const items = (json.data || []).map((c) => sanitize({ id: c.id, email: c.email || null, name: c.name || null, phone: c.phone || null, createdAt: c.created ? new Date(Number(c.created) * 1000).toISOString() : null }));
  return { success: true, data: items, count: items.length, metadata: { provider: 'stripe' }, nextCursor: null };
}

async function stripePaymentMethods(secretKey: string, limit = 100): Promise<FetcherResult> {
  const res = await fetchWithRetry({ url: `https://api.stripe.com/v1/payment_methods?limit=${Math.min(limit, 100)}`, headers: { Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}` } });
  if (!res.ok) return { success: false, data: [], count: 0, metadata: {}, error: `Stripe returned HTTP ${res.status}` };
  const json: any = await res.json();
  const items = (json.data || []).map((p) => sanitize({ id: p.id, type: p.type || null, billingDetails: p.billing_details ? JSON.parse(JSON.stringify(p.billing_details)) : null }));
  return { success: true, data: items, count: items.length, metadata: { provider: 'stripe' }, nextCursor: null };
}
