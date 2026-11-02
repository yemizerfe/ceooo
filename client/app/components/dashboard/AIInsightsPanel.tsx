"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles, AlertTriangle, Lightbulb, TrendingUp, Clock, X, Target, ArrowRight, Send, Loader2, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAIInsightStore } from "@/store/aiInsightStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";

const authHeaders = (): HeadersInit => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export function AIInsightsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Array<{ id: string; role: "user" | "assistant"; content: string }>>([
    {
      id: "welcome",
      role: "assistant",
      content: "I'm tracking your daily brief, key risks, and company momentum. Ask me about revenue, risks, staffing, or priorities.",
    },
  ]);
  const { insights, dailyBrief, fetchInsights, fetchDailyBrief, markInsightRead, isLoading } = useAIInsightStore();

  // Keep the store feed fresh, plus pull the dashboard-curated insight set so the
  // panel can show board-level signals even before the user has generated their own.
  useEffect(() => {
    fetchInsights();
    fetchDailyBrief();
  }, [fetchInsights, fetchDailyBrief]);

  const [dashboardInsights, setDashboardInsights] = useState<Array<{
    type: string;
    title: string;
    message: string;
    action?: string;
    actionLink?: string;
  }>>([]);

  // Kept referentially stable: a new function on every render would re-run the
  // effect below in a loop and flood the API until the rate limiter kicks in.
  const refreshDashboardInsights = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/dashboard/ai-insights`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setDashboardInsights(data.data ?? []);
    } catch {
      // non-fatal: the panel still renders from the store feed
    }
  }, []);

  useEffect(() => {
    refreshDashboardInsights();
  }, [refreshDashboardInsights]);

  const unread = insights.filter((i) => !i.isRead);

  // Opening the panel counts as reading the feed. Without this the badge keeps
  // showing "new" after the user has already seen the insight.
  const readFlushedRef = useRef(false);
  useEffect(() => {
    if (!isOpen || readFlushedRef.current) return;
    readFlushedRef.current = true;
    const timer = setTimeout(() => {
      for (const insight of insights) {
        if (!insight.isRead) void markInsightRead(insight.id);
      }
    }, 1200);
    return () => clearTimeout(timer);
    // Intentionally only depends on `isOpen`: the unread set at open time is
    // what should be flushed, not every later store update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  const risks = insights.filter((i) => i.type === "RISK" || i.type === "ALERT").slice(0, 2);
  const opportunities = insights.filter((i) => i.type === "OPPORTUNITY" || i.type === "RECOMMENDATION").slice(0, 2);

  const generateAIResponse = (input: string) => {
    const text = input.toLowerCase();

    if (text.includes("risk") || text.includes("alert")) {
      return dailyBrief?.criticalRisk || "Your highest risk remains execution drag in the current quarter. Focus on removing bottlenecks and reducing decision latency.";
    }

    if (text.includes("revenue") || text.includes("growth") || text.includes("sales")) {
      return "Revenue momentum is stable, and the strongest opportunity is to accelerate conversion in the top 3 accounts while protecting pipeline quality.";
    }

    if (text.includes("team") || text.includes("staff") || text.includes("hiring")) {
      return "Team capacity is the main constraint. Prioritize backfilling the most critical execution roles and reduce low-impact coordination work.";
    }

    if (text.includes("priority") || text.includes("focus") || text.includes("plan")) {
      return dailyBrief?.recommendedAction || "Focus on the highest-value decision and remove the biggest operating bottleneck before the next planning cycle.";
    }

    if (text.includes("company") || text.includes("performance")) {
      return dailyBrief?.summary || "The company is showing healthy momentum, with a strong operational base and a few high-impact opportunities to convert into faster execution.";
    }

    return `Based on your current brief, the best next move is to focus on ${dailyBrief?.keyOpportunity?.toLowerCase() || "the highest-conviction opportunity"} while keeping risk exposure under control.`;
  };

  const [thinking, setThinking] = useState(false);

  const handleAskAI = async () => {
    const prompt = query.trim();
    if (!prompt || thinking) return;

    const userMessage = { id: `${Date.now()}-user`, role: "user" as const, content: prompt };
    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setThinking(true);

    let reply = "";
    try {
      // Real copilot: grounded in decisions, tasks, calendar and every
      // connected integration snapshot.
      const res = await fetch(`${API_URL}/api/ai/copilot`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
      });
      const data = await res.json();
      reply = data?.data?.message?.trim() || "";
    } catch {
      reply = "";
    }

    // Offline / no AI key: fall back to the local briefing rather than erroring.
    if (!reply) reply = generateAIResponse(prompt);

    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-assistant`, role: "assistant" as const, content: reply },
    ]);
    setThinking(false);
  };

  return (
    <>
      {/* Floating Button - Always Visible */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 flex items-center justify-center group"
          >
            <div className="relative">
              <Brain className="w-6 h-6" />
              {unread.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unread.length > 9 ? "9+" : unread.length}
                </span>
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Widget */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 100 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-40 w-[420px] max-w-[calc(100vw-2rem)] h-[600px] bg-white dark:bg-slate-950 border border-gray-200/80 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">AI Insights</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Your AI copilot</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  aria-label="Minimize"
                >
                  <Minus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsMinimized(false);
                  }}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Minimized State */}
            {isMinimized ? (
              <div className="p-4 text-center text-sm text-gray-600 dark:text-gray-400">
                Click the chat button to expand
              </div>
            ) : (
              <>
                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* AI Summary */}
                  <Card className="border-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-blue-500/10 dark:via-indigo-500/10 dark:to-violet-500/10 shadow-none rounded-xl p-3">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-300 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">AI Summary</p>
                        {isLoading ? (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating...
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                            {dailyBrief?.summary || "Generating your daily brief..."}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* Board Signals from the dashboard curator */}
                  {dashboardInsights.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Board Signals</p>
                      <div className="space-y-2">
                        {dashboardInsights.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 p-2.5 rounded-lg border bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            <div className="mt-0.5">
                              {item.type === 'warning' || item.type === 'critical'
                                ? <AlertTriangle className="w-4 h-4 text-amber-500" />
                                : item.type === 'success'
                                  ? <Lightbulb className="w-4 h-4 text-emerald-500" />
                                  : <Brain className="w-4 h-4 text-blue-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{item.title}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{item.message}</p>
                              {item.action && item.actionLink && (
                                <a
                                  href={item.actionLink}
                                  className="inline-block mt-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  {item.action} <ArrowRight className="w-3 h-3 inline ml-0.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-2.5">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Risks</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{risks.length}</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-2.5">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Opportunities</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{opportunities.length}</p>
                    </div>
                  </div>

                  {/* Key Alerts */}
                  {risks.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">⚠️ Key Alerts</p>
                      <div className="space-y-2">
                        {risks.map((insight) => (
                          <div
                            key={insight.id}
                            className="flex items-start gap-2 p-2.5 rounded-lg border border-red-100 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/10 cursor-pointer hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors"
                            onClick={() => markInsightRead(insight.id)}
                          >
                            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-700 dark:text-gray-300">{insight.title}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Chat */}
                  <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-2.5">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">💬 Chat</p>
                    <div className="space-y-2 max-h-[120px] overflow-y-auto">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                              message.role === "user"
                                ? "bg-blue-600 text-white"
                                : "bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700"
                            }`}
                          >
                            {message.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Input Area */}
                <div className="border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 p-3 flex-shrink-0">
                  <div className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2 mb-2">
                    <Textarea
                      placeholder="Ask about risks, revenue, priorities..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAskAI();
                        }
                      }}
                      className="min-h-[80px] resize-none border-0 bg-transparent p-0 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:ring-0"
                    />
                  </div>
                  <Button
                    onClick={handleAskAI}
                    disabled={!query.trim() || thinking}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg"
                  >
                    {thinking ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    {thinking ? "Thinking..." : "Send"}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
