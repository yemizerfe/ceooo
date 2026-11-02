import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/admin.middleware.js';
import {
  listKPIs,
  getKPI,
  createKPI,
  updateKPI,
  deleteKPI,
  addKPIValue,
  getKPIValues,
} from '../controllers/kpi.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('kpis.view'), listKPIs);
router.post('/', requirePermission('kpis.manage'), createKPI);
router.get('/:id', requirePermission('kpis.view'), getKPI);
router.put('/:id', requirePermission('kpis.manage'), updateKPI);
router.delete('/:id', requirePermission('kpis.manage'), deleteKPI);
router.post('/:id/values', requirePermission('kpis.manage'), addKPIValue);
router.get('/:id/values', requirePermission('kpis.view'), getKPIValues);

export default router;
