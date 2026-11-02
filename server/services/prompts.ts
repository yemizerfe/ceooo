// server/services/prompts.ts
// Central prompt templates. Every template returns a plain string and is
// bounded to the data passed in — never invent figures.

const json = (value: unknown) => JSON.stringify(value, null, 2);

const money = (value: unknown) => Number(value || 0).toLocaleString();

export const PromptTemplates = {
  // ==================== EXECUTIVE DASHBOARD ====================
  EXECUTIVE_SUMMARY: (data: any) => `
You are a senior executive assistant. Generate a concise executive summary.

METRICS:
- Total decisions: ${data.totalDecisions ?? 0}
- Decision completion rate: ${data.completionRate ?? 0}%
- Revenue: $${money(data.revenue)}
- Expenses: $${money(data.expenses)}
- Profit: $${money(Number(data.revenue || 0) - Number(data.expenses || 0))}
- Pending tasks: ${data.pendingTasks ?? 0}
- Upcoming meetings: ${data.upcomingMeetings ?? 0}

INSTRUCTIONS:
Generate insights automatically. Do NOT ask questions.
Use ONLY the data provided. Never invent numbers.

Return ONLY valid JSON:
{
  "insights": ["..."],
  "recommendations": ["..."],
  "alerts": ["..."],
  "quickStats": { "healthScore": number, "riskLevel": "High|Medium|Low", "momentum": "..." }
}`,

  COMPANY_PULSE: (data: any) => `
You are a business intelligence analyst. Give a company pulse check.

DATA:
- Decisions this week: ${data.recentDecisions ?? 0}
- Tasks completed this week: ${data.completedTasks ?? 0}
- Active stakeholders: ${data.stakeholders ?? 0}
- Notes created: ${data.notes ?? 0}
- Revenue: $${money(data.revenue)}
- Expenses: $${money(data.expenses)}

Return ONLY valid JSON:
{ "summary": string, "pulseScore": number, "highlights": string[], "concerns": string[], "nextActions": string[] }`,

  BUSINESS_HEALTH: (data: any) => `
You are a business health analyst. Assess the company using only these metrics:
${json(data)}

Return ONLY valid JSON:
{ "healthScore": number, "financial": { "score": number, "notes": string }, "execution": { "score": number, "notes": string }, "relationships": { "score": number, "notes": string }, "risks": string[], "recommendations": string[] }`,

  DAILY_BRIEF: (data: any) => `
You are the CEO's chief of staff. Write a short daily brief.

TODAY'S DATA:
${json(data)}

Return ONLY valid JSON:
{ "greeting": string, "summary": string, "criticalRisk": string, "keyOpportunity": string, "recommendedAction": string, "focusItems": string[] }`,

  // ==================== FORECASTING ====================
  STRATEGIC_FORECAST: (data: any) => `
You are a strategic forecasting analyst. Use only the supplied metrics:
${json(data)}

Return ONLY valid JSON:
{ "quarter": string, "predictions": object, "risks": object[], "recommendations": string[], "outlook": "Positive|Stable|Caution" }`,

  // ==================== DECISION INTELLIGENCE ====================
  ANALYZE_DECISION: (data: any) => `
You are a decision analysis expert. Analyze this decision and provide actionable recommendations.

DECISION: ${data.title || 'Untitled'}
DESCRIPTION: ${data.description || 'N/A'}
EXECUTIVE CONTEXT: ${data.context || 'N/A'}
WORKSPACE DATA: ${json(data.workspaceData || {})}

Do not invent figures. If key information is missing, note it in dataLimitations.

Return ONLY valid JSON:
{ "recommendation": string, "risks": string[], "opportunities": string[], "confidence": number, "dataLimitations": string }`,

  ANALYZE_DECISION_DEEP: (data: any) => `
You are a senior strategy consultant. Analyze this decision rigorously.

DECISION: ${data.title || 'Untitled'}
DESCRIPTION: ${data.description || 'N/A'}
PROBLEM: ${data.problemStatement || 'N/A'}
DESIRED OUTCOME: ${data.desiredOutcome || 'N/A'}
CONSTRAINTS: ${data.constraints || 'N/A'}
SUCCESS METRICS: ${data.successMetrics || 'N/A'}
BUDGET LIMIT: ${data.budgetLimit || 'N/A'}
TEAM SIZE: ${data.teamSize || 'N/A'}
DEADLINE: ${data.deadline || 'N/A'}
THOUGHTS: ${data.thoughts || 'N/A'}
SWOT: ${json(data.swot || {})}
OPTIONS: ${json(data.options || [])}
WORKSPACE CONTEXT: ${json(data.workspaceContext || {})}

Never invent figures that are not in the inputs above.

Return ONLY valid JSON:
{
  "recommendation": string,
  "confidence": number,
  "decisionAnalysis": {
    "summary": string,
    "pros": string[],
    "cons": string[],
    "risks": [{ "risk": string, "likelihood": string, "mitigation": string }],
    "swotAnalysis": { "strengths": string[], "weaknesses": string[], "opportunities": string[], "threats": string[] }
  },
  "nextSteps": string[],
  "dataLimitations": string
}`,

  DEEP_DECISION: (data: any) => `
Analyze this decision in depth. Inputs:
${json(data)}

Return ONLY valid JSON with recommendation, confidence, decisionAnalysis, nextSteps, dataLimitations.`,

  DECISION_INTELLIGENCE: (data: any) => `
You are a decision intelligence analyst. Use only:
${json(data)}

Return ONLY valid JSON: { "summary": string, "patterns": string[], "bottlenecks": string[], "recommendations": string[] }`,

  // ==================== RISK & OPPORTUNITY ====================
  DETECT_RISKS: (data: any) => `
You are a risk analyst. Identify risks using only this data:
${json(data)}

Never invent numbers. Return ONLY valid JSON:
{ "risks": [{ "title": string, "severity": "HIGH|MEDIUM|LOW", "evidence": string, "mitigation": string }], "summary": string }`,

  RISK_DETECTION: (data: any) => `
Identify business risks using only:
${json(data)}

Return ONLY valid JSON with "risks" and "summary".`,

  DISCOVER_OPPORTUNITIES: (data: any) => `
You are an opportunity analyst. Find realistic opportunities in this data:
${json(data)}

Never invent numbers. Return ONLY valid JSON:
{ "opportunities": [{ "title": string, "impact": "HIGH|MEDIUM|LOW", "evidence": string, "nextStep": string }], "summary": string }`,

  OPPORTUNITY_DISCOVERY: (data: any) => `
Find business opportunities using only:
${json(data)}

Return ONLY valid JSON with "opportunities" and "summary".`,

  // ==================== INSIGHTS & REPORTS ====================
  GENERATE_INSIGHTS: (data: any) => `
You are a management consultant. Generate insights from this workspace data:
${json(data)}

Use only the data provided. Return ONLY valid JSON:
{ "insights": string[], "recommendations": string[], "title": string }`,

  GENERATE_REPORT: (data: any) => `
You are a business analyst. Generate a ${data.reportType || 'business'} report.

PARAMETERS:
${json({
  period: data.dateRange,
  totalDecisions: data.totalDecisions,
  completedDecisions: data.completedDecisions,
  totalTasks: data.totalTasks,
  completedTasks: data.completedTasks,
  totalRevenue: data.totalRevenue,
  totalExpenses: data.totalExpenses,
  totalEvents: data.totalEvents,
})}

DATA SAMPLES:
${(data.dataSamples || []).map((d: any) => `- ${d.title} (${d.status})`).join('\n') || 'None'}

Return ONLY valid JSON: { "title": string, "executiveSummary": string, "keyFindings": string[], "trends": string[], "recommendations": string[] }`,

  GET_AI_RECOMMENDATIONS: (data: any) => `
You are a strategic advisor. Give actionable recommendations from:
${json(data)}

Return ONLY valid JSON: { "recommendations": string[], "priority": string[], "quickWins": string[], "longTerm": string[] }`,

  AI_RECOMMENDATIONS: (data: any) => `
Provide prioritized recommendations using only:
${json(data)}

Return ONLY valid JSON with "recommendations", "priority", "quickWins", "longTerm".`,

  // ==================== NOTES & MEETINGS ====================
  SUMMARIZE_MEETING: (content: string) => `
Summarize this meeting transcript. Extract decisions, owners, and action items.
Do not invent anything that was not said.

TRANSCRIPT:
${content}

Return ONLY valid JSON:
{ "summary": string, "decisions": string[], "actionItems": [{ "task": string, "owner": string, "due": string }], "risks": string[] }`,

  MEETING_SUMMARY: (content: string) => `
Summarize the meeting below into decisions and action items:
${content}

Return ONLY valid JSON with "summary", "decisions", "actionItems".`,

  SUMMARIZE_NOTE: (content: string) => `
Summarize this note into its key points. Do not invent facts.

NOTE:
${content}

Return ONLY valid JSON: { "summary": string, "keyPoints": string[], "nextSteps": string[] }`,

  NOTE_SUMMARY: (content: string) => `
Summarize this note:
${content}

Return ONLY valid JSON with "summary", "keyPoints", "nextSteps".`,
};

export default PromptTemplates;
