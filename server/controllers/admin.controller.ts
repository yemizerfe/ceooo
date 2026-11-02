// controllers/admin.controller.ts
// HTTP layer for the Admin control center.
//
// This file stays thin on purpose: validation happens in middleware, business
// rules live in services, and here we only translate HTTP <-> service calls and
// append the audit trail. Every handler relies on requireAdmin /
// requirePermission having already authorized the request.
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.ts';
import type { AdminRequest } from '../middleware/admin.middleware.ts';
import { auditContext, logAuditEntry } from '../services/audit.service.ts';
import {
  getAdminSettings,
  getAiUsageStats,
  getAuditActions,
  getAuditActors,
  getAuditTargetTypes,
  getDashboardStats,
  getOrganizationDetail,
  getPendingActions,
  getRecentActivity,
  getUserDetail,
  listAuditLogs,
  listOrganizations,
  listSubscriptions,
  listUsers,
  PLANS,
  SUBSCRIPTION_STATUSES,
  updateAdminSettings,
} from '../services/admin.service.ts';
import {
  AdminActionError,
  changeUserRole,
  createUser,
  deleteUser,
  listAssignableRoles,
  resetUserAccess,
  setUserActive,
  updateUser,
} from '../services/adminUser.service.ts';
import {
  createRole,
  deleteRole,
  getAdminIdentity,
  getEffectivePermissions,
  listPermissions,
  listRoles,
  RbacError,
  setRolePermissions,
  updateRole,
} from '../services/rbac.service.ts';
import {
  disconnectIntegrationForAllUsers,
  getIntegrationById,
  listIntegrationsAdmin,
} from '../services/integrationAdmin.service.ts';
import {
  listNotificationSettings,
  setNotificationEnabled,
} from '../services/notificationAdmin.service.ts';
import { getSystemEvents, getSystemHealth } from '../services/systemHealth.service.ts';
import {
  getPlatformSettings,
  passwordPolicyError,
} from '../services/platformSettings.service.ts';

// ===================== HELPERS =====================

function actorId(req: Request): string | undefined {
  return (req as AdminRequest).admin?.id ?? (req as AdminRequest).user?.id;
}

/** Express types query params as string | string[] | undefined. */
function queryString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) return value[0].trim();
  return undefined;
}

function queryInt(value: unknown): number | undefined {
  const raw = queryString(value);
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function paramValue(value: unknown): string {
  return typeof value === 'string' ? value : Array.isArray(value) ? String(value[0] ?? '') : '';
}

/** Maps service-level errors to HTTP responses without leaking internals. */
function fail(res: Response, error: unknown, fallback: string): void {
  if (error instanceof AdminActionError) {
    res.status(error.status).json({ success: false, message: error.message });
    return;
  }
  if (error instanceof RbacError) {
    res.status(error.status).json({ success: false, message: error.message });
    return;
  }
  console.error(`${fallback}:`, error);
  res.status(500).json({ success: false, message: fallback });
}

/** Writes one audit entry. Failures never break the admin operation itself. */
async function audit(
  req: Request,
  entry: {
    action: string;
    targetType: string;
    targetId?: string | null;
    metadata?: Record<string, unknown>;
    result?: 'SUCCESS' | 'FAILURE';
  }
): Promise<void> {
  const admin = (req as AdminRequest).admin;
  await logAuditEntry({
    adminUserId: admin?.id,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId ?? null,
    metadata: entry.metadata ?? {},
    result: entry.result ?? 'SUCCESS',
    context: auditContext(req),
  });
}

// ===================== IDENTITY =====================

export async function getCurrentAdmin(req: Request, res: Response): Promise<void> {
  try {
    const id = actorId(req);
    if (!id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const identity = await getAdminIdentity(id);
    if (!identity) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, data: identity });
  } catch (error) {
    fail(res, error, 'Unable to load admin identity');
  }
}

// ===================== DASHBOARD =====================

export async function getDashboard(req: Request, res: Response): Promise<void> {
  try {
    const [stats, pendingActions, recentActivity, system] = await Promise.all([
      getDashboardStats(),
      getPendingActions(),
      getRecentActivity(8),
      getSystemHealth().catch(() => null),
    ]);

    res.json({
      success: true,
      data: { stats, pendingActions, recentActivity, system },
    });
  } catch (error) {
    fail(res, error, 'Unable to load dashboard');
  }
}

