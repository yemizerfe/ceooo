import { create } from 'zustand';
import { useAuthStore } from "@/store/authStore";
import { isAdminPath, isPlatformAdmin } from "@/lib/authRouting";

function canUseExecutiveWorkspace(): boolean {
  if (typeof window === "undefined" || isAdminPath()) return false;
  const user = useAuthStore.getState().user;
  return Boolean(user) && !isPlatformAdmin(user);
}

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  type: 'OPPORTUNITY' | 'RISK' | 'ALERT' | 'FORECAST' | 'RECOMMENDATION';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  isRead: boolean;
  isActioned: boolean;
  metadata: Record<string, any>;
  createdAt: string;
  expiresAt?: string;
}

export interface DailyBrief {
  summary: string;
  criticalRisk: string;
  keyOpportunity: string;
  recommendedAction: string;
}

interface AIInsightState {
  insights: AIInsight[];
  dailyBrief: DailyBrief | null;
  isLoading: boolean;
  error: string | null;
  fetchInsights: () => Promise<void>;
  generateInsights: () => Promise<void>;
  markInsightRead: (id: string) => Promise<void>;
  fetchDailyBrief: () => Promise<void>;
  analyzeDecision: (title: string, description: string, context?: string, decisionId?: string) => Promise<any>;
  analyzeDecisionDeep: (data: {
    title?: string;
    description?: string;
    deadline?: string;
    strengths?: string[];
    weaknesses?: string[];
    notes?: string;
    problemStatement?: string;
    desiredOutcome?: string;
    constraints?: string;
    successMetrics?: string;
    budgetLimit?: string;
    teamSize?: string;
    thoughts?: string;
    swot?: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
    options?: string[];
    decisionId?: string;
  }) => Promise<any>;
  clearError: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5010';
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

/**
 * Collapse duplicate insights. The server also de-duplicates by fingerprint,
 * but the client guards against repeated rows arriving from a stale feed or a
 * concurrent generation request.
 */
const dedupeInsights = (rows: AIInsight[]): AIInsight[] => {
  const seen = new Set<string>();
  const out: AIInsight[] = [];
  for (const row of rows) {
    const fingerprint = (row.metadata as Record<string, any> | undefined)?.fingerprint;
    const key = typeof fingerprint === 'string' && fingerprint
      ? `fp:${fingerprint}`
      : `${row.type}:${row.title.trim().toLowerCase().replace(/\s+/g, ' ')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
};

export const useAIInsightStore = create<AIInsightState>((set) => ({
  insights: [],
  dailyBrief: null,
  isLoading: false,
  error: null,

  fetchInsights: async () => {
    if (!canUseExecutiveWorkspace()) {
      set({ insights: [], isLoading: false, error: null });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/ai/insights`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) set({ insights: dedupeInsights(data.data || []) });
      else throw new Error(data.message);
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ isLoading: false });
    }
  },

  generateInsights: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/ai/generate-insights`, {
        method: 'POST', headers: authHeaders(),
      });
      const data = await res.json();
      // The endpoint returns the full refreshed feed (including previously
      // generated insights), so replace instead of appending — appending is
      // what produced duplicate cards on the AI Insights page.
      if (data.success) set({ insights: dedupeInsights(data.data || []) });
      else throw new Error(data.message);
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ isLoading: false });
    }
  },

  markInsightRead: async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/ai/insights/${id}/read`, {
        method: 'PATCH', headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        set((s) => ({
          insights: s.insights.map((i) => i.id === id ? { ...i, isRead: true } : i),
        }));
      }
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchDailyBrief: async () => {
    if (!canUseExecutiveWorkspace()) {
      set({ dailyBrief: null, isLoading: false, error: null });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/ai/daily-brief`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) set({ dailyBrief: data.data });
      else throw new Error(data.message);
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ isLoading: false });
    }
  },

  analyzeDecision: async (title, description, context, decisionId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/ai/analyze-decision`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ title, description, context, decisionId }),
      });
      const data = await res.json();
      if (data.success) return data.data;
      else throw new Error(data.message);
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  analyzeDecisionDeep: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/ai/analyze-decision-deep`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data),
      });
      const data2 = await res.json();
      if (data2.success) return data2.data;
      else throw new Error(data2.message);
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
