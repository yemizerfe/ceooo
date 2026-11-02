// integration.catalog.ts
// GET /api/integrations — provider catalog + per-user connection status.

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { PROVIDERS, serializeProvider } from '../integrations/providers.js';
import { RECORD_TYPES } from '../services/integrationImport.service.js';
import { readIntegrations, loadState } from './integration.helpers.js';

export async function getIntegrations(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const state = await loadState(userId);
    const [connections, dataRows] = await Promise.all([
      prisma.integrationConnection.findMany({ where: { userId } }),
      prisma.integrationData.findMany({
        where: {
          userId,
          OR: [{ source: { startsWith: 'sync:' } }, { source: { startsWith: 'import:' } }],
        },
        select: { source: true, data: true },
      }),
    ]);
    const byName = new Map(connections.map((c) => [c.name, c]));

    // Actual persisted record counts per provider (live syncs + imports).
    const recordCounts = new Map<string, number>();
    for (const row of dataRows as any[]) {
      const providerId = String(row.source || '').split(':')[1];
      if (!providerId) continue;
      const rows = Array.isArray(row.data?.items)
        ? row.data.items.length
        : Array.isArray(row.data?.rows)
          ? row.data.rows.length
          : 0;
      recordCounts.set(providerId, (recordCounts.get(providerId) || 0) + rows);
    }

    const integrations = PROVIDERS.map((provider) => {
      const s = readIntegrations(state[provider.id]);
      const conn = byName.get(provider.id);
      const persisted = recordCounts.get(provider.id) || 0;
      return {
        ...serializeProvider(provider),
        connected: Boolean(s.connected || (conn && conn.status === 'CONNECTED')),
        method: s.method || conn?.authMethod || null,
        accountName: s.accountName || conn?.appId || null,
        connectionId: conn?.connectionId || null,
        connectedAt: s.connectedAt || conn?.connectedAt || null,
        lastSync: s.lastSync || conn?.lastSyncAt?.toISOString() || null,
        recordsImported: Math.max(s.recordsImported || 0, persisted),
        importRecordType: s.importRecordType || null,
        lastError:
          s.lastError ||
          (conn?.lastSyncStatus === 'error' ? 'Last sync failed — check credentials' : null),
      };
    });

    res.json({
      success: true,
      data: {
        integrations,
        recordTypes: RECORD_TYPES,
        count: integrations.length,
        connectedCount: integrations.filter((i) => i.connected).length,
      },
    });
  } catch (error) {
    console.error('Failed to get integrations:', error);
    res.status(500).json({ success: false, message: 'Failed to get integrations' });
  }
}
