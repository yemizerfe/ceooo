// server/src/services/n8n.service.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class N8NService {
  async saveIntegrationData(data: {
    userId: string;
    source: string;
    payload: any;
  }): Promise<any> {
    try {
      // First, try to find the user
      let user = await prisma.user.findUnique({
        where: { id: data.userId }
      });

      // If user not found, get the first available user
      if (!user) {
        console.log(`⚠️ User ${data.userId} not found, finding first available user...`);
        user = await prisma.user.findFirst();
        
        if (!user) {
          throw new Error('No users found in database. Please create a user first.');
        }
        
        console.log(`✅ Using existing user: ${user.id}`);
      }

      // Save the data with the valid user ID
      const result = await prisma.integrationData.create({
        data: {
          userId: user.id,
          source: data.source || 'n8n',
          data: data.payload,
          receivedAt: new Date(),
        },
      });

      console.log(`✅ Data saved for user: ${user.id}`);
      return result;
    } catch (error) {
      console.error('❌ Error saving integration data:', error);
      throw error;
    }
  }

  async getLatestData(userId: string): Promise<any> {
    try {
      const result = await prisma.integrationData.findFirst({
        where: { userId },
        orderBy: { receivedAt: 'desc' },
      });
      return result;
    } catch (error) {
      console.error('❌ Error fetching latest data:', error);
      throw error;
    }
  }

  async getDataHistory(userId: string, limit = 10): Promise<any> {
    try {
      return await prisma.integrationData.findMany({
        where: { userId },
        orderBy: { receivedAt: 'desc' },
        take: Math.max(1, Math.min(limit, 100)),
      });
    } catch (error) {
      console.error('❌ Error fetching data history:', error);
      throw error;
    }
  }

  /**
   * Fire the configured n8n webhook (free, self-hosted automation bus).
   * No-ops gracefully when n8n is not configured so the app stays functional.
   */
  async triggerWorkflow(payload: Record<string, unknown>): Promise<any> {
    const url = process.env.N8N_WEBHOOK_URL;
    if (!url) {
      console.log('ℹ️ N8N_WEBHOOK_URL not set — skipping workflow trigger');
      return { triggered: false, reason: 'n8n not configured' };
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.N8N_WEBHOOK_SECRET
          ? { 'x-webhook-secret': process.env.N8N_WEBHOOK_SECRET }
          : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`n8n webhook responded ${response.status}`);
    }
    return { triggered: true, status: response.status };
  }

  /** Snapshot of workflow activity sourced from our own execution log. */
  async getWorkflowStatus(filter: string): Promise<{ data: any[] }> {
    const executions = await prisma.workflowExecution.findMany({
      where: filter === 'active' ? undefined : { status: filter as any },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });
    return { data: executions };
  }

  async getExecutions(limit = 5): Promise<{ data: any[] }> {
    const executions = await prisma.workflowExecution.findMany({
      orderBy: { startedAt: 'desc' },
      take: Math.max(1, Math.min(limit, 50)),
    });
    return { data: executions };
  }
}