// ===================== USERS =====================

export async function getUsers(req: Request, res: Response): Promise<void> {
  try {
    const data = await listUsers({
      search: queryString(req.query.search),
      status: queryString(req.query.status),
      role: queryString(req.query.role),
      organization: queryString(req.query.organization),
      sort: queryString(req.query.sort) as 'created' | 'lastActive' | 'name' | undefined,
      order: queryString(req.query.order) as 'asc' | 'desc' | undefined,
      page: queryInt(req.query.page) ?? 1,
      limit: queryInt(req.query.limit) ?? 25,
    });
    res.json({ success: true, data });
  } catch (error) {
    fail(res, error, 'Unable to load users');
  }
}

export async function getUser(req: Request, res: Response): Promise<void> {
  try {
    const id = paramValue(req.params.id);
    const [detail, permissions] = await Promise.all([getUserDetail(id), getEffectivePermissions(id)]);
    if (!detail) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, data: { ...detail, permissions } });
  } catch (error) {
    fail(res, error, 'Unable to load user');
  }
}

export async function createUserHandler(req: Request, res: Response): Promise<void> {
  try {
    const actor = actorId(req);
    const { email, name, password, role, organizationId, isVerified } = req.body ?? {};

    if (typeof email !== 'string' || typeof name !== 'string' || typeof password !== 'string' || typeof role !== 'string') {
      res.status(400).json({ success: false, message: 'email, name, password and role are required' });
      return;
    }

    const settings = await getPlatformSettings();
    const policyError = passwordPolicyError(password, settings.requireStrongPassword);
    if (policyError) {
      res.status(400).json({ success: false, message: policyError });
      return;
    }

    const created = await createUser({
      email,
      name,
      password,
      role,
      organizationId: typeof organizationId === 'string' ? organizationId : null,
      isVerified: Boolean(isVerified),
    });

    await audit(req, {
      action: 'user.created',
      targetType: 'User',
      targetId: created.id,
      metadata: { email: created.email, role: created.role, actorId: actor ?? null },
    });

    res.status(201).json({ success: true, data: created, message: 'User created successfully.' });
  } catch (error) {
    fail(res, error, 'Unable to create user');
  }
}

export async function updateUserHandler(req: Request, res: Response): Promise<void> {
  try {
    const actor = actorId(req);
    if (!actor) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const id = paramValue(req.params.id);
    const { name, email, role, organizationId, isVerified } = req.body ?? {};

    const updated = await updateUser(id, actor, {
      ...(typeof name === 'string' ? { name } : {}),
      ...(typeof email === 'string' ? { email } : {}),
      ...(typeof role === 'string' ? { role } : {}),
      ...(typeof organizationId === 'string' ? { organizationId } : {}),
      ...(typeof isVerified === 'boolean' ? { isVerified } : {}),
    });

    await audit(req, {
      action: 'user.updated',
      targetType: 'User',
      targetId: id,
      metadata: { fields: Object.keys(req.body ?? {}) },
    });

    res.json({ success: true, data: updated, message: 'User updated successfully.' });
  } catch (error) {
    fail(res, error, 'Unable to update user');
  }
}

export async function updateUserStatusHandler(req: Request, res: Response): Promise<void> {
  try {
    const actor = actorId(req);
    if (!actor) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const id = paramValue(req.params.id);
    const raw = req.body?.status ?? req.body?.isActive;
    const isActive = typeof raw === 'boolean' ? raw : raw === 'active';

    const updated = await setUserActive(id, actor, isActive);

    await audit(req, {
      action: isActive ? 'user.activated' : 'user.suspended',
      targetType: 'User',
      targetId: id,
      metadata: { isActive },
    });

    res.json({
      success: true,
      data: updated,
      message: isActive ? 'User activated.' : 'User suspended.',
    });
  } catch (error) {
    fail(res, error, 'Unable to change user status');
  }
}

export async function changeUserRoleHandler(req: Request, res: Response): Promise<void> {
  try {
    const actor = actorId(req);
    if (!actor) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const id = paramValue(req.params.id);
    const role = req.body?.role;
    if (typeof role !== 'string' || !role.trim()) {
      res.status(400).json({ success: false, message: 'role is required' });
      return;
    }

    const updated = await changeUserRole(id, actor, role.trim());

    await audit(req, {
      action: 'user.role_changed',
      targetType: 'User',
      targetId: id,
      metadata: { role: role.trim() },
    });

    res.json({ success: true, data: updated, message: 'Role changed successfully.' });
  } catch (error) {
    fail(res, error, 'Unable to change role');
  }
}

