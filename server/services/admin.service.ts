// services/admin.service.ts
// Pure data aggregation helpers for the admin panel.
// Controllers translate HTTP concerns; this file keeps queries organized.
import { prisma } from '../lib/prisma.ts';
import {
  getPlatformSettings,
  updatePlatformSettings,
  invalidateSettingsCache,
  type PlatformSettings,
} from './platformSettings.service.ts';

export const PLAN_LIMITS: Record<string, number> = { free: 100, pro: 2000, business: 10000 };
export const SUBSCRIPTION_STATUSES = ['trial', 'active', 'past_due', 'cancelled'];
export const PLANS = ['free', 'pro', 'business'];

export function startOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
  companyName: string | null;
  industry: string | null;
  avatarUrl: string | null;
  subscriptionPlan: string;
  aiUsageCount: number;
  isActive: boolean;
  isVerified: boolean;
  hasCompletedOnboarding: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  organizationId: string | null;
  organization: { id: string; name: string; subscriptionStatus: string; plan: string } | null;
  status: string;
}

// ===================== OVERVIEW =====================

export async function getOverviewStats() {
  const now = new Date();
  const monthStart = startOfMonth(now);

  const [
    totalUsers,
    activeUsers,
    totalOrganizations,
    newUsersThisMonth,
    trialAccounts,
    activeSubscriptions,
    aiRequestsTotal,
    aiRequestsThisMonth,
    aiUsageByMonth,
    usersByPlan,
    recentActivity,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.organization.count(),
    prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.organization.count({ where: { subscriptionStatus: 'trial' } }),
    prisma.organization.count({ where: { subscriptionStatus: { in: ['active', 'trial'] } } }),
    prisma.aIUsage.count(),
    prisma.aIUsage.count({ where: { createdAt: { gte: monthStart } } }),
    getAiUsageByMonth(6),
    getUserBreakdownByPlan(),
    getRecentAuditActivity(8),
  ]);

  return {
    totalUsers,
    activeUsers,
    totalOrganizations,
    newUsersThisMonth,
    activeSubscriptions,
    trialAccounts,
    aiRequestsTotal,
    aiRequestsThisMonth,
    aiUsageByMonth,
    usersByPlan,
    recentActivity,
  };
}

async function getAiUsageByMonth(months: number) {
  const now = new Date();
  const result: { key: string; label: string; requests: number }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const count = await prisma.aIUsage.count({
      where: { createdAt: { gte: start, lt: end } },
    });
    result.push({
      key: monthKey(d),
      label: d.toLocaleString('en', { month: 'short' }),
      requests: count,
    });
  }
  return result;
}

async function getUserBreakdownByPlan() {
  const grouped = await prisma.user.groupBy({
    by: ['subscriptionPlan'],
    _count: { _all: true },
  });
  return grouped
    .map((g) => ({ plan: g.subscriptionPlan, count: g._count._all }))
    .sort((a, b) => b.count - a.count);
}

/** Recent administrative events for the dashboard activity table. */
export async function getRecentActivity(limit = 10) {
  return getRecentAuditActivity(limit);
}

