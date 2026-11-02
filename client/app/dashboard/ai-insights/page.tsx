"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  TrendingUp,
  AlertCircle,
  BarChart3,
  ArrowRight,
  Loader2,
  Sparkles,
  RefreshCw,
  Shield,
  Target,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useAIInsightStore } from "@/store/aiInsightStore";
import { useIntegrationOverviewStore } from "@/store/integrationOverviewStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";

interface SupervisorView {
  generatedAt: string;
  healthScore: number;
  status: "on_track" | "attention" | "at_risk" | "insufficient_data";
  areas: Array<{ area: string; score: number; detail: string }>;
  recommendations: Array<{
    title: string;
    detail: string;
    action: string;
    href: string;
    impact: "HIGH" | "MEDIUM" | "LOW";
  }>;
  risks: string[];
  opportunities: string[];
  narrative?: string;
  coverage: { score: number; missing: string[] };
  counts: Record<string, number>;
  sources: string[];
}

const ACTION_HREF: Record<string, string> = {
  OPPORTUNITY: "/dashboard/network",
  ALERT: "/dashboard/execution",
  RISK: "/dashboard/projects",
  FORECAST: "/dashboard/performance",
  RECOMMENDATION: "/dashboard/decisions",
};

export default function AIInsightsPage() {
  const { insights, fetchInsights, generateInsights, markInsightRead, isLoading } = useAIInsightStore();
  const { overview, fetchOverview } = useIntegrationOverviewStore();
  const [selectedType, setSelectedType] = useState("all");
  const [supervisor, setSupervisor] = useState<SupervisorView | null>(null);
  const [supervisorLoading, setSupervisorLoading] = useState(true);

  const fetchSupervisor = useCallback(async () => {
    setSupervisorLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) return;
      const res = await fetch(`${API_URL}/api/ai/supervisor`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setSupervisor(data.data);
    } catch {
      // Supervisor is additive — the insight feed still works without it.
    } finally {
      setSupervisorLoading(false);
    }
  }, []);

  useEffect(() => { void fetchInsights(); }, [fetchInsights]);
  useEffect(() => { void fetchSupervisor(); }, [fetchSupervisor]);
  useEffect(() => { void fetchOverview(); }, [fetchOverview]);

  // Local guard: even if the feed arrives from a cache, never render the same
  // signal twice on the page.
  const seen = new Set<string>();
  const uniqueInsights = insights.filter((insight) => {
    const fingerprint = (insight.metadata as Record<string, any> | undefined)?.fingerprint;
    const key = typeof fingerprint === "string" && fingerprint
      ? fingerprint
      : `${insight.type}:${insight.title.trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const externalProviders = overview?.providers?.filter((p) => p.records > 0) || [];
  const externalRecords = overview?.totals?.records || 0;

  const filtered = uniqueInsights.filter((i) => selectedType === "all" || i.type === selectedType);
  const countOf = (type: string) => uniqueInsights.filter((i) => i.type === type).length;

  const getIcon = (type: string) => {
    switch (type) {
      case "OPPORTUNITY": return <TrendingUp className="w-5 h-5 text-green-500" />;
      case "ALERT": return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case "RISK": return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "FORECAST": return <BarChart3 className="w-5 h-5 text-blue-500" />;
      default: return <Brain className="w-5 h-5 text-purple-500" />;
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case "HIGH": return "bg-red-100 text-red-700";
      case "MEDIUM": return "bg-yellow-100 text-yellow-700";
      default: return "bg-green-100 text-green-700";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Insights</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              One feed across every page, every import, and every connected system
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => { void fetchSupervisor(); }}
              disabled={supervisorLoading}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${supervisorLoading ? "animate-spin" : ""}`} />
              Refresh supervisor
            </Button>
            <Button onClick={() => generateInsights()} disabled={isLoading} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Sparkles className={`w-4 h-4 ${isLoading ? "animate-pulse" : ""}`} />
              Generate New Insights
            </Button>
          </div>
        </div>

        {/* AI Supervisor — app-wide status derived from all stored records */}
        <Card className="mb-6 border-purple-200 dark:border-purple-500/30 overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-5 text-white">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8" />
                  <div>
                    <h2 className="text-lg font-semibold">AI Supervisor</h2>
                    <p className="text-sm text-white/80">
                      {supervisorLoading
                        ? "Reading decisions, projects, OKRs, finances, stakeholders and integrations…"
                        : supervisor
                          ? `Watching ${supervisor.sources.length} data sources · coverage ${supervisor.coverage.score}%`
                          : "Supervisor unavailable"}
                    </p>
                  </div>
                </div>
                {supervisor && (
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-4xl font-bold leading-none">{supervisor.healthScore}</p>
                      <p className="text-xs uppercase tracking-wide text-white/70">Company health</p>
                    </div>
                    <Badge className="bg-white/20 text-white border-0 capitalize">
                      {supervisor.status.replace("_", " ")}
                    </Badge>
                  </div>
                )}
              </div>
              {supervisor?.narrative && (
                <p className="mt-4 text-sm text-white/90 leading-relaxed">{supervisor.narrative}</p>
              )}
            </div>
            {supervisor && (
              <div className="grid gap-4 p-5 md:grid-cols-5">
                {supervisor.areas.map((area) => (
                  <div key={area.area}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{area.area}</p>
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">{area.score}</span>
                    </div>
                    <Progress value={area.score} className="h-1.5" />
                    <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 leading-snug">{area.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {supervisor && supervisor.recommendations.length > 0 && (
          <div className="mb-6 grid gap-3 md:grid-cols-2">
            {supervisor.recommendations.slice(0, 4).map((rec) => (
              <Card key={rec.title} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-start gap-3">
                  <Target className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{rec.title}</p>
                      <Badge className={getImpactBadge(rec.impact)}>{rec.impact.toLowerCase()}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{rec.detail}</p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="gap-1 flex-shrink-0">
                    <Link href={rec.href}>
                      {rec.action} <ArrowRight className="w-3 h-3" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="mb-6 border-purple-200 dark:border-purple-500/30 bg-purple-50/50 dark:bg-purple-500/10">
          <CardContent className="p-4 flex flex-wrap items-center gap-3 text-sm">
            <Sparkles className="w-5 h-5 text-purple-500" />
            {externalProviders.length > 0 ? (
              <p>
                AI is analyzing <strong>{externalRecords}</strong> records from{" "}
                <strong>{externalProviders.length}</strong> connected integration
                {externalProviders.length === 1 ? "" : "s"} ({externalProviders.map((p) => p.name).join(", ")}) together
                with your in-app data.
              </p>
            ) : (
              <p>
                Connect business tools or import a CSV to let AI reason over external company data.{" "}
                <Link href="/dashboard/integrations" className="text-blue-600 hover:underline font-medium">
                  Open integrations
                </Link>
              </p>
            )}
            {supervisor?.coverage.missing.length ? (
              <span className="text-xs text-gray-500">
                Missing from the picture: {supervisor.coverage.missing.join(", ")}.
              </span>
            ) : null}
          </CardContent>
        </Card>

        <Tabs value={selectedType} onValueChange={setSelectedType} className="mb-8">
          <TabsList>
            <TabsTrigger value="all">All ({uniqueInsights.length})</TabsTrigger>
            <TabsTrigger value="OPPORTUNITY">Opportunities ({countOf("OPPORTUNITY")})</TabsTrigger>
            <TabsTrigger value="ALERT">Alerts ({countOf("ALERT")})</TabsTrigger>
            <TabsTrigger value="RISK">Risks ({countOf("RISK")})</TabsTrigger>
            <TabsTrigger value="FORECAST">Forecasts ({countOf("FORECAST")})</TabsTrigger>
            <TabsTrigger value="RECOMMENDATION">Recommendations ({countOf("RECOMMENDATION")})</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No insights yet</h3>
            <p className="text-gray-500 mb-4">Click "Generate New Insights" to get AI-powered analysis</p>
            <Button onClick={() => generateInsights()} className="bg-blue-600 hover:bg-blue-700">Generate Insights</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((insight) => (
              <Card key={insight.id} className={`hover:shadow-md transition-all ${!insight.isRead ? "border-l-4 border-l-blue-500" : ""}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {getIcon(insight.type)}
                        <h3 className="font-semibold text-lg">{insight.title}</h3>
                        <Badge className={getImpactBadge(insight.impact)}>{insight.impact.toLowerCase()} impact</Badge>
                        {!insight.isRead && <Badge className="bg-blue-100 text-blue-700">New</Badge>}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-3">{insight.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Confidence: {insight.confidence}%</span>
                        <span>{new Date(insight.createdAt).toLocaleDateString()}</span>
                        <span className="capitalize">{insight.type.toLowerCase()}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={async () => {
                        if (!insight.isRead) await markInsightRead(insight.id);
                        window.location.href = ACTION_HREF[insight.type] || "/dashboard";
                      }}
                    >
                      {insight.isRead ? <CheckCircle2 className="w-4 h-4" /> : null}
                      Take Action <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
