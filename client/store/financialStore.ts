import { debugError } from "@/lib/logger";
// store/financialStore.ts
import { create } from "zustand";

export interface FinancialRecord {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  category: string;
  description?: string;
  date: string;
  createdAt: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  budgetUtilization: number;
  totalRecords: number;
}

export interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
}

export interface ExpenseBreakdown {
  name: string;
  value: number;
}

/* =========================
   PERFORMANCE / OKR TYPES
========================= */

export interface KeyResult {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
}

export interface OKR {
  id: string;
  objective: string;
  description?: string;
  quarter: string;
  year: number;
  progress: number;
  owner?: string;
  department?: string;
  status?: "ON_TRACK" | "AT_RISK" | "OFF_TRACK" | "COMPLETED";
  keyResults: KeyResult[];
  createdAt?: string;
}

export interface FinancialDashboard {
  summary: FinancialSummary;
  monthlyData: MonthlyData[];
  expenseBreakdown: ExpenseBreakdown[];
  burnRate: number;
  runwayMonths: number;
  healthScore: number;
  aiInsight: string;
}

// Stub Budget type — only referenced by this store's interface.
// The backend has no /api/budgets endpoint wired up yet.
export interface Budget {
  id: string;
  name: string;
  amount: number;
  spent: number;
  category?: string;
  createdAt: string;
  allocated?: number;
}

interface FinancialStore {
  summary: FinancialSummary | null;
  records: FinancialRecord[];
  dashboard: FinancialDashboard | null;
  budgets: any[];

  /* =========================
     PERFORMANCE / OKRS
  ========================= */

  okrs: OKR[];

  isLoading: boolean;
  error: string | null;

  // Financial Actions
  fetchSummary: () => Promise<void>;

  // Budget actions (uses the backend /api/budgets endpoint)
  fetchBudgets: () => Promise<void>;
  createBudget: (budget: Partial<Budget>) => Promise<Budget | null>;
  updateBudget: (id: string, updates: Partial<Budget>) => Promise<Budget | null>;
  deleteBudget: (id: string) => Promise<void>;
  updateSpent: (id: string, amount: number) => Promise<void>;
  importFromExternal: (source: string, apiKey?: string, baseUrl?: string) => Promise<void>;
  uploadBudgetFile: (file: File) => Promise<void>;
  generateForecast: () => Promise<any>;
  fetchRecords: () => Promise<void>;
  fetchDashboard: () => Promise<void>;

  addRecord: (
    record: Partial<FinancialRecord>
  ) => Promise<void>;

  uploadCSV: (file: File) => Promise<void>;

  /* =========================
     PERFORMANCE ACTIONS
  ========================= */

  fetchOKRs: () => Promise<void>;

  createOKR: (
    okr: Partial<OKR>
  ) => Promise<void>;

  updateOKR: (
    id: string,
    payload: Partial<OKR>
  ) => Promise<void>;

  deleteOKR: (
    id: string
  ) => Promise<void>;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5010";

export const useFinancialStore = create<FinancialStore>(
  (set, get) => ({
    summary: null,
    records: [],
    dashboard: null,
    budgets: [],

    /* =========================
       OKRS INITIAL STATE
    ========================= */

    okrs: [],

    isLoading: false,
    error: null,

    // =========================
    // FETCH SUMMARY
    // =========================

    fetchSummary: async () => {
      set({ isLoading: true, error: null });

      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_URL}/api/financial/dashboard`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok)
          throw new Error("Failed to fetch summary");

        const data = await response.json();

        set({
          summary: data.data?.summary || null,
          dashboard: data.data,
          isLoading: false,
        });
      } catch (error) {
        debugError("Fetch summary error:", error);

        set({
          error: (error as Error).message,
          isLoading: false,
        });
      }
    },

    // =========================
    // FETCH RECORDS
    // =========================

    fetchRecords: async () => {
      set({ isLoading: true, error: null });

      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_URL}/api/financial/records`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok)
          throw new Error("Failed to fetch records");

        const data = await response.json();

        set({
          records: data.data || [],
          isLoading: false,
        });
      } catch (error) {
        debugError("Fetch records error:", error);

        set({
          error: (error as Error).message,
          isLoading: false,
        });
      }
    },

