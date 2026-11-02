// services/rbac.service.ts
// Role Based Access Control for the CEOOO admin control center.
//
// Authorization is ALWAYS resolved server-side from the database:
//   user.accessRole (string)  ->  Role row  ->  RolePermission  ->  Permission.key
//
// IMPORTANT: `User.role` is a free-text job title ("CEO / Founder", "COO") set
// during onboarding. It is NEVER used for authorization - only `accessRole` is.
// Reading `role` here previously meant a job title was looked up verbatim in
// the Role catalog, matched nothing, and silently denied every permission.
//
// The frontend only ever hides UI; it never grants access.
import { prisma } from '../lib/prisma.ts';

// Roles that may open the /admin area at all.
export const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const;

/**
 * Role granted to accounts that have no explicit assignment. Every new signup
 * lands here so an unconfigured account is never locked out of its own
 * workspace, while still resolving through the normal catalog + permission
 * tables (never a hardcoded permission list).
 */
export const DEFAULT_ACCESS_ROLE = 'CEO';


// Roles the platform ships with. System roles cannot be deleted, and every
// role except ADMIN can be edited (ADMIN is protected so an operator can never
// lock the platform out of administration).
export interface SeedRole {
  name: string;
  label: string;
  description: string;
  isSystem: boolean;
  permissions: string[] | '*';
}

export const PERMISSION_GROUPS = {
  Users: [
    { key: 'users.view', label: 'View users', description: 'See the user directory and user details' },
    { key: 'users.create', label: 'Create users', description: 'Invite or create platform users' },
    { key: 'users.update', label: 'Update users', description: 'Edit user profiles and role assignment' },
    { key: 'users.delete', label: 'Delete users', description: 'Permanently delete user accounts' },
    { key: 'users.suspend', label: 'Suspend users', description: 'Suspend or reactivate user accounts' },
  ],
  Projects: [
    { key: 'projects.view', label: 'View projects', description: 'Read project and execution data' },
    { key: 'projects.create', label: 'Create projects', description: 'Create new projects' },
    { key: 'projects.update', label: 'Update projects', description: 'Edit projects and milestones' },
    { key: 'projects.delete', label: 'Delete projects', description: 'Delete projects' },
  ],
  Decisions: [
    { key: 'decisions.view', label: 'View decisions', description: 'Read executive decisions' },
    { key: 'decisions.create', label: 'Create decisions', description: 'Create executive decisions' },
    { key: 'decisions.update', label: 'Update decisions', description: 'Edit executive decisions' },
    { key: 'decisions.delete', label: 'Delete decisions', description: 'Delete executive decisions' },
  ],
  Calendar: [
    { key: 'calendar.view', label: 'View calendar', description: 'Read executive calendar events' },
    { key: 'calendar.create', label: 'Create calendar events', description: 'Create calendar events' },
    { key: 'calendar.update', label: 'Update calendar events', description: 'Edit calendar events' },
    { key: 'calendar.delete', label: 'Delete calendar events', description: 'Delete calendar events' },
  ],
  Stakeholders: [
    { key: 'stakeholders.view', label: 'View stakeholders', description: 'Read stakeholder records' },
    { key: 'stakeholders.create', label: 'Create stakeholders', description: 'Create stakeholder records' },
    { key: 'stakeholders.update', label: 'Update stakeholders', description: 'Edit stakeholder records' },
    { key: 'stakeholders.delete', label: 'Delete stakeholders', description: 'Delete stakeholder records' },
  ],
  Notes: [
    { key: 'notes.view', label: 'View notes', description: 'Read executive notes' },
    { key: 'notes.create', label: 'Create notes', description: 'Create executive notes' },
    { key: 'notes.update', label: 'Update notes', description: 'Edit executive notes' },
    { key: 'notes.delete', label: 'Delete notes', description: 'Delete executive notes' },
  ],
  'Financial Data': [
    { key: 'finance.view', label: 'View financials', description: 'Read budgets, financials and forecasts' },
    { key: 'finance.create', label: 'Create financial records', description: 'Create budgets and financial entries' },
    { key: 'finance.update', label: 'Update financial records', description: 'Edit budgets and financial entries' },
    { key: 'finance.delete', label: 'Delete financial records', description: 'Delete budgets and financial entries' },
  ],
  AI: [
    { key: 'ai.use', label: 'Use AI features', description: 'Run AI insights, analysis and briefings' },
    { key: 'ai.configure', label: 'Configure AI', description: 'Change AI provider, model and availability' },
    { key: 'ai.manage', label: 'Manage AI usage', description: 'Review AI usage and limits' },
  ],
  Reports: [
    { key: 'reports.view', label: 'View reports', description: 'Read generated reports' },
    { key: 'reports.create', label: 'Create reports', description: 'Generate new reports' },
    { key: 'reports.export', label: 'Export reports', description: 'Export reports to PDF or spreadsheet' },
  ],
  Performance: [
    { key: 'objectives.view', label: 'View objectives', description: 'Read OKRs and key results' },
    { key: 'objectives.manage', label: 'Manage objectives', description: 'Create, edit and delete OKRs and key results' },
    { key: 'kpis.view', label: 'View KPIs', description: 'Read KPI definitions and history' },
    { key: 'kpis.manage', label: 'Manage KPIs', description: 'Create, edit and delete KPIs and values' },
    { key: 'focus.manage', label: 'Manage focus', description: 'Use focus sessions, tasks and blocks' },
  ],
  Workspace: [
    { key: 'search.use', label: 'Global search', description: 'Search across workspace records' },
    { key: 'team.view', label: 'View team', description: 'Read team member directory' },
    { key: 'team.manage', label: 'Manage team', description: 'Add, edit and remove team members' },
    { key: 'notifications.manage', label: 'Manage notifications', description: 'Read and configure personal notifications' },
    { key: 'integrations.use', label: 'Use integrations', description: 'Connect and sync external systems' },
  ],
  Administration: [
    { key: 'admin.users', label: 'Administration: users', description: 'Manage users from the admin area' },
    { key: 'admin.roles', label: 'Administration: roles', description: 'Manage roles and role permissions' },
    { key: 'admin.settings', label: 'Administration: settings', description: 'Change platform settings' },
    { key: 'admin.audit_logs', label: 'Administration: audit logs', description: 'Read the audit trail' },
    { key: 'admin.integrations', label: 'Administration: integrations', description: 'Manage platform integrations' },
    { key: 'admin.notifications', label: 'Administration: notifications', description: 'Manage notification settings' },
    { key: 'admin.health', label: 'Administration: system health', description: 'View system health and errors' },
    { key: 'admin.organizations', label: 'Administration: organizations', description: 'Manage organizations and workspace configuration' },
    { key: 'admin.dashboard', label: 'Administration: dashboard', description: 'View the platform administration dashboard' },
    { key: 'admin.support', label: 'Administration: support inbox', description: 'Read and triage inbound demo, call, email and chat requests' },
  ],
} as const;

