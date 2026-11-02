// server/services/integrationSync.service.ts
//
// Pulls every supported dataset from every connected provider, persists the
// result so pages/AI read it instantly, and reports per-provider outcomes.
// CSV/Excel imports already stored in IntegrationData remain readable.

import { prisma } from '../lib/prisma.js';
import { fetchProviderData } from './integrationFetcher.service.js';
import {
  PROVIDER_DATA_TYPES,
  decryptConnectionCredentials,
  fetchAllProviderSnapshots,
  type ProviderSnapshot,
} from './integrationSnapshot.service.js';
import { normalizeSnapshots, type IntegrationOverview } from './integrationNormalize.service.js';
import { loadFreshConnection } from './integrationTokens.service.js';

export interface ProviderSyncResult {
  provider: string;
  status: 'synced' | 'partial' | 'imports_only' | 'no_credentials' | 'error';
  records: number;
  datasets: Record<string, number>;
  errors: Record<string, string>;
  syncedAt: string;
}

export interface SyncAllResult {
  results: ProviderSyncResult[];
  totals: { providers: number; records: number; synced: number; failed: number };
  syncedAt: string;
}

function flattenInto(snapshot: ProviderSnapshot, requestedType: string, payload: unknown) {
  const add = (key: string, items: unknown[]) => {
    if (!items.length) return;
    snapshot.data[key] = [...(snapshot.data[key] || []), ...items];
    snapshot.totalRecords += items.length;
  };

  if (Array.isArray(payload)) {
    add(requestedType, payload);
    return;
  }
  if (payload && typeof payload === 'object') {
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (Array.isArray(value)) add(key, value);
    }
  }
}

async function countImportRows(userId: string, providerId: string): Promise<number> {
  const rows = await prisma.integrationData.findMany({
    where: { userId, source: { startsWith: `import:${providerId}:` } },
    select: { data: true },
    take: 100,
  });
  return rows.reduce((sum, row: any) => sum + (Array.isArray(row.data?.rows) ? row.data.rows.length : 0), 0);
}

/** Sync one provider. Never throws; returns a truthful per-provider result. */
export async function syncProvider(userId: string, providerId: string): Promise<ProviderSyncResult> {
  const now = new Date().toISOString();
  const result: ProviderSyncResult = {
    provider: providerId,
    status: 'error',
    records: 0,
    datasets: {},
    errors: {},
    syncedAt: now,
  };

  try {
    // Refreshes an about-to-expire access token first, so a connection keeps
    // working long after the original consent.
    const conn = await loadFreshConnection(userId, providerId);
    const credentials = decryptConnectionCredentials(conn);

    if (!conn || !Object.keys(credentials).length) {
      const imported = await countImportRows(userId, providerId);
      result.status = imported > 0 ? 'imports_only' : 'no_credentials';
      result.records = imported;
      if (imported > 0) result.datasets = { imported };
      return result;
    }

    const dataTypes = PROVIDER_DATA_TYPES[providerId] || ['all'];
    const snapshot: ProviderSnapshot = {
      provider: providerId,
      accountName: conn.appId || null,
      lastSync: conn.lastSyncAt?.toISOString() || null,
      data: {},
      errors: {},
      totalRecords: 0,
      source: 'live',
    };

    await Promise.all(
      dataTypes.map(async (dataType) => {
        try {
          const fetched = await fetchProviderData(providerId, userId, credentials, {
            dataType,
            limit: 100,
          });
          if (fetched.success) {
            flattenInto(snapshot, dataType, fetched.data);
          } else {
            snapshot.errors[dataType] = (fetched as any).error || 'fetch failed';
          }
        } catch (error) {
          snapshot.errors[dataType] = error instanceof Error ? error.message : 'unknown error';
        }
      }),
    );

    result.datasets = Object.fromEntries(Object.entries(snapshot.data).map(([k, v]) => [k, v.length]));
    result.records = snapshot.totalRecords;
    result.errors = snapshot.errors;

    if (snapshot.totalRecords > 0) {
      // Replace the previous persisted copy for this provider.
      await prisma.integrationData.deleteMany({
        where: { userId, source: { startsWith: `sync:${providerId}:` } },
      });
      for (const [dataType, items] of Object.entries(snapshot.data)) {
        if (!items.length) continue;
        await prisma.integrationData.create({
          data: {
            userId,
            source: `sync:${providerId}:${dataType}`,
            data: { items } as any,
            metadata: {
              provider: providerId,
              dataType,
              count: items.length,
              syncedAt: now,
            } as any,
          },
        });
      }
    }

    // Persist imported rows count for the connection summary.
    const imported = await countImportRows(userId, providerId);
    result.records += imported;
    if (imported > 0) result.datasets.imported = imported;

    const errorCount = Object.keys(snapshot.errors).length;
    result.status = errorCount > 0 ? 'partial' : snapshot.totalRecords > 0 ? 'synced' : 'imports_only';

    await prisma.integrationConnection.update({
      where: { userId_name: { userId, name: providerId } },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: result.status,
        metadata: {
          ...(conn.metadata && typeof conn.metadata === 'object' ? (conn.metadata as object) : {}),
          dataCounts: result.datasets,
          lastSyncErrors: snapshot.errors,
        } as any,
      },
    });

    return result;
  } catch (error) {
    result.status = 'error';
    result.errors.general = error instanceof Error ? error.message : 'Unknown sync error';
    return result;
  }
}

/** Sync every connected provider (bounded concurrency). */
export async function syncAllProviders(userId: string): Promise<SyncAllResult> {
  const connections = await prisma.integrationConnection.findMany({
    where: { userId, status: 'CONNECTED' },
    select: { name: true },
  });

  const names = connections.map((c) => c.name);

  // Include providers with persisted sync/import rows but no connection row.
  const storedRows = await prisma.integrationData.findMany({
    where: {
      userId,
      OR: [{ source: { startsWith: 'sync:' } }, { source: { startsWith: 'import:' } }],
    },
    select: { source: true },
    take: 400,
  });
  for (const row of storedRows as any[]) {
    const name = String(row.source || '').split(':')[1];
    if (name && !names.includes(name)) names.push(name);
  }

  const results: ProviderSyncResult[] = [];
  const concurrency = 4;
  for (let i = 0; i < names.length; i += concurrency) {
    const chunk = names.slice(i, i + concurrency);
    results.push(...(await Promise.all(chunk.map((name) => syncProvider(userId, name)))));
  }

  const synced = results.filter((r) => r.status === 'synced' || r.status === 'partial').length;
  return {
    results,
    totals: {
      providers: names.length,
      records: results.reduce((sum, r) => sum + r.records, 0),
      synced,
      failed: results.filter((r) => r.status === 'error').length,
    },
    syncedAt: new Date().toISOString(),
  };
}

/** Everything the pages need, in one payload. Reads persisted data first. */
export async function getIntegrationOverview(userId: string): Promise<IntegrationOverview> {
  const snapshots = await fetchAllProviderSnapshots(userId, { preferStored: true });
  return normalizeSnapshots(snapshots);
}
