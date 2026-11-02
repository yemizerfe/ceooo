// services/audit.service.ts
import { prisma } from '../lib/prisma.ts';

export interface AuditMetadata {
  [key: string]: unknown;
}

export type AuditResult = 'SUCCESS' | 'FAILURE';

export interface AuditRequestContext {
  ip?: string | null;
  userAgent?: string | null;
}

/** Minimal request shape needed for audit context (avoids Express coupling). */
interface RequestLike {
  ip?: string;
  headers?: Record<string, unknown>;
  socket?: { remoteAddress?: string };
}

/**
 * Extracts non-sensitive request context for the audit trail.
 * NOTE: only IP + user agent are collected — never tokens, bodies or secrets.
 */
export function auditContext(req: RequestLike): AuditRequestContext {
  const forwarded = req.headers?.['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwarded)
    ? String(forwarded[0])
    : typeof forwarded === 'string'
      ? forwarded.split(',')[0]
      : null;

  return {
    ip: (forwardedIp || req.ip || req.socket?.remoteAddress || '').trim().slice(0, 64) || null,
    userAgent:
      typeof req.headers?.['user-agent'] === 'string'
        ? String(req.headers['user-agent']).slice(0, 255)
        : null,
  };
}

export interface AuditEntry {
  adminUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  result?: AuditResult;
  metadata?: AuditMetadata;
  context?: AuditRequestContext;
}

/**
 * Records an important administrative action in the audit trail.
 * Never throws — audit failures must not break the main flow.
 */
export async function logAuditEntry(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminUserId: entry.adminUserId ?? null,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId ?? null,
        result: entry.result ?? 'SUCCESS',
        ipAddress: entry.context?.ip ?? null,
        userAgent: entry.context?.userAgent ?? null,
        metadata: (entry.metadata ?? {}) as object,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

/** Backwards compatible signature used by existing controllers. */
export async function logAudit(
  adminUserId: string | undefined,
  action: string,
  targetType: string,
  targetId?: string,
  metadata?: AuditMetadata
): Promise<void> {
  await logAuditEntry({ adminUserId, action, targetType, targetId, metadata });
}
