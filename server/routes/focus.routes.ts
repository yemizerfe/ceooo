import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/admin.middleware.js';
import {
  getFocusData,
  createFocusSession,
  getFocusTasks,
  createFocusTask,
  updateFocusTask,
  deleteFocusTask,
  getFocusBlocks,
  createFocusBlock,
  deleteFocusBlock,
} from '../controllers/focus.controller.js';

const router = express.Router();

router.use(authenticate);
router.use(requirePermission('focus.manage'));

// Dashboard aggregate (sessions + tasks + blocks + stats)
router.get('/', getFocusData);

// Sessions
router.post('/sessions', createFocusSession);

// Tasks
router.get('/tasks', getFocusTasks);
router.post('/tasks', createFocusTask);
router.put('/tasks/:id', updateFocusTask);
router.delete('/tasks/:id', deleteFocusTask);

// Blocks
router.get('/blocks', getFocusBlocks);
router.post('/blocks', createFocusBlock);
router.delete('/blocks/:id', deleteFocusBlock);

export default router;