export async function resetUserAccessHandler(req: Request, res: Response): Promise<void> {
  try {
    const id = paramValue(req.params.id);
    const result = await resetUserAccess(id);

    await audit(req, {
      action: 'user.access_reset',
      targetType: 'User',
      targetId: id,
      metadata: { note: 'Temporary password issued' },
    });

    res.json({
      success: true,
      data: result,
      message: 'Access reset. The temporary password is shown once.',
    });
  } catch (error) {
    fail(res, error, 'Unable to reset user access');
  }
}

export async function deleteUserHandler(req: Request, res: Response): Promise<void> {
  try {
    const actor = actorId(req);
    if (!actor) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const id = paramValue(req.params.id);
    const confirmation = queryString(req.body?.confirmation) ?? queryString(req.query.confirmation) ?? '';

    const result = await deleteUser(id, actor, confirmation);

    await audit(req, {
      action: 'user.deleted',
      targetType: 'User',
      targetId: id,
      metadata: { userId: id },
    });

    res.json({ success: true, data: result, message: 'User deleted.' });
  } catch (error) {
    fail(res, error, 'Unable to delete user');
  }
}

export async function listAssignableRolesHandler(_req: Request, res: Response): Promise<void> {
  try {
    res.json({ success: true, data: await listAssignableRoles() });
  } catch (error) {
    fail(res, error, 'Unable to load roles');
  }
}

// ===================== ROLES & PERMISSIONS =====================

export async function getRolesHandler(_req: Request, res: Response): Promise<void> {
  try {
    res.json({ success: true, data: await listRoles() });
  } catch (error) {
    fail(res, error, 'Unable to load roles');
  }
}

export async function createRoleHandler(req: Request, res: Response): Promise<void> {
  try {
    const { name, label, description } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim() || typeof label !== 'string' || !label.trim()) {
      res.status(400).json({ success: false, message: 'name and label are required' });
      return;
    }

    const created = await createRole({
      name: name.trim().toUpperCase().replace(/\s+/g, '_'),
      label: label.trim(),
      description: typeof description === 'string' ? description.trim() : undefined,
    });

    await audit(req, {
      action: 'role.created',
      targetType: 'Role',
      targetId: created.id,
      metadata: { name: created.name },
    });

    res.status(201).json({ success: true, data: created, message: 'Role created.' });
  } catch (error) {
    fail(res, error, 'Unable to create role');
  }
}

export async function updateRoleHandler(req: Request, res: Response): Promise<void> {
  try {
    const id = paramValue(req.params.id);
    const { label, description } = req.body ?? {};

    const updated = await updateRole(id, {
      ...(typeof label === 'string' ? { label } : {}),
      ...(typeof description === 'string' ? { description } : {}),
    });

    await audit(req, {
      action: 'role.updated',
      targetType: 'Role',
      targetId: id,
      metadata: { name: updated.name },
    });

    res.json({ success: true, data: updated, message: 'Role updated.' });
  } catch (error) {
    fail(res, error, 'Unable to update role');
  }
}

export async function deleteRoleHandler(req: Request, res: Response): Promise<void> {
  try {
    const id = paramValue(req.params.id);
    await deleteRole(id);

    await audit(req, {
      action: 'role.deleted',
      targetType: 'Role',
      targetId: id,
    });

    res.json({ success: true, message: 'Role deleted.' });
  } catch (error) {
    fail(res, error, 'Unable to delete role');
  }
}

export async function setRolePermissionsHandler(req: Request, res: Response): Promise<void> {
  try {
    const id = paramValue(req.params.id);
    const raw = req.body?.permissionKeys ?? req.body?.permissions;
    if (!Array.isArray(raw) || raw.some((key) => typeof key !== 'string')) {
      res.status(400).json({ success: false, message: 'permissionKeys must be an array of strings' });
      return;
    }

    const keys = await setRolePermissions(id, raw as string[]);

    await audit(req, {
      action: 'permission.updated',
      targetType: 'Role',
      targetId: id,
      metadata: { permissionCount: keys.length },
    });

    res.json({ success: true, data: { permissionKeys: keys }, message: 'Permissions updated.' });
  } catch (error) {
    fail(res, error, 'Unable to update permissions');
  }
}

