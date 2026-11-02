// server/services/integrationSnapshot.service.ts
//
// Fetches a multi-dataType snapshot from a connected provider and normalises
// the result into a shape the AI prompts and page views can consume directly.
//
// Order of truth:
//   1. Live provider API (when credentials exist)
//   2. Data persisted by a previous sync (source = `sync:<provider>:<dataType>`)
//   3. Rows the user imported from CSV/Excel (source = `import:<provider>:<recordType>`)
//
// This means AI prompts and pages always see the newest data available, even
// when a provider is temporarily unreachable or only CSV-imported.

import { prisma } from '../lib/prisma.js';
import { loadFreshConnection } from './integrationTokens.service.js';
import { fetchProviderData } from './integrationFetcher.service.js';
import { decryptSecret, readCredentialBlob } from '../lib/crypto.js';

// Which dataTypes to pull per provider (ordered by priority)
export const PROVIDER_DATA_TYPES: Record<string, string[]> = {
  jira: ['projects', 'issues'],
  asana: ['projects', 'tasks'],
  trello: ['boards'],
  monday: ['boards'],
  github: ['repos', 'issues', 'pulls'],
  notion: ['pages'],
  hubspot: ['contacts', 'deals'],
  salesforce: ['contacts', 'opportunities', 'accounts'],
  zoho: ['contacts', 'deals', 'accounts'],
  airtable: ['bases'],
  slack: ['channels', 'users'],
  quickbooks: ['invoices', 'customers'],
  stripe: ['charges', 'customers'],
  paypal: ['transactions'],
  'google-sheets': ['spreadsheets'],
  'google-drive': ['files'],
  'google-calendar': ['events'],
  dropbox: ['files'],
};

export interface ProviderSnapshot {
  provider: string;
  accountName: string | null;
  lastSync: string | null;
  data: Record<string, any[]>; // { projects: [...], issues: [...] }
  errors: Record<string, string>;
  totalRecords: number;
  /** Where this snapshot's records came from: live API, persisted sync, or import. */
  source?: 'live' | 'stored' | 'import' | 'none';
}

/** Decrypt credentials from an IntegrationConnection row */
export function decryptConnectionCredentials(conn: any): Record<string, string> {
  const out: Record<string, string> = {};
  if (!conn) return out;
  if (conn.accessToken) out.accessToken = decryptSecret(conn.accessToken) || '';
  if (conn.refreshToken) out.refreshToken = decryptSecret(conn.refreshToken) || '';
  if (conn.encryptedCredentials) {
    Object.assign(out, readCredentialBlob(conn.encryptedCredentials));
  }
  if (conn.metadata && typeof conn.metadata === 'object') {
    const m = conn.metadata as Record<string, unknown>;
    for (const k of [
      'instanceUrl',
      'baseUrl',
      'apiDomain',
      'tenantId',
      'realmId',
      'realm_id',
      'cloudId',
      'email',
      'apiToken',
      'apiKey',
      'botToken',
      'secretKey',
      'stripeUserId',
      'clientId',
      'secret',
    ]) {
      if (typeof m[k] === 'string') out[k] = m[k] as string;
    }
  }
  return out;
}

/**
 * Provider responses are inconsistent: some return an array for a dataType,
 * some return `{ contacts: [], deals: [] }` regardless of the requested type.
 * Absorb both shapes into named buckets on the snapshot.
 */
function absorbResult(snapshot: ProviderSnapshot, requestedType: string, payload: unknown): number {
  let added = 0;
  const add = (key: string, items: unknown[]) => {
    if (!items.length) return;
    snapshot.data[key] = [...(snapshot.data[key] || []), ...items];
    added += items.length;
  };

  if (Array.isArray(payload)) {
    add(requestedType, payload);
    return added;
  }

  if (payload && typeof payload === 'object') {
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (Array.isArray(value)) add(key, value);
    }
  }
  return added;
}

/** Lower-case, separator-free view of a raw CSV/Excel row. */
function rowLookup(row: Record<string, unknown>) {
  const map = new Map<string, string>();
  for (const [key, value] of Object.entries(row)) {
    const normalized = key.toLowerCase().replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (value != null && String(value).trim()) map.set(normalized, String(value).trim());
  }
  return (...names: string[]): string | undefined => {
    for (const name of names) {
      const exact = map.get(name);
      if (exact) return exact;
      for (const [key, value] of map) {
        if (key.includes(name)) return value;
      }
    }
    return undefined;
  };
}

