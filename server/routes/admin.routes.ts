// routes/admin.routes.ts
//
// The entire /api/admin surface.
//
// Enforcement chain on EVERY request:
//   authenticate            -> valid JWT / session
//   requireAdmin            -> active account + ADMIN (or legacy SUPER_ADMIN) role
//   requirePermission(key)  -> granular permission resolved from the database
//   validation (where any)  -> express-validator input checks
//   rateLimit (writes)      -> abuse protection on sensitive operations
//
// Client-provided roles/permissions are never trusted.
import express from 'express';

import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin, requirePermission } from '../middleware/admin.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { rateLimit } from '../middleware/rateLimit.middleware.js';

import {
  createUserValidation,
  updateUserValidation,
  changeRoleValidation,
  userActiveValidation,
  deleteUserValidation,
  resetAccessValidation,
  createRoleValidation,
  updateRoleValidation,
  rolePermissionsValidation,
  integrationParamValidation,
  notificationToggleValidation,
  auditQueryValidation,
  updateGeneralSettingsValidation,
  updateSecuritySettingsValidation,
  updateAiSettingsValidation,
  updateSystemSettingsValidation,
  updateNotificationDefaultsValidation,
  updateProfileValidation,
  changePasswordValidation,
} from '../validation/admin.validation.js';

import {
  getCurrentAdmin,
  getDashboard,
  getUsers,
  getUser,
  createUserHandler,
  updateUserHandler,
  updateUserStatusHandler,
  changeUserRoleHandler,
  resetUserAccessHandler,
  deleteUserHandler,
  listAssignableRolesHandler,
  getRolesHandler,
  createRoleHandler,
  updateRoleHandler,
  deleteRoleHandler,
  setRolePermissionsHandler,
  getPermissionsHandler,
  getOrganizations,
  getOrganization,
  updateOrganizationHandler,
  getSubscriptionsHandler,
  getAiUsageHandler,
  getAuditLogsHandler,
  getAuditTargetTypesHandler,
  getAuditActionsHandler,
  getAuditActorsHandler,
} from '../controllers/admin.controller.js';

import {
  listSupportRequests,
  updateSupportRequestStatus,
} from '../controllers/support.controller.js';

import {
  getIntegrationsHandler,
  disconnectIntegrationHandler,
  getNotificationsHandler,
  updateNotificationHandler,
  getSystemHealthHandler,
  getSystemEventsHandler,
  getGeneralSettingsHandler,
  getSecuritySettingsHandler,
  getAiSettingsHandler,
  getNotificationDefaultsHandler,
  getSystemSettingsHandler,
  updateGeneralSettingsHandler,
  updateSecuritySettingsHandler,
  updateAiSettingsHandler,
  updateNotificationDefaultsHandler,
  updateSystemSettingsHandler,
  getProfileHandler,
  updateProfileHandler,
  changePasswordHandler,
} from '../controllers/adminPlatform.controller.js';

const router = express.Router();

// ---- global guards -------------------------------------------------------
router.use(authenticate);
router.use(requireAdmin);

// Sensitivity: every mutating admin operation shares a per-admin ceiling to
// blunt abuse; reads are left to permission checks only.
const adminWriteLimit = rateLimit({
  windowMs: 60_000,
  max: 60,
  message: 'Too many admin changes. Please slow down.',
  keyGenerator: (req) => {
    const admin = (req as unknown as { admin?: { id: string } }).admin;
    return admin?.id ?? req.ip ?? 'unknown';
  },
});

// ---- identity ------------------------------------------------------------
router.get('/me', getCurrentAdmin);

// Profile (own account only - controllers use the authenticated user id)
router.get('/profile', getProfileHandler);
router.patch('/profile', adminWriteLimit, updateProfileValidation, validate, updateProfileHandler);
router.post('/profile/password', adminWriteLimit, changePasswordValidation, validate, changePasswordHandler);

// ---- dashboard -----------------------------------------------------------
router.get('/dashboard', requirePermission('admin.dashboard'), getDashboard);

// ---- users ---------------------------------------------------------------
router.get('/users', requirePermission('users.view'), getUsers);
router.get('/users/:id', requirePermission('users.view'), getUser);
router.post(
  '/users',
  adminWriteLimit,
  requirePermission('users.create'),
  createUserValidation,
  validate,
  createUserHandler
);
router.patch(
  '/users/:id',
  adminWriteLimit,
  requirePermission('users.update'),
  updateUserValidation,
  validate,
  updateUserHandler
);
router.patch(
  '/users/:id/status',
  adminWriteLimit,
  requirePermission('users.suspend'),
  userActiveValidation,
  validate,
  updateUserStatusHandler
);
router.patch(
  '/users/:id/role',
  adminWriteLimit,
  requirePermission('users.update'),
  changeRoleValidation,
  validate,
  changeUserRoleHandler
);
router.post(
  '/users/:id/reset-access',
  adminWriteLimit,
  requirePermission('users.update'),
  resetAccessValidation,
  validate,
  resetUserAccessHandler
);
router.delete(
  '/users/:id',
  adminWriteLimit,
  requirePermission('users.delete'),
  deleteUserValidation,
  validate,
  deleteUserHandler
);

