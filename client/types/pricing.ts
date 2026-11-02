// types/pricing.ts
export interface PricingTier {
  id: string;
  name: string;
  price: number;
  period: 'monthly' | 'yearly';
  description: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
  buttonText: string;
  buttonVariant: 'default' | 'outline' | 'ghost';
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface EnterpriseFeature {
  title: string;
  description: string;
  icon: any;
}