import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import aiService from '../services/ai.service.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { fetchAllProviderSnapshots, buildIntegrationContext, type ProviderSnapshot } from '../services/integrationSnapshot.service.js';
import {
  analyzeDecision as analyzeDecisionRecord,
  analyzeDecisionDeep as analyzeDecisionRecordDeep,
} from '../services/ai/decisions/decision-analysis.service.js';
import {
  dedupeInsights,
  pruneDuplicateInsights,
  listInsights as listInsightRows,
} from '../services/ai/insights/insight-management.service.js';
import {
  buildCompanyContext,
  contextCoverage,
} from '../services/ai/company/company-context.service.js';
import { callGemini } from '../services/ai/call-gemini.service.js';

// ==================== EXECUTIVE DASHBOARD ====================

export const getExecutiveSummary = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const data = await aiService.getExecutiveSummary(userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Executive summary error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCompanyPulse = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const data = await aiService.getCompanyPulse(userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Company pulse error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getBusinessHealth = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const data = await aiService.getBusinessHealth(userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Business health error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getDailyBrief = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Real aggregation from the user's data (service falls back to rule-based
    // output automatically when no AI key is configured).
    const brief = await aiService.getDailyBrief(userId);

    // Shape the fields the dashboard widgets render.
    const today = new Date();
    const [overdueTasks, pendingDecisions, upcomingEvents, revenue, expenses, activeProjects] =
      await Promise.all([
        prisma.task.count({
          where: { project: { userId }, status: { not: 'DONE' }, dueDate: { lt: today } },
        }),
        prisma.decision.count({ where: { userId, status: 'PENDING' } }),
        prisma.calendarEvent.count({
          where: {
            userId,
            startTime: { gte: today, lte: new Date(today.getTime() + 7 * 24 * 3600 * 1000) },
          },
        }),
        prisma.financialRecord.aggregate({
          _sum: { amount: true },
          where: { userId, type: 'INCOME' },
        }),
        prisma.financialRecord.aggregate({
          _sum: { amount: true },
          where: { userId, type: 'EXPENSE' },
        }),
        prisma.project.count({ where: { userId, status: 'ACTIVE' } }),
      ]);

    const integrationSnapshots: ProviderSnapshot[] = await fetchAllProviderSnapshots(userId).catch(() => []);

    const totalRevenue = revenue._sum.amount || 0;
    const totalExpenses = expenses._sum.amount || 0;
    const profit = totalRevenue - totalExpenses;

    const externalRecords = integrationSnapshots.reduce<number>((sum, snap) => sum + snap.totalRecords, 0);
    const externalProjects = integrationSnapshots.reduce<number>(
      (sum, snap) => sum + (snap.data['projects']?.length || 0) + (snap.data['boards']?.length || 0) + (snap.data['repos']?.length || 0),
      0,
    );
    const externalUnpaid = integrationSnapshots.reduce<number>(
      (sum, snap) =>
        sum +
        (snap.data['invoices'] || []).filter((i: any) => i.status === 'open' || i.status === 'unpaid' || i.status === 'OPEN').length,
      0,
    );

    const criticalRisk =
      overdueTasks > 0
        ? `${overdueTasks} overdue task${overdueTasks === 1 ? '' : 's'}`
        : pendingDecisions > 0
          ? `${pendingDecisions} pending decision${pendingDecisions === 1 ? '' : 's'}`
          : externalUnpaid > 0
            ? `${externalUnpaid} unpaid invoice${externalUnpaid === 1 ? '' : 's'} in connected systems`
            : profit < 0
              ? 'Expenses exceed revenue'
              : 'No critical risks detected';

    const keyOpportunity =
      profit > 0
        ? `Profit of ${Math.round(profit).toLocaleString()}`
        : activeProjects > 0
          ? `${activeProjects} active project${activeProjects === 1 ? '' : 's'} in flight`
          : externalProjects > 0
            ? `${externalProjects} external project${externalProjects === 1 ? '' : 's'} synced`
            : upcomingEvents > 0
              ? `${upcomingEvents} meeting${upcomingEvents === 1 ? '' : 's'} this week`
              : 'Pipeline ready to build';

    const recommendedAction =
      overdueTasks > 0
        ? 'Clear overdue tasks first'
        : pendingDecisions > 0
          ? `Resolve ${pendingDecisions} pending decision${pendingDecisions === 1 ? '' : 's'}`
          : upcomingEvents > 0
            ? 'Prepare for upcoming meetings'
            : 'Review quarterly OKR progress';

    res.status(200).json({
      success: true,
      data: {
        ...brief,
        summary: brief.greeting || 'Your brief is ready.',
        criticalRisk,
        keyOpportunity,
        recommendedAction,
        integrationSummary: {
          providers: integrationSnapshots.length,
          records: externalRecords,
          externalProjects,
          externalUnpaidInvoices: externalUnpaid,
        },
        dataLimitations:
          totalRevenue === 0 && totalExpenses === 0
            ? 'No financial records yet — profit figures excluded.'
            : undefined,
      },
    });
  } catch (error) {
    console.error('Daily brief error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ==================== DECISION INTELLIGENCE ====================

export const getDecisionIntelligence = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const data = await aiService.getDecisionIntelligence(userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Decision intelligence error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const analyzeDecision = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    const { decisionId, title, description, context } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Path 1: analyze an existing decision record by id.
    if (decisionId) {
      const owned = await prisma.decision.findFirst({ where: { id: decisionId, userId } });
      if (!owned) {
        res.status(404).json({ success: false, message: 'Decision not found' });
        return;
      }
      const result = await analyzeDecisionRecord(userId, decisionId, context);
      res.status(200).json({ success: true, data: result });
      return;
    }

    // Path 2: ad-hoc analysis from the queue UI ({title, description, context}).
    if (!title) {
      res.status(400).json({ success: false, message: 'decisionId or title is required' });
      return;
    }

    // Try to attach real context from the user's workspace without leaking
    // anything they don't own.
    const [pendingDecisions, overdueTasks, activeProjects, financials, integrationSnapshots] = await Promise.all([
      prisma.decision.count({ where: { userId, status: 'PENDING' } }),
      prisma.task.count({ where: { project: { userId }, status: { not: 'DONE' }, dueDate: { lt: new Date() } } }),
      prisma.project.count({ where: { userId, status: 'ACTIVE' } }),
      prisma.financialRecord.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 50 }),
      fetchAllProviderSnapshots(userId).catch(() => []),
    ]);
    const externalContext = buildIntegrationContext(integrationSnapshots);
    const income = financials.filter((f) => f.type === 'INCOME').reduce((s, f) => s + f.amount, 0);
    const expense = financials.filter((f) => f.type === 'EXPENSE').reduce((s, f) => s + f.amount, 0);
    const profit = income - expense;

    const prompt = `Analyze this business decision for a CEO. Be concrete and bounded to the data provided.\n\n` +
      `DECISION: ${title}\nDESCRIPTION: ${description || 'N/A'}\nEXECUTIVE CONTEXT: ${context || 'N/A'}\n\n` +
      `REAL WORKSPACE DATA (do not invent numbers beyond these):\n` +
      `- Pending decisions: ${pendingDecisions}\n` +
      `- Overdue tasks: ${overdueTasks}\n` +
      `- Active projects: ${activeProjects}\n` +
      `- Recorded income: ${Math.round(income)}, expenses: ${Math.round(expense)}, profit: ${Math.round(profit)}\n\n` +
      `CONNECTED EXTERNAL SYSTEMS (also real data):\n${externalContext}\n\n` +
      `Return ONLY JSON: {"recommendation": string, "risks": string[], "opportunities": string[], "confidence": number, "dataLimitations": string}`;

    let parsed: {
      recommendation: string;
      risks: string[];
      opportunities: string[];
      confidence: number;
      dataLimitations: string;
    } | null = null;

    // Try the AI provider only when a known key is configured; otherwise use the
    // deterministic rule-based analysis so the endpoint is always useful.
    const providerKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    if (providerKey) {
      try {
        const reply = await aiService.copilotChat(userId, prompt, undefined);
        const jsonMatch = (reply.message || '').match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]) as typeof parsed;
        }
      } catch {
        // fall through to deterministic analysis
      }
    }

    if (!parsed) {
      // Rule-based fallback bounded strictly by real counts.
      const risks: string[] = [];
      const opportunities: string[] = [];
      if (overdueTasks > 0) risks.push(`${overdueTasks} overdue task${overdueTasks === 1 ? '' : 's'} may delay execution`);
      if (pendingDecisions > 3) risks.push(`${pendingDecisions} pending decisions could bottleneck this choice`);
      if (profit < 0) risks.push(`Workspace shows negative cash flow (${Math.round(profit)})`);
      if (profit > 0) opportunities.push(`Positive cash flow of ${Math.round(profit)} supports this move`);
      if (activeProjects > 0) opportunities.push(`${activeProjects} active project${activeProjects === 1 ? '' : 's'} create delivery capacity`);
      if (!risks.length && !opportunities.length) risks.push('Insufficient workspace data to evaluate risk — add financials and tasks for sharper analysis');

      parsed = {
        recommendation: risks.length > opportunities.length
          ? 'Proceed cautiously: resolve the flagged risks before committing resources.'
          : 'Conditions look favorable — move forward with a staged rollout and clear success metrics.',
        risks,
        opportunities,
        confidence: risks.length + opportunities.length > 0 ? 70 : 40,
        dataLimitations: 'Rule-based analysis (AI provider unavailable or not configured). Figures come only from your recorded workspace data.',
      };
    }

    res.status(200).json({ success: true, data: parsed });
  } catch (error) {
    console.error('Decision analysis error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ==================== DEEP DECISION ANALYSIS (MAIN ENDPOINT) ====================

export const analyzeDecisionDeep = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    const { 
      decisionId,
      title, 
      description, 
      swot, 
      options,
      problemStatement, 
      desiredOutcome, 
      constraints,
      successMetrics, 
      budgetLimit, 
      teamSize,
      deadline,
      thoughts 
    } = req.body;

    logger.debug({ userId }, 'Deep decision analysis requested');

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const payload = {
      decisionId,
      title: title || undefined,
      description: description || '',
      problemStatement: problemStatement || '',
      desiredOutcome: desiredOutcome || '',
      constraints: constraints || '',
      successMetrics: successMetrics || '',
      budgetLimit: budgetLimit || '',
      teamSize: teamSize || '',
      deadline: deadline || '',
      thoughts: thoughts || '',
      swot: swot || { strengths: [], weaknesses: [], opportunities: [], threats: [] },
      options: options || [],
    };

    // Delegate to the real AI service (provider-backed with deterministic
    // fallback so the client always gets the full insight shape).
    const analysis = await analyzeDecisionRecordDeep(userId, payload);

    const providerKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    const aiUnavailable = !providerKey;

    res.status(200).json({
      success: true,
      data: analysis,
      message: aiUnavailable
        ? 'AI insights generated (rule-based engine — configure an AI provider key for richer analysis)'
        : 'AI insights generated successfully',
    });
  } catch (error) {
    console.error('Deep decision analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate AI insights',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ==================== STRATEGIC FORECASTING ====================

export const getStrategicForecast = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const data = await aiService.getStrategicForecast(userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Strategic forecast error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const generateInsights = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const created = await generateRuleBasedInsights(userId);

    // Keep the list bounded: drop the oldest auto-generated insights beyond 100.
    const total = await prisma.aIInsight.count({ where: { userId } });
    if (total > 100) {
      const oldest = await prisma.aIInsight.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        take: total - 100,
        select: { id: true },
      });
      if (oldest.length) {
        await prisma.aIInsight.deleteMany({ where: { id: { in: oldest.map((o) => o.id) } } });
      }
    }

    // Collapse duplicates (same signal from rules, AI provider, or integrations)
    // and return the full de-duplicated feed so the page can replace its list
    // instead of appending a second copy of every insight.
    await pruneDuplicateInsights(userId);
    const feed = await prisma.aIInsight.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.status(200).json({
      success: true,
      data: dedupeInsights(feed),
      created: created.length,
    });
  } catch (error) {
    console.error('Generate insights error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/ai/insights — full insight list for the workspace feed
export const listInsights = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const limit = Math.min(100, parseInt(String(req.query.limit || '50'), 10) || 50);
    const result = await listInsightRows(userId, limit);
    res.status(200).json(result);
  } catch (error) {
    console.error('List insights error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PATCH /api/ai/insights/:id/read
export const markInsightRead = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    const { id } = authReq.params;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const insight = await prisma.aIInsight.findFirst({ where: { id, userId } });
    if (!insight) {
      res.status(404).json({ success: false, message: 'Insight not found' });
      return;
    }

    const updated = await prisma.aIInsight.update({ where: { id }, data: { isRead: true } });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('Mark insight read error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Derive insights from real records only — every number below is a database
 * count/sum. Nothing is invented. Returns the rows that were created.
 */
async function generateRuleBasedInsights(userId: string) {
  const today = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 24 * 3600 * 1000);

  const [
    overdueTasks,
    pendingDecisions,
    overdueDecisions,
    activeProjects,
    delayedProjects,
    kpiRows,
    totalKpis,
    incomeAgg,
    expenseAgg,
    incomeMonth,
    expenseMonth,
    lowEngagementStakeholders,
    totalStakeholders,
    upcomingEvents,
    budgets,
    integrationSnapshots,
  ] = await Promise.all([
    prisma.task.count({ where: { project: { userId }, status: { not: 'DONE' }, dueDate: { lt: today } } }),
    prisma.decision.count({ where: { userId, status: 'PENDING' } }),
    prisma.decision.count({ where: { userId, status: 'PENDING', deadline: { lt: today } } }),
    prisma.project.count({ where: { userId, status: 'ACTIVE' } }),
    prisma.project.count({ where: { userId, status: 'ACTIVE', deadline: { lt: today } } }),
    prisma.kPI.findMany({ where: { userId }, select: { currentValue: true, targetValue: true } }),
    prisma.kPI.count({ where: { userId } }),
    prisma.financialRecord.aggregate({ _sum: { amount: true }, where: { userId, type: 'INCOME' } }),
    prisma.financialRecord.aggregate({ _sum: { amount: true }, where: { userId, type: 'EXPENSE' } }),
    prisma.financialRecord.aggregate({ _sum: { amount: true }, where: { userId, type: 'INCOME', date: { gte: monthAgo } } }),
    prisma.financialRecord.aggregate({ _sum: { amount: true }, where: { userId, type: 'EXPENSE', date: { gte: monthAgo } } }),
    prisma.stakeholder.count({ where: { userId, engagementScore: { lt: 40 } } }),
    prisma.stakeholder.count({ where: { userId } }),
    prisma.calendarEvent.count({ where: { userId, startTime: { gte: today } } }),
    prisma.budget.findMany({ where: { userId } }),
    fetchAllProviderSnapshots(userId).catch(() => []),
  ]);

  // Prisma cannot compare two columns in `where`, so filter in JS.
  const kpisBelowTarget = kpiRows.filter((k) => k.targetValue > 0 && k.currentValue < k.targetValue).length;

  const candidates: Array<{
    title: string;
    description: string;
    type: 'OPPORTUNITY' | 'RISK' | 'ALERT' | 'FORECAST' | 'RECOMMENDATION';
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    confidence: number;
    fingerprint: string;
  }> = [];

  if (overdueTasks > 0) {
    candidates.push({
      title: `${overdueTasks} overdue task${overdueTasks === 1 ? '' : 's'}`,
      description: `${overdueTasks} task${overdueTasks === 1 ? '' : 's'} passed their due date. Clearing them protects downstream project deadlines.`,
      type: 'ALERT',
      impact: overdueTasks >= 5 ? 'HIGH' : 'MEDIUM',
      confidence: 100,
      fingerprint: `overdue_tasks_${overdueTasks}`,
    });
  }

  if (overdueDecisions > 0) {
    candidates.push({
      title: `${overdueDecisions} decision${overdueDecisions === 1 ? '' : 's'} past deadline`,
      description: `${overdueDecisions} decision${overdueDecisions === 1 ? '' : 's'} remain pending beyond their deadline.`,
      type: 'RISK',
      impact: 'HIGH',
      confidence: 100,
      fingerprint: `overdue_decisions_${overdueDecisions}`,
    });
  } else if (pendingDecisions > 0) {
    candidates.push({
      title: `${pendingDecisions} pending decision${pendingDecisions === 1 ? '' : 's'}`,
      description: `${pendingDecisions} decision${pendingDecisions === 1 ? '' : 's'} awaiting your input.`,
      type: 'RECOMMENDATION',
      impact: 'MEDIUM',
      confidence: 100,
      fingerprint: `pending_decisions_${pendingDecisions}`,
    });
  }

  if (delayedProjects > 0) {
    candidates.push({
      title: `${delayedProjects} project${delayedProjects === 1 ? '' : 's'} past deadline`,
      description: `${delayedProjects} of ${activeProjects} active project${activeProjects === 1 ? '' : 's'} missed their deadline.`,
      type: 'RISK',
      impact: 'HIGH',
      confidence: 100,
      fingerprint: `delayed_projects_${delayedProjects}`,
    });
  }

  if (kpisBelowTarget > 0) {
    candidates.push({
      title: `${kpisBelowTarget} KPI${kpisBelowTarget === 1 ? '' : 's'} below target`,
      description: `${kpisBelowTarget} of ${totalKpis} tracked KPI${totalKpis === 1 ? '' : 's'} are underperforming against target.`,
      type: 'ALERT',
      impact: 'MEDIUM',
      confidence: 100,
      fingerprint: `kpi_below_${kpisBelowTarget}`,
    });
  }

  const totalIncome = incomeAgg._sum.amount || 0;
  const totalExpense = expenseAgg._sum.amount || 0;
  const monthIncome = incomeMonth._sum.amount || 0;
  const monthExpense = expenseMonth._sum.amount || 0;
  const monthProfit = monthIncome - monthExpense;

  if (totalIncome > 0 || totalExpense > 0) {
    if (monthProfit > 0) {
      candidates.push({
        title: `Positive cash flow: ${Math.round(monthProfit).toLocaleString()} this month`,
        description: `Last 30 days: income ${Math.round(monthIncome).toLocaleString()}, expenses ${Math.round(monthExpense).toLocaleString()}.`,
        type: 'OPPORTUNITY',
        impact: monthProfit > totalIncome * 0.1 ? 'HIGH' : 'MEDIUM',
        confidence: 100,
        fingerprint: `profit_${Math.round(monthProfit)}`,
      });
    } else if (monthProfit < 0) {
      candidates.push({
        title: `Negative cash flow: ${Math.round(monthProfit).toLocaleString()} this month`,
        description: `Last 30 days expenses (${Math.round(monthExpense).toLocaleString()}) exceeded income (${Math.round(monthIncome).toLocaleString()}).`,
        type: 'RISK',
        impact: 'HIGH',
        confidence: 100,
        fingerprint: `loss_${Math.round(monthProfit)}`,
      });
    }
  }

  const overspent = budgets.filter((b) => b.allocated > 0 && b.spent / b.allocated >= 0.9);
  if (overspent.length > 0) {
    candidates.push({
      title: `${overspent.length} budget${overspent.length === 1 ? '' : 's'} at/over 90% usage`,
      description: `Budgets nearing exhaustion: ${overspent.map((b) => b.name).join(', ')}.`,
      type: 'RISK',
      impact: 'MEDIUM',
      confidence: 100,
      fingerprint: `budget_threshold_${overspent.length}`,
    });
  }

  if (lowEngagementStakeholders > 0) {
    candidates.push({
      title: `${lowEngagementStakeholders} stakeholder${lowEngagementStakeholders === 1 ? '' : 's'} with low engagement`,
      description: `${lowEngagementStakeholders} of ${totalStakeholders} stakeholders have engagement below 40. Schedule touchpoints.`,
      type: 'RECOMMENDATION',
      impact: 'LOW',
      confidence: 100,
      fingerprint: `stakeholder_low_${lowEngagementStakeholders}`,
    });
  }

  if (upcomingEvents > 0) {
    candidates.push({
      title: `${upcomingEvents} upcoming event${upcomingEvents === 1 ? '' : 's'}`,
      description: `${upcomingEvents} event${upcomingEvents === 1 ? '' : 's'} on your calendar going forward.`,
      type: 'FORECAST',
      impact: 'LOW',
      confidence: 100,
      fingerprint: `events_${upcomingEvents}`,
    });
  }

  // ---- Integration-sourced insights ----
  for (const snap of integrationSnapshots) {
    const src = snap.provider;

    // Project trackers: Jira / Asana / Trello / Monday / GitHub
    const projectRows = [...(snap.data['projects'] || []), ...(snap.data['boards'] || []), ...(snap.data['repos'] || [])];
    const stalledProjects = projectRows.filter((p: any) => !p.completed && !p.closed && p.archived !== true);
    if (stalledProjects.length > 0) {
      candidates.push({
        title: `${stalledProjects.length} active project${stalledProjects.length === 1 ? '' : 's'} in ${src}`,
        description: `External tracker ${src} has ${stalledProjects.length} active project${stalledProjects.length === 1 ? '' : 's'}: ${stalledProjects.slice(0, 3).map((p: any) => p.name || p.full_name || p.key).filter(Boolean).join(', ')}.`,
        type: 'FORECAST',
        impact: stalledProjects.length > 5 ? 'MEDIUM' : 'LOW',
        confidence: 100,
        fingerprint: `${src}_active_projects_${stalledProjects.length}`,
      });
    }

    // CRM contacts that may need follow-up
    const contacts = snap.data['contacts'] || [];
    if (contacts.length > 0) {
      candidates.push({
        title: `${contacts.length} contact${contacts.length === 1 ? '' : 's'} synced from ${src}`,
        description: `${contacts.length} contact${contacts.length === 1 ? '' : 's'} from ${src} are available in your network view. Review them for relationship actions.`,
        type: 'OPPORTUNITY',
        impact: 'LOW',
        confidence: 100,
        fingerprint: `${src}_contacts_${contacts.length}`,
      });
    }

    // Jira / Asana / GitHub open issues
    const issues = [...(snap.data['issues'] || []), ...(snap.data['tasks'] || [])];
    const openIssues = issues.filter((i: any) => !i.completed && i.state !== 'closed' && i.status !== 'Done' && i.status !== 'Closed');
    if (openIssues.length > 0) {
      candidates.push({
        title: `${openIssues.length} open ${src} issue${openIssues.length === 1 ? '' : 's'}`,
        description: `${openIssues.length} open items in ${src} need attention: ${openIssues.slice(0, 3).map((i: any) => i.summary || i.title || i.name || i.key).filter(Boolean).join(', ')}.`,
        type: 'ALERT',
        impact: openIssues.length > 10 ? 'HIGH' : 'MEDIUM',
        confidence: 100,
        fingerprint: `${src}_open_issues_${openIssues.length}`,
      });
    }

    // HubSpot / Salesforce / Zoho open deals
    const deals = snap.data['deals'] || snap.data['opportunities'] || [];
    if (deals.length > 0) {
      candidates.push({
        title: `${deals.length} open deal${deals.length === 1 ? '' : 's'} in ${src}`,
        description: `${deals.length} deal${deals.length === 1 ? '' : 's'} in your ${src} pipeline. Review and advance the top opportunities.`,
        type: 'OPPORTUNITY',
        impact: 'HIGH',
        confidence: 100,
        fingerprint: `${src}_deals_${deals.length}`,
      });
    }

    // Stripe / QuickBooks unpaid invoices
    const invoices = snap.data['invoices'] || [];
    const unpaid = invoices.filter((i: any) => i.status === 'open' || i.status === 'unpaid' || i.status === 'OPEN');
    if (unpaid.length > 0) {
      candidates.push({
        title: `${unpaid.length} unpaid invoice${unpaid.length === 1 ? '' : 's'} in ${src}`,
        description: `${unpaid.length} invoice${unpaid.length === 1 ? '' : 's'} are outstanding in ${src}. Follow up to improve cash flow.`,
        type: 'RISK',
        impact: 'HIGH',
        confidence: 100,
        fingerprint: `${src}_unpaid_invoices_${unpaid.length}`,
      });
    }

    // GitHub open PRs
    const pulls = snap.data['pulls'] || [];
    if (pulls.length > 0) {
      candidates.push({
        title: `${pulls.length} open pull request${pulls.length === 1 ? '' : 's'} on GitHub`,
        description: `${pulls.length} PR${pulls.length === 1 ? '' : 's'} awaiting review: ${pulls.slice(0, 3).map((p: any) => p.title).filter(Boolean).join(', ')}.`,
        type: 'RECOMMENDATION',
        impact: 'MEDIUM',
        confidence: 100,
        fingerprint: `github_pulls_${pulls.length}`,
      });
    }

    // Slack unread channels
    const channels = snap.data['channels'] || [];
    if (channels.length > 0) {
      candidates.push({
        title: `${channels.length} Slack channel${channels.length === 1 ? '' : 's'} active`,
        description: `Your team is active across ${channels.length} Slack channel${channels.length === 1 ? '' : 's'}. Check for unread messages.`,
        type: 'FORECAST',
        impact: 'LOW',
        confidence: 100,
        fingerprint: `slack_channels_${channels.length}`,
      });
    }
  }

  // De-duplicate against every insight generated in the last 7 days (read or
  // unread) and against candidates repeated within this run.
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const recent = await prisma.aIInsight.findMany({
    where: { userId, createdAt: { gte: weekAgo } },
    select: { metadata: true },
    take: 300,
  });
  const existing = new Set(
    recent
      .map((r) => (r.metadata as any)?.fingerprint)
      .filter(Boolean),
  );

  const seen = new Set<string>();
  const toCreate = candidates.filter((c) => {
    if (seen.has(c.fingerprint) || existing.has(c.fingerprint)) return false;
    seen.add(c.fingerprint);
    return true;
  });

  if (!toCreate.length) return [];

  await prisma.aIInsight.createMany({
    data: toCreate.map((c) => ({
      userId,
      title: c.title,
      description: c.description,
      type: c.type,
      impact: c.impact,
      confidence: c.confidence,
      metadata: { fingerprint: c.fingerprint, generatedBy: 'rules', generatedAt: new Date().toISOString() },
    })),
  });

  const fingerprints = toCreate.map((c) => c.fingerprint);
  const all = await prisma.aIInsight.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return all.filter((row) => {
    const fp = (row.metadata as any)?.fingerprint;
    return fp && fingerprints.includes(fp);
  });
}

// ==================== RISK & OPPORTUNITY ====================

export const detectRisks = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const data = await aiService.detectRisks(userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Risk detection error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const discoverOpportunities = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const data = await aiService.discoverOpportunities(userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Opportunity discovery error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ==================== MEETING & NOTE INTELLIGENCE ====================

export const summarizeMeeting = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { meetingId, transcript } = req.body;
    if (!transcript && !meetingId) {
      res.status(400).json({ success: false, message: 'transcript or meetingId is required' });
      return;
    }

    const data = await aiService.summarizeMeeting(userId, meetingId, transcript);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Meeting summary error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const summarizeNote = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    const { content, title } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!content) {
      res.status(400).json({ success: false, message: 'Note content is required' });
      return;
    }

    const data = await aiService.summarizeNote(userId, content, title);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Note summarization error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ==================== AI CO-PILOT ====================

export const copilotChat = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    const { message, conversationId } = req.body;
    
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    
    if (!message) {
      res.status(400).json({ success: false, message: 'Message is required' });
      return;
    }

    const data = await aiService.copilotChat(userId, message, conversationId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Copilot chat error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ==================== REPORTS & RECOMMENDATIONS ====================

export const generateReport = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    const { reportType } = req.body;
    
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    
    if (!reportType) {
      res.status(400).json({ success: false, message: 'Report type is required' });
      return;
    }

    const data = await aiService.generateReport(userId, reportType);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getAIRecommendations = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const data = await aiService.getAIRecommendations(userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('AI recommendations error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ==================== INTEGRATION DATA ANALYSIS ====================

export const analyzeIntegrationData = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Get integration data from the integration controller
    const integrationController = new (await import('../controllers/integration.controller.js')).IntegrationController();
    
    // Create a mock request object
    const mockReq = { user: authReq.user } as any;
    
    // Create a proper mock response that captures the json call
    let capturedResponse: any = null;
    const mockRes = {
      json: (data: any) => {
        capturedResponse = data;
        return data;
      },
      status: () => mockRes
    } as any;

    await integrationController.getIntegrationDataForAI(mockReq, mockRes);
    
    const integrationData = capturedResponse;
    
    if (!integrationData?.success || !integrationData?.data?.integrations?.length) {
      res.status(200).json({
        success: true,
        data: {
          hasData: false,
          message: "No integration data available. Connect your ERP and other business systems to get AI-powered insights.",
          recommendations: [
            "Connect your ERP system (SAP, Microsoft Dynamics) for financial insights",
            "Connect CRM (Salesforce, HubSpot) for customer analytics",
            "Connect accounting tools (QuickBooks) for financial health analysis"
          ]
        }
      });
      return;
    }

    // Use AI service to analyze the integration data
    const analysis = await aiService.analyzeIntegrationData(userId);
    
    res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Integration data analysis error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to analyze integration data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
// ==================== COMPANY CONTEXT & AI SUPERVISOR ====================

/** GET /api/ai/company-context — every record the AI reasons over, as data. */
export const getCompanyContextHandler = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const context = await buildCompanyContext(userId);
    const coverage = contextCoverage(context);
    res.status(200).json({ success: true, data: { ...context, coverage } });
  } catch (error) {
    console.error('Company context error:', error);
    res.status(500).json({ success: false, message: 'Failed to build company context' });
  }
};

/**
 * GET /api/ai/supervisor — the app-wide supervisor view.
 *
 * Deterministic scores and actions derived strictly from stored records, so it
 * works without an AI provider key. When a key is configured, an AI narrative
 * is layered on top; the numbers never come from the model.
 */
export const getAISupervisor = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const context = await buildCompanyContext(userId);
    const { counts, financials } = context;
    const coverage = contextCoverage(context);

    const executionScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          100 -
            (counts.tasks ? (counts.overdueTasks / Math.max(counts.tasks, 1)) * 120 : 0) -
            (counts.projects ? (counts.overdueProjects / Math.max(counts.projects, 1)) * 60 : 0),
        ),
      ),
    );
    const financialScore =
      financials.income > 0 || financials.expenses > 0
        ? Math.max(0, Math.min(100, 50 + financials.profitMargin))
        : 0;
    const okrScore = context.okrs.length
      ? Math.round(context.okrs.reduce((total, okr) => total + okr.progress, 0) / context.okrs.length)
      : 0;
    const kpiScore = counts.kpis
      ? Math.max(0, Math.round(((counts.kpis - counts.kpisBelowTarget) / counts.kpis) * 100))
      : 0;
    const relationshipScore = counts.stakeholders
      ? Math.max(0, Math.round(((counts.stakeholders - counts.lowEngagementStakeholders) / counts.stakeholders) * 100))
      : 0;

    const scored = [
      {
        area: 'Execution',
        score: executionScore,
        hasData: counts.projects > 0 || counts.tasks > 0,
        detail: `${counts.openTasks} open tasks, ${counts.overdueTasks} overdue, ${counts.activeProjects} active projects.`,
      },
      {
        area: 'Financial health',
        score: financialScore,
        hasData: financials.income > 0 || financials.expenses > 0,
        detail: `Profit margin ${financials.profitMargin}%, ${financials.budgetUtilization}% of budget used.`,
      },
      {
        area: 'Objectives',
        score: okrScore,
        hasData: counts.okrs > 0,
        detail: `${counts.okrs} OKRs tracked, average progress ${okrScore}%.`,
      },
      {
        area: 'KPIs',
        score: kpiScore,
        hasData: counts.kpis > 0,
        detail: `${counts.kpisBelowTarget} of ${counts.kpis} KPIs below target.`,
      },
      {
        area: 'Relationships',
        score: relationshipScore,
        hasData: counts.stakeholders > 0,
        detail: `${counts.lowEngagementStakeholders} of ${counts.stakeholders} stakeholders have low engagement.`,
      },
    ];
    // Only average domains that actually have records, so an empty workspace
    // never reports a perfect score.
    const active = scored.filter((item) => item.hasData);
    const healthScore = active.length
      ? Math.round(active.reduce((total, item) => total + item.score, 0) / active.length)
      : 0;

    const recommendations: Array<{
      title: string;
      detail: string;
      action: string;
      href: string;
      impact: 'HIGH' | 'MEDIUM' | 'LOW';
    }> = [];

    if (counts.overdueTasks > 0) {
      recommendations.push({
        title: `Clear ${counts.overdueTasks} overdue task${counts.overdueTasks === 1 ? '' : 's'}`,
        detail: 'Late tasks are the fastest way to lose a delivery commitment. Reassign or re-date them today.',
        action: 'Open execution tracker',
        href: '/dashboard/execution',
        impact: 'HIGH',
      });
    }
    if (counts.overdueProjects > 0) {
      recommendations.push({
        title: `${counts.overdueProjects} project${counts.overdueProjects === 1 ? '' : 's'} past deadline`,
        detail: 'Re-baseline scope or move the deadline — both need a recorded decision.',
        action: 'Review projects',
        href: '/dashboard/projects',
        impact: 'HIGH',
      });
    }
    if (counts.pendingDecisions > 0) {
      recommendations.push({
        title: `Decide ${counts.pendingDecisions} pending decision${counts.pendingDecisions === 1 ? '' : 's'}`,
        detail: 'Pending decisions block downstream execution and hide accountability.',
        action: 'Open decision queue',
        href: '/dashboard/decisions',
        impact: 'MEDIUM',
      });
    }
    if (counts.kpisBelowTarget > 0) {
      recommendations.push({
        title: `${counts.kpisBelowTarget} KPI${counts.kpisBelowTarget === 1 ? '' : 's'} below target`,
        detail: 'Pick the single weakest KPI and attach one owner and one weekly checkpoint.',
        action: 'Open performance',
        href: '/dashboard/performance',
        impact: 'MEDIUM',
      });
    }
    if (financials.profit < 0) {
      recommendations.push({
        title: 'Cash flow is negative',
        detail: `Recorded expenses exceed income by ${Math.round(Math.abs(financials.profit)).toLocaleString()}.`,
        action: 'Open financial tracking',
        href: '/dashboard/financials',
        impact: 'HIGH',
      });
    }
    if (financials.budgetUtilization >= 90 && counts.budgets > 0) {
      recommendations.push({
        title: 'Budgets nearly consumed',
        detail: `${financials.budgetUtilization}% of allocated budget is spent. Re-forecast before new commitments.`,
        action: 'Open budgets',
        href: '/dashboard/budget',
        impact: 'MEDIUM',
      });
    }
    if (counts.lowEngagementStakeholders > 0) {
      recommendations.push({
        title: `${counts.lowEngagementStakeholders} stakeholder${counts.lowEngagementStakeholders === 1 ? '' : 's'} need contact`,
        detail: 'Low engagement scores predict churn in investor and client relationships.',
        action: 'Open stakeholders',
        href: '/dashboard/network',
        impact: 'LOW',
      });
    }
    const unpaid = context.external.financials.filter((record) =>
      ['open', 'unpaid', 'overdue'].includes(String(record.status || '').toLowerCase()),
    );
    if (unpaid.length) {
      recommendations.push({
        title: `${unpaid.length} unpaid external invoice${unpaid.length === 1 ? '' : 's'}`,
        detail: 'Invoices synced from connected systems are still open. Follow up to protect cash flow.',
        action: 'Open integrations',
        href: '/dashboard/integrations',
        impact: 'HIGH',
      });
    }
    if (!counts.externalProviders) {
      recommendations.push({
        title: 'Connect a business system or import a CSV',
        detail: 'AI supervisor accuracy improves as soon as real external data is available.',
        action: 'Open integrations',
        href: '/dashboard/integrations',
        impact: 'MEDIUM',
      });
    }
    if (!recommendations.length) {
      recommendations.push({
        title: 'Keep compounding',
        detail: 'No blocking issues detected. Use the time for the next strategic decision.',
        action: 'Open decisions',
        href: '/dashboard/decisions',
        impact: 'LOW',
      });
    }

    let narrative = '';
    const providerKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    if (providerKey) {
      try {
        const reply = await aiService.copilotChat(
          userId,
          `You are the company's AI supervisor. Using ONLY this data, write a 3-sentence status note and name the single highest-leverage next action.\n\n${context.summary}`,
          undefined,
        );
        narrative = String((reply as any)?.message || '');
      } catch {
        narrative = '';
      }
    }

    res.status(200).json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        healthScore,
        status:
          coverage.score < 40
            ? 'insufficient_data'
            : healthScore >= 75
              ? 'on_track'
              : healthScore >= 50
                ? 'attention'
                : 'at_risk',
        areas: scored,
        recommendations: recommendations.slice(0, 6),
        risks: [
          counts.overdueTasks ? `${counts.overdueTasks} overdue tasks` : null,
          counts.overdueProjects ? `${counts.overdueProjects} projects past deadline` : null,
          financials.profit < 0 ? 'Negative recorded cash flow' : null,
          counts.kpisBelowTarget ? `${counts.kpisBelowTarget} KPIs below target` : null,
        ].filter(Boolean),
        opportunities: [
          context.external.deals.length ? `${context.external.deals.length} deals in the external pipeline` : null,
          counts.activeProjects ? `${counts.activeProjects} active projects in flight` : null,
          financials.profit > 0 ? `Positive profit of ${Math.round(financials.profit).toLocaleString()}` : null,
        ].filter(Boolean),
        narrative,
        coverage,
        counts,
        sources: context.sources,
      },
    });
  } catch (error) {
    console.error('AI supervisor error:', error);
    res.status(500).json({ success: false, message: 'Failed to build supervisor view' });
  }
};
// ==================== NOTE ASSISTANT ====================

