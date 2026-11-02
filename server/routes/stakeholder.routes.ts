// server/src/routes/stakeholder.routes.ts
import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/admin.middleware.js';
import {
  getStakeholders,
  getStakeholderById,
  createStakeholder,
  updateStakeholder,
  deleteStakeholder,
  addInteraction,
  getInteractions,
  addDeal,
  updateDeal,
  getStakeholderInsights,
  updateEngagementScores,
  getUpcomingFollowups
} from '../controllers/stakeholder.controller.js';

const router = express.Router();

router.use(authenticate);
router.use(requirePermission('stakeholders.view'));

// Stakeholder CRUD
router.get('/', getStakeholders);
router.get('/insights', getStakeholderInsights);
router.get('/followups', getUpcomingFollowups);
router.get('/:id', getStakeholderById);
router.post('/', requirePermission('stakeholders.create'), createStakeholder);
router.put('/:id', requirePermission('stakeholders.update'), updateStakeholder);
router.delete('/:id', requirePermission('stakeholders.delete'), deleteStakeholder);

// Interactions
router.get('/:id/interactions', getInteractions);
router.post('/:id/interactions', addInteraction);

// Deals
router.post('/:id/deals', addDeal);
router.put('/deals/:dealId', updateDeal);

// Utilities
router.post('/update-engagement-scores', updateEngagementScores);

export default router;