async function getRecentAuditActivity(limit: number) {
  const rows = await prisma.auditLog.findMany({
    take: limit,
    orderBy: { timestamp: 'desc' },
    include: { admin: { select: { id: true, name: true, email: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    admin: r.admin
      ? { id: r.admin.id, name: r.admin.name, email: r.admin.email }
      : null,
    action: r.action,
    targetType: r.targetType,
    targetId: r.targetId,
    result: r.result,
    timestamp: r.timestamp,
    metadata: r.metadata,
  }));
}

// ===================== DASHBOARD (platform control center) =====================

/**
 * Aggregated statistics for /admin/dashboard.
 *
 * This intentionally does NOT duplicate the CEO dashboard: it only reports
 * platform-level facts (accounts, workspaces, administrator attention items)
 * plus real system health, which is fetched separately.
 */
export async function getDashboardStats() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers,
    suspendedUsers,
    pendingUsers,
    newUsersThisMonth,
    activeLast7Days,
    totalOrganizations,
    activeOrganizations,
    organizationMembers,
    failedAuditLast24h,
    recentActivity,
    rolesInUse,
    aiRequestsThisMonth,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: false } }),
    prisma.user.count({ where: { isActive: true, isVerified: false } }),
    prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.user.count({ where: { lastLoginAt: { gte: sevenDaysAgo } } }),
    prisma.organization.count(),
    prisma.organization.count({ where: { isActive: true } }),
    // Membership count comes from the User <-> Organization relation
    // (there is no separate join table in the CEOOO schema).
    prisma.user.count({ where: { organizationId: { not: null } } }),
    prisma.auditLog.count({ where: { result: 'FAILURE', timestamp: { gte: dayAgo } } }),
    getRecentAuditActivity(10),
    // Group by the RBAC key so the dashboard reports real access grants rather
    // than free-text job titles.
    prisma.user.groupBy({ by: ['accessRole'], _count: { _all: true } }),
    prisma.aIUsage.count({ where: { createdAt: { gte: monthStart } } }).catch(() => 0),
  ]);

  const pendingActions = await getPendingActions({
    pendingUsers,
    suspendedUsers,
    failedAuditLast24h,
  });

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      suspended: suspendedUsers,
      pending: pendingUsers,
      newThisMonth: newUsersThisMonth,
      activeLast7Days,
    },
    organizations: {
      total: totalOrganizations,
      active: activeOrganizations,
      members: organizationMembers,
    },
    roles: rolesInUse
      .map((row) => ({ role: row.accessRole ?? 'UNASSIGNED', count: row._count._all }))
      .sort((a, b) => b.count - a.count),
    aiRequestsThisMonth,
    pendingActions,
    recentActivity,
  };
}

export interface PendingAction {
  id: string;
  title: string;
  description: string;
  count: number;
  severity: 'info' | 'warning' | 'critical';
  href: string;
  actionLabel: string;
}

/**
 * Administrative tasks that genuinely require attention. Each entry is derived
 * from real records â€” nothing is hard-coded.
 */
export async function getPendingActions(seed?: {
  pendingUsers?: number;
  suspendedUsers?: number;
  failedAuditLast24h?: number;
}): Promise<PendingAction[]> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [pendingUsers, failedAuditLast24h, settings, pendingIntegrations] = await Promise.all([
    seed?.pendingUsers ?? prisma.user.count({ where: { isActive: true, isVerified: false } }),
    seed?.failedAuditLast24h ??
      prisma.auditLog.count({ where: { result: 'FAILURE', timestamp: { gte: dayAgo } } }),
    getPlatformSettings(),
    prisma.organization.count({ where: { subscriptionStatus: 'past_due' } }),
  ]);

  const actions: PendingAction[] = [];

  if (pendingUsers > 0) {
    actions.push({
      id: 'unverified-users',
      title: 'Accounts awaiting verification',
      description: `${pendingUsers} account${pendingUsers === 1 ? '' : 's'} signed up but ${
        pendingUsers === 1 ? 'has' : 'have'
      } not verified their email address.`,
      count: pendingUsers,
      severity: 'warning',
      href: '/admin/users?status=pending',
      actionLabel: 'Review accounts',
    });
  }

  if (failedAuditLast24h > 0) {
    actions.push({
      id: 'failed-admin-actions',
      title: 'Failed administrative actions',
      description: `${failedAuditLast24h} administrative operation${
        failedAuditLast24h === 1 ? '' : 's'
      } failed or was denied in the last 24 hours.`,
      count: failedAuditLast24h,
      severity: 'critical',
      href: '/admin/audit-logs?result=FAILURE',
      actionLabel: 'Open audit logs',
    });
  }

  if (pendingIntegrations > 0) {
    actions.push({
      id: 'past-due-organizations',
      title: 'Workspaces with billing issues',
      description: `${pendingIntegrations} workspace${
        pendingIntegrations === 1 ? '' : 's'
      } marked as past due.`,
      count: pendingIntegrations,
      severity: 'warning',
      href: '/admin/organization',
      actionLabel: 'Review workspaces',
    });
  }

  if (settings.maintenanceMode) {
    actions.push({
      id: 'maintenance-mode',
      title: 'Maintenance mode is enabled',
      description: 'Users are currently served in maintenance mode.',
      count: 1,
      severity: 'info',
      href: '/admin/settings',
      actionLabel: 'Open settings',
    });
  }

  if (!settings.aiEnabled) {
    actions.push({
      id: 'ai-disabled',
      title: 'AI features are disabled',
      description: 'AI insights are unavailable to every user until AI is re-enabled.',
      count: 1,
      severity: 'info',
      href: '/admin/settings',
      actionLabel: 'Open AI settings',
    });
  }

  return actions;
}

