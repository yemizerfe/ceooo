import { debugError } from "@/lib/logger";
// store/budgetStore.ts (create this file)
import { create } from 'zustand';

export interface Budget {
  id: string;
  name: string;
  category: string;
  allocated: number;
  spent: number;
  period: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  startDate: string;
  endDate: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetMetrics {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  spendPct: number;
  healthScore: number;
  aiInsight: string;
  budgetCount: number;
}

export interface DepartmentPerformance {
  department: string;
  allocated: number;
  spent: number;
  usage: number;
  remaining: number;
}

export interface ExpenseBreakdown {
  name: string;
  value: number;
  amount: number;
}

export interface SpendingTrend {
  month: string;
  allocated: number;
  spent: number;
}

interface BudgetStore {
  budgets: Budget[];
  metrics: BudgetMetrics | null;
  departmentPerformance: DepartmentPerformance[];
  expenseBreakdown: ExpenseBreakdown[];
  spendingTrend: SpendingTrend[];
  isLoading: boolean;
  error: string | null;
  
  fetchBudgets: () => Promise<void>;
  fetchMetrics: () => Promise<void>;
  createBudget: (budget: Partial<Budget>) => Promise<Budget | null>;
  updateBudget: (id: string, updates: Partial<Budget>) => Promise<Budget | null>;
  deleteBudget: (id: string) => Promise<void>;
  updateSpent: (id: string, amount: number) => Promise<void>;
  importFromExternal: (source: string, apiKey?: string, baseUrl?: string) => Promise<void>;
  uploadBudgetFile: (file: File) => Promise<void>;
  generateForecast: () => Promise<any>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5010';

export const useBudgetStore = create<BudgetStore>((set, get) => ({
  budgets: [],
  metrics: null,
  departmentPerformance: [],
  expenseBreakdown: [],
  spendingTrend: [],
  isLoading: false,
  error: null,

  fetchBudgets: async () => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/budgets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch budgets');
      
      const data = await response.json();
      set({ 
        budgets: data.data || [],
        metrics: data.metrics || null,
        departmentPerformance: data.departmentPerformance || [],
        expenseBreakdown: data.expenseBreakdown || [],
        spendingTrend: data.spendingTrend || [],
        isLoading: false 
      });
    } catch (error) {
      debugError('Fetch budgets error:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchMetrics: async () => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/budgets/metrics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch metrics');
      
      const data = await response.json();
      set({ 
        metrics: data.data,
        departmentPerformance: data.departmentPerformance || [],
        expenseBreakdown: data.expenseBreakdown || [],
        spendingTrend: data.spendingTrend || [],
        isLoading: false 
      });
    } catch (error) {
      debugError('Fetch metrics error:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createBudget: async (budget: Partial<Budget>) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/budgets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(budget)
      });
      
      if (!response.ok) throw new Error('Failed to create budget');
      
      const data = await response.json();
      set(state => ({
        budgets: [...state.budgets, data.data],
        isLoading: false
      }));
      
      await get().fetchMetrics();
      return data.data;
    } catch (error) {
      debugError('Create budget error:', error);
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  },

  updateBudget: async (id: string, updates: Partial<Budget>) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/budgets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error('Failed to update budget');
      
      const data = await response.json();
      set(state => ({
        budgets: state.budgets.map(b => b.id === id ? data.data : b),
        isLoading: false
      }));
      
      await get().fetchMetrics();
      return data.data;
    } catch (error) {
      debugError('Update budget error:', error);
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  },

  deleteBudget: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/budgets/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to delete budget');
      
      set(state => ({
        budgets: state.budgets.filter(b => b.id !== id),
        isLoading: false
      }));
      
      await get().fetchMetrics();
    } catch (error) {
      debugError('Delete budget error:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  updateSpent: async (id: string, amount: number) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/budgets/${id}/spent`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount })
      });
      
      if (!response.ok) throw new Error('Failed to update spent');
      
      const data = await response.json();
      set(state => ({
        budgets: state.budgets.map(b => b.id === id ? data.data : b),
        isLoading: false
      }));
      
      await get().fetchMetrics();
    } catch (error) {
      debugError('Update spent error:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  importFromExternal: async (source: string, apiKey?: string, baseUrl?: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/budgets/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sourceType: source, apiKey, baseUrl })
      });
      
      if (!response.ok) throw new Error('Failed to import budgets');
      
      const data = await response.json();
      await get().fetchBudgets();
      await get().fetchMetrics();
      
      return data.data;
    } catch (error) {
      debugError('Import error:', error);
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  uploadBudgetFile: async (file: File) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_URL}/api/budgets/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (!response.ok) throw new Error('Failed to upload budget file');
      
      const data = await response.json();
      await get().fetchBudgets();
      await get().fetchMetrics();
      
      return data.data;
    } catch (error) {
      debugError('Upload error:', error);
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  generateForecast: async () => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/budgets/forecast`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to generate forecast');
      
      const data = await response.json();
      set({ isLoading: false });
      return data.data;
    } catch (error) {
      debugError('Forecast error:', error);
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  }
}));