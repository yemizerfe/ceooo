import { debugError } from "@/lib/logger";
// store/stakeholderStore.ts
import { create } from 'zustand';

export interface Stakeholder {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  type: 'INVESTOR' | 'BOARD_MEMBER' | 'PARTNER' | 'CLIENT' | 'ADVISOR' | 'VENDOR' | 'OTHER';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  engagementScore: number;
  notes?: string;
  lastContactAt?: string;
  nextFollowUp?: string;
  createdAt: string;
  updatedAt: string;
  interactions?: any[];
  deals?: any[];
}

export interface StakeholderInsights {
  summary: {
    total: number;
    highEngagement: number;
    mediumEngagement: number;
    lowEngagement: number;
    highPriority: number;
    needFollowUp: number;
    avgEngagementScore: number;
  };
  deals: {
    byStage: {
      negotiation: number;
      pending: number;
      closedWon: number;
      closedLost: number;
    };
    totalValue: number;
    totalDeals: number;
  };
  typeDistribution: {
    INVESTOR: number;
    CLIENT: number;
    PARTNER: number;
    ADVISOR: number;
    BOARD_MEMBER: number;
    VENDOR: number;
    OTHER: number;
  };
  aiInsight: string;
  recommendations: string[];
}

interface StakeholderStore {
  stakeholders: Stakeholder[];
  insights: StakeholderInsights | null;
  upcomingFollowups: Stakeholder[];
  isLoading: boolean;
  error: string | null;
  
  fetchStakeholders: () => Promise<void>;
  fetchInsights: () => Promise<void>;
  fetchUpcomingFollowups: () => Promise<void>;
  createStakeholder: (stakeholder: Partial<Stakeholder>) => Promise<Stakeholder | null>;
  updateStakeholder: (id: string, updates: Partial<Stakeholder>) => Promise<Stakeholder | null>;
  deleteStakeholder: (id: string) => Promise<void>;
  addInteraction: (id: string, interaction: any) => Promise<any>;
  addDeal: (id: string, deal: any) => Promise<any>;
  updateEngagementScores: () => Promise<void>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5010';

export const useStakeholderStore = create<StakeholderStore>((set, get) => ({
  stakeholders: [],
  insights: null,
  upcomingFollowups: [],
  isLoading: false,
  error: null,

  fetchStakeholders: async () => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/stakeholders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch stakeholders');
      
      const data = await response.json();
      set({ stakeholders: data.data || [], isLoading: false });
    } catch (error) {
      debugError('Fetch stakeholders error:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchInsights: async () => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/stakeholders/insights`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch insights');
      
      const data = await response.json();
      set({ insights: data.data, isLoading: false });
    } catch (error) {
      debugError('Fetch insights error:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchUpcomingFollowups: async () => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/stakeholders/followups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch followups');
      
      const data = await response.json();
      set({ upcomingFollowups: data.data || [], isLoading: false });
    } catch (error) {
      debugError('Fetch followups error:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createStakeholder: async (stakeholder: Partial<Stakeholder>) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/stakeholders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(stakeholder)
      });
      
      if (!response.ok) throw new Error('Failed to create stakeholder');
      
      const data = await response.json();
      set(state => ({
        stakeholders: [data.data, ...state.stakeholders],
        isLoading: false
      }));
      
      await get().fetchInsights();
      await get().fetchUpcomingFollowups();
      return data.data;
    } catch (error) {
      debugError('Create stakeholder error:', error);
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  },

  updateStakeholder: async (id: string, updates: Partial<Stakeholder>) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/stakeholders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error('Failed to update stakeholder');
      
      const data = await response.json();
      set(state => ({
        stakeholders: state.stakeholders.map(s => s.id === id ? data.data : s),
        isLoading: false
      }));
      
      await get().fetchInsights();
      await get().fetchUpcomingFollowups();
      return data.data;
    } catch (error) {
      debugError('Update stakeholder error:', error);
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  },

  deleteStakeholder: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/stakeholders/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to delete stakeholder');
      
      set(state => ({
        stakeholders: state.stakeholders.filter(s => s.id !== id),
        isLoading: false
      }));
      
      await get().fetchInsights();
      await get().fetchUpcomingFollowups();
    } catch (error) {
      debugError('Delete stakeholder error:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addInteraction: async (id: string, interaction: any) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/stakeholders/${id}/interactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(interaction)
      });
      
      if (!response.ok) throw new Error('Failed to add interaction');
      
      const data = await response.json();
      await get().fetchStakeholders();
      await get().fetchInsights();
      await get().fetchUpcomingFollowups();
      set({ isLoading: false });
      return data.data;
    } catch (error) {
      debugError('Add interaction error:', error);
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  },

  addDeal: async (id: string, deal: any) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/stakeholders/${id}/deals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(deal)
      });
      
      if (!response.ok) throw new Error('Failed to add deal');
      
      const data = await response.json();
      await get().fetchStakeholders();
      await get().fetchInsights();
      await get().fetchUpcomingFollowups();
      set({ isLoading: false });
      return data.data;
    } catch (error) {
      debugError('Add deal error:', error);
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  },

  updateEngagementScores: async () => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/stakeholders/update-engagement-scores`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to update engagement scores');
      
      const data = await response.json();
      await get().fetchStakeholders();
      await get().fetchInsights();
      set({ isLoading: false });
      return data.data;
    } catch (error) {
      debugError('Update engagement scores error:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  }
}));