// ===================== USERS =====================

export interface UserListParams {
  search?: string;
  status?: string;
  role?: string;
  organization?: string;
  sort?: 'created' | 'lastActive' | 'name';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export async function listUsers(params: UserListParams) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 50));
  const where: Record<string, unknown> = {};

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { email: { contains: params.search, mode: 'insensitive' } },
      { companyName: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  if (params.status === 'active') where.isActive = true;
  else if (params.status === 'suspended') where.isActive = false;
  else if (params.status === 'pending') {
    where.isActive = true;
    where.isVerified = false;
  }

  if (params.role) {
    // Filter on the RBAC key so the admin UI's role filter matches real grants.
    where.accessRole = { contains: params.role, mode: 'insensitive' };
  }

  if (params.organization) {
    where.organizationId = params.organization;
  }

  const total = await prisma.user.count({ where });

  const orderBy =
    params.sort === 'lastActive'
      ? { lastLoginAt: params.order ?? 'desc' }
      : params.sort === 'name'
        ? { name: params.order ?? 'asc' }
        : { createdAt: params.order ?? 'desc' };

  const users = await prisma.user.findMany({
    where,
    orderBy: orderBy as never,
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      accessRole: true,
      companyName: true,
      industry: true,
      avatarUrl: true,
      subscriptionPlan: true,
      aiUsageCount: true,
      isActive: true,
      isVerified: true,
      hasCompletedOnboarding: true,
      createdAt: true,
      lastLoginAt: true,
      organizationId: true,
      organization: {
        select: { id: true, name: true, subscriptionStatus: true, plan: true },
      },
    },
  });

  const items: UserRow[] = users.map((u) => ({
    ...u,
    status: u.isActive ? (u.isVerified ? 'active' : 'pending') : 'suspended',
  }));

  return { items, total, page, limit };
}

export async function getUserDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      role: true,
      accessRole: true,
      companyName: true,
      industry: true,
      companySize: true,
      bio: true,
      subscriptionPlan: true,
      aiUsageCount: true,
      isActive: true,
      isVerified: true,
      hasCompletedOnboarding: true,
      createdAt: true,
      lastLoginAt: true,
      organizationId: true,
      organization: {
        select: {
          id: true,
          name: true,
          plan: true,
          subscriptionStatus: true,
          isActive: true,
        },
      },
      ownedOrganizations: { select: { id: true, name: true } },
    },
  });

  if (!user) return null;

  return {
    ...user,
    status: user.isActive ? (user.isVerified ? 'active' : 'pending') : 'suspended',
  };
}

// ===================== ORGANIZATIONS =====================

export interface OrganizationListParams {
  search?: string;
  status?: string;
  plan?: string;
  page?: number;
  limit?: number;
}

export async function listOrganizations(params: OrganizationListParams) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 50));
  const where: Record<string, unknown> = {};

  if (params.search) {
    where.name = { contains: params.search, mode: 'insensitive' };
  }
  // status here maps to account status (active / suspended)
  if (params.status === 'active') where.isActive = true;
  else if (params.status === 'suspended') where.isActive = false;
  if (params.plan && PLANS.includes(params.plan)) where.plan = params.plan;

  const total = await prisma.organization.count({ where });
  const orgs = await prisma.organization.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      owner: { select: { id: true, name: true, email: true, isActive: true } },
      _count: { select: { members: true } },
    },
  });

  const items = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    industry: o.industry,
    companySize: o.companySize,
    plan: o.plan,
    subscriptionStatus: o.subscriptionStatus,
    ownerId: o.ownerId,
    ownerName: o.owner?.name ?? null,
    ownerEmail: o.owner?.email ?? null,
    memberCount: o._count.members ?? 0,
    isActive: o.isActive,
    createdAt: o.createdAt,
    subscriptionStartDate: o.subscriptionStartDate,
    subscriptionRenewalDate: o.subscriptionRenewalDate,
  }));

  return { items, total, page, limit };
}

