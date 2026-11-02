// controllers/adminPlatform.controller.ts
// HTTP handlers for platform-level admin resources: integrations, notification
// switches, system health, sectioned settings, and the admin's own profile.
//
// Authorization (requireAdmin + requirePermission) has already run in the
// router before any of these execute. Every mutation writes an audit entry.
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.ts';
import type { AdminRequest } from '../middleware/admin.middleware.ts';
import { auditContext, logAuditEntry } from '../services/audit.service.ts';
import {
  disconnectIntegrationForAllUsers,
  listIntegrationsAdmin,
} from '../services/integrationAdmin.service.ts';
import {
  listNotificationSettings,
  setNotificationEnabled,
} from '../services/notificationAdmin.service.ts';
import { getSystemEvents, getSystemHealth } from '../services/systemHealth.service.ts';
import { updateAdminSettings } from '../services/admin.service.ts';
import {
  AI_PROVIDERS,
  CURRENCIES,
  DATE_FORMATS,
  FEATURE_FLAG_LABELS,
  LANGUAGES,
  TIMEZONES,
  getPlatformSettings,
  passwordPolicyError,
} from '../services/platformSettings.service.ts';

// ===================== HELPERS (mirrors admin.controller) =====================

function actorId(req: Request): string | undefined {
  return (req as AdminRequest).admin?.id ?? (req as AdminRequest).user?.id;
}

function paramValue(value: unknown): string {
  return typeof value === 'string' ? value : Array.isArray(value) ? String(value[0] ?? '') : '';
}

function fail(res: Response, error: unknown, fallback: string): void {
  console.error(`${fallback}:`, error);
  res.status(500).json({ success: false, message: fallback });
}

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

/** Audit metadata should only ever carry operator-safe, non-secret values. */
function safeSettingsPatch(body: Record<string, unknown>): Record<string, unknown> {
  const allowed = [
    'applicationName',
    'organizationName',
    'defaultTimezone',
    'defaultCurrency',
    'defaultDateFormat',
    'defaultLanguage',
    'requireStrongPassword',
    'sessionTimeoutMinutes',
    'allowRegistration',
    'maxLoginAttempts',
    'aiEnabled',
    'aiProvider',
    'aiModel',
    'maintenanceMode',
  ];
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) out[key] = body[key];
  }
  if ('featureFlags' in body && body.featureFlags && typeof body.featureFlags === 'object') {
    out.featureFlags = body.featureFlags;
  }
  if ('notificationDefaults' in body && body.notificationDefaults && typeof body.notificationDefaults === 'object') {
    out.notificationDefaults = body.notificationDefaults;
  }
  return out;
}

// ===================== INTEGRATIONS =====================

export async function getIntegrationsHandler(_req: Request, res: Response): Promise<void> {
  try {
    res.json({ success: true, data: await listIntegrationsAdmin() });
  } catch (error) {
    fail(res, error, 'Unable to load integrations');
  }
}

export async function disconnectIntegrationHandler(req: Request, res: Response): Promise<void> {
  try {
    const appId = paramValue(req.params.id);
    const result = await disconnectIntegrationForAllUsers(appId);

    await audit(req, {
      action: 'integration.disconnected',
      targetType: 'integration',
      targetId: appId,
      metadata: { affectedUsers: result.affectedUsers },
    });

    res.json({ success: true, data: result, message: 'Integration disconnected.' });
  } catch (error) {
    await audit(req, {
      action: 'integration.disconnected',
      targetType: 'integration',
      targetId: paramValue(req.params.id),
      result: 'FAILURE',
    });
    fail(res, error, 'Unable to disconnect integration');
  }
}

// ===================== NOTIFICATIONS =====================

export async function getNotificationsHandler(_req: Request, res: Response): Promise<void> {
  try {
    res.json({ success: true, data: await listNotificationSettings() });
  } catch (error) {
    fail(res, error, 'Unable to load notification settings');
  }
}

