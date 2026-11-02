import { GoogleGenAI } from '@google/genai';
import { prisma } from '../lib/prisma.js';
import { PromptTemplates } from './prompts.ts';
import { fetchAllProviderSnapshots, buildIntegrationContext } from './integrationSnapshot.service.js';

// ==================== CONFIGURATION ====================

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
const AI_TIMEOUT = parseInt(process.env.AI_TIMEOUT || '60000', 10);
const AI_CACHE_TTL = parseInt(process.env.AI_CACHE_TTL || '300');
const AI_MAX_RETRIES = parseInt(process.env.AI_MAX_RETRIES || '3');
const AI_ENABLE_ANALYTICS = process.env.AI_ENABLE_ANALYTICS === 'true';

// Initialize Gemini AI
const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
  httpOptions: { timeout: AI_TIMEOUT },
});

// ==================== AI SERVICE CLASS ====================

class AIService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  // ==================== CACHE METHODS ====================
  
  private getCached(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < AI_CACHE_TTL * 1000) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  // ==================== USAGE LOGGING ====================
  
  private async logUsage(
    userId: string,
    feature: string,
    usage: any,
    success: boolean,
    error?: string,
    cacheHit: boolean = false,
    durationMs: number = 0
  ): Promise<void> {
    if (!AI_ENABLE_ANALYTICS) return;

    try {
      await prisma.aIUsage.create({
        data: {
          userId,
          feature,
          promptTokens: usage?.promptTokenCount || 0,
          responseTokens: usage?.candidatesTokenCount || 0,
          totalTokens: usage?.totalTokenCount || 0,
          durationMs,
          success,
          error,
          cacheHit
        }
      });
    } catch (e) {
      // Don't let logging break the main flow
      console.error('Failed to log AI usage:', e);
    }
  }

  // ==================== GEMINI API CALL WITH RETRY ====================
  
  private async callGemini(
    prompt: string,
    systemInstruction?: string,
    userId: string = 'system',
    feature: string = 'general'
  ): Promise<string> {
    const cacheKey = `${feature}_${userId}_${prompt.substring(0, 100)}`;
    
    // Check cache
    const cached = this.getCached(cacheKey);
    if (cached) {
      console.log(`📦 Cache hit for ${feature}`);
      await this.logUsage(userId, feature, null, true, undefined, true, 0);
      return cached;
    }

    let lastError: Error | null = null;
    let totalDuration = 0;

    for (let attempt = 1; attempt <= AI_MAX_RETRIES; attempt++) {
      const startTime = Date.now();
      try {
        console.log(`🔄 Gemini API call: ${feature} (attempt ${attempt}/${AI_MAX_RETRIES})`);

        // Build content array
        const contents: any[] = [];
        
        if (systemInstruction) {
          contents.push({ role: 'system', parts: [{ text: systemInstruction }] });
        }
        contents.push({ role: 'user', parts: [{ text: prompt }] });

        // Make API call with timeout
        const response = await ai.models.generateContent({
          model: process.env.GEMINI_MODEL || process.env.AI_MODEL || 'gemini-2.5-flash',
          contents,
          config: {
            temperature: 0.7,
            maxOutputTokens: 8192,
          }
        });

        const duration = Date.now() - startTime;
        totalDuration += duration;

        console.log(`✅ Gemini API call successful: ${duration}ms`);

        const result = response.text || '';

        // Cache the result
        this.setCache(cacheKey, result);

        // Log usage
        await this.logUsage(
          userId,
          feature,
          response.usageMetadata,
          true,
          undefined,
          false,
          duration
        );

        return result;

      } catch (error: unknown) {
        const duration = Date.now() - startTime;
        totalDuration += duration;
        lastError = error instanceof Error ? error : new Error(String(error));
        const status =
          typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number'
            ? error.status
            : undefined;
        console.error(`❌ Gemini API attempt ${attempt} failed:`, lastError.message);

        const isRetryable = status === undefined || status === 408 || status >= 500;
        if (!isRetryable) {
          console.error(`Gemini rejected the request with HTTP ${status}; skipping retries.`);
          break;
        }

        if (attempt < AI_MAX_RETRIES) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    console.error('❌ All Gemini API attempts failed');
    
    await this.logUsage(
      userId,
      feature,
      null,
      false,
      lastError?.message || 'All retries failed',
      false,
      totalDuration
    );

    return this.getFallbackResponse(prompt);
  }

  // ==================== FALLBACK RESPONSES ====================
  
  private getFallbackResponse(prompt: string): string {
    console.warn('⚠️ Using fallback response');

    if (prompt.includes('company pulse') || prompt.includes('Pulse')) {
      return JSON.stringify({
        overallScore: 75,
        trends: { decisions: 'stable', tasks: 'increasing', meetings: 'moderate' },
        sentiment: 'positive',
        highlights: ["Team productivity is strong", "Decision velocity is good"],
        alerts: ["Review pending items", "Check financial health"]
      });
    }

    if (prompt.includes('business health') || prompt.includes('Business Health')) {
      return JSON.stringify({
        overall: 72,
        categories: { financial: 65, operational: 70, strategic: 75, team: 70, customer: 75 },
        strengths: ["Strategic alignment", "Engaged team"],
        weaknesses: ["Financial efficiency", "Task completion"],
        recommendations: ["Improve financial planning", "Increase task completion"]
      });
    }

    // For chat-style prompts (copilot_chat, general), return a plain sentence so
    // callers that expect a JSON object with recommendation/risks/opportunities can
    // detect the fallback and fall back to deterministic analysis.
    return `AI service is currently unavailable. Please try your request again later.`;
  }

  // ==================== EXECUTIVE DASHBOARD ====================
  
  async getExecutiveSummary(userId: string) {
    const cacheKey = `executive_summary_${userId}`;
    const cached = this.getCached(cacheKey);
    if (cached) {
      console.log('📦 Cache hit for executive summary');
      await this.logUsage(userId, 'executive_summary', null, true, undefined, true, 0);
      return cached;
    }

    const [decisions, events, tasks, financials, integrationSnapshots] = await Promise.all([
      prisma.decision.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.calendarEvent.findMany({ where: { userId, startTime: { gte: new Date() } }, take: 5 }),
      prisma.task.findMany({ where: { project: { userId }, status: { not: 'DONE' } }, take: 5 }),
      prisma.financialRecord.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 10 }),
      fetchAllProviderSnapshots(userId).catch(() => []),
    ]);
    
    const totalDecisions = await prisma.decision.count({ where: { userId } });
    const completedDecisions = await prisma.decision.count({ where: { userId, status: 'DECIDED' } });
    
    const totalRevenue = financials.filter(f => f.type === 'INCOME').reduce((s, f) => s + f.amount, 0);
    const totalExpenses = financials.filter(f => f.type === 'EXPENSE').reduce((s, f) => s + f.amount, 0);
    const integrationContext = buildIntegrationContext(integrationSnapshots);
    
    const promptData = {
      totalDecisions,
      completionRate: totalDecisions ? Math.round(completedDecisions/totalDecisions*100) : 0,
      revenue: totalRevenue,
      expenses: totalExpenses,
      pendingTasks: tasks.length,
      upcomingMeetings: events.length
    };

    const prompt = PromptTemplates.EXECUTIVE_SUMMARY(promptData) + `

ADDITIONAL CONTEXT FROM CONNECTED INTEGRATIONS:
${integrationContext}`;
    const aiResponse = await this.callGemini(prompt, undefined, userId, 'executive_summary');
    
    try {
      const insights = JSON.parse(aiResponse);
      const result = {
        welcomeMessage: `Welcome back, CEO. Here's your executive overview for ${new Date().toLocaleDateString()}.`,
        metrics: {
          totalDecisions,
          completionRate: totalDecisions ? Math.round((completedDecisions / totalDecisions) * 100) : 0,
          pendingTasks: tasks.length,
          upcomingMeetings: events.length,
          revenue: totalRevenue,
          expenses: totalExpenses,
          profit: totalRevenue - totalExpenses,
          profitMargin: totalRevenue ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100) : 0
        },
        insights: insights.insights || [
          "Revenue growth is stable, focus on margin improvement",
          `${tasks.length} pending tasks require attention`
        ],
        recommendations: insights.recommendations || [
          "Review pending high-priority decisions",
          "Schedule weekly financial review"
        ],
        recentDecisions: decisions.map(d => ({ id: d.id, title: d.title, status: d.status })),
        upcomingEvents: events.map(e => ({ id: e.id, title: e.title, startTime: e.startTime }))
      };
      
      this.setCache(cacheKey, result);
      return result;
    } catch {
      const result = {
        welcomeMessage: `Welcome back, CEO. Here's your executive overview.`,
        metrics: { 
          totalDecisions, 
          completionRate: totalDecisions ? Math.round((completedDecisions/totalDecisions)*100) : 0, 
          pendingTasks: tasks.length, 
          upcomingMeetings: events.length, 
          revenue: totalRevenue, 
          expenses: totalExpenses, 
          profit: totalRevenue - totalExpenses, 
          profitMargin: totalRevenue ? Math.round(((totalRevenue - totalExpenses)/totalRevenue)*100) : 0 
        },
        insights: ["Review recent decisions", "Check financial performance", "Plan upcoming week"],
        recommendations: ["Prioritize high-impact decisions", "Schedule team sync", "Review Q3 goals"],
        recentDecisions: decisions.map(d => ({ id: d.id, title: d.title, status: d.status })),
        upcomingEvents: events.map(e => ({ id: e.id, title: e.title, startTime: e.startTime }))
      };
      
      this.setCache(cacheKey, result);
      return result;
    }
  }

  async getCompanyPulse(userId: string) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const [recentDecisions, completedTasks, stakeholders, notes] = await Promise.all([
      prisma.decision.count({ where: { userId, createdAt: { gte: weekAgo } } }),
      prisma.task.count({ where: { project: { userId }, completedAt: { gte: weekAgo } } }),
      prisma.stakeholder.count({ where: { userId } }),
      prisma.note.count({ where: { userId, createdAt: { gte: weekAgo } } })
    ]);
    
    const promptData = { recentDecisions, completedTasks, stakeholders, notes };
    const prompt = PromptTemplates.COMPANY_PULSE(promptData);
    const aiResponse = await this.callGemini(prompt, undefined, userId, 'company_pulse');
    
    try {
      const parsed = JSON.parse(aiResponse);
      return {
        overallScore: parsed.overallScore || 78,
        trends: parsed.trends || { decisions: 'stable', tasks: 'increasing', meetings: 'moderate' },
        sentiment: parsed.sentiment || 'positive',
        highlights: parsed.highlights || [
          `Strong decision velocity with ${recentDecisions} decisions this week`,
          `Team completed ${completedTasks} tasks`
        ],
        alerts: parsed.alerts || ["Review pending decisions", "Schedule strategic planning session"]
      };
    } catch {
      return {
        overallScore: 78,
        trends: { decisions: recentDecisions > 10 ? 'increasing' : 'stable', tasks: completedTasks > 20 ? 'high' : 'normal', meetings: 'moderate' },
        sentiment: 'positive',
        highlights: [`${recentDecisions} decisions made this week`, `${completedTasks} tasks completed`],
        alerts: ["Review pending high-priority items"]
      };
    }
  }

  async getBusinessHealth(userId: string) {
    const [decisions, tasks, stakeholders, financials, calendarEvents] = await Promise.all([
      prisma.decision.count({ where: { userId } }),
      prisma.task.count({ where: { project: { userId } } }),
      prisma.stakeholder.count({ where: { userId } }),
      prisma.financialRecord.findMany({ where: { userId }, take: 100 }),
      prisma.calendarEvent.count({ where: { userId, startTime: { gte: new Date() } } })
    ]);
    
    const completedDecisions = await prisma.decision.count({ where: { userId, status: 'DECIDED' } });
    const completedTasks = await prisma.task.count({ where: { project: { userId }, status: 'DONE' } });
    
    const totalRevenue = financials.filter(f => f.type === 'INCOME').reduce((s, f) => s + f.amount, 0);
    const totalExpenses = financials.filter(f => f.type === 'EXPENSE').reduce((s, f) => s + f.amount, 0);
    
    const promptData = {
      decisionCompletion: decisions ? Math.round(completedDecisions/decisions*100) : 0,
      totalDecisions: decisions,
      completedDecisions,
      taskCompletion: tasks ? Math.round(completedTasks/tasks*100) : 0,
      totalTasks: tasks,
      completedTasks,
      revenue: totalRevenue,
      expenses: totalExpenses,
      stakeholders,
      meetings: calendarEvents
    };

    const prompt = PromptTemplates.BUSINESS_HEALTH(promptData);
    const aiResponse = await this.callGemini(prompt, undefined, userId, 'business_health');
    
    try {
      const parsed = JSON.parse(aiResponse);
      return {
        overall: parsed.overall || 72,
        categories: parsed.categories || {
          financial: totalRevenue ? Math.min(100, Math.round((totalRevenue - totalExpenses) / totalRevenue * 100)) : 50,
          operational: tasks ? Math.round(completedTasks / tasks * 100) : 50,
          strategic: decisions ? Math.round(completedDecisions / decisions * 100) : 50,
          team: 70,
          customer: 75
        },
        strengths: parsed.strengths || ["Good decision velocity", "Active stakeholder engagement"],
        weaknesses: parsed.weaknesses || ["Financial optimization needed", "Task completion rate could improve"],
        recommendations: parsed.recommendations || [
          "Improve financial efficiency",
          "Increase task completion rate",
          "Set clearer decision deadlines"
        ]
      };
    } catch {
      return {
        overall: 72,
        categories: { financial: 65, operational: 70, strategic: 75, team: 70, customer: 75 },
        strengths: ["Active decision making", "Engaged stakeholders"],
        weaknesses: ["Financial metrics need attention", "Task backlog exists"],
        recommendations: ["Review financial performance", "Prioritize pending tasks", "Set quarterly OKRs"]
      };
    }
  }

  async getDailyBrief(userId: string) {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    const [todayEvents, pendingDecisions, overdueTasks] = await Promise.all([
      prisma.calendarEvent.findMany({ where: { userId, startTime: { gte: todayStart, lte: todayEnd } }, orderBy: { startTime: 'asc' } }),
      prisma.decision.count({ where: { userId, status: 'PENDING' } }),
      prisma.task.count({ where: { project: { userId }, dueDate: { lt: today }, status: { not: 'DONE' } } })
    ]);
    
    const promptData = {
      date: today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      meetingsCount: todayEvents.length,
      pendingDecisions,
      overdueTasks
    };

    const prompt = PromptTemplates.DAILY_BRIEF(promptData);
    const aiResponse = await this.callGemini(prompt, undefined, userId, 'daily_brief');
    
    try {
      const parsed = JSON.parse(aiResponse);
      return {
        date: today.toISOString(),
        greeting: parsed.greeting || `Good morning, CEO. Here's your briefing for ${today.toLocaleDateString()}.`,
        schedule: todayEvents.map(e => ({ title: e.title, time: e.startTime.toLocaleTimeString(), type: e.type })),
        priorities: parsed.priorities || [
          "Review pending decisions",
          "Prepare for key meetings",
          "Address overdue tasks"
        ],
        focus: parsed.focusRecommendation || "Your optimal focus window is 9-11 AM. Protect this time for strategic work.",
        metrics: {
          pendingDecisions,
          meetingsToday: todayEvents.length,
          overdueTasks
        }
      };
    } catch {
      return {
        date: today.toISOString(),
        greeting: `Good morning. Here's your briefing for ${today.toLocaleDateString()}.`,
        schedule: todayEvents.map(e => ({ title: e.title, time: e.startTime.toLocaleTimeString(), type: e.type })),
        priorities: ["Complete pending decisions", "Prepare for meetings", "Review team progress"],
        focus: "Your optimal focus window is 9-11 AM.",
        metrics: { pendingDecisions, meetingsToday: todayEvents.length, overdueTasks }
      };
    }
  }

  // ==================== DECISION INTELLIGENCE ====================
  
  async getDecisionIntelligence(userId: string) {
    const decisions = await prisma.decision.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { user: true }
    });
    
    const totalDecisions = decisions.length;
    const highImpact = decisions.filter(d => d.impact === 'HIGH').length;
    const highPriority = decisions.filter(d => d.priority === 'HIGH').length;
    const avgConfidence = decisions.reduce((sum, d) => sum + (d.aiConfidence || 0), 0) / (totalDecisions || 1);
    const decisionsByStatus = {
      pending: decisions.filter(d => d.status === 'PENDING').length,
      inProgress: decisions.filter(d => d.status === 'IN_PROGRESS').length,
      decided: decisions.filter(d => d.status === 'DECIDED').length,
      executing: decisions.filter(d => d.status === 'EXECUTING').length
    };
    
    const prompt = `Analyze these decision metrics and provide strategic insights:
    - Total decisions: ${totalDecisions}
    - High impact: ${highImpact}, High priority: ${highPriority}
    - Avg confidence: ${Math.round(avgConfidence)}%
    - Status breakdown: Pending ${decisionsByStatus.pending}, In Progress ${decisionsByStatus.inProgress}, Decided ${decisionsByStatus.decided}, Executing ${decisionsByStatus.executing}
    
    Return JSON with: insights, recommendations, decisionHealth.`;
    
    const aiResponse = await this.callGemini(prompt, undefined, userId, 'decision_intelligence');
    
    try {
      const parsed = JSON.parse(aiResponse);
      return {
        totalDecisions,
        highImpactCount: highImpact,
        highPriorityCount: highPriority,
        averageConfidence: Math.round(avgConfidence),
        decisionsByStatus,
        recentDecisions: decisions.slice(0, 5).map(d => ({
          id: d.id,
          title: d.title,
          impact: d.impact,
          priority: d.priority,
          status: d.status,
          confidence: d.aiConfidence
        })),
        insights: parsed.insights || "Decision quality is strong. Focus on executing decided items.",
        recommendations: parsed.recommendations || [
          "Set clear deadlines for pending decisions",
          "Review high-impact decisions weekly"
        ],
        decisionHealth: parsed.decisionHealth || {
          score: totalDecisions ? Math.round((decisionsByStatus.decided / totalDecisions) * 100) : 0,
          status: decisionsByStatus.decided > totalDecisions / 2 ? "Good" : "Needs Attention"
        }
      };
    } catch {
      return {
        totalDecisions,
        highImpactCount: highImpact,
        highPriorityCount: highPriority,
        averageConfidence: Math.round(avgConfidence),
        decisionsByStatus,
        recentDecisions: decisions.slice(0, 5).map(d => ({ id: d.id, title: d.title, impact: d.impact, priority: d.priority, status: d.status, confidence: d.aiConfidence })),
        insights: "Track decision outcomes to improve future choices",
        recommendations: ["Set decision deadlines", "Document rationale", "Review outcomes"],
        decisionHealth: { score: totalDecisions ? Math.round((decisionsByStatus.decided / totalDecisions) * 100) : 0, status: "Monitor" }
      };
    }
  }

  async analyzeDecision(userId: string, decisionId: string, context?: string) {
    const decision = await prisma.decision.findFirst({
      where: { id: decisionId, userId },
      include: { user: true }
    });
    
    if (!decision) throw new Error('Decision not found');
    
    const prompt = `Analyze this business decision:
    Title: ${decision.title}
    Description: ${decision.description || 'N/A'}
    Priority: ${decision.priority}, Impact: ${decision.impact}
    Context: ${context || 'Standard business analysis'}
    
    Provide analysis with: summary, recommendations (3 items), riskLevel (Low/Medium/High), estimatedImpact, suggestedTimeline, nextSteps (3 items).
    Return as JSON.`;
    
    const aiResponse = await this.callGemini(prompt, undefined, userId, 'analyze_decision');
    
    try {
      const parsed = JSON.parse(aiResponse);
      return {
        decisionId: decision.id,
        title: decision.title,
        analysis: {
          summary: parsed.summary || `Analysis of "${decision.title}" shows significant potential impact.`,
          recommendations: parsed.recommendations || [
            "Gather stakeholder input before finalizing",
            "Evaluate alternatives with cost-benefit analysis"
          ],
          riskLevel: parsed.riskLevel || (decision.priority === 'HIGH' ? 'Medium-High' : 'Low-Medium'),
          estimatedImpact: parsed.estimatedImpact || decision.impact,
          suggestedTimeline: parsed.suggestedTimeline || (decision.deadline || '2 weeks')
        },
        nextSteps: parsed.nextSteps || [
          "Document decision rationale",
          "Assign ownership and timeline",
          "Schedule follow-up review"
        ]
      };
    } catch {
      return {
        decisionId: decision.id,
        title: decision.title,
        analysis: {
          summary: `Analysis of "${decision.title}" is complete.`,
          recommendations: ["Review with stakeholders", "Create implementation plan", "Set success metrics"],
          riskLevel: decision.priority === 'HIGH' ? 'Medium' : 'Low',
          estimatedImpact: decision.impact,
          suggestedTimeline: decision.deadline || '2 weeks'
        },
        nextSteps: ["Document decision", "Assign owner", "Schedule review"]
      };
    }
  }

  // ==================== DEEP DECISION ANALYSIS ====================
  
  async analyzeDecisionDeep(userId: string, data: {
    title: string;
    description: string;
    problemStatement: string;
    desiredOutcome: string;
    constraints: string;
    successMetrics: string;
    budgetLimit: string;
    teamSize: string;
    deadline?: string;
    thoughts: string;
    swot: {
      strengths: string[];
      weaknesses: string[];
      opportunities: string[];
      threats: string[];
    };
    options: string[];
  }) {
    const promptData = {
      title: data.title,
      description: data.description,
      problemStatement: data.problemStatement,
      desiredOutcome: data.desiredOutcome,
      constraints: data.constraints,
      successMetrics: data.successMetrics,
      budgetLimit: data.budgetLimit,
      teamSize: data.teamSize,
      deadline: data.deadline,
      thoughts: data.thoughts,
      swot: data.swot || { strengths: [], weaknesses: [], opportunities: [], threats: [] },
      options: data.options || []
    };

    const prompt = PromptTemplates.DEEP_DECISION(promptData);
    const aiResponse = await this.callGemini(prompt, undefined, userId, 'deep_decision');
    
    try {
      const parsed = JSON.parse(aiResponse);
      const decisionAnalysis = parsed.decisionAnalysis || {};
      
      return {
        recommendation: parsed.recommendation || "",
        confidence: parsed.confidence || 0,
        decisionAnalysis: decisionAnalysis.summary || "",
        risks: (decisionAnalysis.risks || []).map((r: any) => r.risk || ""),
        opportunities: (decisionAnalysis.pros || []).map((p: any) => p || ""),
        successFactors: (decisionAnalysis.cons || []).map((c: any) => c || ""),
        options: [],
        keyQuestions: parsed.keyQuestions || [],
        nextSteps: parsed.nextSteps || []
      };
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      return {
        recommendation: "",
        decisionAnalysis: "",
        confidence: 0,
        risks: [],
        opportunities: [],
        successFactors: [],
        options: [],
        keyQuestions: [],
        nextSteps: []
      };
    }
  }

  // ==================== STRATEGIC FORECASTING ====================
  
  async getStrategicForecast(userId: string) {
    const [decisions, tasks, financials, okrs] = await Promise.all([
      prisma.decision.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.task.findMany({ where: { project: { userId } } }),
      prisma.financialRecord.findMany({ where: { userId }, take: 50 }),
      prisma.oKR.findMany({ where: { userId } })
    ]);
    
    const completedDecisions = decisions.filter(d => d.status === 'DECIDED').length;
    const completedTasks = tasks.filter(t => t.status === 'DONE').length;
    const totalRevenue = financials.filter(f => f.type === 'INCOME').reduce((s, f) => s + f.amount, 0);
    
    const prompt = `Generate a strategic forecast based on:
    - Decision completion: ${decisions.length ? Math.round(completedDecisions/decisions.length*100) : 0}%
    - Task completion: ${tasks.length ? Math.round(completedTasks/tasks.length*100) : 0}%
    - Revenue trend: $${(totalRevenue/1000).toFixed(1)}K
    - Active OKRs: ${okrs.length}
    
    Return JSON with: quarter, predictions (revenue, customerSatisfaction, teamGrowth), risks (3 items), recommendations (3 items).`;
    
    const aiResponse = await this.callGemini(prompt, undefined, userId, 'strategic_forecast');
    
    try {
      const parsed = JSON.parse(aiResponse);
      return {
        quarter: `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`,
        predictions: parsed.predictions || {
          revenue: { growth: "+12%", confidence: "Medium-High" },
          customerSatisfaction: { target: 4.5, current: 4.2 },
          teamGrowth: { target: 15, current: 8 }
        },
        risks: parsed.risks || [
          { name: "Market competition", probability: 65, impact: "Medium" },
          { name: "Resource constraints", probability: 45, impact: "High" }
        ],
        recommendations: parsed.recommendations || [
          "Accelerate key hiring for critical roles",
          "Increase customer success resources",
          "Build competitive moat through innovation"
        ]
      };
    } catch {
      return {
        quarter: `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`,
        predictions: { revenue: { growth: "+12%", confidence: "Medium" }, customerSatisfaction: { target: 4.5, current: 4.2 }, teamGrowth: { target: 15, current: 8 } },
        risks: [{ name: "Market conditions", probability: 50, impact: "Medium" }],
        recommendations: ["Monitor market trends", "Build strategic reserves", "Strengthen customer relationships"]
      };
    }
  }

  async generateInsights(userId: string, type?: string, timeframe?: string) {
    const [decisions, tasks, calendarEvents] = await Promise.all([
      prisma.decision.findMany({ where: { userId }, take: 20, orderBy: { createdAt: 'desc' } }),
      prisma.task.findMany({ where: { project: { userId } }, take: 20 }),
      prisma.calendarEvent.findMany({ where: { userId, startTime: { gte: new Date() } }, take: 20 })
    ]);
    
    const prompt = `Generate business insights based on:
    - Type: ${type || 'general'}, Timeframe: ${timeframe || 'last_30_days'}
    - Decisions: ${decisions.length}, Tasks: ${tasks.length}, Upcoming meetings: ${calendarEvents.length}
    
    Return JSON with: insights (array of objects with category, finding, recommendation), actionItems (array), confidence (0-100).`;
    
    const aiResponse = await this.callGemini(prompt, undefined, userId, 'generate_insights');
    
    try {
      const parsed = JSON.parse(aiResponse);
      return {
        type: type || 'general',
        timeframe: timeframe || 'last_30_days',
        insights: parsed.insights || [
          { category: "Decision Velocity", finding: "Decision-making speed is above average", recommendation: "Maintain current momentum" },
          { category: "Resource Allocation", finding: "Team capacity is well-utilized", recommendation: "Consider strategic hiring for Q4" }
        ],
        actionItems: parsed.actionItems || ["Review pending high-priority items", "Schedule strategic review", "Update quarterly goals"],
        confidence: parsed.confidence || 85,
        generatedAt: new Date().toISOString()
      };
    } catch {
      return {
        type: type || 'general',
        timeframe: timeframe || 'last_30_days',
        insights: [{ category: "Performance", finding: "Key metrics are on track", recommendation: "Continue current strategy" }],
        actionItems: ["Review performance data", "Adjust as needed"],
        confidence: 80,
        generatedAt: new Date().toISOString()
      };
    }
  }

  // ==================== RISK & OPPORTUNITY ====================
  
  async detectRisks(userId: string) {
    const [decisions, tasks, financials, integrationSnapshots] = await Promise.all([
      prisma.decision.findMany({ where: { userId, status: 'PENDING', deadline: { lt: new Date() } } }),
      prisma.task.findMany({ where: { project: { userId }, dueDate: { lt: new Date() }, status: { not: 'DONE' } } }),
      prisma.financialRecord.findMany({ where: { userId, type: 'EXPENSE' }, orderBy: { date: 'desc' }, take: 30 }),
      fetchAllProviderSnapshots(userId).catch(() => []),
    ]);
    
    const recentExpenses = financials.reduce((s, f) => s + f.amount, 0);
    const integrationContext = buildIntegrationContext(integrationSnapshots);
    
    const prompt = `Identify business risks based on:
    - Overdue decisions: ${decisions.length}
    - Overdue tasks: ${tasks.length}
    - Expense trend: $${(recentExpenses/1000).toFixed(1)}K (last 30 days)
    
    ${integrationContext}
    
    Use the integration data above to identify additional risks (e.g. overdue Jira issues, stalled Asana projects, Stripe payment failures, etc.).
    Return JSON with: risks (array with name, severity, probability, mitigation), overallRiskScore (0-100), recommendations (3 items).`;
    
    const aiResponse = await this.callGemini(prompt, undefined, userId, 'detect_risks');
    
    try {
      const parsed = JSON.parse(aiResponse);
      return {
        risks: parsed.risks || [
          { name: "Decision Backlog", severity: decisions.length > 5 ? "High" : "Medium", probability: decisions.length > 5 ? 70 : 40, mitigation: "Schedule decision review sessions" },
          { name: "Task Delays", severity: tasks.length > 10 ? "High" : "Medium", probability: 60, mitigation: "Reallocate resources and reprioritize" }
        ],
        overallRiskScore: parsed.overallRiskScore || (decisions.length > 5 ? 65 : 45),
        recommendations: parsed.recommendations || [
          "Address overdue decisions within 48 hours",
          "Review task allocation and deadlines",
          "Implement expense monitoring system"
        ]
      };
    } catch {
      return {
        risks: [
          { name: "Decision Backlog", severity: decisions.length > 5 ? "High" : "Medium", probability: 60, mitigation: "Prioritize pending decisions" },
          { name: "Task Delays", severity: tasks.length > 10 ? "High" : "Medium", probability: 55, mitigation: "Review resource allocation" }
        ],
        overallRiskScore: 50,
        recommendations: ["Review pending items", "Adjust timelines", "Monitor progress"]
      };
    }
  }

  async discoverOpportunities(userId: string) {
    const [decisions, okrs, stakeholders, integrationSnapshots] = await Promise.all([
      prisma.decision.findMany({ where: { userId, status: 'DECIDED' }, orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.oKR.findMany({ where: { userId } }),
      prisma.stakeholder.findMany({ where: { userId } }),
      fetchAllProviderSnapshots(userId).catch(() => []),
    ]);
    const integrationContext = buildIntegrationContext(integrationSnapshots);
    
    const prompt = `Identify business opportunities based on:
    - Recent decisions: ${decisions.length}
    - Active OKRs: ${okrs.length}
    - Stakeholders: ${stakeholders.length}
    
    ${integrationContext}
    
    Use the integration data above to surface real opportunities (e.g. open HubSpot deals, GitHub repos ready to ship, Stripe revenue trends, etc.).
    Return JSON with: opportunities (array with name, potential, effort, timeline), totalValue, recommendations (3 items).`;
    
    const aiResponse = await this.callGemini(prompt, undefined, userId, 'discover_opportunities');
    
    try {
      const parsed = JSON.parse(aiResponse);
      return {
        opportunities: parsed.opportunities || [
          { name: "Market Expansion", potential: "High", effort: "Medium", timeline: "Q4 2026" },
          { name: "Strategic Partnerships", potential: "Medium", effort: "Low", timeline: "Q3 2026" }
        ],
        totalValue: parsed.totalValue || "$1.2M - $2.5M",
        recommendations: parsed.recommendations || [
          "Prioritize high-potential, low-effort opportunities first",
          "Allocate resources to market expansion"
        ]
      };
    } catch {
      return {
        opportunities: [
          { name: "Market Growth", potential: "High", effort: "Medium", timeline: "Next Quarter" },
          { name: "Process Optimization", potential: "Medium", effort: "Low", timeline: "Current Quarter" }
        ],
        totalValue: "$1M+",
        recommendations: ["Evaluate top opportunities", "Allocate resources", "Track progress"]
      };
    }
  }

  // ==================== MEETING & NOTE INTELLIGENCE ====================
  
  async summarizeMeeting(userId: string, meetingId?: string, transcript?: string) {
    const prompt = `Summarize this meeting transcript or generate a template summary:
    ${transcript || 'Generate a professional meeting summary template for an executive strategy session.'}
    
    Return JSON with: summary, keyDecisions (array), actionItems (array with item, owner, dueDate), nextSteps.`;
    
    const aiResponse = await this.callGemini(prompt, undefined, userId, 'summarize_meeting');
    
    try {
      const parsed = JSON.parse(aiResponse);
      return {
        summary: parsed.summary || "Strategic session focused on Q3 priorities and resource allocation.",
        keyDecisions: parsed.keyDecisions || [
          "Increase marketing budget by 15%",
          "Launch new feature in August",
          "Hire two senior engineers"
        ],
        actionItems: parsed.actionItems || [
          { item: "Prepare budget proposal", owner: "CFO", dueDate: "2026-06-01" },
          { item: "Update product roadmap", owner: "CPO", dueDate: "2026-05-28" }
        ],
        nextSteps: parsed.nextSteps || "Schedule follow-up in two weeks to track progress.",
        meetingId,
        summarizedAt: new Date().toISOString()
      };
    } catch {
      return {
        summary: "Meeting covered strategic priorities and resource planning.",
        keyDecisions: ["Approve Q3 budget", "Launch new initiative"],
        actionItems: [{ item: "Follow up on action items", owner: "Team", dueDate: new Date().toISOString() }],
        nextSteps: "Schedule next meeting",
        meetingId,
        summarizedAt: new Date().toISOString()
      };
    }
  }

  async summarizeNote(userId: string, content: string, title?: string) {
    const prompt = `Summarize this note and extract key information:
    Title: ${title || 'Untitled'}
    Content: ${content.substring(0, 3000)}${content.length > 3000 ? '...' : ''}
    
    Return JSON with: summary, keyPoints (array), suggestedTags (array), actionItems (array).`;
    
    const aiResponse = await this.callGemini(prompt, undefined, userId, 'summarize_note');
    
    try {
      const parsed = JSON.parse(aiResponse);
      return {
        originalTitle: title || 'Untitled Note',
        summary: parsed.summary || content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        keyPoints: parsed.keyPoints || [
          "Extract key decisions from this note",
          "Identify action items and owners",
          "Flag deadlines and dependencies"
        ],
        suggestedTags: parsed.suggestedTags || ["important", "review", "action-needed"],
        actionItems: parsed.actionItems || [],
        fullContent: content,
        summarizedAt: new Date().toISOString()
      };
    } catch {
      return {
        originalTitle: title || 'Untitled Note',
        summary: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        keyPoints: ["Review content for key insights"],
        suggestedTags: ["note"],
        actionItems: [],
        fullContent: content,
        summarizedAt: new Date().toISOString()
      };
    }
  }

  // ==================== AI CO-PILOT ====================
  
  async copilotChat(userId: string, message: string, conversationId?: string) {
    const [decisions, tasks, events, integrationSnapshots] = await Promise.all([
      prisma.decision.count({ where: { userId, status: 'PENDING' } }),
      prisma.task.count({ where: { project: { userId }, status: { not: 'DONE' } } }),
      prisma.calendarEvent.count({ where: { userId, startTime: { gte: new Date() } } }),
      fetchAllProviderSnapshots(userId).catch(() => []),
    ]);
    const integrationContext = buildIntegrationContext(integrationSnapshots);
    
    const systemContext = `You are the CEO's AI Executive Assistant. Current context:
    - Pending decisions: ${decisions}
    - Pending tasks: ${tasks}
    - Upcoming meetings: ${events}
    
    ${integrationContext}
    
    Use the integration data above to give specific, data-driven recommendations. Be concise, professional, and action-oriented.`;
    
    const response = await this.callGemini(message, systemContext, userId, 'copilot_chat');
    
    return {
      message: response,
      conversationId: conversationId || `conv_${Date.now()}`,
      timestamp: new Date().toISOString(),
      context: { pendingDecisions: decisions, pendingTasks: tasks, upcomingMeetings: events },
      suggestions: [
        "What are my top priorities today?",
        "Analyze my recent decisions",
        "Identify business risks",
        "Generate weekly performance report"
      ]
    };
  }

  // ==================== REPORTS & RECOMMENDATIONS ====================
  
  async generateReport(userId: string, reportType: string, dateRange?: { start: Date; end: Date }, format?: string) {
    const start = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = dateRange?.end || new Date();
    
    const [decisions, tasks, financials, calendarEvents] = await Promise.all([
      prisma.decision.findMany({ where: { userId, createdAt: { gte: start, lte: end } } }),
      prisma.task.findMany({ where: { project: { userId }, createdAt: { gte: start, lte: end } } }),
      prisma.financialRecord.findMany({ where: { userId, date: { gte: start, lte: end } } }),
      prisma.calendarEvent.findMany({ where: { userId, startTime: { gte: start, lte: end } } })
    ]);
    
    const completedDecisions = decisions.filter(d => d.status === 'DECIDED').length;
    const completedTasks = tasks.filter(t => t.status === 'DONE').length;
    const totalRevenue = financials.filter(f => f.type === 'INCOME').reduce((s, f) => s + f.amount, 0);
    const totalExpenses = financials.filter(f => f.type === 'EXPENSE').reduce((s, f) => s + f.amount, 0);
    
    const prompt = `Generate a ${reportType} report with these metrics:
    - Period: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}
    - Decisions: ${decisions.length} total, ${completedDecisions} completed
    - Tasks: ${tasks.length} total, ${completedTasks} completed
    - Financial: Revenue $${(totalRevenue/1000).toFixed(1)}K, Expenses $${(totalExpenses/1000).toFixed(1)}K
    - Meetings: ${calendarEvents.length}
    
    Return comprehensive report content in a professional executive format.`;
    
    const aiResponse = await this.callGemini(prompt, undefined, userId, 'generate_report');
    
    return {
      reportType,
      generatedAt: new Date().toISOString(),
      dateRange: { start, end },
      format: format || 'json',
      summary: aiResponse.substring(0, 500),
      metrics: {
        decisions: { total: decisions.length, completed: completedDecisions, completionRate: decisions.length ? Math.round(completedDecisions/decisions.length*100) : 0 },
        tasks: { total: tasks.length, completed: completedTasks, completionRate: tasks.length ? Math.round(completedTasks/tasks.length*100) : 0 },
        financial: { revenue: totalRevenue, expenses: totalExpenses, profit: totalRevenue - totalExpenses, margin: totalRevenue ? Math.round(((totalRevenue - totalExpenses)/totalRevenue)*100) : 0 },
        meetings: calendarEvents.length
      },
      fullReport: aiResponse
    };
  }

  async getAIRecommendations(userId: string) {
    const [decisions, tasks, calendarEvents] = await Promise.all([
      prisma.decision.findMany({ where: { userId, status: 'PENDING' }, orderBy: { priority: 'desc' }, take: 5 }),
      prisma.task.findMany({ where: { project: { userId }, status: { not: 'DONE' } }, orderBy: { priority: 'desc' }, take: 5 }),
      prisma.calendarEvent.findMany({ where: { userId, startTime: { gte: new Date() } }, orderBy: { startTime: 'asc' }, take: 5 })
    ]);
    
    const prompt = `Based on this executive data, provide actionable recommendations:
    - Top pending decisions: ${decisions.map(d => d.title).join(', ')}
    - Top pending tasks: ${tasks.map(t => t.title).join(', ')}
    - Upcoming meetings: ${calendarEvents.map(e => e.title).join(', ')}
    
    Return JSON with: priority (array), quickWins (array), longTerm (array), personalized (string).`;
    
    const aiResponse = await this.callGemini(prompt, undefined, userId, 'recommendations');
    
    try {
      const parsed = JSON.parse(aiResponse);
      return {
        priority: parsed.priority || [
          "Review and decide on high-impact pending decisions",
          "Clear critical path tasks blocking progress",
          "Prepare for key upcoming meetings"
        ],
        quickWins: parsed.quickWins || [
          "Delegate low-priority tasks to team members",
          "Block 2 hours for focused strategic work",
          "Follow up on pending stakeholder requests"
        ],
        longTerm: parsed.longTerm || [
          "Develop quarterly OKRs aligned with strategic goals",
          "Build succession plan for key roles"
        ],
        personalized: parsed.personalized || "Based on your recent activity, focus on clearing pending decisions before end of week."
      };
    } catch {
      return {
        priority: ["Complete pending high-priority decisions", "Address overdue tasks"],
        quickWins: ["Block focus time", "Delegate routine tasks"],
        longTerm: ["Strategic planning", "Team development"],
        personalized: "Prioritize strategic decisions this week."
      };
    }
  }

  // ==================== INTEGRATION DATA ANALYSIS ====================
  
  async analyzeIntegrationData(userId: string, _userToken?: string) {
    const cacheKey = `integration_analysis_${userId}`;
    const cached = this.getCached(cacheKey);
    if (cached) {
      console.log('📦 Cache hit for integration analysis');
      return cached;
    }

    try {
      const snapshots = await fetchAllProviderSnapshots(userId).catch(() => []);
      
      if (!snapshots.length || snapshots.every(s => !s.totalRecords)) {
        return {
          message: "No integration data available. Connect integrations to get AI-powered insights.",
          hasData: false
        };
      }

      const dataSummary = snapshots.map(s => ({
        source: s.provider,
        dataTypes: Object.keys(s.data).join(', '),
        recordCount: s.totalRecords,
        lastSync: s.lastSync,
      }));

      const integrationContext = buildIntegrationContext(snapshots);

      const prompt = `Analyze this business data from integrated systems:
      ${JSON.stringify(dataSummary, null, 2)}
      
      ${integrationContext}
      
      Provide insights on:
      1. What business intelligence can be derived from these integrations
      2. Key metrics and trends that should be monitored
      3. Recommendations for leveraging this data for better decision-making
      4. Any data gaps or additional integrations that would be valuable
      
      Return JSON with: summary, insights (array), recommendations (array), dataQuality (object with completeness, freshness, diversity scores 0-100).`;

      const aiResponse = await this.callGemini(prompt, undefined, userId, 'integration_analysis');
      
      try {
        const parsed = JSON.parse(aiResponse);
        const result = {
          hasData: true,
          summary: parsed.summary || "Integration data analysis complete",
          insights: parsed.insights || ["Data from connected integrations is being processed"],
          recommendations: parsed.recommendations || ["Connect more integrations for comprehensive insights"],
          dataQuality: parsed.dataQuality || { completeness: 75, freshness: 80, diversity: 60 },
          connectedSystems: dataSummary,
          analyzedAt: new Date().toISOString()
        };
        this.setCache(cacheKey, result);
        return result;
      } catch {
        const result = {
          hasData: true,
          summary: "Integration data analysis complete",
          insights: ["Data from connected integrations is being processed"],
          recommendations: ["Connect more integrations for comprehensive insights"],
          dataQuality: { completeness: 75, freshness: 80, diversity: 60 },
          connectedSystems: dataSummary,
          analyzedAt: new Date().toISOString()
        };
        this.setCache(cacheKey, result);
        return result;
      }
    } catch (error) {
      console.error('Integration data analysis failed:', error);
      return {
        hasData: false,
        message: "Unable to analyze integration data. Please try again later.",
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==================== CACHE CLEARING ====================
   
  clearUserCache(userId: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🧹 Cleared cache for user ${userId}: ${keysToDelete.length} entries`);
  }

  clearAllCache(): void {
    this.cache.clear();
    console.log('🧹 Cleared all cache');
  }
}

// ==================== EXPORT ====================

const aiService = new AIService();
export default aiService;