    // =========================
    // FETCH DASHBOARD
    // =========================

    fetchDashboard: async () => {
      set({ isLoading: true, error: null });

      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_URL}/api/financial/dashboard`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok)
          throw new Error("Failed to fetch dashboard");

        const data = await response.json();

        set({
          dashboard: data.data,
          summary: data.data?.summary || null,
          isLoading: false,
        });
      } catch (error) {
        debugError("Fetch dashboard error:", error);

        set({
          error: (error as Error).message,
          isLoading: false,
        });
      }
    },

    // Budget actions (stubs — /api/budgets endpoint not wired yet)
    createBudget: async (budget) => {
      set({ isLoading: true, error: null });
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/api/financial/budgets`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(budget),
        });
        if (!response.ok) throw new Error("Failed to create budget");
        const data = await response.json();
        set((state) => ({ budgets: [data.data, ...state.budgets], isLoading: false }));
        return data.data;
      } catch (error) {
        set({ error: (error as Error).message, isLoading: false });
        return null;
      }
    },

    updateBudget: async (id, updates) => {
      set({ isLoading: true, error: null });
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/api/financial/budgets/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        });
        if (!response.ok) throw new Error("Failed to update budget");
        const data = await response.json();
        set((state) => ({
          budgets: state.budgets.map((b) => (b && "id" in b && b.id === id ? data.data : b)),
          isLoading: false,
        }));
        return data.data;
      } catch (error) {
        set({ error: (error as Error).message, isLoading: false });
        return null;
      }
    },

    deleteBudget: async (id) => {
      set({ isLoading: true, error: null });
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/api/financial/budgets/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to delete budget");
        set((state) => ({
          budgets: state.budgets.filter((b) => b && "id" in b && b.id !== id),
          isLoading: false,
        }));
      } catch (error) {
        set({ error: (error as Error).message, isLoading: false });
      }
    },

    updateSpent: async (id, amount) => {
      set({ isLoading: true, error: null });
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/api/financial/budgets/${id}/spent`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ spent: amount }),
        });
        if (!response.ok) throw new Error("Failed to update spent");
        const data = await response.json();
        set((state) => ({
          budgets: state.budgets.map((b) => (b && "id" in b && b.id === id ? data.data : b)),
          isLoading: false,
        }));
      } catch (error) {
        set({ error: (error as Error).message, isLoading: false });
      }
    },

    uploadBudgetFile: async (file) => {
      set({ isLoading: true, error: null });
      try {
        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(`${API_URL}/api/financial/budgets/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!response.ok) throw new Error("Failed to upload budget file");
        const data = await response.json();
        await get().fetchBudgets();
        return data.data;
      } catch (error) {
        set({ error: (error as Error).message, isLoading: false });
        throw error;
      }
    },

    // =========================
    // FETCH BUDGETS
    // =========================

    fetchBudgets: async () => {
      set({ isLoading: true, error: null });

      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_URL}/api/financial/budgets`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok)
          throw new Error("Failed to fetch budgets");

        const data = await response.json();

        set({
          budgets: data.data || [],
          isLoading: false,
        });
      } catch (error) {
        debugError("Fetch budgets error:", error);

        set({
          error: (error as Error).message,
          isLoading: false,
        });
      }
    },

    // =========================
    // ADD RECORD
    // =========================

    addRecord: async (record) => {
      set({ isLoading: true, error: null });

      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_URL}/api/financial/records`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(record),
          }
        );

        if (!response.ok)
          throw new Error("Failed to add record");

        const data = await response.json();

        set((state) => ({
          records: [data.data, ...state.records],
          isLoading: false,
        }));

        await get().fetchSummary();
      } catch (error) {
        debugError("Add record error:", error);

        set({
          error: (error as Error).message,
          isLoading: false,
        });
      }
    },

    // =========================
    // IMPORT EXTERNAL
    // =========================

    importFromExternal: async (
      source,
      apiKey,
      baseUrl
    ) => {
      set({ isLoading: true, error: null });

      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_URL}/api/financial/import`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              sourceType: source,
              apiKey,
              baseUrl,
            }),
          }
        );

        if (!response.ok)
          throw new Error("Failed to import data");

        const data = await response.json();

        await get().fetchRecords();
        await get().fetchSummary();

        return data.data;
      } catch (error) {
        debugError("Import error:", error);

        set({
          error: (error as Error).message,
          isLoading: false,
        });

        throw error;
      }
    },

    // =========================
    // CSV UPLOAD
    // =========================

    uploadCSV: async (file) => {
      set({ isLoading: true, error: null });

      try {
        const token = localStorage.getItem("token");

        const formData = new FormData();

        formData.append("file", file);

        const response = await fetch(
          `${API_URL}/api/financial/upload-csv`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        if (!response.ok)
          throw new Error("Failed to upload CSV");

        const data = await response.json();

        await get().fetchRecords();
        await get().fetchSummary();

        return data.data;
      } catch (error) {
        debugError("CSV upload error:", error);

        set({
          error: (error as Error).message,
          isLoading: false,
        });

        throw error;
      }
    },

    // =========================
    // FORECAST
    // =========================

    generateForecast: async () => {
      set({ isLoading: true, error: null });

      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_URL}/api/financial/forecast`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok)
          throw new Error("Failed to generate forecast");

        const data = await response.json();

        set({ isLoading: false });

        return data.data;
      } catch (error) {
        debugError("Forecast error:", error);

        set({
          error: (error as Error).message,
          isLoading: false,
        });

        return null;
      }
    },

    // =========================
    // FETCH OKRS
    // =========================

    fetchOKRs: async () => {
      set({ isLoading: true, error: null });

      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_URL}/api/performance/okrs`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok)
          throw new Error("Failed to fetch OKRs");

        const data = await response.json();

        set({
          okrs: data.data || [],
          isLoading: false,
        });
      } catch (error) {
        debugError("Fetch OKRs error:", error);

        set({
          error: (error as Error).message,
          isLoading: false,
        });
      }
    },

    // =========================
    // CREATE OKR
    // =========================

    createOKR: async (okr) => {
      set({ isLoading: true, error: null });

      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_URL}/api/performance/okrs`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(okr),
          }
        );

        if (!response.ok)
          throw new Error("Failed to create OKR");

        const data = await response.json();

        set((state) => ({
          okrs: [data.data, ...state.okrs],
          isLoading: false,
        }));
      } catch (error) {
        debugError("Create OKR error:", error);

        set({
          error: (error as Error).message,
          isLoading: false,
        });
      }
    },

    // =========================
    // UPDATE OKR
    // =========================

    updateOKR: async (id, payload) => {
      set({ isLoading: true, error: null });

      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_URL}/api/performance/okrs/${id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          }
        );

        if (!response.ok)
          throw new Error("Failed to update OKR");

        const data = await response.json();

        set((state) => ({
          okrs: state.okrs.map((o) =>
            o.id === id ? data.data : o
          ),
          isLoading: false,
        }));
      } catch (error) {
        debugError("Update OKR error:", error);

        set({
          error: (error as Error).message,
          isLoading: false,
        });
      }
    },

    // =========================
    // DELETE OKR
    // =========================

    deleteOKR: async (id) => {
      set({ isLoading: true, error: null });

      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_URL}/api/performance/okrs/${id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok)
          throw new Error("Failed to delete OKR");

        set((state) => ({
          okrs: state.okrs.filter((o) => o.id !== id),
          isLoading: false,
        }));
      } catch (error) {
        debugError("Delete OKR error:", error);

        set({
          error: (error as Error).message,
          isLoading: false,
        });
      }
    },
  })
);