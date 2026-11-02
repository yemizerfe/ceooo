// services/systemHealth.service.ts
// Platform health + recent system events for the Admin control center.
//
// Everything reported here is measured live or read from real records:
//   * API        -> this process (heap, uptime)
//   * Database   -> a real query against PostgreSQL
//   * AI Service -> provider reachability + whether AI is enabled in settings
//   * Storage    -> uploads directory access
//   * Integrations -> live connection state from the integrations service
//
// No health value is ever fabricated. When a check cannot run, it is reported
// as UNKNOWN rather than "Operational".
import { accessSync, constants, existsSync } from 'node:fs';
import path from 'node:path';
import { prisma } from '../lib/prisma.ts';
import { getPlatformSettings } from './platformSettings.service.ts';

export type HealthState = 'operational' | 'degraded' | 'down' | 'unknown' | 'disabled';

export interface HealthCheck {
  key: string;
  name: string;
  state: HealthState;
  detail: string;
  latencyMs: number | null;
  checkedAt: string;
}

export interface SystemEventRow {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  source: string;
  timestamp: string;
}

const STARTED_AT = Date.now();

function stateFromLatency(latencyMs: number, degradedAfterMs: number): HealthState {
  if (latencyMs > degradedAfterMs * 3) return 'down';
  if (latencyMs > degradedAfterMs) return 'degraded';
  return 'operational';
}

// ===================== INDIVIDUAL CHECKS =====================

function checkApi(): HealthCheck {
  const memory = process.memoryUsage();
  const heapMb = Math.round(memory.heapUsed / 1024 / 1024);
  const totalMb = Math.round(memory.heapTotal / 1024 / 1024);

  return {
    key: 'api',
    name: 'API',
    state: 'operational',
    detail: `Serving requests — heap ${heapMb} MB / ${totalMb} MB`,
    latencyMs: 0,
    checkedAt: new Date().toISOString(),
  };
}

async function checkDatabase(): Promise<HealthCheck> {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - startedAt;
    return {
      key: 'database',
      name: 'Database',
      state: stateFromLatency(latencyMs, 250),
      detail: `PostgreSQL responded in ${latencyMs} ms`,
      latencyMs,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      key: 'database',
      name: 'Database',
      state: 'down',
      detail: error instanceof Error ? `Unreachable: ${error.message}` : 'Unreachable',
      latencyMs: null,
      checkedAt: new Date().toISOString(),
    };
  }
}


