// server/services/ai/executives/executive-forecast.service.ts
// ================================
// Strategic forecasting, insights generation, risk detection, and opportunity identification.
// ================================

import { prisma } from '../../../lib/prisma.js';
import { PromptTemplates } from '../../prompts.js';
import { callGemini } from '../call-gemini.service.js';

// ---- Generate Insights (on demand) ----
export async function generateInsights(userId: string): Promise<any> {
  const [decisions, tasks] = await Promise.all([
    prisma.decision.findMany({ where: { userId } }),
    prisma.task.findMany({ where: { project: { userId } } }),
  ]);

  const completedDecisions = decisions.filter((d: any) => d.status === 'DECIDED').length;
  const completedTasks = tasks.filter((t: any) => t.status === 'DONE').length;

  const promptData = {
    totalDecisions: decisions.length,
    completedDecisions,
    totalTasks: tasks.length,
    completedTasks,
  };

  try {
    const aiResponse = await callGemini(
      PromptTemplates.GENERATE_INSIGHTS(promptData),
      'You are a management consultant analyzing the company performance and providing actionable insights.',
      userId,
      'generate_insights'
    );
    return {
      success: true,
      data: {
        insights: [],
        recommendations: [],
        aiResponse,
      },
    };
  } catch (error) {
    console.error('Generate insights AI call failed:', error);
    return { success: true, data: { insights: [], recommendations: [], fallback: true } };
  }
}

// ---- Detect Risks ----
export async function detectRisks(userId: string): Promise<any> {
  const [decisions, tasks, financials] = await Promise.all([
    prisma.decision.findMany({ where: { userId, status: 'PENDING' } }),
    prisma.task.findMany({ where: { project: { userId }, status: { not: 'DONE' } } }),
    prisma.financialRecord.findMany({ where: { userId } }),
  ]);

  const pendingDecisions = decisions.length;
  const overdueTasks = tasks.filter((t: any) => t.status !== 'DONE' && t.dueDate < new Date()).length;
  const totalExpenses = financials.filter((f: any) => f.type === 'EXPENSE').reduce((s: number, f: any) => s + (f.amount || 0), 0);
  const totalRevenue = financials.filter((f: any) => f.type === 'INCOME').reduce((s: number, f: any) => s + (f.amount || 0), 0);

  const promptData = {
    pendingDecisions,
    overdueTasks,
    revenue: totalRevenue,
    expenses: totalExpenses,
  };

  try {
    const aiResponse = await callGemini(
      PromptTemplates.DETECT_RISKS(promptData),
      'You are a risk analyst. Identify key business risks and provide actionable mitigation recommendations.',
      userId,
      'detect_risks'
    );
    return {
      success: true,
      data: {
        risks: [],
        aiAnalysis: aiResponse,
      },
    };
  } catch (error) {
    console.error('Detect risks AI call failed:', error);
    return { success: true, data: { risks: [], fallback: true } };
  }
}

// ---- Discover Opportunities ----
export async function discoverOpportunities(userId: string): Promise<any> {
  const [completedDecisions, completedTasks, financials] = await Promise.all([
    prisma.decision.count({ where: { userId, status: 'DECIDED' } }),
    prisma.task.count({ where: { project: { userId }, status: 'DONE' } }),
    prisma.financialRecord.findMany({ where: { userId } }),
  ]);

  const totalRevenue = financials.filter((f: any) => f.type === 'INCOME').reduce((s: number, f: any) => s + (f.amount || 0), 0);
  const totalExpenses = financials.filter((f: any) => f.type === 'EXPENSE').reduce((s: number, f: any) => s + (f.amount || 0), 0);
  const profitMargin = totalRevenue > 0 ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100) : 0;

  const promptData = {
    completedDecisions,
    completedTasks,
    revenue: totalRevenue,
    profitMargin,
    okrs: 0,
  };

  try {
    const aiResponse = await callGemini(
      PromptTemplates.DISCOVER_OPPORTUNITIES(promptData),
      'You are a business development strategist. Identify growth opportunities and market advantages.',
      userId,
      'discover_opportunities'
    );
    return {
      success: true,
      data: {
        opportunities: [],
        aiAnalysis: aiResponse,
      },
    };
  } catch (error) {
    console.error('Discover opportunities AI call failed:', error);
    return { success: true, data: { opportunities: [], fallback: true } };
  }
}