export type PermissionGroupName = keyof typeof PERMISSION_GROUPS;

export const ALL_PERMISSION_KEYS: string[] = Object.values(PERMISSION_GROUPS).flatMap((group) =>
  group.map((permission) => permission.key)
);


// Role catalog. Platform administrators receive account and platform controls
// only. Executive business-data permissions are never granted implicitly.
export const ADMIN_PERMISSION_KEYS: string[] = [
  'users.view',
  'users.create',
  'users.update',
  'users.delete',
  'users.suspend',
  'admin.users',
  'admin.roles',
  'admin.settings',
  'admin.audit_logs',
  'admin.integrations',
  'admin.notifications',
  'admin.health',
  'admin.organizations',
  'admin.dashboard',
  'admin.support',
  'projects.view',
  'projects.create',
  'projects.update',
  'projects.delete',
  'decisions.view',
  'decisions.create',
  'decisions.update',
  'decisions.delete',
  'calendar.view',
  'calendar.create',
  'calendar.update',
  'calendar.delete',
  'stakeholders.view',
  'stakeholders.create',
  'stakeholders.update',
  'stakeholders.delete',
  'notes.view',
  'notes.create',
  'notes.update',
  'notes.delete',
  'finance.view',
  'finance.create',
  'finance.update',
  'finance.delete',
  'ai.use',
  'ai.manage',
  'reports.view',
  'reports.create',
  'reports.export',
  'objectives.view',
  'objectives.manage',
  'kpis.view',
  'kpis.manage',
  'focus.manage',
  'search.use',
  'team.view',
  'team.manage',
  'notifications.manage',
  'integrations.use',
];

