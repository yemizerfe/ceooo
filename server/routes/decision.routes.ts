// server/src/routes/decision.routes.ts
import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/admin.middleware.js';
import {
  getDecisions,
  getDecisionById,
  createDecision,
  updateDecision,
  deleteDecision,
  addDecisionInsight,
  getDecisionInsights,
  getDecisionStats
} from '../controllers/decision.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);
router.use(requirePermission('decisions.view'));

// Decision CRUD
router.get('/', getDecisions);
router.get('/stats', getDecisionStats);
router.get('/:id', getDecisionById);
router.post('/', requirePermission('decisions.create'), createDecision);
router.put('/:id', requirePermission('decisions.update'), updateDecision);
router.delete('/:id', requirePermission('decisions.delete'), deleteDecision);

// Decision insights
router.get('/:id/insights', getDecisionInsights);
router.post('/:id/insights', addDecisionInsight);

export default router;