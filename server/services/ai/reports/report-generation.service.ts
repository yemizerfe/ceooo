// server/services/ai/reports/report-generation.service.ts
// ================================
// Report generation and AI recommendations.
// ================================

import { prisma } from '../../../lib/prisma.js';
import { PromptTemplates } from '../../prompts.js';
import { callGemini } from '../call-gemini.service.js';

// ---- Generate Report ----
export async function generateReport(
  userId: string,
  reportType: string,
  dateRange?: { start: Date; end: Date },
  format?: string
): Promise<any> {
  const start = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = dateRange?.end || new Date();

  const [decisions, tasks, financials, calendarEvents] = await Promise.all([
    prisma.decision.findMany({ where: { userId, createdAt: { gte: start, lte: end } } }),
    prisma.task.findMany({ where: { project: { userId }, createdAt: { gte: start, lte: end } } }),
    prisma.financialRecord.findMany({ where: { userId, date: { gte: start, lte: end } } }),
    prisma.calendarEvent.findMany({ where: { userId, startTime: { gte: start, lte: end } } }),
  ]);

  const completedDecisions = decisions.filter((d: any) => d.status === 'DECIDED').length;
  const completedTasks = tasks.filter((t: any) => t.status === 'DONE').length;
  const totalRevenue = financials.filter((f: any) => f.type === 'INCOME').reduce((s: number, f: any) => s + (f.amount || 0), 0);
  const totalExpenses = financials.filter((f: any) => f.type === 'EXPENSE').reduce((s: number, f: any) => s + (f.amount || 0), 0);

  const promptData = {
    reportType,
    dateRange: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
    totalDecisions: decisions.length,
    completedDecisions,
    totalTasks: tasks.length,
    completedTasks,
    totalRevenue,
    totalExpenses,
    profit: totalRevenue - totalExpenses,
    totalEvents: calendarEvents.length,
    dataSamples: decisions.length > 0 ? decisions.slice(0, 5).map((d: any) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      createdAt: d.createdAt,
    })) : [],
  };

  try {
    const aiResponse = await callGemini(
      PromptTemplates.GENERATE_REPORT(promptData),
      `You are a business analyst. Generate a ${reportType} report.`,
      userId,
      'generate_report'
    );
    return {
      success: true,
      data: {
        reportType,
        generatedAt: new Date().toISOString(),
        aiResponse,
      },
    };
  } catch (error) {
    console.error('Report generation AI call failed:', error);
    return {
      success: true,
      data: {
        reportType,
        generatedAt: new Date().toISOString(),
        fallback: true,
        message: 'Report generation unavailable. Please try again later.',
      },
    };
  }
}

// ---- Get AI Recommendations ----
export async function getAIRecommendations(userId: string): Promise<any> {
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
      PromptTemplates.GET_AI_RECOMMENDATIONS(promptData),
      'You are a strategic advisor. Provide actionable recommendations based on the current business state.',
      userId,
      'ai_recommendations'
    );
    return {
      success: true,
      data: {
        recommendations: [],
        aiAnalysis: aiResponse,
      },
    };
  } catch (error) {
    console.error('AI recommendations AI call failed:', error);
    return {
      success: true,
      data: {
        recommendations: [],
        fallback: true,
        message: 'Recommendations unavailable. Please try again later.',
      },
    };
  }
}
