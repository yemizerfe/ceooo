// store/dashboardStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DashboardState {
  selectedDate: Date;
  viewMode: 'overview' | 'decisions' | 'calendar' | 'execution' | 'financials' | 'network';
  refreshInterval: number;
  isLoading: boolean;
  setSelectedDate: (date: Date) => void;
  setViewMode: (mode: DashboardState['viewMode']) => void;
  setRefreshInterval: (interval: number) => void;
  setIsLoading: (loading: boolean) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      selectedDate: new Date(),
      viewMode: 'overview',
      refreshInterval: 300000,
      isLoading: false,
      setSelectedDate: (date) => set({ selectedDate: date }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setRefreshInterval: (interval) => set({ refreshInterval: interval }),
      setIsLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'dashboard-storage',
    }
  )
);