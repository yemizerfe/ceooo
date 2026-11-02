import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/admin.middleware';
import {
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  summarizeNote,
} from '../controllers/note.controller';

const router = Router();

router.use(authenticate);
router.use(requirePermission('notes.view'));

router.get('/', getNotes);
router.post('/', requirePermission('notes.create'), createNote);
router.get('/:id', getNoteById);
router.put('/:id', requirePermission('notes.update'), updateNote);
router.delete('/:id', requirePermission('notes.delete'), deleteNote);
router.post('/:id/summarize', summarizeNote);

export default router;