export async function getOrganizationDetail(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      },
      members: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          subscriptionPlan: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!org) return null;

  const { members, owner, ...rest } = org;
  return { ...rest, owner, memberCount: members.length, members };
}

export interface SubscriptionRow {
  id: string;
  name: string;
  ownerName: string | null;
  ownerEmail: string | null;
  plan: string;
  subscriptionStatus: string;
  subscriptionStartDate: Date | null;
  subscriptionRenewalDate: Date | null;
  isActive: boolean;
  memberCount: number;
  createdAt: Date;
}

export async function listSubscriptions(params: OrganizationListParams) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 50));
  const where: Record<string, unknown> = {};

  if (params.search) where.name = { contains: params.search, mode: 'insensitive' };
  if (params.plan && PLANS.includes(params.plan)) where.plan = params.plan;
  if (params.status && SUBSCRIPTION_STATUSES.includes(params.status)) {
    where.subscriptionStatus = params.status;
  }

  const total = await prisma.organization.count({ where });
  const orgs = await prisma.organization.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      owner: { select: { name: true, email: true } },
      _count: { select: { members: true } },
    },
  });

  const items: SubscriptionRow[] = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    ownerName: o.owner?.name ?? null,
    ownerEmail: o.owner?.email ?? null,
    plan: o.plan,
    subscriptionStatus: o.subscriptionStatus,
    subscriptionStartDate: o.subscriptionStartDate,
    subscriptionRenewalDate: o.subscriptionRenewalDate,
    isActive: o.isActive,
    memberCount: o._count.members,
    createdAt: o.createdAt,
  }));

  return { items, total, page, limit };
}

// ===================== AI USAGE =====================

export async function getAiUsageStats() {
  const now = new Date();
  const monthStart = startOfMonth(now);

  const [totalRequests, monthRequests, totalTokens, grouped, monthGrouped] =
    await Promise.all([
      prisma.aIUsage.count(),
      prisma.aIUsage.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.aIUsage.aggregate({ _sum: { totalTokens: true } }),
      prisma.aIUsage.groupBy({
        by: ['userId'],
        _count: { _all: true },
        _sum: { totalTokens: true },
      }),
      prisma.aIUsage.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: monthStart } },
        _count: { _all: true },
      }),
    ]);

  const userIds = Array.from(
    new Set([...grouped.map((g) => g.userId), ...monthGrouped.map((g) => g.userId)])
  );
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          name: true,
          email: true,
          companyName: true,
          subscriptionPlan: true,
          organizationId: true,
          organization: { select: { id: true, name: true, plan: true } },
        },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));
  const monthCountByUser = new Map(
    monthGrouped.map((g) => [g.userId, g._count._all])
  );

  const usageByUser = grouped
    .map((g) => {
      const u = userMap.get(g.userId);
      return {
        userId: g.userId,
        name: u?.name ?? 'Unknown user',
        email: u?.email ?? '',
        organization: u?.organization?.name ?? u?.companyName ?? 'â€”',
        requests: g._count._all ?? 0,
        tokens: g._sum.totalTokens ?? 0,
        thisMonth: monthCountByUser.get(g.userId) ?? 0,
      };
    })
    .sort((a, b) => b.requests - a.requests);

  const orgAgg = new Map<
    string,
    { organization: string; requests: number; tokens: number }
  >();
  for (const row of usageByUser) {
    const key = row.organization || 'â€”';
    const current = orgAgg.get(key) ?? {
      organization: key,
      requests: 0,
      tokens: 0,
    };
    current.requests += row.requests;
    current.tokens += row.tokens;
    orgAgg.set(key, current);
  }
  const usageByOrg = Array.from(orgAgg.values()).sort(
    (a, b) => b.requests - a.requests
  );

  // Plan limits â€” monthly allowance per org plan vs. this month's usage
  const orgsByPlan = await prisma.organization.groupBy({
    by: ['plan'],
    _count: { _all: true },
  });
  const orgPlanCount = new Map(orgsByPlan.map((g) => [g.plan, g._count._all]));
  const monthUsageByUserPlan = new Map<string, number>();
  for (const g of monthGrouped) {
    const u = userMap.get(g.userId);
    const plan = u?.organization?.plan ?? u?.subscriptionPlan ?? 'free';
    monthUsageByUserPlan.set(
      plan,
      (monthUsageByUserPlan.get(plan) ?? 0) + (g._count._all ?? 0)
    );
  }

  const limits = PLANS.map((plan) => ({
    plan,
    monthlyLimit: PLAN_LIMITS[plan] ?? 0,
    organizationCount: orgPlanCount.get(plan) ?? 0,
    usedThisMonth: monthUsageByUserPlan.get(plan) ?? 0,
  }));

  return {
    totalRequests,
    monthRequests,
    totalTokens: totalTokens._sum.totalTokens ?? 0,
    usageByOrg,
    usageByUser,
    limits,
  };
}

