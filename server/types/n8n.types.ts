// server/src/types/n8n.types.ts

export interface N8NWebhookPayload {
  userId: string;
  source: string;
  data: any;
  timestamp: string;
}

export interface N8NWebhookResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export interface IntegrationData {
  id: string;
  userId: string;
  source: string;
  data: any;
  receivedAt: Date;
  processedAt?: Date;
}