export const SEED_ROLES: SeedRole[] = [
  {
    name: 'ADMIN',
    label: 'Administrator',
    description: 'Manages CEOOO platform access and configuration without automatic access to executive business data.',
    isSystem: true,
    permissions: ADMIN_PERMISSION_KEYS,
  },
  {
    name: 'SUPER_ADMIN',
    label: 'Super Administrator',
    description: 'Legacy platform administrator role with the same least-privilege platform grants as ADMIN.',
    isSystem: true,
    permissions: ADMIN_PERMISSION_KEYS,
  },
  {
    name: 'CEO',
    label: 'Executive user',
    description: 'Owns the executive workspace: decisions, budgets, OKRs and KPIs.',
    isSystem: true,
    permissions: [
      'projects.view',
      'projects.create',
      'projects.update',
      'projects.delete',
      'decisions.view',
      'decisions.create',
      'decisions.update',
      'decisions.delete',
      'calendar.view',
      'calendar.create',
      'calendar.update',
      'calendar.delete',
      'stakeholders.view',
      'stakeholders.create',
      'stakeholders.update',
      'stakeholders.delete',
      'notes.view',
      'notes.create',
      'notes.update',
      'notes.delete',
      'finance.view',
      'finance.create',
      'finance.update',
      'finance.delete',
      'ai.use',
      'ai.manage',
      'reports.view',
      'reports.create',
      'reports.export',
      'objectives.view',
      'objectives.manage',
      'kpis.view',
      'kpis.manage',
      'focus.manage',
      'search.use',
      'team.view',
      'team.manage',
      'notifications.manage',
      'integrations.use',
    ],
  },
  {
    name: 'EXECUTIVE',
    label: 'Executive',
    description: 'Senior leadership with read access to performance data and reports.',
    isSystem: false,
    permissions: [
      'projects.view',
      'projects.update',
      'finance.view',
      'ai.use',
      'reports.view',
      'reports.create',
      'reports.export',
      'objectives.view',
      'kpis.view',
      'focus.manage',
      'search.use',
      'team.view',
      'notifications.manage',
    ],
  },
  {
    name: 'MANAGER',
    label: 'Manager',
    description: 'Runs projects and budgets within a workspace.',
    isSystem: false,
    permissions: [
      'projects.view',
      'projects.create',
      'projects.update',
      'finance.view',
      'ai.use',
      'reports.view',
      'reports.export',
      'objectives.view',
      'kpis.view',
      'search.use',
      'team.view',
      'notifications.manage',
    ],
  },
  {
    name: 'ANALYST',
    label: 'Analyst',
    description: 'Read-only access to business data with reporting and AI analysis.',
    isSystem: false,
    permissions: [
      'projects.view',
      'finance.view',
      'ai.use',
      'reports.view',
      'reports.create',
      'reports.export',
      'objectives.view',
      'kpis.view',
      'search.use',
      'notifications.manage',
    ],
  },
  {
    name: 'EMPLOYEE',
    label: 'Employee',
    description: 'Standard member of a workspace with read access to their projects.',
    isSystem: false,
    permissions: ['projects.view', 'ai.use', 'search.use', 'notifications.manage'],
  },
];

export function isAdminRole(role: string | null | undefined): boolean {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role);
}


