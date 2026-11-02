// store/pricingStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PricingState {
  billingPeriod: 'monthly' | 'yearly';
  selectedPlan: string | null;
  setBillingPeriod: (period: 'monthly' | 'yearly') => void;
  setSelectedPlan: (planId: string | null) => void;
  calculatePrice: (price: number, period: 'monthly' | 'yearly') => number;
}

export const usePricingStore = create<PricingState>()(
  persist(
    (set, get) => ({
      billingPeriod: 'monthly',
      selectedPlan: null,

      setBillingPeriod: (period) => set({ billingPeriod: period }),
      
      setSelectedPlan: (planId) => set({ selectedPlan: planId }),
      
      calculatePrice: (price, period) => {
        if (period === 'yearly') {
          return price * 12 * 0.8; // 20% discount for yearly
        }
        return price;
      },
    }),
    {
      name: 'pricing-storage',
    }
  )
);