// ===================== AUDIT LOGS =====================

export interface AuditLogParams {
  search?: string;
  targetType?: string;
  action?: string;
  actorId?: string;
  result?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export async function listAuditLogs(params: AuditLogParams) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 50));
  const where: Record<string, unknown> = {};

  if (params.search) {
    where.OR = [
      { action: { contains: params.search, mode: 'insensitive' } },
      { targetType: { contains: params.search, mode: 'insensitive' } },
      { targetId: { contains: params.search, mode: 'insensitive' } },
      { admin: { email: { contains: params.search, mode: 'insensitive' } } },
      { admin: { name: { contains: params.search, mode: 'insensitive' } } },
    ];
  }

  if (params.targetType) where.targetType = params.targetType;
  if (params.action) where.action = params.action;
  if (params.actorId) where.adminUserId = params.actorId;
  if (params.result === 'SUCCESS' || params.result === 'FAILURE') where.result = params.result;

  if (params.from || params.to) {
    const range: Record<string, Date> = {};
    if (params.from) {
      const from = new Date(params.from);
      if (!Number.isNaN(from.getTime())) range.gte = from;
    }
    if (params.to) {
      const to = new Date(params.to);
      if (!Number.isNaN(to.getTime())) {
        // A date-only value should include the whole day.
        if (/^\d{4}-\d{2}-\d{2}$/.test(params.to)) to.setHours(23, 59, 59, 999);
        range.lte = to;
      }
    }
    if (Object.keys(range).length) where.timestamp = range;
  }

  const total = await prisma.auditLog.count({ where });
  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    include: { admin: { select: { id: true, name: true, email: true } } },
  });

  const items = logs.map((l) => ({
    id: l.id,
    adminUserId: l.adminUserId,
    adminName: l.admin?.name ?? null,
    adminEmail: l.admin?.email ?? null,
    action: l.action,
    targetType: l.targetType,
    targetId: l.targetId,
    result: l.result,
    ipAddress: l.ipAddress,
    userAgent: l.userAgent,
    timestamp: l.timestamp,
    metadata: l.metadata,
  }));

  return { items, total, page, limit };
}

export async function getAuditTargetTypes() {
  const rows = await prisma.auditLog.groupBy({ by: ['targetType'] });
  return rows.map((r) => r.targetType).filter(Boolean);
}

/** Distinct actions present in the audit trail, used by the filter bar. */
export async function getAuditActions() {
  const rows = await prisma.auditLog.groupBy({ by: ['action'] });
  return rows.map((r) => r.action).filter(Boolean).sort();
}

/** Administrators who appear in the audit trail, used by the filter bar. */
export async function getAuditActors() {
  const rows = await prisma.auditLog.findMany({
    where: { adminUserId: { not: null } },
    select: { admin: { select: { id: true, name: true, email: true } } },
    distinct: ['adminUserId'],
    take: 200,
  });

  return rows
    .map((row) => row.admin)
    .filter((admin): admin is { id: string; name: string | null; email: string } => Boolean(admin))
    .sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email));
}

// ===================== SETTINGS =====================
// The platform settings row is owned by services/platformSettings.service.ts.
// These helpers re-export it so admin controllers have a single import site.

export async function getAdminSettings(): Promise<PlatformSettings> {
  return getPlatformSettings(true);
}

export type SettingsInput = Parameters<typeof updatePlatformSettings>[0];

export async function updateAdminSettings(input: SettingsInput): Promise<PlatformSettings> {
  return updatePlatformSettings(input);
}

export { invalidateSettingsCache };
export type { PlatformSettings };
