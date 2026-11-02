// validation/admin.validation.ts
// Input validation for the admin control center.
// Validation is enforced server-side; the UI validates for feedback only.
import { body, param, query } from 'express-validator';

// ===================== USERS =====================

export const createUserValidation = [
  body('email').isEmail().withMessage('A valid email address is required').normalizeEmail(),
  body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 120 })
    .withMessage('Name must be 120 characters or fewer'),
  body('password')
    .isString()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('role').isString().trim().notEmpty().withMessage('Role is required'),
  body('organizationId').optional({ nullable: true }).isString().trim(),
  body('sendInvite').optional().isBoolean().withMessage('sendInvite must be a boolean'),
];

export const updateUserValidation = [
  body('name').optional().isString().trim().isLength({ max: 120 }),
  body('email').optional().isEmail().withMessage('A valid email address is required').normalizeEmail(),
  body('role').optional().isString().trim().notEmpty(),
  body('organizationId').optional({ nullable: true }).isString().trim(),
];

export const changeRoleValidation = [
  body('role').isString().trim().notEmpty().withMessage('Role is required'),
];

export const userActiveValidation = [
  body('isActive').isBoolean().withMessage('isActive must be a boolean'),
];

export const deleteUserValidation = [
  // Typed confirmation phrase required for this irreversible operation.
  body('confirmation')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Type the user email to confirm deletion'),
];

export const resetAccessValidation = [
  body('temporaryPassword')
    .optional()
    .isString()
    .isLength({ min: 8 })
    .withMessage('Temporary password must be at least 8 characters long'),
];

// ===================== ROLES =====================

export const createRoleValidation = [
  body('name')
    .isString()
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('Role name must be 2-30 characters'),
  body('label').optional().isString().trim().isLength({ max: 60 }),
  body('description').optional().isString().trim().isLength({ max: 300 }),
  body('permissions').optional().isArray().withMessage('permissions must be an array'),
  body('permissions.*').optional().isString().trim(),
];

export const updateRoleValidation = [
  body('label').optional().isString().trim().isLength({ max: 60 }),
  body('description').optional().isString().trim().isLength({ max: 300 }),
  body('permissions').optional().isArray().withMessage('permissions must be an array'),
  body('permissions.*').optional().isString().trim(),
];

export const rolePermissionsValidation = [
  body('permissionKeys').isArray().withMessage('permissionKeys must be an array'),
  body('permissionKeys.*').isString().trim(),
];

// ===================== INTEGRATIONS =====================

export const integrationParamValidation = [
  param('id').isString().trim().notEmpty().withMessage('Integration id is required'),
];

// ===================== NOTIFICATIONS =====================

export const notificationToggleValidation = [
  param('key').isString().trim().notEmpty().withMessage('Notification key is required'),
  body('enabled').isBoolean().withMessage('enabled must be a boolean'),
];

// ===================== AUDIT LOGS =====================

// Filters arrive from the UI as empty strings when nothing is selected. Empty
// values mean "no filter", not "invalid", so falsy optionals are skipped.
export const auditQueryValidation = [
  query('page').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional({ values: 'falsy' }).isInt({ min: 1, max: 200 }),
  query('result').optional({ values: 'falsy' }).isIn(['SUCCESS', 'FAILURE']),
  query('from').optional({ values: 'falsy' }).isISO8601().withMessage('from must be a date'),
  query('to').optional({ values: 'falsy' }).isISO8601().withMessage('to must be a date'),
];

// ===================== SETTINGS =====================

export const updateGeneralSettingsValidation = [
  body('applicationName').optional().isString().trim().isLength({ min: 1, max: 60 }),
  body('organizationName').optional().isString().trim().isLength({ min: 1, max: 120 }),
  body('organizationLogoUrl').optional({ nullable: true }).isString().trim().isLength({ max: 500 }),
  body('defaultTimezone').optional().isString().trim().isLength({ max: 64 }),
  body('defaultCurrency').optional().isString().trim().isLength({ min: 3, max: 3 }),
  body('defaultDateFormat').optional().isString().trim().isLength({ max: 20 }),
  body('defaultLanguage').optional().isString().trim().isLength({ min: 2, max: 5 }),
];

export const updateSecuritySettingsValidation = [
  body('requireStrongPassword').optional().isBoolean(),
  body('sessionTimeoutMinutes').optional().isInt({ min: 5, max: 43200 }),
  body('allowRegistration').optional().isBoolean(),
  body('maxLoginAttempts').optional().isInt({ min: 0, max: 100 }),
];

export const updateAiSettingsValidation = [
  body('aiEnabled').optional().isBoolean(),
  body('aiProvider').optional().isIn(['google-gemini', 'openai']),
  body('aiModel').optional().isString().trim().isLength({ min: 2, max: 80 }),
];

export const updateSystemSettingsValidation = [
  body('maintenanceMode').optional().isBoolean(),
  body('featureFlags').optional().isObject().withMessage('featureFlags must be an object'),
];

export const updateNotificationDefaultsValidation = [
  body('notificationDefaults').isObject().withMessage('notificationDefaults must be an object'),
];

// ===================== PROFILE =====================

export const updateProfileValidation = [
  body('name').optional().isString().trim().isLength({ min: 1, max: 120 }),
  body('avatarUrl').optional({ nullable: true }).isString().trim().isLength({ max: 500 }),
];

export const changePasswordValidation = [
  body('currentPassword').isString().notEmpty().withMessage('Current password is required'),
  body('newPassword').isString().isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
];
