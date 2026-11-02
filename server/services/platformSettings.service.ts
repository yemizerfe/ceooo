// services/platformSettings.service.ts
// Single source of truth for the platform (singleton) settings row.
//
// Every value exposed here is ENFORCED somewhere in the backend:
//   - requireStrongPassword  -> registration password validation
//   - sessionTimeoutMinutes  -> JWT / session lifetime
//   - allowRegistration      -> public signup endpoint
//   - maxLoginAttempts       -> login brute-force protection (lib/loginGuard)
//   - aiEnabled              -> AI service availability
//   - maintenanceMode        -> reported to clients / admin banner
//   - featureFlags           -> feature availability switches
//
// Settings CEOOO does not actually implement are deliberately NOT exposed.
import { prisma } from '../lib/prisma.ts';

export const SETTINGS_ID = 'global-settings';

export const DATE_FORMATS = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'] as const;
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'ETB', 'KES', 'NGN', 'INR', 'AED', 'CAD'] as const;
export const LANGUAGES = ['en', 'am', 'fr', 'ar', 'es'] as const;
export const AI_PROVIDERS = ['google-gemini', 'openai'] as const;
export const TIMEZONES = [
  'UTC',
  'Africa/Addis_Ababa',
  'Africa/Nairobi',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'Africa/Cairo',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
] as const;

export const FEATURE_FLAG_LABELS: Record<string, string> = {
  aiAssistant: 'AI Assistant',
  advancedAnalytics: 'Advanced Analytics',
  budgetForecasting: 'Budget Forecasting',
  okrInsights: 'OKR Insights',
};

export const DEFAULT_FEATURE_FLAGS: Record<string, boolean> = {
  aiAssistant: true,
  advancedAnalytics: true,
  budgetForecasting: true,
  okrInsights: true,
};

export const DEFAULT_NOTIFICATION_DEFAULTS: Record<string, boolean> = {
  Security: true,
  System: true,
  User: true,
  Integration: true,
  AI: true,
};

export interface PlatformSettings {
  id: string;
  applicationName: string;
  organizationName: string;
  organizationLogoUrl: string | null;
  defaultTimezone: string;
  defaultCurrency: string;
  defaultDateFormat: string;
  defaultLanguage: string;
  maintenanceMode: boolean;
  featureFlags: Record<string, boolean>;
  requireStrongPassword: boolean;
  sessionTimeoutMinutes: number;
  allowRegistration: boolean;
  maxLoginAttempts: number;
  aiEnabled: boolean;
  aiProvider: string;
  aiModel: string;
  notificationDefaults: Record<string, boolean>;
  updatedAt: string | null;
}

interface SettingRow {
  id: string;
  applicationName: string;
  organizationName: string;
  organizationLogoUrl: string | null;
  defaultTimezone: string;
  defaultCurrency: string;
  defaultDateFormat: string;
  defaultLanguage: string;
  maintenanceMode: boolean;
  featureFlags: unknown;
  requireStrongPassword: boolean;
  sessionTimeoutMinutes: number;
  allowRegistration: boolean;
  maxLoginAttempts: number;
  aiEnabled: boolean;
  aiProvider: string;
  aiModel: string;
  notificationDefaults: unknown;
  updatedAt: Date;
}

export function parseJsonObject<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null ? (parsed as T) : fallback;
    } catch {
      return fallback;
    }
  }
  if (typeof value === 'object') return value as T;
  return fallback;
}


function toPlatformSettings(row: SettingRow | null): PlatformSettings {
  if (!row) {
    return {
      id: SETTINGS_ID,
      applicationName: 'CEOOO',
      organizationName: 'CEOOO',
      organizationLogoUrl: null,
      defaultTimezone: 'UTC',
      defaultCurrency: 'USD',
      defaultDateFormat: 'MM/DD/YYYY',
      defaultLanguage: 'en',
      maintenanceMode: false,
      featureFlags: { ...DEFAULT_FEATURE_FLAGS },
      requireStrongPassword: true,
      sessionTimeoutMinutes: 10080,
      allowRegistration: true,
      maxLoginAttempts: 10,
      aiEnabled: true,
      aiProvider: 'google-gemini',
      aiModel: 'gemini-2.0-flash-exp',
      notificationDefaults: { ...DEFAULT_NOTIFICATION_DEFAULTS },
      updatedAt: null,
    };
  }

  return {
    id: row.id,
    applicationName: row.applicationName,
    organizationName: row.organizationName,
    organizationLogoUrl: row.organizationLogoUrl,
    defaultTimezone: row.defaultTimezone,
    defaultCurrency: row.defaultCurrency,
    defaultDateFormat: row.defaultDateFormat,
    defaultLanguage: row.defaultLanguage,
    maintenanceMode: row.maintenanceMode,
    featureFlags: {
      ...DEFAULT_FEATURE_FLAGS,
      ...parseJsonObject<Record<string, boolean>>(row.featureFlags, {}),
    },
    requireStrongPassword: row.requireStrongPassword,
    sessionTimeoutMinutes: row.sessionTimeoutMinutes,
    allowRegistration: row.allowRegistration,
    maxLoginAttempts: row.maxLoginAttempts,
    aiEnabled: row.aiEnabled,
    aiProvider: row.aiProvider,
    aiModel: row.aiModel,
    notificationDefaults: {
      ...DEFAULT_NOTIFICATION_DEFAULTS,
      ...parseJsonObject<Record<string, boolean>>(row.notificationDefaults, {}),
    },
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
  };
}

// Settings are read on nearly every request (security enforcement), so a short
// lived in-process cache avoids hammering the database.
const CACHE_TTL_MS = 15_000;
let cache: { value: PlatformSettings; at: number } | null = null;

export function invalidateSettingsCache(): void {
  cache = null;
}

