// server/services/ai/copilot/copilot-chat.service.ts
// ================================
// AI co-pilot chat functionality: conversation handling and context management.
// ================================

import { prisma } from '../../../lib/prisma.js';
import { PromptTemplates } from '../../prompts.js';
import { callGemini } from '../call-gemini.service.js';
import { buildIntegrationContext, fetchAllProviderSnapshots } from '../integrations/integration-analysis.service.js';

// ---- Copilot Chat ----
export async function copilotChat(
  userId: string,
  message: string,
  conversationId?: string
): Promise<any> {
  // Gather context data for the prompt
  const [pendingDecisions, pendingTasks, upcomingEvents, integrationSnapshots] = await Promise.all([
    prisma.decision.count({ where: { userId, status: 'PENDING' } }),
    prisma.task.count({ where: { project: { userId }, status: { not: 'DONE' } } }),
    prisma.calendarEvent.count({ where: { userId, startTime: { gte: new Date() } } }),
    fetchAllProviderSnapshots(userId).catch(() => []),
  ]);

  const integrationContext = buildIntegrationContext(integrationSnapshots);

  const systemContext = `You are the CEO's AI Executive Assistant. Current context:
- Pending decisions: ${pendingDecisions}
- Pending tasks: ${pendingTasks}
- Upcoming meetings: ${upcomingEvents}
${integrationContext}
Use the integration data above to give specific, data-driven recommendations. Be concise, professional, and action-oriented.`;

  const response = await callGemini(
    message,
    systemContext,
    userId,
    'copilot_chat'
  );

  return {
    message: response,
    conversationId: conversationId || `conv_${Date.now()}`,
    timestamp: new Date().toISOString(),
    context: {
      pendingDecisions,
      pendingTasks,
      upcomingMeetings: upcomingEvents,
    },
    suggestions: [
      'What are my top priorities today?',
      'Analyze my recent decisions',
      'Identify business risks',
      'Generate weekly performance report',
    ],
  };
}

// ---- Copilot Summarize ----
export async function copilotSummarize(
  userId: string,
  content: string,
  type: 'meeting' | 'note' = 'note'
): Promise<any> {
  const prompt = type === 'meeting'
    ? `Summarize this meeting into:
  1. Key decisions
  2. Action items with owners
  3. Deadlines and dependencies
  4. Topics for follow-up
  
  Content: ${content}`
    : `Summarize this note into:
  1. Key insights
  2. Action items
  3. Suggested tags
  
  Content: ${content}`;

  try {
    const aiResponse = await callGemini(
      prompt,
      'You are a professional meeting secretary. Create clear, structured summaries.',
      userId,
      'copilot_summarize'
    );
    return {
      success: true,
      data: {
        summary: aiResponse,
        summarizedAt: new Date().toISOString(),
        type,
      },
    };
  } catch (error) {
    console.error('Copilot summarize AI call failed:', error);
    return {
      success: true,
      data: {
        summary: 'Summary unavailable. Please try again later.',
        summarizedAt: new Date().toISOString(),
        type,
        fallback: true,
      },
    };
  }
}
