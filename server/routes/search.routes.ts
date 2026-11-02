import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/admin.middleware.js';
import { globalSearch } from '../controllers/search.controller.js';

const router = express.Router();

router.use(authenticate);
router.get('/', requirePermission('search.use'), globalSearch);

export default router;