/** Map arbitrary CSV headers onto the canonical fields the pages and AI use. */
function normalizeImportedRows(rows: any[], recordType: string): any[] {
  return rows.map((row, index) => {
    if (!row || typeof row !== 'object') return row;
    const get = rowLookup(row as Record<string, unknown>);
    const id = get('id', 'key', 'row') || `import-${index + 1}`;

    if (recordType === 'projects') {
      return {
        ...row,
        id,
        name: get('project name', 'project', 'name', 'title', 'initiative') || `Imported project ${index + 1}`,
        status: get('status', 'state', 'phase'),
        priority: get('priority', 'importance'),
        progress: get('progress', 'percent complete', 'completion'),
        deadline: get('deadline', 'due date', 'due', 'target date', 'end date'),
        startDate: get('start date', 'start', 'kickoff'),
        description: get('description', 'notes', 'summary'),
        kind: 'external',
      };
    }
    if (recordType === 'tasks') {
      return {
        ...row,
        id,
        title: get('task', 'issue', 'task name', 'issue title', 'name', 'summary', 'subject') || `Imported task ${index + 1}`,
        status: get('status', 'state', 'stage'),
        priority: get('priority', 'severity'),
        assignedTo: get('assignee', 'owner', 'assigned to', 'responsible'),
        dueDate: get('due date', 'deadline', 'due', 'target date'),
        project: get('project', 'project name', 'board'),
        url: get('url', 'link'),
      };
    }
    if (recordType === 'deals') {
      return {
        ...row,
        id,
        name: get('deal', 'deal name', 'opportunity', 'name', 'title') || `Imported deal ${index + 1}`,
        amount: get('amount', 'value', 'deal value', 'revenue'),
        stage: get('stage', 'status', 'pipeline stage'),
        closeDate: get('close date', 'expected close', 'deadline'),
      };
    }
    if (recordType === 'invoices') {
      return {
        ...row,
        id,
        description:
          get('description', 'invoice number', 'invoice', 'name', 'customer') || `Imported invoice ${index + 1}`,
        amount: get('amount', 'total', 'invoice amount', 'balance', 'value'),
        currency: get('currency', 'currency code'),
        status: get('status', 'payment status'),
        date: get('date', 'invoice date', 'due date', 'payment due date'),
      };
    }
    return row;
  });
}

/** Group persisted rows into snapshot buckets. */
function absorbStoredRows(
  snapshot: ProviderSnapshot,
  rows: Array<{ source: string; data: any; metadata: any; receivedAt: Date }>,
) {
  for (const row of rows) {
    const meta = (row.metadata || {}) as Record<string, any>;
    const source = String(row.source || '');

    if (source.startsWith('import:')) {
      const recordType = String(meta.recordType || 'generic');
      const importedRows: any[] = Array.isArray(row.data?.rows) ? row.data.rows : [];
      if (!importedRows.length) continue;
      const normalized = normalizeImportedRows(importedRows, recordType);
      // Contacts are already written to the Stakeholder table by the importer,
      // so store them in a side bucket: AI can read them without the network
      // page showing every contact twice.
      const bucket =
        recordType === 'companies'
          ? 'companies'
          : recordType === 'deals'
            ? 'deals'
            : recordType === 'invoices'
              ? 'invoices'
              : recordType === 'projects'
                ? 'projects'
                : recordType === 'tasks'
                  ? 'tasks'
                  : recordType === 'contacts'
                    ? 'importedContacts'
                    : 'records';
      snapshot.data[bucket] = [...(snapshot.data[bucket] || []), ...normalized];
      snapshot.totalRecords += normalized.length;
      snapshot.source = snapshot.source === 'live' ? 'live' : 'import';
      continue;
    }

    // sync:<provider>:<dataType>
    const dataType = source.split(':')[2] || meta.dataType || 'records';
    const items: any[] = Array.isArray(row.data?.items)
      ? row.data.items
      : Array.isArray(row.data?.rows)
        ? row.data.rows
        : [];
    if (!items.length) continue;
    snapshot.data[dataType] = [...(snapshot.data[dataType] || []), ...items];
    snapshot.totalRecords += items.length;
    if (snapshot.source !== 'live') snapshot.source = 'stored';
  }
}

