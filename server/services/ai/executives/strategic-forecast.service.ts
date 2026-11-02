// server/services/ai/executives/strategic-forecast.service.ts
// ================================
// Strategic forecast generation.
// ================================

import { prisma } from '../../../lib/prisma.js';
import { PromptTemplates } from '../../prompts.js';
import { callGemini } from '../call-gemini.service.js';

export async function getStrategicForecast(userId: string, timeframe: string = 'quarterly'): Promise<any> {
  const [decisions, tasks, financials] = await Promise.all([
    prisma.decision.findMany({ where: { userId } }),
    prisma.task.findMany({ where: { project: { userId } } }),
    prisma.financialRecord.findMany({ where: { userId } }),
  ]);

  const completedDecisions = decisions.filter((d: any) => d.status === 'DECIDED').length;
  const completedTasks = tasks.filter((t: any) => t.status === 'DONE').length;
  const totalRevenue = financials.filter((f: any) => f.type === 'INCOME').reduce((s: number, f: any) => s + (f.amount || 0), 0);
  const totalExpenses = financials.filter((f: any) => f.type === 'EXPENSE').reduce((s: number, f: any) => s + (f.amount || 0), 0);

  const promptData = {
    decisionCompletion: Math.round((completedDecisions / decisions.length) * 100 || 0),
    taskCompletion: Math.round((completedTasks / tasks.length) * 100 || 0),
    revenue: totalRevenue,
    revenueGrowth: 0,
    okrs: 0,
  };

  try {
    const aiResponse = await callGemini(
      PromptTemplates.STRATEGIC_FORECAST(promptData),
      'You are a strategic forecaster. Generate a forward-looking business forecast with clear predictions, risks, and recommendations.',
      userId,
      'strategic_forecast'
    );
    return {
      success: true,
      data: {
        timeframe,
        aiAnalysis: aiResponse,
      },
    };
  } catch (error) {
    console.error('Strategic forecast AI call failed:', error);
    return {
      success: true,
      data: {
        timeframe,
        fallback: true,
        predictions: {},
        risks: [],
        recommendations: [],
      },
    };
  }
}
