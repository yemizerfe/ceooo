// server/src/routes/n8n/webhook.routes.ts
import { Router } from 'express';
import { N8NController } from '../../controllers/n8n.controller.js';

const router = Router();
const controller = new N8NController();

// POST /api/n8n/webhook - Receives data from n8n
router.post('/webhook', controller.webhookReceiver.bind(controller));

// GET /api/n8n/data - Get latest data
router.get('/data', controller.getLatestData.bind(controller));

// GET /api/n8n/history - Get data history
router.get('/history', controller.getDataHistory.bind(controller));

export default router;