/** Idempotently creates the permission + role catalog. Safe to call on boot. */
export async function ensureRbacCatalog(): Promise<void> {
  const permissionRows = Object.entries(PERMISSION_GROUPS).flatMap(([group, permissions]) =>
    permissions.map((permission) => ({
      key: permission.key,
      group,
      label: permission.label,
      description: permission.description,
    }))
  );

  for (const row of permissionRows) {
    await prisma.permission.upsert({
      where: { key: row.key },
      create: { ...row, isSystem: true },
      update: { group: row.group, label: row.label, description: row.description },
    });
  }

  const permissions = await prisma.permission.findMany({ select: { id: true, key: true } });
  const permissionIdByKey = new Map<string, string>();
  for (const permission of permissions) permissionIdByKey.set(permission.key, permission.id);

  for (const role of SEED_ROLES) {
    const existing = await prisma.role.findUnique({ where: { name: role.name } });

    if (!existing) {
      await prisma.role.create({
        data: {
          name: role.name,
          label: role.label,
          description: role.description,
          isSystem: role.isSystem,
        },
      });
    } else if (existing.isSystem && role.isSystem) {
      // Keep labels in sync for system roles without touching grants.
      await prisma.role.update({
        where: { id: existing.id },
        data: { label: role.label, description: role.description, isSystem: true },
      });
    }

    const roleRow = await prisma.role.findUnique({ where: { name: role.name } });
    if (!roleRow) continue;

    // Platform administrator roles are protected and always receive the exact
    // least-privilege administrative grant. This also repairs legacy wildcard
    // grants when the server boots against an existing database.
    if (isPermissionLockedRole(role.name)) {
      const roleKeys = role.permissions === '*' ? Object.keys(PERMISSION_GROUPS).flatMap((g) => (PERMISSION_GROUPS as any)[g].map((p: any) => p.key)) : role.permissions;
      const permissionIds = roleKeys
        .map((key) => permissionIdByKey.get(key))
        .filter((id): id is string => Boolean(id));
      await prisma.$transaction([
        prisma.rolePermission.deleteMany({ where: { roleId: roleRow.id } }),
        prisma.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId: roleRow.id, permissionId })),
          skipDuplicates: true,
        }),
      ]);
      continue;
    }

    const grantedCount = await prisma.rolePermission.count({ where: { roleId: roleRow.id } });
    if (grantedCount > 0) {
      // Existing system roles may predate a newly shipped permission. Add only
      // missing seed grants; never remove permissions an operator has added.
      if (role.isSystem) {
        const roleKeys = role.permissions === '*' ? [] : role.permissions;
        const expectedIds = roleKeys
          .map((key) => permissionIdByKey.get(key))
          .filter((id): id is string => Boolean(id));
        const existing = await prisma.rolePermission.findMany({
          where: { roleId: roleRow.id },
          select: { permissionId: true },
        });
        const existingIds = new Set(existing.map((grant) => grant.permissionId));
        const missing = expectedIds.filter((permissionId) => !existingIds.has(permissionId));
        if (missing.length) {
          await prisma.rolePermission.createMany({
            data: missing.map((permissionId) => ({ roleId: roleRow.id, permissionId })),
            skipDuplicates: true,
          });
        }
      }
      continue;
    }

    const keys = role.permissions === '*' ? [] : role.permissions;
    const data = keys
      .map((key) => permissionIdByKey.get(key))
      .filter((id): id is string => Boolean(id))
      .map((permissionId) => ({ roleId: roleRow.id, permissionId }));

    if (data.length) {
      await prisma.rolePermission.createMany({ data, skipDuplicates: true });
    }
  }

  invalidateRbacCache();
}

// ===================== PERMISSION RESOLUTION =====================

// Resolved per request and cached briefly to keep admin pages fast.
const CACHE_TTL_MS = 10_000;
const permissionsByRole = new Map<string, { keys: string[]; at: number }>();

export function invalidateRbacCache(roleName?: string): void {
  if (roleName) permissionsByRole.delete(roleName);
  else permissionsByRole.clear();
}

export async function getRolePermissionKeys(roleName: string): Promise<string[]> {
  const cached = permissionsByRole.get(roleName);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.keys;

  const role = await prisma.role.findUnique({
    where: { name: roleName },
    include: { permissions: { include: { permission: { select: { key: true } } } } },
  });

  const keys = role ? role.permissions.map((rp) => rp.permission.key).sort() : [];
  permissionsByRole.set(roleName, { keys, at: Date.now() });
  return keys;
}

export interface ResolvedAccess {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  accessRole: string;
  isActive: boolean;
  isAdmin: boolean;
  avatarUrl: string | null;
  permissions: string[];
}

/**
 * Resolves the RBAC role name for a user record.
 *
 * Defensive by design: a missing or unrecognized value falls back to
 * DEFAULT_ACCESS_ROLE instead of yielding an empty permission set. Previously an
 * unresolved role produced `[]`, which surfaced to the user as a wall of
 * "Forbidden: missing permission" errors rather than a usable account.
 */
export function resolveAccessRoleName(accessRole: string | null | undefined): string {
  const trimmed = typeof accessRole === 'string' ? accessRole.trim() : '';
  if (!trimmed) return DEFAULT_ACCESS_ROLE;
  const known = SEED_ROLES.some((role) => role.name === trimmed);
  return known ? trimmed : DEFAULT_ACCESS_ROLE;
}

