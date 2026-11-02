import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/admin.middleware.js';
import {
  getExecutiveSummary,
  getCompanyPulse,
  getBusinessHealth,
  getDailyBrief,
  getDecisionIntelligence,
  listInsights,
  markInsightRead,
  analyzeDecision,
  analyzeDecisionDeep,
  getStrategicForecast,
  generateInsights,
  detectRisks,
  discoverOpportunities,
  summarizeMeeting,
  summarizeNote,
  copilotChat,
  generateReport,
  getAIRecommendations,
  analyzeIntegrationData,
  getCompanyContextHandler,
  getAISupervisor,
  assistNote
} from '../controllers/ai.controller.js';

const router = express.Router();

// ============ PUBLIC TEST ROUTES (No auth for testing) ============
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'AI routes are working!' });
});

// Public support chat endpoint
router.post('/support-chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const lowerMessage = message.toLowerCase();
    let response = '';

    if (lowerMessage.includes('getting started') || lowerMessage.includes('start')) {
      response = "Getting started with CEOOO is easy! Sign up for a free trial, complete the 5-minute onboarding, connect your calendar and email, and you're ready to go. You can access your dashboard at /dashboard after signing in.";
    } else if (lowerMessage.includes('accurate') || lowerMessage.includes('accuracy')) {
      response = "Our AI provides data-driven insights based on your business data. The accuracy improves as you add more data (decisions, projects, financials, etc.) to your workspace.";
    } else if (lowerMessage.includes('integrate') || lowerMessage.includes('tools')) {
      response = "CEOOO has an Integrations page where you can connect various tools. Go to Dashboard > Integrations to see available integrations and connect them to sync data into your workspace.";
    } else if (lowerMessage.includes('pricing') || lowerMessage.includes('cost')) {
      response = "We offer flexible plans. Check out our Pricing page for current plans and features. All plans include core features like decision tracking, AI insights, and project management.";
    } else if (lowerMessage.includes('team') || lowerMessage.includes('invite')) {
      response = "You can manage team members from your dashboard. Go to Dashboard > Team to invite members and assign roles. Team management is available based on your plan.";
    } else if (lowerMessage.includes('security') || lowerMessage.includes('data')) {
      response = "Security is a top priority. We use industry-standard encryption, secure authentication, and role-based access controls. Your data is stored securely and only accessible to authorized users in your workspace.";
    } else if (lowerMessage.includes('decision')) {
      response = "The Decisions module helps you track, analyze, and manage important business decisions. You can create decisions, add context, get AI analysis, and track outcomes over time.";
    } else if (lowerMessage.includes('ai') || lowerMessage.includes('insight')) {
      response = "AI Insights analyzes your workspace data to provide actionable recommendations. It looks at your decisions, projects, financials, and other data to surface risks and opportunities.";
    } else {
      response = "Thank you for your question about CEOOO! CEOOO is an executive decision-making platform that helps CEOs track decisions, manage projects, monitor financials, and get AI-powered insights. For specific questions about features or setup, feel free to ask more details or check our Documentation page.";
    }

    res.status(200).json({
      success: true,
      data: {
        message: response,
        type: 'ai'
      }
    });
  } catch (error) {
    console.error('Support chat error:', error);
    res.status(500).json({ success: false, message: 'Failed to process message' });
  }
});

// ============ PROTECTED ROUTES (Auth required) ============
router.use(authenticate);
router.use(requirePermission('ai.use'));

// Executive Dashboard
router.get('/executive-summary', getExecutiveSummary);
router.get('/company-pulse', getCompanyPulse);
router.get('/business-health', getBusinessHealth);
router.get('/daily-brief', getDailyBrief);

// Decision Intelligence
router.get('/decision-intelligence', getDecisionIntelligence);

// Insight feed (workspace-wide, permission-scoped)
router.get('/insights', listInsights);
router.patch('/insights/:id/read', markInsightRead);
router.post('/analyze-decision', analyzeDecision);
router.post('/analyze-decision-deep', analyzeDecisionDeep);  // THIS IS THE MISSING ROUTE

// Strategic Forecasting
router.get('/strategic-forecast', getStrategicForecast);
router.post('/generate-insights', generateInsights);

// Risk & Opportunity
router.get('/detect-risks', detectRisks);
router.get('/discover-opportunities', discoverOpportunities);

// Meeting & Notes
router.post('/summarize-meeting', summarizeMeeting);
router.post('/summarize-note', summarizeNote);
router.post('/note-assist', assistNote);

// AI Co-pilot
router.post('/copilot', copilotChat);

// Reports
router.post('/generate-report', generateReport);
router.get('/recommendations', getAIRecommendations);

// Integration Data Analysis
router.get('/analyze-integration-data', analyzeIntegrationData);

// Company-wide context + AI supervisor (all pages, all synced/imported data)
router.get('/company-context', getCompanyContextHandler);
router.get('/supervisor', getAISupervisor);

export default router;
