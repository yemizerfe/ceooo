// server/services/ai/company/company-context.service.ts
// ================================
// One company-wide context for every AI feature.
//
// The CEO workspace has data in many places: decisions, projects/tasks, OKRs,
// KPIs, financial records, budgets, stakeholders, team members, notes, the
// calendar, CSV imports and connected integrations. This service reads all of
// them (bounded to the user) and returns a single structured snapshot plus a
// compact prompt summary, so the AI reasons over the whole company instead of
// one table.
// ================================

import { prisma } from '../../../lib/prisma.js';
import { getIntegrationOverview } from '../../integrationSync.service.js';
import type { IntegrationOverview } from '../../integrationNormalize.service.js';

export interface CompanyProjectSummary {
  name: string;
  status: string;
  priority: string;
  progress: number;
  deadline: string | null;
  budget: number | null;
  source: 'app' | string;
  taskCount?: number;
  completedTaskCount?: number;
}

export interface CompanyContext {
  generatedAt: string;
  counts: {
    decisions: number;
    pendingDecisions: number;
    projects: number;
    activeProjects: number;
    overdueProjects: number;
    tasks: number;
    openTasks: number;
    overdueTasks: number;
    okrs: number;
    kpis: number;
    kpisBelowTarget: number;
    stakeholders: number;
    lowEngagementStakeholders: number;
    teamMembers: number;
    notes: number;
    upcomingEvents: number;
    budgets: number;
    externalRecords: number;
    externalProviders: number;
  };
  financials: {
    income: number;
    expenses: number;
    profit: number;
    profitMargin: number;
    monthIncome: number;
    monthExpense: number;
    monthProfit: number;
    budgetAllocated: number;
    budgetSpent: number;
    budgetUtilization: number;
    externalIncome: number;
    externalExpenses: number;
    currency: string;
  };
  projects: CompanyProjectSummary[];
  tasks: Array<{ title: string; status: string; dueDate: string | null; project: string; source: string }>;
  decisions: Array<{ title: string; status: string; priority: string; deadline: string | null; progress: string }>;
  okrs: Array<{ objective: string; owner: string | null; quarter: string; year: number; progress: number; keyResults: Array<{ title: string; current: number; target: number; unit: string }> }>;
  kpis: Array<{ name: string; current: number; target: number; unit: string; category: string | null }>;
  stakeholders: Array<{ name: string; company: string | null; type: string; engagementScore: number; lastContactAt: string | null; source: 'app' | string }>;
  team: Array<{ name: string; role: string | null; department: string | null; performanceScore: number; status: string }>;
  notes: Array<{ title: string; category: string; updatedAt: string; source: 'app' | string }>;
  events: Array<{ title: string; startTime: string; endTime: string; type: string; source: 'app' | string }>;
  budgets: Array<{ name: string; allocated: number; spent: number; utilization: number; period: string }>;
  external: {
    providers: IntegrationOverview['providers'];
    totals: IntegrationOverview['totals'];
    projects: CompanyProjectSummary[];
    tasks: IntegrationOverview['tasks'];
    stakeholders: IntegrationOverview['stakeholders'];
    deals: IntegrationOverview['deals'];
    financials: IntegrationOverview['financials'];
    events: IntegrationOverview['events'];
    notes: IntegrationOverview['notes'];
  };
  sources: string[];
  summary: string;
}

const iso = (value?: Date | string | null): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const sum = (values: number[]) => values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);

const progressOf = (okr: { keyResults: Array<{ current: number; target: number }> }): number => {
  const targets = okr.keyResults.filter((kr) => kr.target > 0);
  if (!targets.length) return 0;
  const ratio = sum(targets.map((kr) => Math.min(1, kr.current / kr.target))) / targets.length;
  return Math.round(ratio * 100);
};

