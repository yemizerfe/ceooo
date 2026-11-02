// server/src/routes/n8n/trigger.routes.ts
import { Router } from 'express';
import { N8NController } from '../../controllers/n8n.controller.js';

const router = Router();
const controller = new N8NController();

// POST /api/n8n/trigger - Triggers n8n workflow
router.post('/trigger', controller.triggerWorkflow.bind(controller));

// GET /api/n8n/status - Gets n8n status
router.get('/status', controller.getStatus.bind(controller));

export default router;