/** Load persisted sync/import rows for a provider (or all providers). */
async function loadStoredRows(userId: string, providerId?: string) {
  const rows = await prisma.integrationData.findMany({
    where: {
      userId,
      OR: [
        { source: { startsWith: 'sync:' } },
        { source: { startsWith: 'import:' } },
      ],
    },
    orderBy: { receivedAt: 'desc' },
    take: 400,
  });

  if (!providerId) return rows;
  return rows.filter((r: any) => {
    const source = String(r.source || '');
    const name = source.startsWith('import:')
      ? source.split(':')[1]
      : source.split(':')[1];
    return name === providerId;
  });
}

/**
 * Fetch a full snapshot for one provider. Returns persisted data when the live
 * API is unavailable, so callers never crash and rarely see empty results.
 */
export async function fetchProviderSnapshot(
  userId: string,
  providerId: string,
  options: { preferStored?: boolean } = {},
): Promise<ProviderSnapshot> {
  const conn = await loadFreshConnection(userId, providerId);

  const snapshot: ProviderSnapshot = {
    provider: providerId,
    accountName: conn?.appId || null,
    lastSync: conn?.lastSyncAt?.toISOString() || null,
    data: {},
    errors: {},
    totalRecords: 0,
    source: 'none',
  };

  // Pages read the last persisted snapshot instantly; AI asks for live data.
  if (options.preferStored) {
    const stored = await loadStoredRows(userId, providerId);
    absorbStoredRows(snapshot, stored);
    if (snapshot.totalRecords > 0) return snapshot;
  }

  const credentials = decryptConnectionCredentials(conn);
  if (conn && Object.keys(credentials).length) {
    const dataTypes = PROVIDER_DATA_TYPES[providerId] || ['all'];

    await Promise.all(
      dataTypes.map(async (dt) => {
        try {
          const result = await fetchProviderData(providerId, userId, credentials, {
            dataType: dt,
            limit: 100,
          });
          if (result.success) {
            absorbResult(snapshot, dt, result.data);
          } else {
            snapshot.errors[dt] = (result as any).error || 'fetch failed';
          }
        } catch (e) {
          snapshot.errors[dt] = e instanceof Error ? e.message : 'unknown error';
        }
      }),
    );

    if (snapshot.totalRecords > 0) snapshot.source = 'live';
  }

  // Nothing live (no credentials, provider error, or CSV-only connection):
  // fall back to the last persisted sync/import rows.
  if (snapshot.totalRecords === 0) {
    const stored = await loadStoredRows(userId, providerId);
    absorbStoredRows(snapshot, stored);
  }

  return snapshot;
}

/**
 * Fetch snapshots for ALL connected providers for a user.
 * Returns every connected provider, including ones with zero records so the
 * UI can explain why nothing is showing.
 */
export async function fetchAllProviderSnapshots(
  userId: string,
  options: { preferStored?: boolean } = {},
): Promise<ProviderSnapshot[]> {
  const connections = await prisma.integrationConnection.findMany({
    where: { userId, status: 'CONNECTED' },
    select: { name: true },
  });

  const names = connections.map((c) => c.name);

  // Include providers that only have persisted sync or imported rows but no
  // connection row (e.g. a disconnected tool whose data still powers pages).
  const storedRows = await loadStoredRows(userId);
  for (const row of storedRows as any[]) {
    const source = String(row.source || '');
    if (source.startsWith('import:') || source.startsWith('sync:')) {
      const provider = source.split(':')[1];
      if (provider && !names.includes(provider)) names.push(provider);
    }
  }

  const results = await Promise.allSettled(
    names.map((name) => fetchProviderSnapshot(userId, name, options)),
  );

  return results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => (r as PromiseFulfilledResult<ProviderSnapshot>).value);
}

