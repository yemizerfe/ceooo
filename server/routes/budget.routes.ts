// server/src/routes/budget.routes.ts
import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/admin.middleware.js';
import multer from 'multer';
import {
  getBudgets,
  getBudgetMetrics,
  createBudget,
  updateBudget,
  deleteBudget,
  importFromExternal,
  uploadBudgetFile,
  updateSpent,
  generateForecast,
  getIntegrationStatus
} from '../controllers/budget.controller.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);
router.use(requirePermission('finance.view'));

// Budget CRUD
router.get('/', getBudgets);
router.get('/metrics', getBudgetMetrics);
router.post('/', requirePermission('finance.create'), createBudget);
router.put('/:id', requirePermission('finance.update'), updateBudget);
router.delete('/:id', requirePermission('finance.delete'), deleteBudget);

// Spending tracking
router.put('/:id/spent', requirePermission('finance.update'), updateSpent);

// External integrations
router.post('/import', importFromExternal);
router.post('/upload', upload.single('file'), uploadBudgetFile);
router.get('/integrations', getIntegrationStatus);

// Forecasting
router.get('/forecast', generateForecast);

export default router;