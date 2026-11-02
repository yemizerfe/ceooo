// server/services/ai/executives/executive-summary.service.ts
// ================================
// Executive dashboard functions: daily briefs, company pulse, business health.
// These functions provide the key metrics and insights shown on the CEO dashboard.
// ================================

import { prisma } from '../../../lib/prisma.js';
import { PromptTemplates } from '../../prompts.js';
import { callGemini, getCached, setCache, clearCache } from '../call-gemini.service.js';

export { getCached, setCache, clearCache };

// ---- Executive Summary (for dashboard and "Generate Insights" button) ----
export async function getExecutiveSummary(userId: string): Promise<any> {
  // Gather raw data first
  const today = new Date();
  const [decisions, tasks, financials] = await Promise.all([
    prisma.decision.findMany({ where: { userId } }),
    prisma.task.findMany({ where: { project: { userId } } }),
    prisma.financialRecord.findMany({ where: { userId } }),
  ]);

  // Calculate metrics
  const completedDecisions = decisions.filter((d: any) => d.status === 'DECIDED').length;
  const totalDecisions = decisions.length;
  const decisionCompletionRate = totalDecisions > 0 ? Math.round((completedDecisions / totalDecisions) * 100) : 0;

  const totalRevenue =
    financials.filter((f: any) => f.type === 'INCOME').reduce((sum: number, f: any) => sum + (f.amount || 0), 0) || 0;

  const totalExpenses =
    financials.filter((f: any) => f.type === 'EXPENSE').reduce((sum: number, f: any) => sum + (f.amount || 0), 0) || 0;

  const profit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? Math.round((profit / totalRevenue) * 100) : 0;

  const pendingTasks = tasks.filter((t: any) => t.status !== 'DONE').length;

  const promptData = {
    totalDecisions,
    completedDecisions,
    decisionCompletionRate,
    totalRevenue,
    totalExpenses,
    profit,
    profitMargin,
    pendingTasks,
  };

  // Try AI first, fall back to rule-based if no API key
  try {
    const aiResponse = await callGemini(
      PromptTemplates.EXECUTIVE_SUMMARY(promptData),
      `You are a senior executive assistant at a ${promptData.totalDecisions}-decision company. ` +
      `Generate a concise executive summary with the following metrics:` +
      `\n- Total decisions: ${promptData.totalDecisions}`,
      userId,
      'executive_summary'
    );
    return {
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        insights: [],
        recommendations: [],
        alerts: [],
        ...promptData,
        aiResponse,
      },
    };
  } catch (error) {
    console.error('Executive summary AI call failed, using fallback:', error);
    return {
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        fallback: true,
        ...promptData,
      },
    };
  }
}

