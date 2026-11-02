// server/src/routes/financial.routes.ts
import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/admin.middleware.js';
import multer from 'multer';
import {
  getFinancialDashboard,
  getFinancialRecords,
  addFinancialRecord,
  updateFinancialRecord,
  deleteFinancialRecord,
  importFromExternal,
  uploadCSV,
  getBudgets,
  createBudget,
  updateBudget,
  generateForecast,
  getIntegrationStatus
} from '../controllers/financial.controller.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);
router.use(requirePermission('finance.view'));

// Dashboard & Metrics
router.get('/dashboard', getFinancialDashboard);
router.get('/records', getFinancialRecords);
router.post('/records', requirePermission('finance.create'), addFinancialRecord);
router.put('/records/:recordId', requirePermission('finance.update'), updateFinancialRecord);
router.delete('/records/:recordId', requirePermission('finance.delete'), deleteFinancialRecord);
router.get('/forecast', generateForecast);

// Budget Management
router.get('/budgets', getBudgets);
router.post('/budgets', requirePermission('finance.create'), createBudget);
router.put('/budgets/:id', requirePermission('finance.update'), updateBudget);

// External Integrations
router.post('/import', importFromExternal);
router.post('/upload-csv', upload.single('file'), uploadCSV);
router.get('/integrations', getIntegrationStatus);

export default router;