/** Human-readable, compact representation of a single record for AI prompts. */
function describeRecord(item: any): string {
  if (item == null) return '';
  if (typeof item !== 'object') return String(item);

  const name =
    item.name ||
    item.title ||
    item.summary ||
    item.subject ||
    item.dealname ||
    item.full_name ||
    item.fullName ||
    item.displayName ||
    item.DocNumber ||
    item.id ||
    '';

  const bits: string[] = [];
  if (name) bits.push(String(name));

  const status = item.status || item.state || item.stage || item.stageLabel || item.rawStatus;
  if (status) bits.push(`[${status}]`);
  if (item.completed === true) bits.push('[done]');
  if (item.closed === true) bits.push('[closed]');

  const amount =
    item.amount ?? item.TotalAmt ?? item.total ?? item.balance ?? item.Balance ?? null;
  if (amount != null && amount !== '' && Number(amount) !== 0) {
    bits.push(`$${Number(amount).toLocaleString()}`);
  }
  const due = item.due_on || item.duedate || item.dueDate || item.closedate || item.due;
  if (due) bits.push(`due ${String(due).slice(0, 10)}`);
  const start = item.start || item.startTime;
  if (start) bits.push(`at ${String(start).slice(0, 16).replace('T', ' ')}`);
  const email = item.email || item.Email || item.EmailAddress;
  if (email) bits.push(String(email));
  const company = item.company || item.companyName || item.accountName;
  if (company) bits.push(`@${company}`);

  return bits.join(' ');
}

/**
 * Build a compact text summary of all integration snapshots suitable for
 * injecting into an AI prompt without blowing the context window.
 */
export function buildIntegrationContext(snapshots: ProviderSnapshot[]): string {
  if (!snapshots?.length) return 'No external integrations connected.';

  const lines: string[] = ['=== CONNECTED INTEGRATION DATA ==='];
  let hasRecords = false;

  for (const snap of snapshots) {
    if (!snap.totalRecords) continue;
    hasRecords = true;
    lines.push(
      `\n[${snap.provider.toUpperCase()}] account=${snap.accountName || 'unknown'} records=${snap.totalRecords} lastSync=${snap.lastSync || 'unknown'}`,
    );
    for (const [dt, items] of Object.entries(snap.data)) {
      if (!items.length) continue;
      const sample = items.slice(0, 12);
      lines.push(`  ${dt} (${items.length}):`);
      for (const item of sample) {
        const text = describeRecord(item);
        if (text) lines.push(`    - ${text}`);
      }
      if (items.length > sample.length) lines.push(`    ... and ${items.length - sample.length} more`);
    }
    const errorKeys = Object.keys(snap.errors);
    if (errorKeys.length) {
      lines.push(`  unavailable: ${errorKeys.map((k) => `${k} (${snap.errors[k]})`).join('; ')}`);
    }
  }

  if (!hasRecords) return 'No external integration records are available yet.';
  lines.push('\n=== END INTEGRATION DATA ===');
  return lines.join('\n');
}

/**
 * Normalise integration snapshots into project-like objects for the
 * projects page. Kept for backwards compatibility; the richer mapping lives in
 * integrationNormalize.service.ts.
 */
export function extractProjectItems(snapshots: ProviderSnapshot[]): Array<{
  id: string;
  name: string;
  source: string;
  status: string | null;
  url?: string;
  description?: string;
}> {
  const items: Array<{
    id: string;
    name: string;
    source: string;
    status: string | null;
    url?: string;
    description?: string;
  }> = [];

  for (const snap of snapshots) {
    const src = snap.provider;

    for (const p of snap.data['projects'] || []) {
      const status = p.completed ? 'completed' : p.status || 'active';
      items.push({
        id: `${src}:${p.id || p.key}`,
        name: p.name || p.key,
        source: src,
        status,
        description: p.projectTypeKey || p.workspace || undefined,
      });
    }
    for (const b of snap.data['boards'] || []) {
      items.push({
        id: `${src}:${b.id}`,
        name: b.name,
        source: src,
        status: b.closed ? 'closed' : 'active',
        url: b.url,
        description: b.desc || b.description || undefined,
      });
    }
    for (const r of snap.data['repos'] || []) {
      items.push({
        id: `${src}:${r.full_name || r.name}`,
        name: r.full_name || r.name,
        source: src,
        status: 'active',
        url: r.html_url,
        description: r.description || undefined,
      });
    }
    for (const p of snap.data['pages'] || []) {
      items.push({
        id: `${src}:${p.id}`,
        name: p.title || p.id,
        source: src,
        status: p.archived ? 'archived' : 'active',
        url: p.url,
      });
    }
  }

  return items;
}
