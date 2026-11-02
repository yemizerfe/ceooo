// types/decision.ts
export interface Decision {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  timestamp: Date;
  aiInsights: string[];
  recommendations: string[];
}

export interface ScenarioAnalysis {
  id: string;
  name: string;
  probability: number;
  impact: number;
  description: string;
  recommendations: string[];
}

export interface BusinessMetric {
  name: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  percentage: number;
  forecast: number;
}

export interface AIAnalysisRequest {
  context: string;
  metrics: Record<string, number>;
  goals: string[];
  constraints: string[];
}