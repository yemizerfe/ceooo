// services/notificationAdmin.service.ts
// Platform-level notification switches for the Admin control center.
//
// Only notifications CEOOO actually emits are exposed, so an administrator can
// never enable a toggle that does nothing.
import { prisma } from '../lib/prisma.ts';

export interface NotificationCategory {
  key: string;
  label: string;
  description: string;
}

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  { key: 'Security', label: 'Security', description: 'Sign-in protection and administrator alerts' },
  { key: 'System', label: 'System', description: 'Platform status and maintenance messages' },
  { key: 'User', label: 'User', description: 'Account lifecycle notifications' },
  { key: 'Integration', label: 'Integration', description: 'Connected application status' },
  { key: 'AI', label: 'AI', description: 'AI availability and usage notices' },
];

interface SeedNotification {
  key: string;
  label: string;
  description: string;
  category: string;
}

/** The notification catalog CEOOO ships with. */
export const SEED_NOTIFICATIONS: SeedNotification[] = [
  {
    key: 'security.alert',
    label: 'Security Alert',
    description: 'Notifies administrators when a suspicious sign-in or denied action occurs.',
    category: 'Security',
  },
  {
    key: 'security.new_login',
    label: 'New Sign-in',
    description: 'Alerts a user when their account signs in from a new session.',
    category: 'Security',
  },
  {
    key: 'system.maintenance',
    label: 'System Maintenance',
    description: 'Announces planned maintenance windows to administrators.',
    category: 'System',
  },
  {
    key: 'system.health_degraded',
    label: 'Service Degradation',
    description: 'Alerts when a platform service reports a degraded state.',
    category: 'System',
  },
  {
    key: 'user.registration',
    label: 'New User Registration',
    description: 'Notifies administrators when a new account is created.',
    category: 'User',
  },
  {
    key: 'user.suspended',
    label: 'Account Suspended',
    description: 'Confirms when an account is suspended or reactivated.',
    category: 'User',
  },
  {
    key: 'integration.failure',
    label: 'Integration Failure',
    description: 'Alerts administrators when a connected application fails to synchronize.',
    category: 'Integration',
  },
  {
    key: 'integration.sync',
    label: 'Integration Sync Summary',
    description: 'Summarizes scheduled synchronization results.',
    category: 'Integration',
  },
  {
    key: 'ai.usage_limit',
    label: 'AI Usage Limit',
    description: 'Alerts when a plan approaches its monthly AI request allowance.',
    category: 'AI',
  },
  {
    key: 'ai.failure',
    label: 'AI Request Failure',
    description: 'Alerts administrators when an AI request fails repeatedly.',
    category: 'AI',
  },
];

/** Idempotently creates missing notification settings, honouring defaults. */
export async function ensureNotificationSettings(): Promise<void> {
  const existing = await prisma.notificationSetting.findMany({ select: { key: true } });
  const existingKeys = new Set(existing.map((row) => row.key));

  const missing = SEED_NOTIFICATIONS.filter((notification) => !existingKeys.has(notification.key));
  if (!missing.length) return;

  await prisma.notificationSetting.createMany({
    data: missing.map((notification) => ({
      key: notification.key,
      label: notification.label,
      description: notification.description,
      category: notification.category,
    })),
    skipDuplicates: true,
  });
}

export interface NotificationSettingRow {
  id: string;
  key: string;
  label: string;
  description: string | null;
  category: string;
  enabled: boolean;
  updatedAt: string;
}

export async function listNotificationSettings(): Promise<{
  categories: NotificationCategory[];
  items: NotificationSettingRow[];
  enabledCount: number;
  total: number;
}> {
  await ensureNotificationSettings();

  const rows = await prisma.notificationSetting.findMany({ orderBy: [{ category: 'asc' }, { label: 'asc' }] });

  const items: NotificationSettingRow[] = rows.map((row) => ({
    id: row.id,
    key: row.key,
    label: row.label,
    description: row.description,
    category: row.category,
    enabled: row.enabled,
    updatedAt: row.updatedAt.toISOString(),
  }));

  return {
    categories: NOTIFICATION_CATEGORIES,
    items,
    enabledCount: items.filter((item) => item.enabled).length,
    total: items.length,
  };
}

export async function setNotificationEnabled(key: string, enabled: boolean): Promise<NotificationSettingRow | null> {
  const existing = await prisma.notificationSetting.findUnique({ where: { key } });
  if (!existing) return null;

  const updated = await prisma.notificationSetting.update({ where: { key }, data: { enabled } });

  return {
    id: updated.id,
    key: updated.key,
    label: updated.label,
    description: updated.description,
    category: updated.category,
    enabled: updated.enabled,
    updatedAt: updated.updatedAt.toISOString(),
  };
}

/** Bulk update used by the notification page's "save" action. */
export async function setNotificationsEnabled(
  entries: { key: string; enabled: boolean }[]
): Promise<NotificationSettingRow[]> {
  const results: NotificationSettingRow[] = [];

  for (const entry of entries) {
    const updated = await setNotificationEnabled(entry.key, entry.enabled);
    if (updated) results.push(updated);
  }

  return results;
}