/** Everything the AI is allowed to know about this user's company, as data. */
export async function buildCompanyContext(userId: string): Promise<CompanyContext> {
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

  const [
    decisions,
    projects,
    okrs,
    kpis,
    financials,
    budgets,
    stakeholders,
    team,
    notes,
    events,
    overview,
  ] = await Promise.all([
    prisma.decision.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 40 }),
    prisma.project.findMany({
      where: { userId },
      include: { tasks: { select: { title: true, status: true, dueDate: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 80,
    }),
    prisma.oKR.findMany({ where: { userId }, include: { keyResults: true }, orderBy: { createdAt: 'desc' }, take: 25 }),
    prisma.kPI.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 40 }),
    prisma.financialRecord.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 400 }),
    prisma.budget.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 40 }),
    prisma.stakeholder.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 120 }),
    prisma.teamMember.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 80 }),
    prisma.note.findMany({ where: { userId, isArchived: false }, orderBy: { updatedAt: 'desc' }, take: 60 }),
    prisma.calendarEvent.findMany({
      where: { userId, endTime: { gte: now } },
      orderBy: { startTime: 'asc' },
      take: 40,
    }),
    getIntegrationOverview(userId).catch((): IntegrationOverview => ({
      providers: [],
      projects: [],
      tasks: [],
      stakeholders: [],
      deals: [],
      financials: [],
      events: [],
      notes: [],
      totals: {},
      generatedAt: new Date().toISOString(),
    })),
  ]);

  const income = sum(financials.filter((f) => f.type === 'INCOME').map((f) => f.amount));
  const expenses = sum(financials.filter((f) => f.type === 'EXPENSE').map((f) => f.amount));
  const monthIncome = sum(financials.filter((f) => f.type === 'INCOME' && f.date >= monthAgo).map((f) => f.amount));
  const monthExpense = sum(financials.filter((f) => f.type === 'EXPENSE' && f.date >= monthAgo).map((f) => f.amount));
  const budgetAllocated = sum(budgets.map((b) => b.allocated));
  const budgetSpent = sum(budgets.map((b) => b.spent));
  const externalIncome = sum(overview.financials.filter((f) => f.type === 'INCOME').map((f) => f.amount));
  const externalExpenses = sum(overview.financials.filter((f) => f.type === 'EXPENSE').map((f) => f.amount));

  const openTasks = projects.flatMap((p) => p.tasks).filter((t) => t.status !== 'DONE');
  const overdueTasks = openTasks.filter((t) => t.dueDate && t.dueDate < now);
  const activeProjects = projects.filter((p) => p.status === 'ACTIVE');
  const overdueProjects = activeProjects.filter((p) => p.deadline && p.deadline < now);
  const pendingDecisions = decisions.filter((d) => d.status === 'PENDING' || d.status === 'IN_PROGRESS');

  const context: CompanyContext = {
    generatedAt: new Date().toISOString(),
    counts: {
      decisions: decisions.length,
      pendingDecisions: pendingDecisions.length,
      projects: projects.length,
      activeProjects: activeProjects.length,
      overdueProjects: overdueProjects.length,
      tasks: projects.reduce((total, p) => total + p.tasks.length, 0),
      openTasks: openTasks.length,
      overdueTasks: overdueTasks.length,
      okrs: okrs.length,
      kpis: kpis.length,
      kpisBelowTarget: kpis.filter((k) => k.targetValue > 0 && k.currentValue < k.targetValue).length,
      stakeholders: stakeholders.length,
      lowEngagementStakeholders: stakeholders.filter((s) => s.engagementScore < 40).length,
      teamMembers: team.length,
      notes: notes.length,
      upcomingEvents: events.length,
      budgets: budgets.length,
      externalRecords: overview.providers.reduce((total, provider) => total + provider.records, 0),
      externalProviders: overview.providers.length,
    },
    financials: {
      income,
      expenses,
      profit: income - expenses,
      profitMargin: income > 0 ? Math.round(((income - expenses) / income) * 100) : 0,
      monthIncome,
      monthExpense,
      monthProfit: monthIncome - monthExpense,
      budgetAllocated,
      budgetSpent,
      budgetUtilization: budgetAllocated > 0 ? Math.round((budgetSpent / budgetAllocated) * 100) : 0,
      externalIncome,
      externalExpenses,
      currency: 'USD',
    },
    projects: [
      ...projects.map((p) => ({
        name: p.name,
        status: p.status,
        priority: p.priority,
        progress: p.progress,
        deadline: iso(p.deadline),
        budget: p.budget ?? null,
        source: 'app' as const,
        taskCount: p.tasks.length,
        completedTaskCount: p.tasks.filter((t) => t.status === 'DONE').length,
      })),
      ...overview.projects.map((p) => ({
        name: p.name,
        status: p.status,
        priority: p.priority,
        progress: p.progress,
        deadline: p.deadline ?? null,
        budget: null,
        source: p.source,
        taskCount: p.taskCount,
        completedTaskCount: p.completedTaskCount,
      })),
    ],
    tasks: [
      ...projects.flatMap((p) =>
        p.tasks.map((t) => ({
          title: t.title,
          status: t.status,
          dueDate: iso(t.dueDate),
          project: p.name,
          source: 'app',
        })),
      ),
      ...overview.tasks.slice(0, 120).map((t) => ({
        title: t.title,
        status: t.status,
        dueDate: t.dueDate ?? null,
        project: t.project || t.source,
        source: t.source,
      })),
    ],
    decisions: decisions.map((d) => ({
      title: d.title,
      status: d.status,
      priority: d.priority,
      deadline: iso(d.deadline),
      progress: `${d.status}${d.aiConfidence != null ? ` · ${d.aiConfidence}% AI confidence` : ''}`,
    })),
    okrs: okrs.map((okr) => ({
      objective: okr.objective,
      owner: okr.owner,
      quarter: okr.quarter,
      year: okr.year,
      progress: progressOf(okr),
      keyResults: okr.keyResults.map((kr) => ({
        title: kr.title,
        current: kr.current,
        target: kr.target,
        unit: kr.unit,
      })),
    })),
    kpis: kpis.map((k) => ({
      name: k.name,
      current: k.currentValue,
      target: k.targetValue,
      unit: k.unit,
      category: k.category,
    })),
    stakeholders: [
      ...stakeholders.map((s) => ({
        name: s.name,
        company: s.company,
        type: s.type,
        engagementScore: s.engagementScore,
        lastContactAt: iso(s.lastContactAt),
        source: 'app' as const,
      })),
      ...overview.stakeholders.slice(0, 120).map((s) => ({
        name: s.name,
        company: s.company ?? null,
        type: s.type,
        engagementScore: 0,
        lastContactAt: null,
        source: s.source,
      })),
    ],
    team: team.map((m) => ({
      name: m.name,
      role: m.role,
      department: m.department,
      performanceScore: m.performanceScore,
      status: m.status,
    })),
    notes: [
      ...notes.map((n) => ({
        title: n.title,
        category: n.category,
        updatedAt: n.updatedAt.toISOString(),
        source: 'app' as const,
      })),
      ...overview.notes.map((n) => ({
        title: n.title,
        category: 'external',
        updatedAt: n.updatedAt || new Date().toISOString(),
        source: n.source,
      })),
    ],
    events: [
      ...events.map((e) => ({
        title: e.title,
        startTime: e.startTime.toISOString(),
        endTime: e.endTime.toISOString(),
        type: e.type,
        source: 'app' as const,
      })),
      ...overview.events.map((e) => ({
        title: e.title,
        startTime: e.startTime,
        endTime: e.endTime,
        type: 'EXTERNAL',
        source: e.source,
      })),
    ],
    budgets: budgets.map((b) => ({
      name: b.name,
      allocated: b.allocated,
      spent: b.spent,
      utilization: b.allocated > 0 ? Math.round((b.spent / b.allocated) * 100) : 0,
      period: b.period,
    })),
    external: {
      providers: overview.providers,
      totals: overview.totals,
      projects: overview.projects.map((p) => ({
        name: p.name,
        status: p.status,
        priority: p.priority,
        progress: p.progress,
        deadline: p.deadline ?? null,
        budget: null,
        source: p.source,
        taskCount: p.taskCount,
        completedTaskCount: p.completedTaskCount,
      })),
      tasks: overview.tasks,
      stakeholders: overview.stakeholders,
      deals: overview.deals,
      financials: overview.financials,
      events: overview.events,
      notes: overview.notes,
    },
    sources: [
      'decisions',
      'projects',
      'tasks',
      'okrs',
      'kpis',
      'financials',
      'budgets',
      'stakeholders',
      'team',
      'notes',
      'calendar',
      ...overview.providers.map((p) => `integration:${p.id}`),
    ],
    summary: '',
  };

  context.summary = formatCompanyContext(context);
  return context;
}

