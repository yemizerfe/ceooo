// services/integrationAdmin.service.ts
// Platform-level (Admin) view of CEOOO integrations.
//
// CEOOO connects user accounts to third-party apps through Membrane. The Admin
// control center therefore reports:
//   * which integrations the platform SUPPORTS (from the provider catalog)
//   * how many CEOOO users have connected each one
//   * the aggregated connection state and last synchronization time
//
// SECURITY: provider credentials live in environment variables / the provider
// vault. This service only ever returns non-secret configuration metadata, so
// nothing displayed to an administrator can leak a token or API key.
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.ts';
import { parseJsonObject } from './platformSettings.service.ts';

export type ConnectionState = 'connected' | 'connecting' | 'error' | 'disconnected';

export interface StoredConnection {
  connected?: boolean;
  connecting?: boolean;
  connectionId?: string;
  connectedAt?: string | null;
  lastSync?: string | null;
  metadata?: Record<string, unknown>;
  error?: string;
}

export type IntegrationStore = Record<string, StoredConnection>;

export interface IntegrationConnectionRow {
  userId: string;
  userName: string | null;
  userEmail: string;
  state: ConnectionState;
  lastSync: string | null;
  connectedAt: string | null;
}

export interface IntegrationAdminRow {
  id: string;
  name: string;
  category: string;
  description: string;
  /** Whether the provider catalog is reachable (i.e. configuration is live). */
  available: boolean;
  state: ConnectionState;
  connectedUsers: number;
  totalConnections: number;
  lastSync: string | null;
  /** Non-secret configuration summary, e.g. which app id is enabled. */
  configuration: { key: string; value: string }[];
  connections: IntegrationConnectionRow[];
}

function normaliseState(connection: StoredConnection | undefined): ConnectionState {
  if (!connection) return 'disconnected';
  if (connection.error) return 'error';
  if (connection.connecting && !connection.connected) return 'connecting';
  if (connection.connected) return 'connected';
  return 'disconnected';
}

/** Flattens every user's stored connection records into one collection. */
async function collectConnections() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, integrations: true },
  });

  const byApp = new Map<string, IntegrationConnectionRow[]>();

  for (const user of users) {
    const store = parseJsonObject<IntegrationStore>(user.integrations, {});
    for (const [appName, connection] of Object.entries(store)) {
      if (!connection || typeof connection !== 'object') continue;

      const rows = byApp.get(appName) ?? [];
      rows.push({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        state: normaliseState(connection),
        lastSync: connection.lastSync ?? null,
        connectedAt: connection.connectedAt ?? null,
      });
      byApp.set(appName, rows);
    }
  }

  return byApp;
}

/** Live catalog of integrations the platform supports. Never throws. */
async function loadCatalog(): Promise<{ id: string; name: string; category: string; description: string }[]> {
  try {
    const n8nCatalog = [
      { id: 'sheetdb', name: 'SheetDB', category: 'Data', description: 'Run your SQL-like queries directly on Google Sheets' },
      { id: 'airtable', name: 'Airtable', category: 'CRM', description: 'Free tier up to 1,200 records, REST API included' },
      { id: 'google-sheets', name: 'Google Sheets', category: 'Data', description: 'Free spreadsheet + Sheets API v4' },
      { id: 'sendgrid', name: 'SendGrid', category: 'Email', description: 'Free tier 100 emails/day, v3 API' },
      { id: 'slack', name: 'Slack', category: 'Communication', description: 'Free workspace, Web API + incoming webhooks' },
      { id: 'whatsapp', name: 'WhatsApp Business', category: 'Communication', description: 'Free API for small volumes, official free sandbox' },
      { id: 'discord', name: 'Discord', category: 'Communication', description: 'Free bot API + REST API for guilds' },
      { id: 'trello', name: 'Trello', category: 'Project', description: 'Free for teams, REST API included' },
      { id: 'notion', name: 'Notion', category: 'Productivity', description: 'Free personal plan, API v1' },
      { id: 'github', name: 'GitHub', category: 'Development', description: 'Free unlimited private repos, REST API' },
      { id: 'gitlab', name: 'GitLab', category: 'Development', description: 'Free self-hosted/open-source, REST + GraphQL API' },
      { id: 'google-tasks', name: 'Google Tasks', category: 'Productivity', description: 'Free task list, free REST API' },
      { id: 'outlook', name: 'Microsoft Outlook', category: 'Productivity', description: 'Free personal Outlook, free Graph API' },
      { id: 'todoist', name: 'Todoist', category: 'Productivity', description: 'Free plan, REST API included' },
      { id: 'calendly', name: 'Calendly', category: 'Scheduling', description: 'Free plan, REST API' },
      { id: 'typeform', name: 'Typeform', category: 'Surveys', description: 'Free plan, REST API' },
      { id: 'google-calendar', name: 'Google Calendar', category: 'Scheduling', description: 'Free calendar, REST API v3' },
    ];
    return n8nCatalog;

  } catch (error) {
    console.error('Integration catalog unavailable:', error);
    return [];
  }
}

