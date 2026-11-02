// store/integrationOverviewStore.ts
// Shared, read-only view of everything synced from connected integrations.

import { create } from 'zustand';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5010';

export interface ExternalProject {
  id: string;
  name: string;
  source: string;
  sourceName: string;
  sourceIcon: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  rawStatus: string | null;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  progress: number;
  taskCount: number;
  completedTaskCount: number;
  startDate?: string;
  deadline?: string;
  url?: string;
  description?: string;
  workspace?: string;
  kind: 'external';
}

export interface ExternalTask {
  id: string;
  title: string;
  source: string;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  rawStatus: string | null;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  assignedTo?: string;
  dueDate?: string;
  project?: string;
  url?: string;
}

export interface ExternalStakeholder {
  id: string;
  name: string;
  source: string;
  sourceName: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  type: string;
  notes?: string;
}

export interface ExternalDeal {
  id: string;
  name: string;
  source: string;
  amount: number;
  stage: string | null;
  closeDate?: string;
}

export interface ExternalFinancial {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  currency: string;
  category: string;
  description?: string;
  date: string;
  status?: string;
  source: string;
  sourceName: string;
}

export interface ExternalEvent {
  id: string;
  title: string;
  source: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location?: string;
  meetingLink?: string;
  url?: string;
  status: string;
}

export interface ExternalNote {
  id: string;
  title: string;
  source: string;
  sourceName: string;
  url?: string;
  updatedAt?: string;
  kind: 'page' | 'file' | 'record';
}

export interface IntegrationProviderStatus {
  id: string;
  name: string;
  icon: string;
  accountName: string | null;
  lastSync: string | null;
  source: string;
  records: number;
  datasets: Record<string, number>;
  errors: Record<string, string>;
}

export interface IntegrationOverview {
  providers: IntegrationProviderStatus[];
  projects: ExternalProject[];
  tasks: ExternalTask[];
  stakeholders: ExternalStakeholder[];
  deals: ExternalDeal[];
  financials: ExternalFinancial[];
  events: ExternalEvent[];
  notes: ExternalNote[];
  totals: Record<string, number>;
  generatedAt: string;
}

interface IntegrationOverviewState {
  overview: IntegrationOverview | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: number;
  fetchOverview: (force?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

const CACHE_MS = 60_000;

export const useIntegrationOverviewStore = create<IntegrationOverviewState>((set, get) => ({
  overview: null,
  isLoading: false,
  error: null,
  lastFetched: 0,

  fetchOverview: async (force = false) => {
    const { overview, lastFetched, isLoading } = get();
    if (!force && overview && Date.now() - lastFetched < CACHE_MS) return;
    if (isLoading) return;

    set({ isLoading: true, error: null });
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        set({ isLoading: false });
        return;
      }
      const res = await fetch(`${API_URL}/api/integrations/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load integration data');
      set({ overview: data.data, isLoading: false, lastFetched: Date.now() });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load integration data',
        isLoading: false,
      });
    }
  },

  refresh: async () => {
    await get().fetchOverview(true);
  },
}));
