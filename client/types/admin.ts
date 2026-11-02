// types/admin.ts
// Shared type definitions for the admin panel data structures.

export type UserRole = "SUPER_ADMIN" | "CEO" | "MANAGER" | "EMPLOYEE";
export type UserStatus = "Active" | "Suspended" | "Pending";

export interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
  roleLabel: string;
  isAdmin: boolean;
  avatarUrl?: string | null;
  permissions: string[];
}

export interface StatCard {
  title: string;
  value: string;
  icon: string;
  change?: string;
  changePositive?: boolean;
}

export interface OverviewStats {
  totalUsers: number;
  activeUsers: number;
  totalOrganizations: number;
  newUsersThisMonth: number;
  activeSubscriptions: number;
  trialAccounts: number;
  aiRequestsTotal: number;
  aiRequestsThisMonth: number;
  aiUsageByMonth: { key: string; label: string; requests: number }[];
  usersByPlan: { plan: string; count: number }[];
  recentActivity: AdminActivityLog[];
}

export interface AdminActivityLog {
  id: string;
  admin: { id: string; name: string | null; email: string } | null;
  action: string;
  targetType: string;
  targetId: string | null;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface AdminUserRow {
  id: string;
  name: string | null;
  email: string;
  /** Display-only job title. */
  role: string | null;
  /** RBAC catalog key — what the role filter and access checks use. */
  accessRole?: string | null;
  companyName: string | null;
  industry: string | null;
  avatarUrl: string | null;
  subscriptionPlan: string;
  aiUsageCount: number;
  isActive: boolean;
  isVerified: boolean;
  hasCompletedOnboarding: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  organizationId: string | null;
  organization: { id: string; name: string; subscriptionStatus: string; plan: string } | null;
  status: string;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string | null;
  companyName: string | null;
  industry: string | null;
  companySize: string | null;
  bio: string | null;
  subscriptionPlan: string;
  aiUsageCount: number;
  isActive: boolean;
  isVerified: boolean;
  hasCompletedOnboarding: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  organizationId: string | null;
  organization: { id: string; name: string; plan: string; subscriptionStatus: string; isActive: boolean } | null;
  ownedOrganizations: { id: string; name: string }[];
  status: string;
}

export interface AdminOrgRow {
  id: string;
  name: string;
  industry: string | null;
  companySize: string | null;
  plan: string;
  subscriptionStatus: string;
  ownerId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  memberCount: number;
  isActive: boolean;
  createdAt: string;
  subscriptionStartDate: string | null;
  subscriptionRenewalDate: string | null;
}

export interface AdminOrgDetail {
  id: string;
  name: string;
  industry: string | null;
  companySize: string | null;
  plan: string;
  subscriptionStatus: string;
  isActive: boolean;
  ownerId: string | null;
  owner: { id: string; name: string | null; email: string; role: string | null; isActive: boolean; createdAt: string } | null;
  members: Array<{
    id: string;
    name: string | null;
    email: string;
    role: string | null;
    isActive: boolean;
    subscriptionPlan: string;
    createdAt: string;
  }>;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  subscriptionStartDate: string | null;
  subscriptionRenewalDate: string | null;
}

export interface AdminSubscriptionRow {
  id: string;
  name: string;
  ownerName: string | null;
  ownerEmail: string | null;
  plan: string;
  subscriptionStatus: string;
  subscriptionStartDate: string | null;
  subscriptionRenewalDate: string | null;
  isActive: boolean;
  memberCount: number;
  createdAt: string;
}

export interface AiUsageStats {
  totalRequests: number;
  monthRequests: number;
  totalTokens: number;
  usageByOrg: { organization: string; requests: number; tokens: number }[];
  usageByUser: {
    userId: string;
    name: string;
    email: string;
    organization: string;
    requests: number;
    tokens: number;
    thisMonth: number;
  }[];
  limits: { plan: string; monthlyLimit: number; organizationCount: number; usedThisMonth: number }[];
}

export interface AdminSettings {
  id: string;
  applicationName: string;
  defaultTimezone: string;
  defaultCurrency: string;
  maintenanceMode: boolean;
  featureFlags: Record<string, boolean>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
