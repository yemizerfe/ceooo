// server/src/routes/user.routes.ts
import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  completeOnboarding,
  getUserProfile,
  updateUserProfile,
  changePassword,
  updateAvatar,
  uploadAvatar,
  generateAvatar,
  getPreferences,
  updatePreferences,
  getIntegrations,
  connectIntegration,
  disconnectIntegration,
  toggleTwoFactor
} from '../controllers/user.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Profile routes
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);
router.post('/onboarding/complete', completeOnboarding);

// Avatar routes
router.post('/avatar', uploadAvatar);
router.post('/avatar/generate', generateAvatar);
router.put('/avatar', updateAvatar);

// Preferences routes
router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);

// Integration routes
router.get('/integrations', getIntegrations);
router.post('/integrations/:integration/connect', connectIntegration);
router.post('/integrations/:integration/disconnect', disconnectIntegration);

// Security routes
router.post('/change-password', changePassword);
router.post('/2fa/toggle', toggleTwoFactor);

export default router;