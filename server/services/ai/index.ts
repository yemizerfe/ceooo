// server/services/ai/index.ts
// ================================
// Central AI service module.
// Exports all AI functionality through a single point of entry so that other
// modules (controllers, routes, etc.) can `import aiService from './services/ai'`
// without needing to know which sub-module contains each function.
// ================================

// ---- Configuration (re-exported for env-typed access) ----
export {
  GEMINI_API_KEY,
  AI_TIMEOUT,
  AI_CACHE_TTL,
  AI_MAX_RETRIES,
  AI_ENABLE_ANALYTICS,
} from './config.js';

// ---- Core AI operations ----
export {
  callGemini,
  getCached,
  setCache,
  clearCache,
} from './call-gemini.service.js';

// ---- Executive dashboard functions ----
export { getExecutiveSummary } from './executives/executive-summary.service.js';
export {
  getCompanyPulse,
  getBusinessHealth,
  getDailyBrief,
} from './executives/company-metrics.service.js';

export { getStrategicForecast } from './executives/strategic-forecast.service.js';
export {
  generateInsights,
  detectRisks,
  discoverOpportunities,
} from './executives/executive-forecast.service.js';

// ---- Decision intelligence ----
export {
  analyzeDecision,
  analyzeDecisionDeep,
} from './decisions/decision-analysis.service.js';

// ---- Insight management ----
export {
  listInsights,
  markInsightRead,
} from './insights/insight-management.service.js';

// ---- Copilot chat ----
export {
  copilotChat,
  copilotSummarize,
} from './copilot/copilot-chat.service.js';

// ---- Report generation ----
export {
  generateReport,
  getAIRecommendations,
} from './reports/report-generation.service.js';

// ---- Integration data analysis ----
export {
  analyzeIntegrationData,
  buildIntegrationContext,
  fetchAllProviderSnapshots,
} from './integrations/integration-analysis.service.js';

// ---- Note summarization ----
export {
  summarizeNote,
  summarizeMeeting,
} from './notifications/note-summarization.service.js';

// ---- Prompt templates (re-exported for reference) ----
export { PromptTemplates } from '../prompts.js';