export async function resolveUserAccess(userId: string): Promise<ResolvedAccess | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, accessRole: true, isActive: true, avatarUrl: true },
  });

  if (!user) return null;

  // `accessRole` is authoritative. `role` is only a fallback for rows written
  // before the column existed, and only when it is already a valid catalog key.
  const accessRole = resolveAccessRoleName(user.accessRole ?? user.role);

  const isAdmin = isAdminRole(accessRole);
  const permissions = await getRolePermissionKeys(accessRole);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    accessRole,
    isActive: user.isActive,
    isAdmin,
    avatarUrl: user.avatarUrl,
    // Never synthesize business-data access from administrator status.
    permissions,
  };
}


// ===================== ADMIN IDENTITY =====================

export interface AdminIdentity {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  accessRole: string;
  roleLabel: string;
  isAdmin: boolean;
  avatarUrl: string | null;
  permissions: string[];
}

/**
 * Identity payload for the admin shell (header + sidebar + permission gates).
 * Permissions come from the database, never from the client.
 */
export async function getAdminIdentity(userId: string): Promise<AdminIdentity | null> {
  const access = await resolveUserAccess(userId);
  if (!access) return null;

  // Label is looked up by the resolved RBAC key, not the job title.
  const role = await prisma.role.findUnique({
    where: { name: access.accessRole },
    select: { label: true },
  });

  return {
    id: access.id,
    email: access.email,
    name: access.name,
    role: access.role,
    accessRole: access.accessRole,
    roleLabel: role?.label ?? access.accessRole,
    isAdmin: access.isAdmin,
    avatarUrl: access.avatarUrl,
    permissions: [...access.permissions].sort(),
  };
}

// ===================== ROLE & PERMISSION MANAGEMENT =====================

export class RbacError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'RbacError';
    this.status = status;
  }
}

export interface RoleRow {
  id: string;
  name: string;
  label: string;
  description: string | null;
  isSystem: boolean;
  /** ADMIN / SUPER_ADMIN always hold every permission and cannot be edited. */
  isProtected: boolean;
  userCount: number;
  permissionCount: number;
  permissions: string[];
}

function isPermissionLockedRole(name: string): boolean {
  return name === 'ADMIN' || name === 'SUPER_ADMIN';
}

export async function listRoles(): Promise<RoleRow[]> {
  const roles = await prisma.role.findMany({
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    include: {
      permissions: { include: { permission: { select: { key: true } } } },
      _count: { select: { permissions: true } },
    },
  });

  const userCounts = await prisma.user.groupBy({ by: ['role'], _count: { _all: true } });
  const userCountByRole = new Map<string, number>();
  for (const row of userCounts) {
    if (row.role) userCountByRole.set(row.role, row._count._all);
  }

  return roles.map((role) => {
    const locked = isPermissionLockedRole(role.name);
    return {
      id: role.id,
      name: role.name,
      label: role.label,
      description: role.description,
      isSystem: role.isSystem,
      isProtected: locked,
      userCount: userCountByRole.get(role.name) ?? 0,
      permissionCount: locked ? ADMIN_PERMISSION_KEYS.length : role._count.permissions,
      permissions: locked
        ? [...ADMIN_PERMISSION_KEYS]
        : role.permissions.map((rp) => rp.permission.key).sort(),
    };
  });
}

export interface PermissionRow {
  id: string;
  key: string;
  group: string;
  label: string;
  description: string | null;
  roleCount: number;
  roles: string[];
}

export async function listPermissions(): Promise<{
  groups: { group: string; permissions: PermissionRow[] }[];
  total: number;
}> {
  const permissions = await prisma.permission.findMany({
    include: { roles: { include: { role: { select: { name: true } } } } },
    orderBy: [{ group: 'asc' }, { key: 'asc' }],
  });

  const rows: PermissionRow[] = permissions.map((permission) => {
    const roles = permission.roles.map((rp) => rp.role.name).sort();
    return {
      id: permission.id,
      key: permission.key,
      group: permission.group,
      label: permission.label,
      description: permission.description,
      roleCount: roles.length,
      roles,
    };
  });

  const groupOrder = Object.keys(PERMISSION_GROUPS) as string[];
  const grouped = new Map<string, PermissionRow[]>();
  for (const row of rows) {
    const list = grouped.get(row.group) ?? [];
    list.push(row);
    grouped.set(row.group, list);
  }

  const groups = [...grouped.entries()]
    .sort((a, b) => {
      const ai = groupOrder.indexOf(a[0]);
      const bi = groupOrder.indexOf(b[0]);
      if (ai === -1 && bi === -1) return a[0].localeCompare(b[0]);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    })
    .map(([group, perms]) => ({ group, permissions: perms }));

  return { groups, total: rows.length };
}

