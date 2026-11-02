// integration.data.ts
// API key save, CSV/Excel import, disconnect, sync, and data-fetch endpoints.

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { IntegrationType } from '@prisma/client';
import { getProvider, serializeProvider } from '../integrations/providers.js';
import { RECORD_TYPES } from '../services/integrationImport.service.js';
import { getConfiguredApiCredentials } from '../integrations/providers.js';
import { encryptSecret, encryptCredentials } from '../lib/crypto.js';
import { fetchProviderData } from '../services/integrationFetcher.service.js';
import {
  assertTabularFile,
  parseTabularFile,
  suggestMapping,
  guessRecordType,
  mapContacts,
  previewRows,
  type RecordType,
  type SuggestedMapping,
} from '../services/integrationImport.service.js';
import {
  loadState,
  saveState,
  readIntegrations,
  getProviderCredentials,
} from './integration.helpers.js';

const IMPORT_CHUNK_SIZE = 500;

// ── Save API key / access token ───────────────────────────────────────────────

export async function saveCredentials(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { provider: providerId, credentials: submittedCredentials, source } = req.body || {};
    const provider = getProvider(providerId);
    if (!provider?.apiKey) {
      return res.status(400).json({ success: false, message: `API key connection is not supported for ${providerId}` });
    }
    if (source !== undefined && source !== 'server') {
      return res.status(400).json({ success: false, message: 'Unsupported credential source' });
    }

    const credentials = source === 'server' ? getConfiguredApiCredentials(provider) : submittedCredentials;
    if (!credentials || typeof credentials !== 'object') {
      return res.status(400).json({
        success: false,
        message: source === 'server'
          ? `No server credentials are configured for ${provider.name}`
          : 'Credentials are required',
      });
    }

    const missing = provider.apiKey.fields
      .filter((f) => f.required && !String(credentials[f.key] ?? '').trim())
      .map((f) => f.label);
    if (missing.length) {
      return res.status(400).json({ success: false, message: `Missing required field(s): ${missing.join(', ')}` });
    }

    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(credentials)) {
      const value = String(v ?? '').trim();
      if (value) clean[k] = value;
    }

    // Best-effort live verification (never blocks storing the credentials).
    let verified: boolean | null = null;
    let verifyMessage: string | null = null;
    if (provider.apiKey.test) {
      try {
        const { url, headers } = provider.apiKey.test(clean);
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const check = await fetch(url, { headers, signal: ctrl.signal });
        clearTimeout(timer);
        verified = check.ok;
        verifyMessage = check.ok ? 'Credentials verified' : `Provider returned HTTP ${check.status}`;
      } catch {
        verified = false;
        verifyMessage = 'Could not reach the provider to verify (credentials were saved)';
      }
    }

    const accountName = clean.accountName || clean.instanceUrl || clean.baseUrl || clean.hubDomain || clean.email || provider.name;
    const encrypted = JSON.stringify(encryptCredentials(clean));

    await prisma.integrationConnection.upsert({
      where: { userId_name: { userId, name: provider.id } },
      create: {
        userId,
        name: provider.id,
        type: provider.integrationType as IntegrationType,
        status: 'CONNECTED',
        authMethod: 'apiKey',
        encryptedCredentials: encrypted,
        connectionId: `key_${provider.id}_${Date.now().toString(36)}`,
        appId: accountName,
        connectedAt: new Date(),
        lastSyncAt: new Date(),
        lastSyncStatus: verified === false ? 'unverified' : 'connected',
        metadata: { accountName, fieldKeys: Object.keys(clean), verified: verified ?? 'unchecked', verifyMessage },
      },
      update: {
        type: provider.integrationType as IntegrationType,
        status: 'CONNECTED',
        authMethod: 'apiKey',
        encryptedCredentials: encrypted,
        appId: accountName,
        connectedAt: new Date(),
        lastSyncAt: new Date(),
        lastSyncStatus: verified === false ? 'unverified' : 'connected',
        metadata: { accountName, fieldKeys: Object.keys(clean), verified: verified ?? 'unchecked', verifyMessage },
      },
    });

    const stateMap = await loadState(userId);
    stateMap[provider.id] = {
      ...readIntegrations(stateMap[provider.id]),
      connected: true,
      method: 'apiKey',
      accountName,
      connectedAt: new Date().toISOString(),
      lastSync: new Date().toISOString(),
      lastError: verified === false ? verifyMessage || 'The provider rejected these credentials.' : null,
    };
    await saveState(userId, stateMap);

    res.json({
      success: true,
      data: { provider: provider.id, method: 'apiKey', accountName, verified, verifyMessage },
      message: verified === false
        ? 'Connected. Credentials saved but could not be verified.'
        : `Connected to ${provider.name}`,
    });
  } catch (error) {
    console.error('Save credentials failed:', error);
    res.status(500).json({ success: false, message: 'Failed to save credentials' });
  }
}

// ── CSV / Excel import ────────────────────────────────────────────────────────

