import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/admin.middleware.js';
import {
  listOKRs,
  getOKR,
  createOKR,
  updateOKR,
  deleteOKR,
  createKeyResult,
  updateKeyResult,
  incrementKeyResult,
  deleteKeyResult,
} from '../controllers/performance.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/okrs', requirePermission('objectives.view'), listOKRs);
router.post('/okrs', requirePermission('objectives.manage'), createOKR);
router.get('/okrs/:id', requirePermission('objectives.view'), getOKR);
router.put('/okrs/:id', requirePermission('objectives.manage'), updateOKR);
router.delete('/okrs/:id', requirePermission('objectives.manage'), deleteOKR);

router.post('/okrs/:id/key-results', requirePermission('objectives.manage'), createKeyResult);
router.put('/key-results/:krId', requirePermission('objectives.manage'), updateKeyResult);
router.patch('/key-results/:krId/increment', requirePermission('objectives.manage'), incrementKeyResult);
router.delete('/key-results/:krId', requirePermission('objectives.manage'), deleteKeyResult);

export default router;