async function checkAi(): Promise<HealthCheck> {
  const settings = await getPlatformSettings();
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

  if (!settings.aiEnabled) {
    return {
      key: 'ai',
      name: 'AI Service',
      state: 'disabled',
      detail: 'AI features are disabled in platform settings',
      latencyMs: null,
      checkedAt: new Date().toISOString(),
    };
  }

  if (!apiKey) {
    return {
      key: 'ai',
      name: 'AI Service',
      state: 'down',
      detail: `Provider "${settings.aiProvider}" has no API credentials configured`,
      latencyMs: null,
      checkedAt: new Date().toISOString(),
    };
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      method: 'GET',
      headers: { 'x-goog-api-key': apiKey },
      signal: controller.signal,
    });
    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      return {
        key: 'ai',
        name: 'AI Service',
        state: 'degraded',
        detail: `Provider responded with HTTP ${response.status}`,
        latencyMs,
        checkedAt: new Date().toISOString(),
      };
    }

    return {
      key: 'ai',
      name: 'AI Service',
      state: stateFromLatency(latencyMs, 1500),
      detail: `${settings.aiProvider} (${settings.aiModel}) reachable in ${latencyMs} ms`,
      latencyMs,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return {
      key: 'ai',
      name: 'AI Service',
      state: aborted ? 'degraded' : 'down',
      detail: aborted
        ? 'Provider did not respond within 4 seconds'
        : 'Provider could not be reached',
      latencyMs: null,
      checkedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function checkStorage(): HealthCheck {
  const directory = path.resolve(process.cwd(), 'uploads');
  const startedAt = Date.now();

  try {
    if (!existsSync(directory)) {
      return {
        key: 'storage',
        name: 'Storage',
        state: 'degraded',
        detail: 'Uploads directory has not been created yet',
        latencyMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
      };
    }

    accessSync(directory, constants.W_OK | constants.R_OK);
    const latencyMs = Date.now() - startedAt;

    return {
      key: 'storage',
      name: 'Storage',
      state: stateFromLatency(latencyMs, 100),
      detail: 'Uploads directory is readable and writable',
      latencyMs,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      key: 'storage',
      name: 'Storage',
      state: 'down',
      detail: error instanceof Error ? `Not accessible: ${error.message}` : 'Not accessible',
      latencyMs: null,
      checkedAt: new Date().toISOString(),
    };
  }
}

/** Aggregated integration health, derived from live connection records. */
async function checkIntegrations(): Promise<HealthCheck> {
  const { getIntegrationHealthSummary } = await import('./integrationAdmin.service.ts');
  const summary = await getIntegrationHealthSummary();

  if (summary.total === 0) {
    return {
      key: 'integrations',
      name: 'External Integrations',
      state: 'unknown',
      detail: 'No integrations have been connected yet',
      latencyMs: null,
      checkedAt: new Date().toISOString(),
    };
  }

  const state: HealthState =
    summary.failing > 0 ? 'degraded' : summary.connected > 0 ? 'operational' : 'unknown';

  return {
    key: 'integrations',
    name: 'External Integrations',
    state,
    detail:
      summary.failing > 0
        ? `${summary.failing} of ${summary.total} connections need attention`
        : `${summary.connected} of ${summary.total} connections active`,
    latencyMs: null,
    checkedAt: new Date().toISOString(),
  };
}

// ===================== AGGREGATED REPORT =====================

export async function getSystemHealth() {
  const [checks, settings] = await Promise.all([
    Promise.all([checkApi(), checkDatabase(), checkAi(), checkStorage(), checkIntegrations()]),
    getPlatformSettings(),
  ]);

  const overall: HealthState = checks.some((c) => c.state === 'down')
    ? 'down'
    : checks.some((c) => c.state === 'degraded')
      ? 'degraded'
      : checks.some((c) => c.state === 'operational')
        ? 'operational'
        : 'unknown';

  return {
    overall,
    service: {
      name: settings.applicationName,
      environment: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.floor((Date.now() - STARTED_AT) / 1000),
      nodeVersion: process.version,
      platform: process.platform,
      maintenanceMode: settings.maintenanceMode,
    },
    checks,
    checkedAt: new Date().toISOString(),
  };
}

export type SystemHealthReport = Awaited<ReturnType<typeof getSystemHealth>>;

/**
 * Recent system events.
 *
 * Built from records CEOOO genuinely stores:
 *   * FAILURE audit entries (denied admin access, failed operations)
 *   * webhook / background-job rows that recorded an error status
 *   * an explicit notice when maintenance mode is enabled
 *
 * Stack traces are never included — only the operator-safe message.
 */
export async function getSystemEvents(limit = 20): Promise<SystemEventRow[]> {
  const events: SystemEventRow[] = [];

  const [failedAudits, failedWebhooks, settings] = await Promise.all([
    prisma.auditLog.findMany({
      where: { result: 'FAILURE' },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: { id: true, action: true, targetType: true, targetId: true, timestamp: true },
    }),
    prisma.webhookLog
      .findMany({
        where: { OR: [{ error: { not: null } }, { statusCode: { gte: 400 } }] },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          source: true,
          event: true,
          error: true,
          statusCode: true,
          createdAt: true,
        },
      })
      .catch(() => []),
    getPlatformSettings(),
  ]);

  for (const entry of failedAudits) {
    events.push({
      id: `audit-${entry.id}`,
      type: 'warning',
      message: `${entry.action.replace(/[._]/g, ' ')} — ${entry.targetType}${
        entry.targetId ? ` (${entry.targetId})` : ''
      }`,
      source: 'Security',
      timestamp: entry.timestamp.toISOString(),
    });
  }

  for (const entry of failedWebhooks) {
    const status = entry.statusCode ? `HTTP ${entry.statusCode}` : 'request failed';
    events.push({
      id: `webhook-${entry.id}`,
      type: 'error',
      message: `${entry.source} ${entry.event} — ${status}`,
      source: 'Integrations',
      timestamp: entry.createdAt.toISOString(),
    });
  }

  if (settings.maintenanceMode) {
    events.push({
      id: 'maintenance-mode',
      type: 'info',
      message: 'Maintenance mode is currently enabled for the platform',
      source: 'System',
      timestamp: new Date().toISOString(),
    });
  }

  return events
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