/** Health rollup used by the System Health page.
      .map((entry) => {
        const item = entry as Record<string, unknown>;
        const id = String(item.appName ?? item.id ?? item.name ?? '').trim();
        if (!id) return null;
        return {
          id,
          name: String(item.displayName ?? item.name ?? id),
          category: String(item.category ?? item.type ?? 'Other'),
          description: String(item.description ?? item.tagline ?? ''),
        };
      })
      .filter((entry): entry is { id: string; name: string; category: string; description: string } =>
        Boolean(entry)
      );
  } catch (error) {
    console.error('Integration catalog unavailable:', error);
    return [];
  }
}

/** Health rollup used by the System Health page. */
export async function getIntegrationHealthSummary() {
  const byApp = await collectConnections();

  let total = 0;
  let connected = 0;
  let failing = 0;

  for (const rows of byApp.values()) {
    for (const row of rows) {
      total += 1;
      if (row.state === 'connected') connected += 1;
      if (row.state === 'error') failing += 1;
    }
  }

  return { total, connected, failing, supportedApps: byApp.size };
}

function describeConfiguration(appId: string): { key: string; value: string }[] {
  // Only non-secret facts about how the platform is wired up.
  const entries: { key: string; value: string }[] = [
    { key: 'Provider', value: 'Free open-source catalog (n8n community + free APIs)' },

    { key: 'App ID', value: appId },
  ];

  // The free open-source layer needs no platform-held credentials: each user
  // authenticates directly with the provider (or via a self-hosted n8n instance).
  entries.push({ key: 'Credentials', value: 'User-managed (free provider accounts / self-hosted n8n)' });

  return entries;
}

/**
 * Full admin listing of platform integrations.
 *
 * The provider catalog is the source of truth for which integrations CEOOO
 * supports; connection counts come from the accounts that have actually
 * connected them.
 */
export async function listIntegrationsAdmin(): Promise<{
  items: IntegrationAdminRow[];
  catalogAvailable: boolean;
  catalogError: string | null;
}> {
  const [catalog, byApp] = await Promise.all([loadCatalog(), collectConnections()]);

  const items: IntegrationAdminRow[] = catalog.map((entry) => {
    const connections = byApp.get(entry.id) ?? [];
    const connectedUsers = connections.filter((connection) => connection.state === 'connected').length;

    const state: ConnectionState = connections.some((connection) => connection.state === 'error')
      ? 'error'
      : connections.some((connection) => connection.state === 'connecting')
        ? 'connecting'
        : connectedUsers > 0
          ? 'connected'
          : 'disconnected';

    const lastSync =
      connections
        .map((connection) => connection.lastSync)
        .filter((value): value is string => Boolean(value))
        .sort()
        .reverse()[0] ?? null;

    return {
      id: entry.id,
      name: entry.name,
      category: entry.category,
      description: entry.description,
      available: true,
      state,
      connectedUsers,
      totalConnections: connections.length,
      lastSync,
      configuration: describeConfiguration(entry.id),
      connections: connections.sort((a, b) => a.userEmail.localeCompare(b.userEmail)),
    };
  });

  // Apps users connected that are no longer in the catalog are surfaced so an
  // admin can see and clean up stale connections instead of them being hidden.
  for (const [appId, connections] of byApp.entries()) {
    if (items.some((item) => item.id === appId)) continue;

    items.push({
      id: appId,
      name: appId,
      category: 'Other',
      description: 'Connected by users but no longer offered by the integration provider.',
      available: false,
      state: connections.some((connection) => connection.state === 'error') ? 'error' : 'connected',
      connectedUsers: connections.filter((connection) => connection.state === 'connected').length,
      totalConnections: connections.length,
      lastSync:
        connections
          .map((connection) => connection.lastSync)
          .filter((value): value is string => Boolean(value))
          .sort()
          .reverse()[0] ?? null,
      configuration: describeConfiguration(appId),
      connections,
    });
  }

  return {
    items: items.sort((a, b) => a.name.localeCompare(b.name)),
    catalogAvailable: catalog.length > 0,
    catalogError: catalog.length ? null : 'The integration provider catalog is currently unreachable.',
  };
}

export async function getIntegrationById(appId: string): Promise<IntegrationAdminRow | null> {
  const { items } = await listIntegrationsAdmin();
  return items.find((item) => item.id === appId) ?? null;
}

/**
 * Platform-level disconnect: clears the stored connection record for every
 * account that connected this app. Tokens themselves are revoked at the
 * provider, so no secret material passes through CEOOO here.
 */
export async function disconnectIntegrationForAllUsers(appId: string): Promise<{ affectedUsers: number }> {
  const users = await prisma.user.findMany({
    select: { id: true, integrations: true },
  });

  let affectedUsers = 0;

  for (const user of users) {
    const store = parseJsonObject<IntegrationStore>(user.integrations, {});
    if (!store[appId]) continue;

    delete store[appId];
    await prisma.user.update({
      where: { id: user.id },
      data: { integrations: store as unknown as Prisma.InputJsonValue },
    });
    // Drop what was pulled from this platform too, so a platform-wide
    // disconnect does not leave synced/imported rows behind.
    const names = new Set([appId, appId.replace(/-/g, '_'), appId.replace(/_/g, '-')]);
    await prisma.integrationData
      .deleteMany({
        where: {
          userId: user.id,
          OR: [...names].flatMap((name) => [
            { source: { startsWith: `sync:${name}:` } },
            { source: { startsWith: `import:${name}:` } },
          ]),
        },
      })
      .catch(() => null);
    affectedUsers += 1;
  }

  return { affectedUsers };
}
