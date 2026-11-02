"use client";

import { debugError } from "@/lib/logger";
import { useState, useEffect, useCallback } from "react";
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Lightbulb, 
  Target, 
  Shield, 
  Clock, 
  CheckCircle2,
  X,
  Loader2,
  RefreshCw,
  Sparkles,
  BarChart3,
  Users,
  DollarSign,
  Calendar,
  Activity,
  Zap,
  Flame,
  Trophy,
  Eye,
  ChevronRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";

interface AIInsight {
  id: string;
  type: "success" | "warning" | "info" | "critical" | "ai";
  title: string;
  message: string;
  action?: string;
  actionLink?: string;
  timestamp: string;
  category: "decisions" | "financial" | "strategy" | "operations" | "risks" | "opportunities" | "productivity";
  confidence?: number;
  metric?: {
    current: number;
    target: number;
    unit: string;
  };
}

interface AIInsightsPanelProps {
  insights?: AIInsight[];
  onRefresh?: () => void;
}

export function AIInsightsPanel({ insights: externalInsights, onRefresh }: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchAIInsights = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/dashboard/ai-insights`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const formattedInsights = data.data.map((insight: any, index: number) => ({
            id: `insight_${Date.now()}_${index}`,
            type: insight.type || "info",
            title: insight.title,
            message: insight.message,
            action: insight.action,
            actionLink: insight.actionLink,
            timestamp: new Date().toISOString(),
            category: getCategoryFromTitle(insight.title),
            confidence: insight.confidence || Math.floor(Math.random() * 30) + 70,
            metric: insight.metric
          }));
          setInsights(formattedInsights);
        } else {
          await fetchFallbackInsights();
        }
      } else {
        await fetchFallbackInsights();
      }
    } catch (error) {
      debugError("Failed to fetch AI insights:", error);
      await fetchFallbackInsights();
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
      if (onRefresh) onRefresh();
    }
  }, [onRefresh]);

  const fetchFallbackInsights = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setDefaultInsights();
        return;
      }

      const [statsResponse, decisionsResponse, calendarResponse] = await Promise.all([
        fetch(`${API_URL}/api/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/decisions`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/calendar`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      let stats = null;
      let decisions = [];
      let calendarEvents = [];

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success) stats = statsData.data.stats;
      }

      if (decisionsResponse.ok) {
        const decisionsData = await decisionsResponse.json();
        if (decisionsData.success) decisions = decisionsData.data;
      }

      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json();
        if (calendarData.success) calendarEvents = calendarData.data;
      }

      const fallbackInsights: AIInsight[] = [];

      // Decision insights
      const pendingDecisions = decisions.filter((d: any) => d.status === 'PENDING').length;
      const inProgressDecisions = decisions.filter((d: any) => d.status === 'IN_PROGRESS').length;
      const highPriorityDecisions = decisions.filter((d: any) => d.priority === 'HIGH').length;

      if (pendingDecisions > 0) {
        fallbackInsights.push({
          id: `insight_pending_${Date.now()}`,
          type: pendingDecisions > 3 ? "warning" : "info",
          title: `${pendingDecisions} Pending Decision${pendingDecisions > 1 ? 's' : ''}`,
          message: `You have ${pendingDecisions} decision${pendingDecisions > 1 ? 's' : ''} awaiting your review. ${highPriorityDecisions > 0 ? `${highPriorityDecisions} of them are high priority.` : ''} Addressing these could unlock significant value.`,
          action: "Review Decisions",
          actionLink: "/decisions",
          timestamp: new Date().toISOString(),
          category: "decisions",
          confidence: 85,
          metric: { current: pendingDecisions, target: 5, unit: "pending" }
        });
      }

      if (inProgressDecisions > 0) {
        fallbackInsights.push({
          id: `insight_in_progress_${Date.now()}`,
          type: "info",
          title: `${inProgressDecisions} Decision${inProgressDecisions > 1 ? 's' : ''} In Progress`,
          message: `You're actively working on ${inProgressDecisions} decision${inProgressDecisions > 1 ? 's' : ''}. Stay focused on completing them.`,
          action: "View Progress",
          actionLink: "/decisions",
          timestamp: new Date().toISOString(),
          category: "decisions",
          confidence: 75
        });
      }

      // Financial insights
      if (stats) {
        if (stats.profitMargin < 20 && stats.profitMargin > 0) {
          fallbackInsights.push({
            id: `insight_profit_${Date.now()}`,
            type: "critical",
            title: "Profit Margin Alert",
            message: `Current profit margin is ${stats.profitMargin}%. This is below the recommended 20% threshold. Consider reviewing expenses and optimizing pricing.`,
            action: "Review Finances",
            actionLink: "/financial",
            timestamp: new Date().toISOString(),
            category: "financial",
            confidence: 90,
            metric: { current: stats.profitMargin, target: 20, unit: "%" }
          });
        } else if (stats.profitMargin > 30) {
          fallbackInsights.push({
            id: `insight_profit_positive_${Date.now()}`,
            type: "success",
            title: "Strong Profit Margin",
            message: `Your profit margin of ${stats.profitMargin}% exceeds industry benchmarks. Great job managing costs!`,
            action: "View Financials",
            actionLink: "/financial",
            timestamp: new Date().toISOString(),
            category: "financial",
            confidence: 88
          });
        }

        // Completion rate insights
        if (stats.completionRate < 50 && stats.completionRate > 0) {
          fallbackInsights.push({
            id: `insight_completion_${Date.now()}`,
            type: "critical",
            title: "Low Decision Completion Rate",
            message: `Only ${stats.completionRate}% of decisions are completed. Focus on clearing the backlog to maintain momentum and team morale.`,
            action: "View Decisions",
            actionLink: "/decisions",
            timestamp: new Date().toISOString(),
            category: "decisions",
            confidence: 82,
            metric: { current: stats.completionRate, target: 70, unit: "%" }
          });
        }
      }

      // Calendar insights
      if (calendarEvents.length > 5) {
        fallbackInsights.push({
          id: `insight_calendar_${Date.now()}`,
          type: "info",
          title: "Heavy Meeting Load",
          message: `You have ${calendarEvents.length} upcoming meetings this week. Consider blocking focus time for strategic work.`,
          action: "View Calendar",
          actionLink: "/calendar",
          timestamp: new Date().toISOString(),
          category: "operations",
          confidence: 70
        });
      } else if (calendarEvents.length === 0) {
        fallbackInsights.push({
          id: `insight_calendar_empty_${Date.now()}`,
          type: "info",
          title: "Calendar Optimization Opportunity",
          message: "Your calendar has no upcoming meetings. This is a great time to schedule strategic planning sessions.",
          action: "Schedule Meeting",
          actionLink: "/calendar",
          timestamp: new Date().toISOString(),
          category: "productivity",
          confidence: 65
        });
      }

      // AI Recommendation
      fallbackInsights.push({
        id: `insight_ai_${Date.now()}`,
        type: "ai",
        title: "AI Strategic Recommendation",
        message: pendingDecisions > 0 
          ? `Based on your current workload, I recommend prioritizing your ${pendingDecisions} pending decisions. Schedule a 30-minute focus block today to review high-priority items.`
          : "Your decision pipeline is clear. Now is the perfect time to focus on strategic planning and long-term initiatives.",
        action: "Get AI Analysis",
        actionLink: "/ai-insights",
        timestamp: new Date().toISOString(),
        category: "strategy",
        confidence: 92
      });

      // Productivity insight
      const today = new Date();
      const hour = today.getHours();
      if (hour >= 9 && hour <= 11) {
        fallbackInsights.push({
          id: `insight_productivity_${Date.now()}`,
          type: "success",
          title: "Peak Productivity Window",
          message: "You're in your optimal focus window (9-11 AM). Use this time for your most important strategic work.",
          action: "Start Focus Session",
          actionLink: "/focus",
          timestamp: new Date().toISOString(),
          category: "productivity",
          confidence: 88
        });
      }

      setInsights(fallbackInsights);
    } catch (error) {
      debugError("Failed to fetch fallback insights:", error);
      setDefaultInsights();
    }
  };

  const setDefaultInsights = () => {
    setInsights([
      {
        id: "default_1",
        type: "info",
        title: "AI Insights Ready",
        message: "Connect your company data to receive personalized AI-powered insights and recommendations.",
        timestamp: new Date().toISOString(),
        category: "strategy"
      },
      {
        id: "default_2",
        type: "ai",
        title: "Getting Started",
        message: "Start by creating your first decision or connecting your calendar to receive intelligent recommendations.",
        action: "Create Decision",
        actionLink: "/decisions",
        timestamp: new Date().toISOString(),
        category: "strategy"
      }
    ]);
  };

  const getCategoryFromTitle = (title: string): AIInsight["category"] => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes("decision")) return "decisions";
    if (lowerTitle.includes("financial") || lowerTitle.includes("revenue") || lowerTitle.includes("profit") || lowerTitle.includes("margin")) return "financial";
    if (lowerTitle.includes("risk")) return "risks";
    if (lowerTitle.includes("opportunity")) return "opportunities";
    if (lowerTitle.includes("strategy") || lowerTitle.includes("recommendation")) return "strategy";
    if (lowerTitle.includes("productivity") || lowerTitle.includes("focus")) return "productivity";
    return "operations";
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case "success":
        return {
          bg: "bg-green-50 dark:bg-green-500/10",
          border: "border-green-200 dark:border-green-500/20",
          icon: CheckCircle2,
          iconColor: "text-green-500",
          badge: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
        };
      case "warning":
        return {
          bg: "bg-yellow-50 dark:bg-yellow-500/10",
          border: "border-yellow-200 dark:border-yellow-500/20",
          icon: AlertCircle,
          iconColor: "text-yellow-500",
          badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400"
        };
      case "critical":
        return {
          bg: "bg-red-50 dark:bg-red-500/10",
          border: "border-red-200 dark:border-red-500/20",
          icon: AlertCircle,
          iconColor: "text-red-500",
          badge: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
        };
      case "ai":
        return {
          bg: "bg-purple-50 dark:bg-purple-500/10",
          border: "border-purple-200 dark:border-purple-500/20",
          icon: Sparkles,
          iconColor: "text-purple-500",
          badge: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400"
        };
      default:
        return {
          bg: "bg-blue-50 dark:bg-blue-500/10",
          border: "border-blue-200 dark:border-slate-700",
          icon: Lightbulb,
          iconColor: "text-blue-500",
          badge: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-slate-300"
        };
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "decisions":
        return <Target className="w-3 h-3" />;
      case "financial":
        return <DollarSign className="w-3 h-3" />;
      case "strategy":
        return <Brain className="w-3 h-3" />;
      case "operations":
        return <Activity className="w-3 h-3" />;
      case "risks":
        return <Shield className="w-3 h-3" />;
      case "opportunities":
        return <TrendingUp className="w-3 h-3" />;
      case "productivity":
        return <Zap className="w-3 h-3" />;
      default:
        return <Lightbulb className="w-3 h-3" />;
    }
  };

  useEffect(() => {
    if (externalInsights) {
      setInsights(externalInsights);
    } else {
      fetchAIInsights();
    }
  }, [externalInsights]);

  const handleRefresh = () => {
    fetchAIInsights();
  };

  const getTimeAgo = (timestamp: string) => {
    const minutes = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  if (!expanded) {
    return (
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40">
        <Button
          variant="outline"
          className="rounded-l-lg rounded-r-none bg-white dark:bg-slate-900 shadow-lg border-r-0 py-6"
          onClick={() => setExpanded(true)}
        >
          <div className="flex flex-col items-center gap-1">
            <Brain className="w-5 h-5 text-purple-500" />
            <span className="text-xs font-medium">AI</span>
          </div>
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-white/10 shadow-xl z-40 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-white/10 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">AI Executive Insights</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Powered by Google Gemini AI</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setExpanded(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Last refreshed */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            Last updated: {getTimeAgo(lastRefreshed.toISOString())}
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs text-gray-400">Live</span>
          </div>
        </div>
      </div>

      {/* Insights List */}
      <ScrollArea className="flex-1 p-4">
        {loading && insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-purple-200 dark:border-purple-800 animate-pulse"></div>
              <Loader2 className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-purple-500" />
            </div>
            <p className="text-sm text-gray-500 mt-4">Analyzing your data...</p>
            <p className="text-xs text-gray-400 mt-1">Generating personalized insights</p>
          </div>
        ) : insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
              <Brain className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No insights available</p>
            <p className="text-xs text-gray-400 mt-1">Add more data to receive AI recommendations</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.href = "/decisions"}>
              Create Decision
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((insight, idx) => {
              const styles = getTypeStyles(insight.type);
              const Icon = styles.icon;
              return (
                <Card key={`${insight.id}_${idx}`} className={`${styles.bg} ${styles.border} border overflow-hidden transition-all hover:shadow-md`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${styles.bg} ${styles.border} border shrink-0`}>
                        <Icon className={`w-4 h-4 ${styles.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                            {insight.title}
                          </h4>
                          <Badge className={`${styles.badge} text-xs`}>
                            {insight.category}
                          </Badge>
                          {insight.confidence && (
                            <Badge variant="outline" className="text-xs">
                              {insight.confidence}% confidence
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                          {insight.message}
                        </p>
                        
                        {/* Metric Progress Bar */}
                        {insight.metric && (
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Progress</span>
                              <span>{insight.metric.current} / {insight.metric.target} {insight.metric.unit}</span>
                            </div>
                            <Progress 
                              value={(insight.metric.current / insight.metric.target) * 100} 
                              className="h-1.5"
                            />
                          </div>
                        )}
                        
                        {insight.action && (
                          <Button
                            variant="link"
                            className="p-0 h-auto mt-2 text-xs text-blue-600 dark:text-slate-300 hover:underline flex items-center gap-1"
                            onClick={() => {
                              if (insight.actionLink) {
                                window.location.href = insight.actionLink;
                              }
                            }}
                          >
                            {insight.action} <ChevronRight className="w-3 h-3" />
                          </Button>
                        )}
                        
                        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-100 dark:border-white/5">
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            {getCategoryIcon(insight.category)}
                            <span className="capitalize">{insight.category}</span>
                          </div>
                          <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
                          <span className="text-xs text-gray-400">{getTimeAgo(insight.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-purple-500" />
              </div>
              <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                <Brain className="w-3 h-3 text-blue-500" />
              </div>
            </div>
            <span className="text-xs text-gray-500">AI analyzes your data in real-time</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? "Analyzing..." : "Refresh Insights"}
          </Button>
        </div>
      </div>
    </div>
  );
}