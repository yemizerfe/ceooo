// types/auth.ts

export interface User {
  id: string;
  email: string;
  name: string;
  /** Display-only job title ("CEO / Founder"). Never used for authorization. */
  role: string;
  /** RBAC catalog key (ADMIN, CEO, …). Authoritative for routing and gates. */
  accessRole?: string;
  /** Convenience flag computed by the API from `accessRole`. */
  isAdmin?: boolean;
  companyName?: string;
  industry?: string;
  companySize?: "startup" | "small" | "medium" | "enterprise";
  avatarUrl?: string;
  linkedAccounts?: { provider: string; email: string }[];
  aiUsageCount: number;
  subscriptionPlan: "free" | "pro" | "enterprise";
  isVerified: boolean;
  hasCompletedOnboarding: boolean;
  createdAt?: Date;
  lastLoginAt?: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface SignupData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface AuthError {
  message: string;
  code?: string;
  field?: string;
}