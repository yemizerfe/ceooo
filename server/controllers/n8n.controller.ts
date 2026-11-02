// server/src/controllers/n8n.controller.ts
import { Request, Response } from 'express';
import { N8NService } from '../services/n8n.service.js';
import { logger } from '../lib/logger.js';

const n8nService = new N8NService();

export class N8NController {
  // Trigger n8n workflow
  async triggerWorkflow(req: Request, res: Response) {
    try {
      const { userId } = req.body;
      const userIdFinal = userId || process.env.N8N_USER_ID || 'default-user';

      logger.debug({ userId: userIdFinal }, 'Triggering n8n workflow');

      const result = await n8nService.triggerWorkflow({
        userId: userIdFinal,
        action: 'refresh_data',
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: 'n8n workflow triggered successfully',
        data: result,
      });
    } catch (error) {
      console.error('❌ Failed to trigger n8n:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Webhook receiver (called by n8n)
  async webhookReceiver(req: Request, res: Response) {
    try {
      const data = req.body;
      logger.debug({ provider: 'n8n' }, 'Received webhook');

      // Validate webhook secret
      const webhookSecret = req.headers['x-webhook-secret'];
      if (webhookSecret !== process.env.N8N_WEBHOOK_SECRET) {
        logger.warn({ provider: 'n8n' }, 'Rejected webhook with an invalid secret');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Save data
      const result = await n8nService.saveIntegrationData({
        userId: data.userId || process.env.N8N_USER_ID || 'default-user',
        source: data.source || 'n8n',
        payload: data.payload || data,
      });

      logger.debug({ id: result.id }, 'Stored n8n payload');

      res.json({
        success: true,
        message: 'Data received successfully',
        id: result.id,
      });
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Get latest data
  async getLatestData(req: Request, res: Response) {
    try {
      const { userId } = req.query;
      const userIdFinal = userId as string || process.env.N8N_USER_ID || 'default-user';

      const data = await n8nService.getLatestData(userIdFinal);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('❌ Error fetching latest data:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Get data history
  async getDataHistory(req: Request, res: Response) {
    try {
      const { userId, limit } = req.query;
      const userIdFinal = userId as string || process.env.N8N_USER_ID || 'default-user';
      const limitFinal = limit ? parseInt(limit as string) : 10;

      const data = await n8nService.getDataHistory(userIdFinal, limitFinal);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('❌ Error fetching data history:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Get n8n status
  async getStatus(req: Request, res: Response) {
    try {
      const workflows = await n8nService.getWorkflowStatus('active');
      const executions = await n8nService.getExecutions(5);

      res.json({
        success: true,
        status: 'running',
        data: {
          activeWorkflows: workflows?.data?.length || 0,
          recentExecutions: executions?.data || [],
        },
      });
    } catch (error) {
      console.error('❌ n8n status check failed:', error);
      res.status(500).json({
        success: false,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Make sure n8n is running on localhost:5678',
      });
    }
  }
}