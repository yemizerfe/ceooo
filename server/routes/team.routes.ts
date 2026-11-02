import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getTeamMembers,
  getTeamMemberById,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  getTeamInsights
} from '../controllers/team.controller.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// IMPORTANT: Place specific routes BEFORE dynamic routes with :id
router.get('/insights', getTeamInsights);
router.get('/', getTeamMembers);
router.post('/', createTeamMember);
router.get('/:id', getTeamMemberById);
router.put('/:id', updateTeamMember);
router.delete('/:id', deleteTeamMember);

export default router;