// ---- roles & permissions -------------------------------------------------
router.get('/roles/assignable', requirePermission('users.view'), listAssignableRolesHandler);
router.get('/roles', requirePermission('admin.roles'), getRolesHandler);
router.post(
  '/roles',
  adminWriteLimit,
  requirePermission('admin.roles'),
  createRoleValidation,
  validate,
  createRoleHandler
);
router.patch(
  '/roles/:id',
  adminWriteLimit,
  requirePermission('admin.roles'),
  updateRoleValidation,
  validate,
  updateRoleHandler
);
router.put(
  '/roles/:id/permissions',
  adminWriteLimit,
  requirePermission('admin.roles'),
  rolePermissionsValidation,
  validate,
  setRolePermissionsHandler
);
router.delete('/roles/:id', adminWriteLimit, requirePermission('admin.roles'), deleteRoleHandler);
router.get('/permissions', requirePermission('admin.roles'), getPermissionsHandler);

// ---- organizations -------------------------------------------------------
router.get('/organizations', requirePermission('admin.organizations'), getOrganizations);
router.get('/organizations/:id', requirePermission('admin.organizations'), getOrganization);
router.patch(
  '/organizations/:id',
  adminWriteLimit,
  requirePermission('admin.organizations'),
  updateOrganizationHandler
);

// ---- subscriptions / AI usage (platform reporting) -----------------------
router.get('/subscriptions', requirePermission('admin.settings'), getSubscriptionsHandler);
router.get('/ai-usage', requirePermission('admin.settings'), getAiUsageHandler);

// ---- integrations (free open-source) ----
// Critical role: Ensures the CEO can connect their ERP or system to the site
// through a free open-source API hub (n8n + free direct APIs). Relies on the
// integration controller that proxies to the free layer.

// ---- integrations --------------------------------------------------------
router.get('/integrations', requirePermission('admin.integrations'), getIntegrationsHandler);
router.delete(
  '/integrations/:id',
  adminWriteLimit,
  requirePermission('admin.integrations'),
  integrationParamValidation,
  validate,
  disconnectIntegrationHandler
);

// ---- notifications -------------------------------------------------------
router.get('/notifications', requirePermission('admin.notifications'), getNotificationsHandler);
router.put(
  '/notifications/:key',
  adminWriteLimit,
  requirePermission('admin.notifications'),
  notificationToggleValidation,
  validate,
  updateNotificationHandler
);

// ---- audit logs (specific routes before parametric ones) -----------------
router.get('/audit-logs/actions', requirePermission('admin.audit_logs'), getAuditActionsHandler);
router.get('/audit-logs/actors', requirePermission('admin.audit_logs'), getAuditActorsHandler);
router.get('/audit-logs/target-types', requirePermission('admin.audit_logs'), getAuditTargetTypesHandler);
router.get(
  '/audit-logs',
  requirePermission('admin.audit_logs'),
  auditQueryValidation,
  validate,
  getAuditLogsHandler
);

// ---- system health -------------------------------------------------------
router.get('/system-health', requirePermission('admin.health'), getSystemHealthHandler);
router.get('/system-events', requirePermission('admin.health'), getSystemEventsHandler);

// ---- settings (sectioned) ------------------------------------------------
router.get('/settings/general', requirePermission('admin.settings'), getGeneralSettingsHandler);
router.get('/settings/security', requirePermission('admin.settings'), getSecuritySettingsHandler);
router.get('/settings/ai', requirePermission('admin.settings'), getAiSettingsHandler);
router.get('/settings/notifications', requirePermission('admin.settings'), getNotificationDefaultsHandler);
router.get('/settings/system', requirePermission('admin.settings'), getSystemSettingsHandler);

router.patch(
  '/settings/general',
  adminWriteLimit,
  requirePermission('admin.settings'),
  updateGeneralSettingsValidation,
  validate,
  updateGeneralSettingsHandler
);
router.patch(
  '/settings/security',
  adminWriteLimit,
  requirePermission('admin.settings'),
  updateSecuritySettingsValidation,
  validate,
  updateSecuritySettingsHandler
);
router.patch(
  '/settings/ai',
  adminWriteLimit,
  requirePermission('admin.settings'),
  updateAiSettingsValidation,
  validate,
  updateAiSettingsHandler
);
router.patch(
  '/settings/notifications',
  adminWriteLimit,
  requirePermission('admin.settings'),
  updateNotificationDefaultsValidation,
  validate,
  updateNotificationDefaultsHandler
);
router.patch(
  '/settings/system',
  adminWriteLimit,
  requirePermission('admin.settings'),
  updateSystemSettingsValidation,
  validate,
  updateSystemSettingsHandler
);

// ---- Support inbox -------------------------------------------------------
router.get('/support-requests', requirePermission('admin.support'), listSupportRequests);
router.patch(
  '/support-requests/:id',
  adminWriteLimit,
  requirePermission('admin.support'),
  updateSupportRequestStatus
);

export default router;
