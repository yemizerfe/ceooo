"use client";

import { debugError } from "@/lib/logger";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GitBranch, Clock, CheckCircle2, Brain, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { useDecisionStore, Decision } from "@/store/decisionStore";
import { useAIInsightStore } from "@/store/aiInsightStore";
import Link from "next/link";

export default function DecisionQueuePage() {
  const { decisions, fetchDecisions, updateDecision, isLoading } = useDecisionStore();
  const { analyzeDecisionDeep } = useAIInsightStore();
  const [selected, setSelected] = useState<Decision | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => { fetchDecisions(); }, [fetchDecisions]);

  useEffect(() => {
    if (decisions.length > 0 && !selected) setSelected(decisions[0]);
  }, [decisions]);

  const pending = decisions.filter((d) => d.status === "pending" || d.status === "in_progress" || d.status === "in-progress");

  const getPriorityColor = (p: string) => {
    if (p === "high") return "destructive";
    if (p === "medium") return "default";
    return "secondary";
  };

  const handleAnalyze = async () => {
    if (!selected) return;
    setAnalyzing(true);
    try {
      const result = await analyzeDecisionDeep({
        title: selected.title,
        description: selected.description || "",
        deadline: selected.deadline,
        strengths: selected.strengths,
        weaknesses: selected.weaknesses,
        notes: selected.notes,
      });
      setAnalysis(result);
    } catch (e) {
      debugError(e);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleMarkDecided = async () => {
    if (!selected) return;
    await updateDecision(selected.id, { status: "decided" });
    setSelected((prev) => prev ? { ...prev, status: "decided" } : null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Decision Queue</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Prioritize and evaluate critical business decisions</p>
          </div>
          <Link href="/dashboard/decisions">
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
              <GitBranch className="w-4 h-4" />Open Decision Workspace
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
        ) : pending.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">All caught up!</h3>
            <p className="text-gray-500 mb-4">No pending decisions in the queue</p>
            <Link href="/dashboard/decisions"><Button>Create a Decision</Button></Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-3">
              {pending.map((d) => (
                <Card key={d.id} className={`cursor-pointer transition-all hover:shadow-md ${selected?.id === d.id ? "ring-2 ring-blue-500" : ""}`} onClick={() => { setSelected(d); setAnalysis(null); }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">{d.title}</h3>
                      <Badge variant={getPriorityColor(d.priority) as any}>{d.priority}</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mb-2 line-clamp-2">{d.description}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {d.deadline && <span>Due: {new Date(d.deadline).toLocaleDateString()}</span>}
                      {d.aiConfidence && <span>AI: {d.aiConfidence}%</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="lg:col-span-2">
              {selected && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>{selected.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="outline">{selected.status}</Badge>
                        <Badge variant={getPriorityColor(selected.priority) as any}>{selected.priority} priority</Badge>
                        <Badge variant="outline">{selected.impact} impact</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selected.description && <p className="text-gray-600 dark:text-gray-400">{selected.description}</p>}

                      {selected.aiConfidence && (
                        <div>
                          <h3 className="font-medium mb-2">AI Confidence</h3>
                          <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-500/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm">Decision Confidence</span>
                              <span className="text-sm font-semibold">{selected.aiConfidence}%</span>
                            </div>
                            <Progress value={selected.aiConfidence} className="h-2" />
                          </div>
                        </div>
                      )}

                      {analysis && (
                        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-500/10">
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-4 h-4 text-blue-500" />
                            <span className="font-semibold">AI Analysis</span>
                          </div>
                          <p className="text-sm mb-3">{analysis.recommendation}</p>
                          {analysis.keyQuestions?.length > 0 && (
                            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-500/20 rounded">
                              <p className="text-xs font-medium text-blue-600 mb-2">Key Questions for Decision Maker:</p>
                              <ul className="text-sm text-gray-700 space-y-1">{analysis.keyQuestions.map((q: string, i: number) => <li key={i}>• {q}</li>)}</ul>
                            </div>
                          )}
                          {analysis.risks?.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-red-600 mb-1">Risks:</p>
                              <ul className="text-xs text-gray-600 space-y-1">{analysis.risks.map((r: string, i: number) => <li key={i}>• {r}</li>)}</ul>
                            </div>
                          )}
                          {analysis.opportunities?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-green-600 mb-1">Opportunities:</p>
                              <ul className="text-xs text-gray-600 space-y-1">{analysis.opportunities.map((o: string, i: number) => <li key={i}>• {o}</li>)}</ul>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-3 pt-4">
                        <Button className="flex-1 gap-2" onClick={handleAnalyze} disabled={analyzing}>
                          <Brain className="w-4 h-4" />{analyzing ? "Analyzing..." : "AI Analysis"}
                        </Button>
                        <Button variant="outline" className="flex-1 gap-2" onClick={handleMarkDecided}>
                          <CheckCircle2 className="w-4 h-4" />Mark Decided
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
