// server/services/ai/decisions/decision-analysis.service.ts
// ================================
// Decision intelligence: analyze decisions from their real record fields
// (title, description, problem, goals, constraints, SWOT, options, thoughts,
// deadline, budget, team size) plus workspace and integration context.
// ================================

import { prisma } from '../../../lib/prisma.js';
import { PromptTemplates } from '../../prompts.js';
import { callGemini } from '../call-gemini.service.js';
import { fetchAllProviderSnapshots, buildIntegrationContext } from '../../integrationSnapshot.service.js';
import { buildCompanyContext } from '../company/company-context.service.js';

interface DecisionNotes {
  category?: string | null;
  owner?: string | null;
  thoughts?: string | null;
  problemStatement?: string | null;
  desiredOutcome?: string | null;
  constraints?: string | null;
  successMetrics?: string | null;
  budgetLimit?: string | number | null;
  teamSize?: string | number | null;
  options?: Array<{ name?: string; cost?: string; risk?: string; roi?: string; timeline?: string }>;
  swot?: {
    strengths?: string[];
    weaknesses?: string[];
    opportunities?: string[];
    threats?: string[];
  };
  risks?: Array<{ name?: string; description?: string; mitigation?: string; severity?: number }>;
}

export interface DeepDecisionInput {
  decisionId?: string;
  title?: string;
  description?: string;
  problemStatement?: string;
  desiredOutcome?: string;
  constraints?: string;
  successMetrics?: string;
  budgetLimit?: string | number;
  teamSize?: string | number;
  deadline?: string;
  thoughts?: string;
  swot?: DecisionNotes['swot'];
  options?: Array<string | { name?: string }>;
}

const asText = (value: unknown): string =>
  value == null || value === '' ? '' : String(value).trim();

const asList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((v) => asText(v)).filter(Boolean) : [];

const sum = (values: number[]): number =>
  values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);

function parseNotes(notes: unknown): DecisionNotes {
  if (!notes) return {};
  if (typeof notes === 'object') return notes as DecisionNotes;
  if (typeof notes !== 'string') return {};
  try {
    return (JSON.parse(notes) as DecisionNotes) || {};
  } catch {
    return {};
  }
}

function mergeNotes(notes: DecisionNotes): DecisionNotes {
  // Legacy records stored some fields with Korean keys; read both shapes.
  const legacy = notes as any;
  return {
    ...notes,
    problemStatement: notes.problemStatement || legacy['문제정의'] || legacy['문제'] || null,
    desiredOutcome: notes.desiredOutcome || legacy['목표'] || legacy['기대효과'] || null,
    constraints: notes.constraints || legacy['고려되어야할사항'] || null,
    successMetrics: notes.successMetrics || legacy['성공기준'] || null,
    budgetLimit: notes.budgetLimit ?? legacy['예산제한'] ?? null,
    teamSize: notes.teamSize ?? legacy['팀규모'] ?? null,
    thoughts: notes.thoughts || legacy['참고사항'] || null,
  };
}

/** Real workspace + connected-integration context, bounded to the user. */
async function loadContext(userId: string) {
  const [company, snapshots] = await Promise.all([
    buildCompanyContext(userId),
    fetchAllProviderSnapshots(userId).catch(() => []),
  ]);

  return {
    pendingDecisions: company.counts.pendingDecisions,
    overdueTasks: company.counts.overdueTasks,
    activeProjects: company.counts.activeProjects,
    revenue: company.financials.income,
    expenses: company.financials.expenses,
    integrationContext: buildIntegrationContext(snapshots),
    externalRecords: company.counts.externalRecords,
    company,
    companySummary: company.summary,
  };
}