export async function importIntegrationFile(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const file = (req as any).file as { buffer: Buffer; originalname: string; size: number } | undefined;
    if (!file?.buffer?.length) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const providerId = (req.body?.provider as string) || 'csv-import';
    const provider = getProvider(providerId);
    const sheet = req.body?.sheet as string | undefined;
    const preview = String(req.body?.preview ?? '') === 'true' || String(req.query?.preview ?? '') === 'true';

    let table;
    try {
      assertTabularFile(file.buffer, file.originalname);
      table = parseTabularFile(file.buffer, sheet);
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: parseError instanceof Error ? parseError.message : 'Could not read the file',
      });
    }

    const guessed = guessRecordType(table.columns);
    const recordType: RecordType = (req.body?.recordType as RecordType) || guessed;
    const mapping: SuggestedMapping =
      typeof req.body?.mapping === 'string' && req.body.mapping
        ? JSON.parse(req.body.mapping)
        : req.body?.mapping && typeof req.body.mapping === 'object'
          ? req.body.mapping
          : suggestMapping(table.columns, recordType);

    if (preview) {
      return res.json({
        success: true,
        data: {
          fileName: file.originalname,
          sheetName: table.sheetName,
          sheetNames: table.sheetNames,
          columns: table.columns,
          rowCount: table.rows.length,
          sampleRows: previewRows(table.rows, 20),
          guessedRecordType: guessed,
          recordType,
          suggestedMapping: mapping,
        },
      });
    }

    if (!table.rows.length) {
      return res.status(400).json({ success: false, message: 'The file contains no data rows' });
    }

    const source = `import:${providerId}:${recordType}`;
    let stored = 0;
    for (let i = 0; i < table.rows.length; i += IMPORT_CHUNK_SIZE) {
      const chunk = table.rows.slice(i, i + IMPORT_CHUNK_SIZE);
      await prisma.integrationData.create({
        data: {
          userId,
          source,
          data: { rows: chunk } as any,
          metadata: {
            provider: providerId,
            recordType,
            columns: table.columns,
            fileName: file.originalname,
            sheetName: table.sheetName,
            chunkStart: i,
            chunkSize: chunk.length,
            mapping,
            importedAt: new Date().toISOString(),
          } as any,
        },
      });
      stored += chunk.length;
    }

    let stakeholders = 0;
    if (recordType === 'contacts') {
      const drafts = mapContacts(table.rows, mapping);
      if (drafts.length) {
        await prisma.stakeholder.createMany({
          data: drafts.map((d) => ({
            userId,
            name: d.name,
            email: d.email,
            phone: d.phone,
            company: d.company,
            role: d.role,
            type: d.type,
            notes: d.notes,
          })),
        });
        stakeholders = drafts.length;
      }
    }

    const targetId = provider ? provider.id : 'csv-import';
    await prisma.integrationConnection.upsert({
      where: { userId_name: { userId, name: targetId } },
      create: {
        userId,
        name: targetId,
        type: (provider?.integrationType as IntegrationType) ?? 'OTHER',
        status: 'CONNECTED',
        authMethod: 'csv',
        connectionId: `import_${targetId}_${Date.now().toString(36)}`,
        connectedAt: new Date(),
        lastSyncAt: new Date(),
        lastSyncStatus: 'imported',
        metadata: { fileName: file.originalname, recordType, rows: stored, stakeholders, columns: table.columns },
      },
      update: {
        status: 'CONNECTED',
        authMethod: 'csv',
        lastSyncAt: new Date(),
        lastSyncStatus: 'imported',
        metadata: { fileName: file.originalname, recordType, rows: stored, stakeholders, columns: table.columns },
      },
    });

    const stateMap = await loadState(userId);
    const prev = readIntegrations(stateMap[targetId]);
    stateMap[targetId] = {
      ...prev,
      connected: true,
      method: 'csv',
      accountName: prev.accountName || file.originalname,
      connectedAt: prev.connectedAt || new Date().toISOString(),
      lastSync: new Date().toISOString(),
      recordsImported: (prev.recordsImported || 0) + stored,
      importRecordType: recordType,
      lastError: null,
    };
    await saveState(userId, stateMap);

    res.json({
      success: true,
      data: {
        provider: targetId,
        fileName: file.originalname,
        sheetName: table.sheetName,
        recordType,
        columns: table.columns,
        rowsImported: stored,
        stakeholdersCreated: stakeholders,
        sampleRows: previewRows(table.rows, 5),
      },
      message: recordType === 'contacts'
        ? `Imported ${stored} rows and created ${stakeholders} stakeholders`
        : `Imported ${stored} rows`,
    });
  } catch (error) {
    console.error('Integration import failed:', error);
    res.status(500).json({ success: false, message: 'Failed to import file', error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// ── Connect (legacy) ──────────────────────────────────────────────────────────

export async function connectIntegration(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const provider = getProvider(req.body?.appName);
    if (!provider) {
      return res.status(404).json({ success: false, message: `Unknown integration: ${req.body?.appName}` });
    }
    res.status(400).json({
      success: false,
      code: 'METHOD_REQUIRED',
      message: `${provider.name} requires a connection method. Choose OAuth, an API key, or a CSV/Excel import.`,
      data: { provider: serializeProvider(provider) },
    });
  } catch (error) {
    console.error('Connect failed:', error);
    res.status(500).json({ success: false, message: 'Failed to connect to integration' });
  }
}

// ── Disconnect ────────────────────────────────────────────────────────────────

export async function disconnectIntegration(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    const { appName } = req.body;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!appName) return res.status(400).json({ success: false, message: 'App name is required' });

    await prisma.integrationConnection
      .delete({ where: { userId_name: { userId, name: appName } } })
      .catch(() => null);

    const stateMap = await loadState(userId);
    delete stateMap[appName];
    await saveState(userId, stateMap);

    res.json({ success: true, message: `Disconnected from ${appName}` });
  } catch (error) {
    console.error('Disconnect failed:', error);
    res.status(500).json({ success: false, message: 'Failed to disconnect from integration' });
  }
}