type NoteAssistMode = 'improve' | 'tasks' | 'stakeholders' | 'action-plan';

const NOTE_ASSIST_FALLBACK: Record<NoteAssistMode, (title: string, content: string) => string> = {
  improve: (title, content) => {
    const sentences = content
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    const summary = sentences.slice(0, 2).join(' ') || content.slice(0, 200);
    const points = sentences.slice(0, 6).map((sentence) => `- ${sentence}`);
    return [
      `# ${title || 'Untitled note'}`,
      '',
      '**Summary**',
      summary,
      '',
      '**Key points**',
      ...(points.length ? points : ['- Add more detail to extract key points.']),
      '',
      '**Next steps**',
      '- Confirm the owner for each open item.',
      '- Set a review date so this note does not go stale.',
    ].join('\n');
  },
  tasks: (_title, content) => {
    const sentences = content.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    const actions = sentences.filter((s) =>
      /(need|should|must|will|plan|follow|review|send|schedule|decide|assign|build|launch)/i.test(s),
    );
    const source = actions.length ? actions : sentences;
    if (!source.length) return 'No action items found — add detail to the note first.';
    return source
      .slice(0, 6)
      .map((sentence, index) => `${index + 1}. ${sentence.replace(/^[-•]\s*/, '')}`)
      .join('\n');
  },
  stakeholders: (_title, content) => {
    const emails = content.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
    const names = content.match(/\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g) || [];
    const unique = [...new Set([...emails, ...names])];
    if (!unique.length) return 'No people detected in this note yet. Mention names or emails to extract them.';
    return unique.slice(0, 10).map((item) => `- ${item}`).join('\n');
  },
  'action-plan': (title, content) => {
    const sentences = content.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    const focus = sentences[0] || title || 'the initiative';
    return [
      `Plan for: ${focus}`,
      '',
      '1. Clarify the outcome and the single measurable success criterion.',
      '2. Assign one accountable owner and a decision deadline.',
      '3. Sequence the first two concrete steps from the note.',
      '4. Schedule a checkpoint and record the outcome in the decision log.',
      '',
      sentences.length > 1 ? `Source context: ${sentences.slice(0, 3).join(' ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  },
};

const NOTE_ASSIST_INSTRUCTIONS: Record<NoteAssistMode, string> = {
  improve:
    'Rewrite the note as a clear executive note with a short summary, key points, and next steps. Preserve every fact; never invent names, numbers, or dates.',
  tasks:
    'Extract a numbered list of concrete action items found in the note. Only include work the note actually mentions.',
  stakeholders:
    'List every person, team, or company mentioned in the note with why they matter. Only include what the note states.',
  'action-plan':
    'Write a short, sequenced action plan for the topic of the note using only its content as context.',
};

/** POST /api/ai/note-assist — improve / extract tasks / people / plan from a note. */
export const assistNote = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const mode = (['improve', 'tasks', 'stakeholders', 'action-plan'].includes(String(req.body?.mode))
      ? req.body.mode
      : 'improve') as NoteAssistMode;
    let title = String(req.body?.title || '').trim();
    let content = String(req.body?.content || '').trim();

    // Notes opened from the library send only an id.
    const noteId = req.body?.noteId ? String(req.body.noteId) : null;
    if (noteId && !content) {
      const note = await prisma.note.findFirst({ where: { id: noteId, userId } });
      if (!note) {
        res.status(404).json({ success: false, message: 'Note not found' });
        return;
      }
      title = title || note.title;
      content = note.content || '';
    }

    if (!content) {
      res.status(400).json({ success: false, message: 'Note content is required' });
      return;
    }

    let result = '';
    const providerKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    if (providerKey) {
      try {
        result = (await callGemini(
          `NOTE TITLE: ${title || 'Untitled'}\n\nNOTE CONTENT:\n${content.slice(0, 6000)}\n\n${NOTE_ASSIST_INSTRUCTIONS[mode]}`,
          'You are an executive chief of staff. Use only the supplied note. Never invent facts, names, or figures.',
          userId,
          `note_assist_${mode}`,
        )).trim();
      } catch (error) {
        console.error('Note assistant AI call failed, using deterministic fallback:', error);
      }
    }

    const usedFallback = !result;
    if (!result) {
      result = NOTE_ASSIST_FALLBACK[mode](title, content);
    }

    res.status(200).json({
      success: true,
      data: { mode, result, fallback: usedFallback },
    });
  } catch (error) {
    console.error('Note assistant error:', error);
    res.status(500).json({ success: false, message: 'Failed to process note' });
  }
};
