import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/admin.middleware';
import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getUpcomingEvents,
} from '../controllers/calendar.controller';

const router = Router();

router.use(authenticate);
router.use(requirePermission('calendar.view'));

router.get('/', getEvents);
router.get('/upcoming', getUpcomingEvents);
router.post('/', requirePermission('calendar.create'), createEvent);
router.put('/:id', requirePermission('calendar.update'), updateEvent);
router.delete('/:id', requirePermission('calendar.delete'), deleteEvent);

export default router;
