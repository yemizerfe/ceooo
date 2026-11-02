// server/services/ai/executives/company-metrics.service.ts
// ================================
// Company pulse, business health, and daily brief generation.
// ================================

import { prisma } from '../../../lib/prisma.js';
import { PromptTemplates } from '../../prompts.js';
import { callGemini } from '../call-gemini.service.js';

// ---- Company Pulse (auto-refresh on dashboard) ----
export async function getCompanyPulse(userId: string): Promise<any> {
  const [recentDecisions, completedTasks, activeStakeholders, notesCount] = await Promise.all([
    prisma.decision.count({ where: { userId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    prisma.task.count({ where: { project: { userId }, status: 'DONE', createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    prisma.stakeholder.count({ where: { userId, lastContactAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
    prisma.note.count({ where: { userId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
  ]);

  const promptData = {
    recentDecisions,
    completedTasks,
    stakeholders: activeStakeholders,
    notes: notesCount,
  };

  try {
    await callGemini(
      PromptTemplates.COMPANY_PULSE(promptData),
      'You are a business intelligence analyst. Analyze this company data and provide a pulse check.',
      userId,
      'company_pulse'
    );
    return {
      success: true,
      data: {
        overallScore: 0,
        trends: {},
      },
    };
  } catch (error) {
    console.error('Company pulse AI call failed, using fallback:', error);
    return {
      success: true,
      data: {
        overallScore: 0,
        trends: {},
        fallback: true,
      },
    };
  }
}

// ---- Business Health ----
export async function getBusinessHealth(userId: string): Promise<any> {
  const [revenue, expenses] = await Promise.all([
    prisma.financialRecord.aggregate({ _sum: { amount: true }, where: { userId, type: 'INCOME' } }),
    prisma.financialRecord.aggregate({ _sum: { amount: true }, where: { userId, type: 'EXPENSE' } }),
  ]);

  const totalRevenue = revenue._sum.amount || 0;
  const totalExpenses = expenses._sum.amount || 0;
  const profit = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0 ? Math.round((profit / totalRevenue) * 100) : 0;

  return {
    success: true,
    data: {
      totalRevenue,
      totalExpenses,
      profit,
      profitMargin: margin,
      period: 'current',
    },
  };
}

// ---- Daily Brief ----
export async function getDailyBrief(userId: string): Promise<any> {
  const today = new Date();
  const [overdueTasks, pendingDecisions, upcomingEvents, revenue, expenses, activeProjects] = await Promise.all([
    prisma.task.count({ where: { project: { userId }, status: { not: 'DONE' }, dueDate: { lt: today } } }),
    prisma.decision.count({ where: { userId, status: 'PENDING' } }),
    prisma.calendarEvent.count({
      where: { userId, startTime: { gte: today, lte: new Date(today.getTime() + 7 * 24 * 3600 * 1000) } },
    }),
    prisma.financialRecord.aggregate({ _sum: { amount: true }, where: { userId, type: 'INCOME' } }),
    prisma.financialRecord.aggregate({ _sum: { amount: true }, where: { userId, type: 'EXPENSE' } }),
    prisma.project.count({ where: { userId } }),
  ]);

  const prompt = `Generate a concise daily CEO brief with current:
- Overdue tasks: ${overdueTasks}
- Pending decisions: ${pendingDecisions}
- Upcoming meetings (7 days): ${upcomingEvents}
- Revenue: $${(revenue._sum.amount || 0).toFixed(2)}
- Expenses: $${(expenses._sum.amount || 0).toFixed(2)}
- Active projects: ${activeProjects}

Write 3-5 bullet points highlighting the most important items for the day.`;

  try {
    const aiResponse = await callGemini(
      prompt,
      "You are the CEO's personal AI assistant. Provide a concise, actionable daily brief that prioritizes important items.",
      userId,
      'daily_brief'
    );
    return {
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        brief: aiResponse,
        metrics: {
          overdueTasks,
          pendingDecisions,
          upcomingEvents,
          revenue: revenue._sum.amount || 0,
          expenses: expenses._sum.amount || 0,
          activeProjects,
        },
      },
    };
  } catch (error) {
    console.error('Daily brief AI call failed, using fallback:', error);
    return {
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        brief: 'Auto-generated brief unavailable. Please check your API key or try again later.',
        metrics: {
          overdueTasks,
          pendingDecisions,
          upcomingEvents,
          revenue: revenue._sum.amount || 0,
          expenses: expenses._sum.amount || 0,
          activeProjects,
        },
        fallback: true,
      },
    };
  }
}
