import express from 'express';
import { rateLimit } from '../middleware/rateLimit.middleware.js';
import {
  createSupportRequest,
  supportChat,
  requestHumanHandoff,
} from '../controllers/support.controller.js';

const router = express.Router();

// Public surface: these endpoints are reachable without a session, so they get
// a dedicated, tighter limit than the general API limiter.
const supportLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

router.post('/requests', supportLimit, createSupportRequest);
router.post('/chat', supportLimit, supportChat);
router.post('/handoff', supportLimit, requestHumanHandoff);

export default router;
