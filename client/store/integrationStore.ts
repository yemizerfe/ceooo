import { debugError } from "@/lib/logger";
import { create } from "zustand";

export interface Integration {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  connected: boolean;
  isConnecting?: boolean;
  connectionId?: string;
  lastSync?: string;
  metadata?: Record<string, any>;
}

// Integration data payload from API
export interface IntegrationDataItem {
  source: string;
  data: any;
  lastSync?: string;
}

export interface IntegrationState {
  integrations: Integration[];
  integrationData: Record<string, any>; // { [appName]: data }
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
  
  fetchIntegrations: () => Promise<void>;
  connectIntegration: (appName: string) => Promise<void>;
  disconnectIntegration: (appName: string) => Promise<void>;
  syncAllIntegrations: () => Promise<void>;
  fetchIntegrationData: (appName: string, dataType?: string) => Promise<any>;
  clearMessages: () => void;
  // New: sync integration data to all connected integrations
  syncIntegrationData: () => Promise<void>;
  // New: get integration data for AI
  getIntegrationDataForAI: () => Promise<any>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";

export const useIntegrationStore = create<IntegrationState>((set, get) => ({
  integrations: [],
  integrationData: {},
  isLoading: false,
  error: null,
  successMessage: null,

  fetchIntegrations: async () => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${API_URL}/api/integrations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch integrations");
      }

      set({ integrations: data.data.integrations, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch integrations",
        isLoading: false,
      });
    }
  },

  connectIntegration: async (appName: string) => {
    set({ isLoading: true, error: null, successMessage: null });
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${API_URL}/api/integrations/connect`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ appName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to connect integration");
      }

      // If there's an auth URL, open it in a new window
      if (data.data.authUrl) {
        window.open(data.data.authUrl, "_blank", "width=600,height=700");
      }

      set({
        successMessage: `Connection initiated for ${appName}. Please complete authentication in the popup.`,
        isLoading: false,
      });

      // Refresh integrations list
      get().fetchIntegrations();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to connect integration",
        isLoading: false,
      });
    }
  },

  disconnectIntegration: async (appName: string) => {
    set({ isLoading: true, error: null, successMessage: null });
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${API_URL}/api/integrations/disconnect`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ appName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to disconnect integration");
      }

      set({
        successMessage: data.message || `Disconnected from ${appName}`,
        isLoading: false,
      });

      // Refresh integrations list
      get().fetchIntegrations();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to disconnect integration",
        isLoading: false,
      });
    }
  },

  syncAllIntegrations: async () => {
    set({ isLoading: true, error: null, successMessage: null });
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${API_URL}/api/integrations/sync`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to sync integrations");
      }

      set({
        successMessage: data.message || "All integrations synced successfully!",
        isLoading: false,
      });

      // Refresh integrations list
      get().fetchIntegrations();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to sync integrations",
        isLoading: false,
      });
    }
  },

  fetchIntegrationData: async (appName: string, dataType: string = "all") => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(
        `${API_URL}/api/integrations/${appName}/data?dataType=${dataType}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch integration data");
      }

      return data.data;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch integration data",
      });
      return null;
    }
  },

  // New: sync integration data to all connected integrations
  syncIntegrationData: async () => {
    const { integrations } = get();
    set({ isLoading: true, error: null, successMessage: null });
    try {
      for (const integration of integrations) {
        if (integration.connected && !integration.isConnecting) {
          try {
            const data = await get().fetchIntegrationData(integration.id, "all");
            if (data) {
              set((state) => ({
                integrationData: {
                  ...state.integrationData,
                  [integration.id]: data,
                },
              }));
            }
          } catch (e) {
            // Ignore individual integration fetch errors
            debugError(`Failed to fetch data for ${integration.id}:`, e);
          }
        }
      }
      set({ isLoading: false, successMessage: "Integration data synced successfully" });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to sync integration data",
        isLoading: false,
      });
    }
  },

  /**
   * Get integration data suitable for AI analysis
   * Combines all integration data into a single payload for AI analysis
   */
  getIntegrationDataForAI: async () => {
    const { integrations, integrationData } = get();
    const connectedIntegrations = integrations.filter((i) => i.connected);

    if (connectedIntegrations.length === 0) {
      return { success: true, data: { integrations: [], count: 0 } };
    }

    // Ensure all integration data is up to date
    await get().syncIntegrationData();

    const payload = {
      integrations: connectedIntegrations.map((integration) => ({
        source: integration.id,
        data: integrationData[integration.id] || null,
        lastSync: integration.lastSync,
      })),
      count: connectedIntegrations.length,
    };

    return payload;
  },

  clearMessages: () => {
    set({ error: null, successMessage: null });
  },
}));