export async function getPlatformSettings(force = false): Promise<PlatformSettings> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;

  try {
    const row = await prisma.adminSetting.findUnique({ where: { id: SETTINGS_ID } });
    const value = toPlatformSettings(row as SettingRow | null);
    cache = { value, at: Date.now() };
    return value;
  } catch (error) {
    console.error('Failed to load platform settings:', error);
    // Never block the app because of a settings read failure.
    return toPlatformSettings(null);
  }
}

export interface PlatformSettingsInput {
  applicationName?: unknown;
  organizationName?: unknown;
  organizationLogoUrl?: unknown;
  defaultTimezone?: unknown;
  defaultCurrency?: unknown;
  defaultDateFormat?: unknown;
  defaultLanguage?: unknown;
  maintenanceMode?: unknown;
  featureFlags?: unknown;
  requireStrongPassword?: unknown;
  sessionTimeoutMinutes?: unknown;
  allowRegistration?: unknown;
  maxLoginAttempts?: unknown;
  aiEnabled?: unknown;
  aiProvider?: unknown;
  aiModel?: unknown;
  notificationDefaults?: unknown;
}


function pickString(value: unknown, current: string, allowed?: readonly string[]): string {
  if (typeof value !== 'string' || !value.trim()) return current;
  const trimmed = value.trim();
  if (allowed && !allowed.includes(trimmed)) return current;
  return trimmed;
}

function pickNumber(value: unknown, current: number, min: number, max: number): number {
  const parsed =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) return current;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function pickBoolean(value: unknown, current: boolean): boolean {
  return typeof value === 'boolean' ? value : current;
}

export async function updatePlatformSettings(input: PlatformSettingsInput): Promise<PlatformSettings> {
  const current = await getPlatformSettings(true);

  const flagsInput =
    input.featureFlags && typeof input.featureFlags === 'object' && !Array.isArray(input.featureFlags)
      ? (input.featureFlags as Record<string, unknown>)
      : null;

  const featureFlags: Record<string, boolean> = { ...DEFAULT_FEATURE_FLAGS, ...current.featureFlags };
  if (flagsInput) {
    for (const key of Object.keys(DEFAULT_FEATURE_FLAGS)) {
      const value = flagsInput[key];
      if (typeof value === 'boolean') featureFlags[key] = value;
    }
  }

  const notificationInput =
    input.notificationDefaults &&
    typeof input.notificationDefaults === 'object' &&
    !Array.isArray(input.notificationDefaults)
      ? (input.notificationDefaults as Record<string, unknown>)
      : null;

  const notificationDefaults: Record<string, boolean> = { ...current.notificationDefaults };
  if (notificationInput) {
    for (const [key, value] of Object.entries(notificationInput)) {
      if (typeof value === 'boolean') notificationDefaults[key] = value;
    }
  }

  let organizationLogoUrl: string | null = current.organizationLogoUrl;
  if (input.organizationLogoUrl === null) {
    organizationLogoUrl = null;
  } else if (typeof input.organizationLogoUrl === 'string' && input.organizationLogoUrl.trim()) {
    organizationLogoUrl = input.organizationLogoUrl.trim();
  }

  const data = {
    applicationName: pickString(input.applicationName, current.applicationName),
    organizationName: pickString(input.organizationName, current.organizationName),
    organizationLogoUrl,
    defaultTimezone: pickString(input.defaultTimezone, current.defaultTimezone),
    defaultCurrency: pickString(input.defaultCurrency, current.defaultCurrency, CURRENCIES),
    defaultDateFormat: pickString(input.defaultDateFormat, current.defaultDateFormat, DATE_FORMATS),
    defaultLanguage: pickString(input.defaultLanguage, current.defaultLanguage, LANGUAGES),
    maintenanceMode: pickBoolean(input.maintenanceMode, current.maintenanceMode),
    featureFlags,
    requireStrongPassword: pickBoolean(input.requireStrongPassword, current.requireStrongPassword),
    // 5 minutes .. 30 days
    sessionTimeoutMinutes: pickNumber(
      input.sessionTimeoutMinutes,
      current.sessionTimeoutMinutes,
      5,
      43200
    ),
    allowRegistration: pickBoolean(input.allowRegistration, current.allowRegistration),
    // 0 disables login throttling, otherwise 3..100 attempts
    maxLoginAttempts: pickNumber(input.maxLoginAttempts, current.maxLoginAttempts, 0, 100),
    aiEnabled: pickBoolean(input.aiEnabled, current.aiEnabled),
    aiProvider: pickString(input.aiProvider, current.aiProvider, AI_PROVIDERS),
    aiModel: pickString(input.aiModel, current.aiModel),
    notificationDefaults,
  };

  await prisma.adminSetting.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...data },
    update: data,
  });

  invalidateSettingsCache();
  return getPlatformSettings(true);
}

/** Password policy shared by public registration and admin user creation. */
export function passwordPolicyError(password: string, requireStrong: boolean): string | null {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (requireStrong && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return 'Password must contain uppercase, lowercase, and number';
  }
  return null;
}

/** Settings a client is allowed to see (never contains secrets). */
export function publicSettings(settings: PlatformSettings) {
  return {
    applicationName: settings.applicationName,
    organizationName: settings.organizationName,
    organizationLogoUrl: settings.organizationLogoUrl,
    defaultTimezone: settings.defaultTimezone,
    defaultCurrency: settings.defaultCurrency,
    defaultDateFormat: settings.defaultDateFormat,
    defaultLanguage: settings.defaultLanguage,
    maintenanceMode: settings.maintenanceMode,
    featureFlags: settings.featureFlags,
    allowRegistration: settings.allowRegistration,
    aiEnabled: settings.aiEnabled,
  };
}