// ── Sync ──────────────────────────────────────────────────────────────────────

export async function syncAllIntegrations(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    const { appName } = req.params as { appName?: string };
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const stateMap = await loadState(userId);
    const connected = Object.entries(stateMap)
      .filter(([, v]: [string, any]) => v?.connected)
      .map(([name]) => name)
      .filter((name) => !appName || name === appName);

    const now = new Date().toISOString();
    let successful = 0;
    for (const name of connected) {
      const imported = await prisma.integrationData.aggregate({
        where: { userId, source: { startsWith: `import:${name}:` } },
        _count: { _all: true },
      }).catch(() => ({ _count: { _all: 0 } }));

      stateMap[name] = {
        ...readIntegrations(stateMap[name]),
        lastSync: now,
        recordsImported: imported._count._all ? undefined : readIntegrations(stateMap[name]).recordsImported,
      };
      await prisma.integrationConnection
        .update({ where: { userId_name: { userId, name } }, data: { lastSyncAt: new Date(), lastSyncStatus: 'ok' } })
        .catch(() => null);
      successful++;
    }
    for (const name of connected) {
      if (stateMap[name].recordsImported === undefined) delete stateMap[name].recordsImported;
    }
    await saveState(userId, stateMap);

    res.json({
      success: true,
      message: `Refreshed ${successful} integration${successful === 1 ? '' : 's'}`,
      data: { total: connected.length, successful, failed: 0, syncedAt: now },
    });
  } catch (error) {
    console.error('Sync failed:', error);
    res.status(500).json({ success: false, message: 'Failed to sync integrations' });
  }
}

// ── Data fetch ────────────────────────────────────────────────────────────────

export async function fetchIntegrationData(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    const { appName, dataType } = req.params as { appName: string; dataType?: string };
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const result = await freeFetchData(appName, dataType || 'all', userId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Data fetch failed:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch integration data' });
  }
}

export async function getIntegrationDataForAI(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const stateMap = await loadState(userId);
    const connected: any[] = Object.entries(stateMap)
      .filter(([, v]: [string, any]) => v?.connected)
      .map(([name, data]: [string, any]) => ({ name, ...readIntegrations(data) }));

    if (!connected.length) {
      return res.json({ success: true, data: { integrations: [], count: 0, message: 'No connected integrations found' } });
    }

    const integrationData = await Promise.allSettled(
      connected.map(async (integration) => {
        try {
          const data = await freeFetchData(integration.name, 'all', userId);
          return { source: integration.name, data, lastSync: integration.lastSync };
        } catch (error) {
          return { source: integration.name, error: error instanceof Error ? error.message : 'Unknown error', lastSync: integration.lastSync };
        }
      }),
    );

    const successfulData = integrationData
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<any>).value);

    res.json({ success: true, data: { integrations: successfulData, count: successfulData.length } });
  } catch (error) {
    console.error('Failed to get integration data for AI:', error);
    res.status(500).json({ success: false, message: 'Failed to get integration data' });
  }
}

// ── Internal: fetch data for a provider ──────────────────────────────────────

export async function freeFetchData(appName: string, dataType: string, userId: string): Promise<any> {
  const imported = await prisma.integrationData.findMany({
    where: { userId, source: { startsWith: `import:${appName}:` } },
    orderBy: { receivedAt: 'desc' },
    take: 10,
  });

  if (imported.length) {
    const rows = imported.flatMap((r: any) => (r.data?.rows as any[]) || []);
    return { success: true, data: rows, count: rows.length, metadata: { appName, dataType, source: 'imported', fetchedAt: new Date().toISOString() } };
  }

  const credentials = await getProviderCredentials(userId, appName);
  if (credentials) return fetchProviderData(appName, userId, credentials, { dataType: dataType || 'all' });

  return { success: true, data: [], count: 0, metadata: { appName, dataType, source: 'none', note: 'No connection credentials are configured for this provider' } };
}
