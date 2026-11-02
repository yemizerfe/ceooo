// server/services/ai/integrations/integration-analysis.service.ts
// ================================
// Integration data analysis for AI insights.
// Reads every connected provider (live API, last persisted sync, or CSV import)
// and prepares a compact, data-bounded context for AI prompts.
// ================================

import {
  fetchAllProviderSnapshots as loadProviderSnapshots,
  buildIntegrationContext as buildContext,
  type ProviderSnapshot,
} from '../../integrationSnapshot.service.js';

export type { ProviderSnapshot };

/** Fetch integration snapshots for a user (never throws). */
export async function fetchAllProviderSnapshots(userId: string): Promise<ProviderSnapshot[]> {
  try {
    return await loadProviderSnapshots(userId);
  } catch (error) {
    console.error('Failed to fetch integration snapshots:', error);
    return [];
  }
}

/** Compact prompt block describing external business data. */
export function buildIntegrationContext(snapshots: ProviderSnapshot[]): string {
  return buildContext(snapshots || []);
}

/** Analyze Integration Data with the configured AI provider. */
export async function analyzeIntegrationData(userId: string): Promise<any> {
  try {
    const snapshots = await fetchAllProviderSnapshots(userId);
    const hasRecords = snapshots.some((snap) => snap.totalRecords > 0);

    if (!hasRecords) {
      return {
        success: true,
        data: {
          hasData: false,
          message:
            'No integration data available yet. Connect a business tool or import a CSV/Excel file to get AI-powered insights.',
          recommendations: [
            'Connect CRM (Salesforce, HubSpot, Zoho) for customer and pipeline analytics',
            'Connect accounting tools (QuickBooks, Stripe) for financial health analysis',
            'Connect project tools (Jira, Asana, Trello, Monday) for delivery insights',
          ],
        },
      };
    }

    const { callGemini } = await import('../call-gemini.service.js');
    const context = buildIntegrationContext(snapshots);
    const summary = snapshots.map((snap) => ({
      provider: snap.provider,
      account: snap.accountName,
      records: snap.totalRecords,
      datasets: Object.keys(snap.data).map((key) => `${key}:${snap.data[key].length}`),
      lastSync: snap.lastSync,
      errors: snap.errors,
    }));

    const response = await callGemini(
      `Analyze this company data from external systems.\n\n` +
        `SOURCE SUMMARY:\n${JSON.stringify(summary, null, 2)}\n\n` +
        `${context}\n\n` +
        `Provide concrete, data-bounded insights. Do not invent numbers. ` +
        `Return JSON: { "summary": string, "insights": string[], "recommendations": string[], "risks": string[], "dataQuality": { "completeness": number, "freshness": number, "diversity": number } }`,
      'You are a business intelligence analyst. Use only the provided integration data.',
      userId,
      'integration_analysis',
    );

    let parsed: any = null;
    try {
      const match = response.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch {
      /* fall through */
    }

    return {
      success: true,
      data: parsed || { summary: response },
    };
  } catch (error) {
    console.error('Integration data analysis error:', error);
    return {
      success: false,
      data: { error: 'Failed to analyze integration data' },
    };
  }
}
