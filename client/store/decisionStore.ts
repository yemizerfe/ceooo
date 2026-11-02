import { debugError } from "@/lib/logger";
// store/decisionStore.ts
import { create } from 'zustand';
import { useAuthStore } from "@/store/authStore";
import { isAdminPath, isPlatformAdmin } from "@/lib/authRouting";

function canUseExecutiveWorkspace(): boolean {
  if (typeof window === "undefined" || isAdminPath()) return false;
  const user = useAuthStore.getState().user;
  return Boolean(user) && !isPlatformAdmin(user);
}

export type DecisionStatus = 'pending' | 'in_progress' | 'in-progress' | 'decided' | 'executing' | 'cancelled';

export interface Decision {
  id: string;
  title: string;
  description?: string;
  status: DecisionStatus;
  priority: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  notes?: string;
  options?: Array<{ id?: string; label?: string; [key: string]: unknown }>;
  selectedOption?: string;
  aiConfidence?: number;
  createdAt: string;
  updatedAt: string;
  decidedAt?: string;
  deadline?: string;
  strengths?: string[];
  weaknesses?: string[];
}

interface DecisionStore {
  decisions: Decision[];
  currentDecisionId: string | null;
  loading: boolean;
  isLoading: boolean;
  error: string | null;
  isHydrated: boolean;
  fetchDecisions: () => Promise<void>;
  fetchDecision: (id: string) => Promise<Decision | null>;
  addDecision: (decision: Partial<Decision>) => Promise<Decision | null>;
  createDecision: (decision: Partial<Decision>) => Promise<Decision | null>;
  updateDecision: (id: string, updates: Partial<Decision>) => Promise<Decision | null>;
  deleteDecision: (id: string) => Promise<void>;
  setCurrentDecision: (id: string | null) => void;
  clearError: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5010';

const normalizeStatus = (status?: string | null): Decision['status'] => {
  const normalized = (status ?? 'pending').toString().trim().toLowerCase().replace(/[-\s]+/g, '_');
  if (normalized === 'in_progress' || normalized === 'in-progress') return 'in_progress';
  if (normalized === 'decided') return 'decided';
  if (normalized === 'executing') return 'executing';
  if (normalized === 'cancelled') return 'cancelled';
  return 'pending';
};

const normalizePriority = (priority?: string | null): Decision['priority'] => {
  const normalized = (priority ?? 'medium').toString().trim().toLowerCase();
  if (normalized === 'high') return 'high';
  if (normalized === 'low') return 'low';
  return 'medium';
};

const normalizeImpact = (impact?: string | null): Decision['impact'] => {
  const normalized = (impact ?? 'medium').toString().trim().toLowerCase();
  if (normalized === 'high') return 'high';
  if (normalized === 'low') return 'low';
  return 'medium';
};

type DecisionOption = { id?: string; label?: string; [key: string]: unknown };
type DecisionRecord = Partial<Decision> & { id?: string; status?: string; priority?: string; impact?: string };

const normalizeDecision = (decision: DecisionRecord): Decision => ({
  id: decision?.id ?? '',
  title: decision?.title ?? 'Untitled decision',
  description: decision?.description ?? '',
  status: normalizeStatus(decision?.status),
  priority: normalizePriority(decision?.priority),
  impact: normalizeImpact(decision?.impact),
  notes: typeof decision?.notes === 'string' ? decision.notes : undefined,
  options: Array.isArray(decision?.options) ? decision.options as DecisionOption[] : [],
  selectedOption: decision?.selectedOption ?? undefined,
  aiConfidence: decision?.aiConfidence ?? undefined,
  createdAt: decision?.createdAt ?? new Date().toISOString(),
  updatedAt: decision?.updatedAt ?? decision?.createdAt ?? new Date().toISOString(),
  decidedAt: decision?.decidedAt ?? undefined,
  deadline: decision?.deadline ?? undefined,
  strengths: (Array.isArray(decision?.strengths) ? decision.strengths : undefined),
  weaknesses: (Array.isArray(decision?.weaknesses) ? decision.weaknesses : undefined),
});

export const useDecisionStore = create<DecisionStore>((set, get) => ({
  decisions: [],
  currentDecisionId: null,
  loading: false,
  isLoading: false,
  error: null,
  isHydrated: false,

  fetchDecisions: async () => {
    if (!canUseExecutiveWorkspace()) {
      set({ decisions: [], loading: false, isLoading: false, isHydrated: true, error: null });
      return;
    }
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      set({ loading: false, isLoading: false, error: 'No authentication token found' });
      return;
    }

    set({ loading: true, isLoading: true, error: null });
    try {

      const response = await fetch(`${API_URL}/api/decisions`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch decisions');
      }

      const data = await response.json();
      const decisions = Array.isArray(data?.data) ? data.data.map(normalizeDecision) : [];

      set((state) => ({
        decisions,
        currentDecisionId: state.currentDecisionId && decisions.some((d: Decision) => d.id === state.currentDecisionId)
          ? state.currentDecisionId
          : decisions[0]?.id ?? null,
        loading: false,
        isLoading: false,
        isHydrated: true,
        error: null,
      }));
    } catch (error) {
      debugError('Fetch decisions error:', error);
      set({ error: (error as Error).message, loading: false, isLoading: false });
    }
  },

  fetchDecision: async (id: string) => {
    set({ loading: true, isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        set({ loading: false, isLoading: false, error: 'No authentication token found' });
        return null;
      }

      const response = await fetch(`${API_URL}/api/decisions/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch decision');

      const data = await response.json();
      const decision: Decision = normalizeDecision(data.data);

      set((state) => {
        const decisions = [...state.decisions];
        const index = decisions.findIndex((d) => d.id === id);
        if (index !== -1) decisions[index] = decision;
        else decisions.push(decision);

        return {
          decisions,
          currentDecisionId: state.currentDecisionId ?? decision.id,
          loading: false,
          isLoading: false,
        };
      });

      return decision;
    } catch (error) {
      debugError('Fetch decision error:', error);
      set({ error: (error as Error).message, loading: false, isLoading: false });
      return null;
    }
  },

  addDecision: async (decision: Partial<Decision>) => {
    set({ loading: true, isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        set({ loading: false, isLoading: false, error: 'No authentication token found' });
        return null;
      }

      const response = await fetch(`${API_URL}/api/decisions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...decision,
          status: (decision.status || 'pending').replace('in-progress', 'in_progress'),
          priority: decision.priority || 'medium',
          impact: decision.impact || 'medium',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create decision');
      }

      const data = await response.json();
      const newDecision: Decision = normalizeDecision(data.data);

      set((state) => ({
        decisions: [newDecision, ...state.decisions],
        currentDecisionId: newDecision.id ?? state.currentDecisionId,
        loading: false,
        isLoading: false,
      }));

      return newDecision;
    } catch (error) {
      debugError('Add decision error:', error);
      set({ error: (error as Error).message, loading: false, isLoading: false });
      return null;
    }
  },

  createDecision: async (decision: Partial<Decision>) => get().addDecision(decision),

  updateDecision: async (id: string, updates: Partial<Decision>) => {
    set({ loading: true, isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        set({ loading: false, isLoading: false, error: 'No authentication token found' });
        return null;
      }

      const payload = {
        ...updates,
        status: updates.status ? updates.status.replace('in-progress', 'in_progress') : updates.status,
      };

      const response = await fetch(`${API_URL}/api/decisions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update decision');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to update decision');
      }

      const updatedDecision: Decision = normalizeDecision(data.data);

      set((state) => ({
        decisions: state.decisions.map((d) => (d.id === id ? updatedDecision : d)),
        currentDecisionId: state.currentDecisionId ?? updatedDecision.id,
        loading: false,
        isLoading: false,
      }));

      return updatedDecision;
    } catch (error) {
      debugError('Update decision error:', error);
      set({ error: (error as Error).message, loading: false, isLoading: false });
      return null;
    }
  },

  deleteDecision: async (id: string) => {
    set({ loading: true, isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        set({ loading: false, isLoading: false, error: 'No authentication token found' });
        return;
      }

      const response = await fetch(`${API_URL}/api/decisions/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to delete decision');

      set((state) => ({
        decisions: state.decisions.filter((d) => d.id !== id),
        currentDecisionId: state.currentDecisionId === id ? null : state.currentDecisionId,
        loading: false,
        isLoading: false,
      }));
    } catch (error) {
      debugError('Delete decision error:', error);
      set({ error: (error as Error).message, loading: false, isLoading: false });
    }
  },

  setCurrentDecision: (id: string | null) => {
    set({ currentDecisionId: id });
  },

  clearError: () => {
    set({ error: null });
  },
}));
