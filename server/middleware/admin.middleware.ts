// middleware/admin.middleware.ts
// Server-side authorization for the /api/admin surface.
//
// Order of enforcement (never trust the client):
//   authenticated?  ->  account active?  ->  admin role?  ->  required permission?
//
// Access is resolved from the database on every request so a role change or
// suspension takes effect immediately, without waiting for a token to expire.
import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.ts';
import type { AuthRequest } from './auth.middleware.ts';
import { auditContext, logAuditEntry } from '../services/audit.service.ts';
import { resolveUserAccess, ADMIN_ROLES, type ResolvedAccess } from '../services/rbac.service.ts';

/** Request augmented with the resolved admin identity + effective permissions. */
export interface AdminRequest extends AuthRequest {
  admin?: ResolvedAccess;
}

async function resolveAuthenticatedAccess(req: Request, res: Response): Promise<ResolvedAccess | null> {
  const authReq = req as AdminRequest;
  const userId = authReq.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return null;
  }

  const access = await resolveUserAccess(userId);
  if (!access) {
    res.status(401).json({ success: false, message: 'User not found' });
    return null;
  }
  if (!access.isActive) {
    res.status(403).json({ success: false, message: 'Account suspended' });
    return null;
  }
  return access;
}

async function resolveAdmin(req: Request, res: Response): Promise<ResolvedAccess | null> {
  const access = await resolveAuthenticatedAccess(req, res);
  if (!access) return null;
  const authReq = req as AdminRequest;

  if (!access.isAdmin) {
    // Record the denial — repeated attempts are a useful security signal.
    await logAuditEntry({
      adminUserId: access.id,
      action: 'admin.access_denied',
      targetType: 'AdminArea',
      targetId: new URL(req.originalUrl || req.url, 'http://localhost').pathname,
      result: 'FAILURE',
      metadata: { role: access.accessRole, method: req.method },
      context: auditContext(req),
    });

    res.status(403).json({
      success: false,
      message: 'Forbidden: administrator role required',
    });
    return null;
  }

  return access;
}

/**
 * Requires an authenticated, active user holding an admin role
 * (ADMIN or the legacy SUPER_ADMIN).
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const access = await resolveAdmin(req, res);
    if (!access) return;

    (req as AdminRequest).admin = access;
    next();
  } catch (error) {
    console.error('Admin authorization error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/** Alias kept so any older imports keep working. */
export const requireSuperAdmin = requireAdmin;

/**
 * Requires a database-resolved permission for the authenticated caller. On the
 * Admin router this runs after requireAdmin; executive routers use it after
 * authenticate. Examples: projects.view, finance.view, admin.users.
 *
 * The permission must exist in the database for the caller's role.
 */
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AdminRequest;
      const access = authReq.admin ?? (await resolveAuthenticatedAccess(req, res));
      if (!access) return;

      authReq.admin = access;

      if (!access.permissions.includes(permission)) {
        await logAuditEntry({
          adminUserId: access.id,
          action: 'admin.permission_denied',
          targetType: 'Permission',
          targetId: permission,
          result: 'FAILURE',
          metadata: { role: access.accessRole, method: req.method, path: req.originalUrl },
          context: auditContext(req),
        });

        res.status(403).json({
          success: false,
          message: `Forbidden: missing permission "${permission}"`,
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Permission authorization error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
};

/**
 * Guards the very last administrator account from being locked out.
 *
 * Counts on `accessRole` (the RBAC key), not `role` (a job title). A user whose
 * job title happens to read "ADMIN" must never satisfy this guard, and a real
 * administrator whose title is "CEO / Founder" must always be counted.
 */
export async function countActiveAdmins(excludeUserId?: string): Promise<number> {
  const admins = await prisma.user.findMany({
    where: {
      isActive: true,
      accessRole: { in: [...ADMIN_ROLES] },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  });
  return admins.length;
}