export async function getPermissionsHandler(_req: Request, res: Response): Promise<void> {
  try {
    res.json({ success: true, data: await listPermissions() });
  } catch (error) {
    fail(res, error, 'Unable to load permissions');
  }
}

// ===================== ORGANIZATIONS =====================

export async function getOrganizations(req: Request, res: Response): Promise<void> {
  try {
    const data = await listOrganizations({
      search: queryString(req.query.search),
      status: queryString(req.query.status),
      plan: queryString(req.query.plan),
      page: queryInt(req.query.page) ?? 1,
      limit: queryInt(req.query.limit) ?? 25,
    });
    res.json({ success: true, data });
  } catch (error) {
    fail(res, error, 'Unable to load organizations');
  }
}

export async function getOrganization(req: Request, res: Response): Promise<void> {
  try {
    const id = paramValue(req.params.id);
    const detail = await getOrganizationDetail(id);
    if (!detail) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }
    res.json({ success: true, data: detail });
  } catch (error) {
    fail(res, error, 'Unable to load organization');
  }
}

export async function updateOrganizationHandler(req: Request, res: Response): Promise<void> {
  try {
    const id = paramValue(req.params.id);
    const { name, isActive, plan, subscriptionStatus } = req.body ?? {};

    const data: Record<string, unknown> = {};
    if (typeof name === 'string' && name.trim()) data.name = name.trim();
    if (typeof isActive === 'boolean') data.isActive = isActive;
    if (typeof plan === 'string' && PLANS.includes(plan)) data.plan = plan;
    if (typeof subscriptionStatus === 'string' && SUBSCRIPTION_STATUSES.includes(subscriptionStatus)) {
      data.subscriptionStatus = subscriptionStatus;
    }

    if (!Object.keys(data).length) {
      res.status(400).json({ success: false, message: 'No valid fields to update' });
      return;
    }

    const updated = await prisma.organization.update({ where: { id }, data });

    await audit(req, {
      action: 'organization.updated',
      targetType: 'Organization',
      targetId: id,
      metadata: { fields: Object.keys(data) },
    });

    res.json({ success: true, data: updated, message: 'Organization updated.' });
  } catch (error) {
    fail(res, error, 'Unable to update organization');
  }
}

export async function getSubscriptionsHandler(req: Request, res: Response): Promise<void> {
  try {
    const data = await listSubscriptions({
      search: queryString(req.query.search),
      status: queryString(req.query.status),
      plan: queryString(req.query.plan),
      page: queryInt(req.query.page) ?? 1,
      limit: queryInt(req.query.limit) ?? 25,
    });
    res.json({ success: true, data });
  } catch (error) {
    fail(res, error, 'Unable to load subscriptions');
  }
}

export async function getAiUsageHandler(_req: Request, res: Response): Promise<void> {
  try {
    res.json({ success: true, data: await getAiUsageStats() });
  } catch (error) {
    fail(res, error, 'Unable to load AI usage');
  }
}

// ===================== AUDIT LOGS =====================

export async function getAuditLogsHandler(req: Request, res: Response): Promise<void> {
  try {
    const data = await listAuditLogs({
      search: queryString(req.query.search),
      targetType: queryString(req.query.targetType),
      action: queryString(req.query.action),
      actorId: queryString(req.query.actorId),
      result: queryString(req.query.result),
      from: queryString(req.query.from),
      to: queryString(req.query.to),
      page: queryInt(req.query.page),
      limit: queryInt(req.query.limit),
    });
    res.json({ success: true, data });
  } catch (error) {
    fail(res, error, 'Unable to load audit logs');
  }
}

export async function getAuditTargetTypesHandler(_req: Request, res: Response): Promise<void> {
  try {
    res.json({ success: true, data: await getAuditTargetTypes() });
  } catch (error) {
    fail(res, error, 'Unable to load audit target types');
  }
}

export async function getAuditActionsHandler(_req: Request, res: Response): Promise<void> {
  try {
    res.json({ success: true, data: await getAuditActions() });
  } catch (error) {
    fail(res, error, 'Unable to load audit actions');
  }
}

export async function getAuditActorsHandler(_req: Request, res: Response): Promise<void> {
  try {
    res.json({ success: true, data: await getAuditActors() });
  } catch (error) {
    fail(res, error, 'Unable to load audit actors');
  }
}