/** Compact, prompt-ready description of the whole company. */
export function formatCompanyContext(context: CompanyContext): string {
  const { counts: c, financials: f } = context;
  const lines: string[] = [];

  lines.push('COMPANY SNAPSHOT (all values are stored records, never estimates):');
  lines.push(
    `- Projects: ${c.projects} total, ${c.activeProjects} active, ${c.overdueProjects} past deadline. ` +
      `Tasks: ${c.tasks} total, ${c.openTasks} open, ${c.overdueTasks} overdue.`,
  );
  lines.push(
    `- Decisions: ${c.decisions} total, ${c.pendingDecisions} pending/in progress. ` +
      `OKRs: ${c.okrs}. KPIs: ${c.kpis} (${c.kpisBelowTarget} below target).`,
  );
  lines.push(
    `- Financials: income ${Math.round(f.income)}, expenses ${Math.round(f.expenses)}, ` +
      `profit ${Math.round(f.profit)} (${f.profitMargin}% margin). Last 30 days: +${Math.round(f.monthIncome)} / -${Math.round(f.monthExpense)}. ` +
      `Budgets: ${Math.round(f.budgetSpent)} of ${Math.round(f.budgetAllocated)} used (${f.budgetUtilization}%).`,
  );
  lines.push(
    `- Relationships: ${c.stakeholders} stakeholders (${c.lowEngagementStakeholders} low engagement), ` +
      `${c.teamMembers} team members. ${c.notes} notes, ${c.upcomingEvents} upcoming calendar events.`,
  );

  if (context.projects.length) {
    const top = context.projects.slice(0, 12);
    lines.push(
      `- Project portfolio: ${top
        .map((p) => `${p.name} [${p.source === 'app' ? 'app' : p.source}] ${p.status} ${p.progress}%${p.deadline ? ` due ${p.deadline.slice(0, 10)}` : ''}`)
        .join('; ')}`,
    );
  }
  if (context.okrs.length) {
    lines.push(
      `- OKRs: ${context.okrs
        .slice(0, 8)
        .map((o) => `${o.objective} (${o.progress}% — ${o.keyResults.map((k) => `${k.title} ${k.current}/${k.target}${k.unit}`).join(', ') || 'no key results'})`)
        .join('; ')}`,
    );
  }
  if (context.kpis.length) {
    lines.push(
      `- KPIs: ${context.kpis
        .slice(0, 10)
        .map((k) => `${k.name} ${k.current}/${k.target}${k.unit}${k.target > 0 && k.current < k.target ? ' (below target)' : ''}`)
        .join('; ')}`,
    );
  }
  if (context.external.providers.length) {
    lines.push(
      `- Connected systems: ${context.external.providers
        .map((p) => `${p.name} (${p.records} records${p.errors && Object.keys(p.errors).length ? ', with sync errors' : ''})`)
        .join('; ')}.`,
    );
    if (context.external.totals.projects) {
      lines.push(
        `- External projects: ${context.external.projects
          .slice(0, 10)
          .map((p) => `${p.name} [${p.source}] ${p.status} ${p.progress}%`)
          .join('; ')}`,
      );
    }
    if (context.external.totals.stakeholders) {
      lines.push(
        `- External contacts: ${context.external.stakeholders
          .slice(0, 10)
          .map((s) => `${s.name}${s.company ? ` (${s.company})` : ''} [${s.source}]`)
          .join('; ')}`,
      );
    }
    if (context.external.totals.financials) {
      lines.push(
        `- External financial records: ${context.external.totals.financials} ` +
          `(income ${Math.round(f.externalIncome)}, expenses ${Math.round(f.externalExpenses)}).`,
      );
    }
  }

  return lines.join('\n');
}

/** True when the context has enough data to support non-trivial analysis. */
export function contextCoverage(context: CompanyContext): { score: number; missing: string[] } {
  const missing: string[] = [];
  if (!context.counts.projects) missing.push('projects');
  if (!context.counts.decisions) missing.push('decisions');
  if (!context.financials.income && !context.financials.expenses) missing.push('financial records');
  if (!context.counts.okrs && !context.counts.kpis) missing.push('OKRs or KPIs');
  if (!context.counts.stakeholders) missing.push('stakeholders');
  if (!context.counts.externalRecords) missing.push('connected integrations or CSV imports');
  const score = Math.round(((6 - missing.length) / 6) * 100);
  return { score, missing };
}