// ===================== ROLE WRITE OPERATIONS =====================

const ROLE_NAME_PATTERN = /^[A-Z][A-Z0-9_]{1,29}$/;

function normaliseRoleName(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, '_');
}

async function resolvePermissionIds(keys: string[]): Promise<string[]> {
  const wanted = [...new Set(keys.filter((key) => ALL_PERMISSION_KEYS.includes(key)))];
  if (!wanted.length) return [];

  const rows = await prisma.permission.findMany({
    where: { key: { in: wanted } },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

export interface CreateRoleInput {
  name: string;
  label?: string;
  description?: string;
  permissions?: string[];
}

export async function createRole(input: CreateRoleInput): Promise<RoleRow> {
  const name = normaliseRoleName(input.name || '');

  if (!ROLE_NAME_PATTERN.test(name)) {
    throw new RbacError(
      'Role name must be 2-30 characters, start with a letter and use only letters, numbers or underscores'
    );
  }

  const existing = await prisma.role.findUnique({ where: { name } });
  if (existing) throw new RbacError('A role with that name already exists', 409);

  const permissionIds = await resolvePermissionIds(input.permissions ?? []);

  const role = await prisma.role.create({
    data: {
      name,
      label: input.label?.trim() || name,
      description: input.description?.trim() || null,
      isSystem: false,
      permissions: permissionIds.length
        ? { createMany: { data: permissionIds.map((permissionId) => ({ permissionId })) } }
        : undefined,
    },
  });

  invalidateRbacCache();
  const roles = await listRoles();
  return roles.find((row) => row.id === role.id)!;
}

export interface UpdateRoleInput {
  label?: string;
  description?: string;
  permissions?: string[];
}

export async function updateRole(id: string, input: UpdateRoleInput): Promise<RoleRow> {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw new RbacError('Role not found', 404);

  if (isPermissionLockedRole(role.name)) {
    throw new RbacError(`${role.name} is a protected system role and always holds every permission`, 409);
  }

  const data: { label?: string; description?: string | null } = {};
  if (typeof input.label === 'string' && input.label.trim()) data.label = input.label.trim();
  if (typeof input.description === 'string') data.description = input.description.trim() || null;

  if (Object.keys(data).length) {
    await prisma.role.update({ where: { id }, data });
  }

  if (Array.isArray(input.permissions)) {
    await setRolePermissions(id, input.permissions);
  }

  invalidateRbacCache(role.name);
  const roles = await listRoles();
  return roles.find((row) => row.id === id)!;
}

export async function setRolePermissions(roleId: string, keys: string[]): Promise<string[]> {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new RbacError('Role not found', 404);

  if (isPermissionLockedRole(role.name)) {
    throw new RbacError(`${role.name} always holds every permission`, 409);
  }

  const permissionIds = await resolvePermissionIds(keys);

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    ...(permissionIds.length
      ? [
          prisma.rolePermission.createMany({
            data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);

  invalidateRbacCache(role.name);
  return getRolePermissionKeys(role.name);
}

export async function deleteRole(id: string): Promise<void> {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw new RbacError('Role not found', 404);

  if (role.isSystem) {
    throw new RbacError(`${role.name} is a system role. System roles cannot be deleted.`, 409);
  }

  const assigned = await prisma.user.count({ where: { role: role.name } });
  if (assigned > 0) {
    throw new RbacError(
      `${role.name} is assigned to ${assigned} user${assigned === 1 ? '' : 's'}. Move them to another role first.`,
      409
    );
  }

  await prisma.role.delete({ where: { id } });
  invalidateRbacCache(role.name);
}

/** Effective permissions for a specific user (used by the user detail page). */
export async function getEffectivePermissions(userId: string) {
  const access = await resolveUserAccess(userId);
  if (!access) return null;

  // Permissions come from the RBAC catalog key (`accessRole`). `role` is a
  // free-text job title such as "CEO / Founder" and has no permission set.
  const effective = await getRolePermissionKeys(access.accessRole);

  return {
    role: access.accessRole,
    jobTitle: access.role,
    isAdmin: access.isAdmin,
    rolePermissionKeys: effective,
    effectivePermissions: [...effective].sort(),
  };
}