function parseJsonObject(text: string): any | null {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const match = candidate.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function daysUntil(value?: string | null): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

/** Deterministic analysis derived only from the decision's real inputs. */
function fallbackAnalysis(input: Required<Pick<DeepDecisionInput, 'title' | 'description'>> & {
  problemStatement: string;
  desiredOutcome: string;
  constraints: string;
  successMetrics: string;
  budgetLimit: string;
  teamSize: string;
  deadline: string;
  thoughts: string;
  swot: Required<NonNullable<DecisionNotes['swot']>>;
  options: Array<{ name: string }>;
  priority?: string;
  status?: string;
  context: Awaited<ReturnType<typeof loadContext>>;
}) {
  const risks: Array<{ name: string; description: string; mitigation: string; severity: number; probability: number }> = [];
  const opportunities: Array<{ name: string; description: string; potential: 'High' | 'Medium' | 'Low' }> = [];
  const successFactors: string[] = [];
  const keyFactors: string[] = [];
  const nextSteps: string[] = [];
  const missing: string[] = [];

  const risk = (name: string, description: string, mitigation: string, severity: number) =>
    risks.push({ name, description, mitigation, severity, probability: severity });

  if (!input.description.trim()) missing.push('description');
  if (!input.problemStatement.trim()) missing.push('problem statement');
  if (!input.desiredOutcome.trim()) missing.push('desired outcome');
  if (!input.successMetrics.trim()) missing.push('success metrics');
  if (!input.deadline) missing.push('deadline');
  if (!input.budgetLimit) missing.push('budget');

  if (input.description.trim()) {
    keyFactors.push(`Stated objective: ${input.description.trim().slice(0, 180)}`);
  }
  if (input.problemStatement.trim()) {
    keyFactors.push(`Problem framing: ${input.problemStatement.trim().slice(0, 180)}`);
  }
  if (input.thoughts.trim()) {
    keyFactors.push(`Executive notes: ${input.thoughts.trim().slice(0, 180)}`);
  }

  const days = daysUntil(input.deadline);
  if (days != null && days < 0) {
    risk('Deadline already passed', `The decision deadline was ${Math.abs(days)} day(s) ago.`, 'Reset the deadline or close the decision with a recorded outcome.', 85);
  } else if (days != null && days <= 30) {
    risk('Tight timeline', `Only ${days} day(s) remain before the deadline.`, 'Lock scope and assign an owner with weekly checkpoints.', 65);
  }
  if (!input.budgetLimit.trim()) {
    risk('No budget ceiling', 'No budget limit is recorded, so cost overruns cannot be detected.', 'Add a budget limit or explicitly mark the decision as unbudgeted.', 60);
  } else {
    const budget = Number(String(input.budgetLimit).replace(/[^0-9.-]/g, ''));
    if (Number.isFinite(budget) && budget > 0 && input.context.expenses > 0 && budget > input.context.expenses * 0.5) {
      risk('Budget concentration', `The ${budget.toLocaleString()} budget is large relative to recorded expenses of ${Math.round(input.context.expenses).toLocaleString()}.`, 'Stage the spend and gate each tranche on milestones.', 55);
    }
    if (Number.isFinite(budget) && budget > 0) keyFactors.push(`Budget ceiling: ${budget.toLocaleString()}`);
  }
  if (!input.teamSize.trim()) {
    risk('Unclear ownership capacity', 'Team size is not recorded, so delivery capacity is unknown.', 'Assign an accountable owner and estimate required headcount.', 45);
  } else {
    keyFactors.push(`Team size: ${input.teamSize}`);
  }
  if (input.constraints.trim()) keyFactors.push(`Constraints: ${input.constraints.trim().slice(0, 180)}`);
  if (input.successMetrics.trim()) {
    successFactors.push(`Measure outcomes with: ${input.successMetrics.trim().slice(0, 180)}`);
  } else {
    risk('Unmeasured outcome', 'No success metrics are defined, so the decision cannot be evaluated after execution.', 'Define 1–3 measurable success criteria before committing.', 70);
  }

  for (const weakness of input.swot.weaknesses) risk(`Weakness: ${weakness}`, 'Flagged in the decision SWOT analysis.', 'Assign a mitigation owner and review progress at the next checkpoint.', 60);
  for (const threat of input.swot.threats) risk(`Threat: ${threat}`, 'Flagged as an external threat in the SWOT analysis.', 'Monitor the trigger conditions and prepare a contingency.', 65);
  for (const strength of input.swot.strengths) opportunities.push({ name: `Leverage: ${strength}`, description: 'Existing strength recorded in the SWOT analysis.', potential: 'High' });
  for (const opportunity of input.swot.opportunities) opportunities.push({ name: `Opportunity: ${opportunity}`, description: 'Recorded upside in the SWOT analysis.', potential: 'Medium' });

  if (input.options.length > 1) {
    keyFactors.push(`${input.options.length} options considered: ${input.options.slice(0, 4).map((o) => o.name).join(', ')}`);
    nextSteps.push('Compare the shortlisted options against the success metrics before deciding.');
  } else if (input.options.length === 0) {
    nextSteps.push('Draft at least two credible options so the trade-off is explicit.');
  }

  if (input.context.overdueTasks > 0) {
    risk('Execution backlog', `${input.context.overdueTasks} overdue task(s) already compete for the same team.`, 'Clear or renegotiate overdue work before starting this initiative.', 60);
  }
  if (input.context.pendingDecisions > 0) {
    nextSteps.push(`Resolve or sequence the ${input.context.pendingDecisions} other pending decision(s) to avoid bottlenecks.`);
  }
  if (input.context.activeProjects > 0) {
    keyFactors.push(`${input.context.activeProjects} active project(s) in the workspace`);
  }
  if (input.context.externalRecords > 0) {
    keyFactors.push(`${input.context.externalRecords} synced record(s) from connected integrations were included in the analysis`);
  }
  if (input.context.revenue || input.context.expenses) {
    const profit = input.context.revenue - input.context.expenses;
    keyFactors.push(`Recorded cash flow: revenue ${Math.round(input.context.revenue).toLocaleString()}, expenses ${Math.round(input.context.expenses).toLocaleString()}, profit ${Math.round(profit).toLocaleString()}`);
    if (profit < 0) risk('Negative cash flow', 'Recorded expenses currently exceed recorded revenue.', 'Confirm funding or reduce committed spend before proceeding.', 70);
  }

  // ---- Company-wide context: every page and every synced/imported record ----
  const company = input.context.company;
  if (company) {
    const shared = company.projects.filter((p) => p.source === 'app');
    const external = company.projects.filter((p) => p.source !== 'app');
    if (shared.length) {
      keyFactors.push(
        `Workspace projects: ${shared.slice(0, 5).map((p) => `${p.name} (${p.progress}%)`).join(', ')}`,
      );
    }
    if (external.length) {
      keyFactors.push(
        `Synced projects from integrations: ${external.slice(0, 5).map((p) => `${p.name} [${p.source}] ${p.progress}%`).join(', ')}`,
      );
    }
    const weakOkrs = company.okrs.filter((okr) => okr.progress < 60);
    if (weakOkrs.length) {
      risk(
        `${weakOkrs.length} OKR(s) below 60%`,
        `Objectives behind plan: ${weakOkrs.slice(0, 3).map((o) => o.objective).join(', ')}.`,
        'Rebalance this initiative against existing objectives before committing more capacity.',
        55,
      );
    }
    if (company.counts.kpisBelowTarget > 0) {
      risk(
        `${company.counts.kpisBelowTarget} KPI(s) below target`,
        'Company metrics that are behind target: ' +
          company.kpis.filter((k) => k.target > 0 && k.current < k.target).slice(0, 4).map((k) => k.name).join(', ') + '.',
        'Tie this decision to the weakest KPI and report movement monthly.',
        50,
      );
    }
    if (company.counts.lowEngagementStakeholders > 0) {
      risk(
        'Relationship coverage gap',
        `${company.counts.lowEngagementStakeholders} stakeholder(s) have engagement below 40.`,
        'Pair this decision with a stakeholder outreach plan.',
        40,
      );
    }
    if (company.financials.budgetUtilization >= 90) {
      risk(
        'Budget nearly consumed',
        `${company.financials.budgetUtilization}% of allocated budget is already spent.`,
        'Re-forecast spend or request additional allocation first.',
        65,
      );
    }
    if (company.external.deals.length) {
      opportunities.push({
        name: `Sales pipeline: ${company.external.deals.length} open deal(s)`,
        description: `Pipeline value recorded in integrations: ${Math.round(sum(company.external.deals.map((d) => d.amount))).toLocaleString()}. Use it to fund or validate this decision.`,
        potential: 'High',
      });
    }
    if (company.external.stakeholders.length) {
      opportunities.push({
        name: `Reach: ${company.external.stakeholders.length} synced contact(s)`,
        description: 'Contacts synced from connected systems can be leveraged for this decision (see the stakeholders page).',
        potential: 'Medium',
      });
    }
    keyFactors.push(
      `Company context used: ${company.sources.length} data sources` +
        (company.counts.externalProviders ? ` across ${company.counts.externalProviders} connected system(s)` : '') +
        '.',
    );
  }

  if (input.priority) keyFactors.push(`Priority: ${input.priority}`);
  if (input.status) keyFactors.push(`Current status: ${input.status}`);

  if (!risks.length) {
    risk('Unvalidated assumptions', 'Key assumptions are not documented, so the analysis relies on the stated context only.', 'Record the top three assumptions and how each will be tested.', 40);
  }
  if (!opportunities.length) {
    opportunities.push({ name: 'Decision clarity', description: 'The decision is framed with a stated objective and can be executed once ownership is set.', potential: 'Medium' });
  }

  const completeness = [input.description, input.problemStatement, input.desiredOutcome, input.constraints, input.successMetrics, input.budgetLimit, input.teamSize, input.deadline, input.thoughts]
    .filter((value) => asText(value).length > 0).length;
  const confidence = Math.min(92, 45 + completeness * 6);

  const recommendation =
    risks.length > opportunities.length
      ? `Proceed only after addressing ${risks.length} identified risk(s) — start with "${risks[0].name}".`
      : `Proceed with "${input.title}" using the stated constraints, and track the recorded success metrics.`;

  return {
    recommendation,
    confidence,
    decisionAnalysis:
      `The decision "${input.title}" is ${input.priority ? `${input.priority}-priority ` : ''}${input.status ? `and currently ${input.status}` : ''}. ` +
      `It is supported by ${opportunities.length} identified upside(s) and ${risks.length} risk(s). ` +
      (input.desiredOutcome ? `Target outcome: ${input.desiredOutcome}. ` : '') +
      (completeness < 5 ? 'Several fields are incomplete, so confidence is limited.' : 'The core decision fields are populated.'),
    risks,
    opportunities,
    successFactors,
    keyFactors,
    nextSteps: nextSteps.length ? nextSteps : ['Assign an owner', 'Confirm the deadline and budget', 'Schedule the first execution checkpoint'],
    options: input.options.map((option, index) => ({
      id: index + 1,
      name: option.name,
      cost: 'Assess',
      risk: 'Assess',
      roi: 'Assess',
      timeline: input.deadline || 'TBD',
    })),
    dataLimitations: missing.length
      ? `Not provided: ${missing.join(', ')}. The analysis is bounded to the fields that were supplied.`
      : 'Analysis bounded to the supplied decision fields, workspace counts, and connected integration data.',
    analyzedAt: new Date().toISOString(),
  };
}

function inputFromRecord(decision: { id: string; title: string; description: string | null; notes: unknown; priority?: string | null; status?: string | null; deadline?: Date | null }, notes: DecisionNotes) {
  return {
    title: decision.title,
    description: decision.description || '',
    problemStatement: asText(notes.problemStatement),
    desiredOutcome: asText(notes.desiredOutcome),
    constraints: asText(notes.constraints),
    successMetrics: asText(notes.successMetrics),
    budgetLimit: asText(notes.budgetLimit),
    teamSize: asText(notes.teamSize),
    deadline: decision.deadline ? decision.deadline.toISOString().slice(0, 10) : '',
    thoughts: asText(notes.thoughts),
    swot: {
      strengths: asList(notes.swot?.strengths),
      weaknesses: asList(notes.swot?.weaknesses),
      opportunities: asList(notes.swot?.opportunities),
      threats: asList(notes.swot?.threats),
    },
    options: (notes.options || []).map((option) => ({ name: asText(option?.name) || 'Option' })),
    priority: decision.priority || '',
    status: decision.status || '',
  };
}

/** Quick analysis used by the decision sidebar. */
export async function analyzeDecision(userId: string, decisionId: string, context?: string): Promise<any> {
  const decision = await prisma.decision.findFirst({ where: { id: decisionId, userId } });
  if (!decision) {
    return { success: false, data: { error: 'Decision not found' } };
  }

  const notes = mergeNotes(parseNotes(decision.notes));
  const base = inputFromRecord(decision, notes);
  const ctx = await loadContext(userId);

  const prompt = `Analyze this executive decision using ONLY the supplied data.\n\n` +
    `DECISION: ${base.title}\nDESCRIPTION: ${base.description || 'N/A'}\n` +
    `PROBLEM: ${base.problemStatement || 'N/A'}\nDESIRED OUTCOME: ${base.desiredOutcome || 'N/A'}\n` +
    `CONSTRAINTS: ${base.constraints || 'N/A'}\nSUCCESS METRICS: ${base.successMetrics || 'N/A'}\n` +
    `BUDGET: ${base.budgetLimit || 'N/A'}\nTEAM SIZE: ${base.teamSize || 'N/A'}\nDEADLINE: ${base.deadline || 'N/A'}\n` +
    `THOUGHTS: ${base.thoughts || 'N/A'}\nSWOT: ${JSON.stringify(base.swot)}\nOPTIONS: ${JSON.stringify(base.options)}\n` +
    `PRIORITY: ${base.priority || 'N/A'}\nSTATUS: ${base.status || 'N/A'}\n` +
    `EXTRA CONTEXT: ${context || 'N/A'}\n\n` +
    `WORKSPACE: pending decisions ${ctx.pendingDecisions}, overdue tasks ${ctx.overdueTasks}, active projects ${ctx.activeProjects}, ` +
    `profit ${Math.round(ctx.revenue - ctx.expenses)}.\n` +
    `EXTERNAL DATA:\n${ctx.integrationContext}\n\n` +
    `COMPANY DATA FROM EVERY PAGE (projects, OKRs, KPIs, budgets, stakeholders, team, notes, calendar, imports):\n${ctx.companySummary}\n\n` +
    `Never invent numbers. Return ONLY JSON: {"recommendation": string, "risks": string[], "opportunities": string[], "keyFactors": string[], "nextSteps": string[], "confidence": number, "dataLimitations": string}`;

  let parsed: any = null;
  const providerKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  if (providerKey) {
    try {
      const reply = await callGemini(
        prompt,
        'You are a senior strategy advisor. Use only the provided decision data and never invent figures.',
        userId,
        'analyze_decision',
      );
      parsed = parseJsonObject(reply);
    } catch (error) {
      console.error('Decision analysis AI call failed:', error);
    }
  }

  const fallback = fallbackAnalysis({ ...base, context: ctx });
  // The sidebar renders risks/opportunities as plain strings, so flatten the
  // richer fallback objects instead of leaking them into React children.
  const fallbackRisks = fallback.risks.map(
    (risk) => `${risk.name} — ${risk.description} Mitigation: ${risk.mitigation}`,
  );
  const fallbackOpportunities = fallback.opportunities.map(
    (opportunity) => `${opportunity.name} — ${opportunity.description}`,
  );
  const data = parsed
    ? {
        decisionId,
        recommendation: asText(parsed.recommendation) || fallback.recommendation,
        risks: asList(parsed.risks).length ? asList(parsed.risks) : fallbackRisks,
        opportunities: asList(parsed.opportunities).length
          ? asList(parsed.opportunities)
          : fallbackOpportunities,
        keyFactors: asList(parsed.keyFactors).length ? asList(parsed.keyFactors) : fallback.keyFactors,
        nextSteps: asList(parsed.nextSteps).length ? asList(parsed.nextSteps) : fallback.nextSteps,
        confidence: Number(parsed.confidence) || fallback.confidence,
        dataLimitations: asText(parsed.dataLimitations) || fallback.dataLimitations,
        analyzedAt: new Date().toISOString(),
      }
    : {
        decisionId,
        recommendation: fallback.recommendation,
        risks: fallbackRisks,
        opportunities: fallbackOpportunities,
        keyFactors: fallback.keyFactors,
        nextSteps: fallback.nextSteps,
        confidence: fallback.confidence,
        dataLimitations: fallback.dataLimitations,
        decisionAnalysis: fallback.decisionAnalysis,
        successFactors: fallback.successFactors,
        analyzedAt: fallback.analyzedAt,
      };

  return data;
}

/** Deep analysis used by the decision workspace "Generate AI Insights" action. */
export async function analyzeDecisionDeep(userId: string, input: DeepDecisionInput | string): Promise<any> {
  const payload: DeepDecisionInput = typeof input === 'string' ? { decisionId: input } : input || {};

  let record: Awaited<ReturnType<typeof prisma.decision.findFirst>> = null;
  if (payload.decisionId) {
    record = await prisma.decision.findFirst({ where: { id: payload.decisionId, userId } });
  }

  const notes = mergeNotes(parseNotes(record?.notes));
  const fromRecord = record ? inputFromRecord(record, notes) : null;

  const options = (payload.options?.length ? payload.options : fromRecord?.options || [])
    .map((option) => ({ name: typeof option === 'string' ? option : asText(option?.name) }))
    .filter((option) => option.name);

  const merged = {
    title: asText(payload.title) || fromRecord?.title || 'Untitled decision',
    description: asText(payload.description) || fromRecord?.description || '',
    problemStatement: asText(payload.problemStatement) || fromRecord?.problemStatement || '',
    desiredOutcome: asText(payload.desiredOutcome) || fromRecord?.desiredOutcome || '',
    constraints: asText(payload.constraints) || fromRecord?.constraints || '',
    successMetrics: asText(payload.successMetrics) || fromRecord?.successMetrics || '',
    budgetLimit: asText(payload.budgetLimit) || fromRecord?.budgetLimit || '',
    teamSize: asText(payload.teamSize) || fromRecord?.teamSize || '',
    deadline: asText(payload.deadline) || fromRecord?.deadline || '',
    thoughts: asText(payload.thoughts) || fromRecord?.thoughts || '',
    swot: {
      strengths: asList(payload.swot?.strengths).length ? asList(payload.swot?.strengths) : fromRecord?.swot.strengths || [],
      weaknesses: asList(payload.swot?.weaknesses).length ? asList(payload.swot?.weaknesses) : fromRecord?.swot.weaknesses || [],
      opportunities: asList(payload.swot?.opportunities).length ? asList(payload.swot?.opportunities) : fromRecord?.swot.opportunities || [],
      threats: asList(payload.swot?.threats).length ? asList(payload.swot?.threats) : fromRecord?.swot.threats || [],
    },
    options,
    priority: fromRecord?.priority || '',
    status: fromRecord?.status || '',
  };

  const ctx = await loadContext(userId);
  const fallback = fallbackAnalysis({ ...merged, context: ctx });

  let parsed: any = null;
  const providerKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  if (providerKey) {
    try {
      const prompt =
        PromptTemplates.ANALYZE_DECISION_DEEP({
          ...merged,
          options: merged.options,
          workspaceContext: {
            pendingDecisions: ctx.pendingDecisions,
            overdueTasks: ctx.overdueTasks,
            activeProjects: ctx.activeProjects,
            profit: Math.round(ctx.revenue - ctx.expenses),
            integrationContext: ctx.integrationContext,
            companySummary: ctx.companySummary,
          },
        }) +
        `\n\nReturn this exact JSON shape:\n` +
        `{"recommendation": string, "confidence": number, "decisionAnalysis": string, "successFactors": string[], ` +
        `"risks": [{"name": string, "description": string, "mitigation": string, "severity": number, "probability": number}], ` +
        `"opportunities": [{"name": string, "description": string, "potential": "High"|"Medium"|"Low"}], ` +
        `"options": [{"name": string, "cost": string, "risk": string, "roi": string, "timeline": string}], ` +
        `"nextSteps": string[], "dataLimitations": string}`;

      const reply = await callGemini(
        prompt,
        'You are a senior strategy advisor performing deep decision analysis. Use only the provided decision data.',
        userId,
        'analyze_decision_deep',
      );
      parsed = parseJsonObject(reply);
    } catch (error) {
      console.error('Deep decision analysis AI call failed:', error);
    }
  }

  if (!parsed) {
    return { ...fallback, decisionId: payload.decisionId, fallback: true };
  }

  const risks = Array.isArray(parsed.risks)
    ? parsed.risks
        .map((risk: any) => ({
          name: asText(risk?.name) || asText(risk?.risk) || 'Risk',
          description: asText(risk?.description) || asText(risk?.risk) || '',
          mitigation: asText(risk?.mitigation) || 'Monitor closely',
          severity: Number(risk?.severity) || 50,
          probability: Number(risk?.probability) || Number(risk?.likelihood) || 50,
        }))
        .filter((risk: any) => risk.name)
    : fallback.risks;

  const opportunities = Array.isArray(parsed.opportunities)
    ? parsed.opportunities
        .map((opportunity: any) => ({
          name: asText(opportunity?.name) || asText(opportunity?.opportunity) || 'Opportunity',
          description: asText(opportunity?.description) || '',
          potential: ['High', 'Medium', 'Low'].includes(opportunity?.potential) ? opportunity.potential : 'Medium',
        }))
        .filter((opportunity: any) => opportunity.name)
    : fallback.opportunities;

  return {
    decisionId: payload.decisionId,
    recommendation: asText(parsed.recommendation) || fallback.recommendation,
    confidence: Number(parsed.confidence) || fallback.confidence,
    decisionAnalysis:
      asText(parsed.decisionAnalysis) ||
      asText(parsed?.decisionAnalysis?.summary) ||
      fallback.decisionAnalysis,
    risks,
    opportunities,
    successFactors: asList(parsed.successFactors).length ? asList(parsed.successFactors) : fallback.successFactors,
    keyFactors: asList(parsed.keyFactors).length ? asList(parsed.keyFactors) : fallback.keyFactors,
    nextSteps: asList(parsed.nextSteps).length ? asList(parsed.nextSteps) : fallback.nextSteps,
    options: Array.isArray(parsed.options) && parsed.options.length
      ? parsed.options.map((option: any, index: number) => ({
          id: index + 1,
          name: asText(option?.name) || `Option ${index + 1}`,
          cost: asText(option?.cost) || 'Assess',
          risk: asText(option?.risk) || 'Assess',
          roi: asText(option?.roi) || 'Assess',
          timeline: asText(option?.timeline) || merged.deadline || 'TBD',
        }))
      : fallback.options,
    dataLimitations: asText(parsed.dataLimitations) || fallback.dataLimitations,
    analyzedAt: new Date().toISOString(),
  };
}