export async function updateNotificationHandler(req: Request, res: Response): Promise<void> {
  try {
    const key = paramValue(req.params.key);
    const enabled = req.body?.enabled;

    if (typeof enabled !== 'boolean') {
      res.status(400).json({ success: false, message: 'enabled must be a boolean' });
      return;
    }

    const updated = await setNotificationEnabled(key, enabled);
    if (!updated) {
      res.status(404).json({ success: false, message: 'Notification setting not found' });
      return;
    }

    await audit(req, {
      action: 'notification.updated',
      targetType: 'notification_setting',
      targetId: key,
      metadata: { enabled },
    });

    res.json({ success: true, data: updated, message: 'Notification setting saved.' });
  } catch (error) {
    fail(res, error, 'Unable to update notification setting');
  }
}

// ===================== SYSTEM HEALTH =====================

export async function getSystemHealthHandler(_req: Request, res: Response): Promise<void> {
  try {
    res.json({ success: true, data: await getSystemHealth() });
  } catch (error) {
    fail(res, error, 'Unable to load system health');
  }
}

export async function getSystemEventsHandler(_req: Request, res: Response): Promise<void> {
  try {
    const items = await getSystemEvents(20);
    res.json({ success: true, data: { items, total: items.length } });
  } catch (error) {
    fail(res, error, 'Unable to load system events');
  }
}


// ===================== SETTINGS =====================

async function settingsSection(res: Response, section: 'general' | 'security' | 'ai' | 'notifications' | 'system'): Promise<void> {
  const settings = await getPlatformSettings(true);

  const payload: Record<string, unknown> = {
    applicationName: settings.applicationName,
    organizationName: settings.organizationName,
    organizationLogoUrl: settings.organizationLogoUrl,
    defaultLanguage: settings.defaultLanguage,
    defaultTimezone: settings.defaultTimezone,
    defaultDateFormat: settings.defaultDateFormat,
    defaultCurrency: settings.defaultCurrency,
    maintenanceMode: settings.maintenanceMode,
    updatedAt: settings.updatedAt,
    options: {
      timezones: TIMEZONES,
      currencies: CURRENCIES,
      dateFormats: DATE_FORMATS,
      languages: LANGUAGES,
    },
  };

  if (section === 'security') {
    Object.assign(payload, {
      requireStrongPassword: settings.requireStrongPassword,
      sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
      allowRegistration: settings.allowRegistration,
      maxLoginAttempts: settings.maxLoginAttempts,
    });
  }

  if (section === 'ai') {
    Object.assign(payload, {
      aiEnabled: settings.aiEnabled,
      aiProvider: settings.aiProvider,
      aiModel: settings.aiModel,
      providers: AI_PROVIDERS,
    });
  }

  if (section === 'notifications') {
    Object.assign(payload, {
      notificationDefaults: settings.notificationDefaults,
      categories: Object.keys(settings.notificationDefaults),
    });
  }

  if (section === 'system') {
    Object.assign(payload, {
      featureFlags: Object.entries(FEATURE_FLAG_LABELS).map(([key, label]) => ({
        key,
        label,
        enabled: Boolean(settings.featureFlags[key]),
      })),
    });
  }

  res.json({ success: true, data: payload });
}

export async function getGeneralSettingsHandler(_req: Request, res: Response): Promise<void> {
  try {
    await settingsSection(res, 'general');
  } catch (error) {
    fail(res, error, 'Unable to load general settings');
  }
}

export async function getSecuritySettingsHandler(_req: Request, res: Response): Promise<void> {
  try {
    await settingsSection(res, 'security');
  } catch (error) {
    fail(res, error, 'Unable to load security settings');
  }
}

export async function getAiSettingsHandler(_req: Request, res: Response): Promise<void> {
  try {
    await settingsSection(res, 'ai');
  } catch (error) {
    fail(res, error, 'Unable to load AI settings');
  }
}

export async function getNotificationDefaultsHandler(_req: Request, res: Response): Promise<void> {
  try {
    await settingsSection(res, 'notifications');
  } catch (error) {
    fail(res, error, 'Unable to load notification defaults');
  }
}

export async function getSystemSettingsHandler(_req: Request, res: Response): Promise<void> {
  try {
    await settingsSection(res, 'system');
  } catch (error) {
    fail(res, error, 'Unable to load system settings');
  }
}


