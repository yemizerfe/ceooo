import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/admin.middleware.js';
import {
  getDashboardStats,
  getCompanySnapshot,
  getDashboardAIInsights,
  getStrategicFocus,
  getAlertsRisks,
  getCalendarPreview,
  getProgressTracker
} from '../controllers/dashboard.controller.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);
router.use(requirePermission('reports.view'));

router.get('/stats', getDashboardStats);
router.get('/company-snapshot', getCompanySnapshot);
router.get('/ai-insights', getDashboardAIInsights);
router.get('/strategic-focus', getStrategicFocus);
router.get('/alerts-risks', getAlertsRisks);
router.get('/calendar-preview', getCalendarPreview);
router.get('/progress-tracker', getProgressTracker);

export default router;