async function patchSettings(req: Request, res: Response, action: string): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const patch = safeSettingsPatch(body);
  const updated = await updateAdminSettings(patch);

  await audit(req, {
    action,
    targetType: 'admin_setting',
    targetId: 'global-settings',
    metadata: patch,
  });

  res.json({ success: true, data: updated, message: 'Settings saved.' });
}

export async function updateGeneralSettingsHandler(req: Request, res: Response): Promise<void> {
  try {
    await patchSettings(req, res, 'setting.general_updated');
  } catch (error) {
    fail(res, error, 'Unable to save general settings');
  }
}

export async function updateSecuritySettingsHandler(req: Request, res: Response): Promise<void> {
  try {
    await patchSettings(req, res, 'setting.security_updated');
  } catch (error) {
    fail(res, error, 'Unable to save security settings');
  }
}

export async function updateAiSettingsHandler(req: Request, res: Response): Promise<void> {
  try {
    await patchSettings(req, res, 'setting.ai_updated');
  } catch (error) {
    fail(res, error, 'Unable to save AI settings');
  }
}

export async function updateNotificationDefaultsHandler(req: Request, res: Response): Promise<void> {
  try {
    await patchSettings(req, res, 'setting.notification_defaults_updated');
  } catch (error) {
    fail(res, error, 'Unable to save notification defaults');
  }
}

export async function updateSystemSettingsHandler(req: Request, res: Response): Promise<void> {
  try {
    await patchSettings(req, res, 'setting.system_updated');
  } catch (error) {
    fail(res, error, 'Unable to save system settings');
  }
}


// ===================== ADMIN PROFILE =====================

export async function getProfileHandler(req: Request, res: Response): Promise<void> {
  try {
    const id = actorId(req);
    if (!id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        isVerified: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const { getEffectivePermissions } = await import('../services/rbac.service.ts');
    const permissions = await getEffectivePermissions(id);

    res.json({
      success: true,
      data: {
        ...user,
        // Security-safe summary — never includes hashes, tokens or secrets.
        security: {
          authMethod: 'password',
          twoFactorEnabled: false,
          isVerified: user.isVerified,
          lastLoginAt: user.lastLoginAt,
          accountStatus: user.isActive ? 'active' : 'suspended',
        },
        permissions,
      },
    });
  } catch (error) {
    fail(res, error, 'Unable to load profile');
  }
}

export async function updateProfileHandler(req: Request, res: Response): Promise<void> {
  try {
    const id = actorId(req);
    if (!id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const avatarUrl = typeof req.body?.avatarUrl === 'string' ? req.body.avatarUrl.trim() : undefined;

    if (!name) {
      res.status(400).json({ success: false, message: 'Name is required' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { name, ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}) },
      select: { id: true, name: true, email: true, role: true, avatarUrl: true },
    });

    await audit(req, {
      action: 'profile.updated',
      targetType: 'user',
      targetId: id,
      metadata: { fields: Object.keys(req.body ?? {}) },
    });

    res.json({ success: true, data: updated, message: 'Profile updated.' });
  } catch (error) {
    fail(res, error, 'Unable to update profile');
  }
}

export async function changePasswordHandler(req: Request, res: Response): Promise<void> {
  try {
    const id = actorId(req);
    if (!id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'Current and new password are required' });
      return;
    }

    const settings = await getPlatformSettings();
    const policyError = passwordPolicyError(newPassword, settings.requireStrongPassword);
    if (policyError) {
      res.status(400).json({ success: false, message: policyError });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id }, select: { passwordHash: true } });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Accounts registered through an OAuth provider have no password to verify;
    // the admin can set the first one here.
    if (user.passwordHash) {
      const matches = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!matches) {
        res.status(401).json({ success: false, message: 'Current password is incorrect' });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { passwordHash } });

    await audit(req, {
      action: 'security.password_changed',
      targetType: 'user',
      targetId: id,
      metadata: { self: true },
    });

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    fail(res, error, 'Unable to change password');
  }
}

