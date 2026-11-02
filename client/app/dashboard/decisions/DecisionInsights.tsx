"use client";
// app/dashboard/decisions/DecisionInsights.tsx

import { useState } from "react";
import { Decision } from "@/store/decisionStore";
import { useAIInsightStore } from "@/store/aiInsightStore";
import { Brain, AlertTriangle, Lightbulb, Target, Sparkles, BarChart3, Loader2, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface DecisionInsightsProps {
  decision: Decision;
}

export function DecisionInsights({ decision }: DecisionInsightsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { analyzeDecision } = useAIInsightStore();

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzeDecision(
        decision.title,
        decision.description || "",
        `Priority: ${decision.priority}, Impact: ${decision.impact}, Status: ${decision.status}`,
        decision.id
      );
      // Handle both ad-hoc shape {recommendation, risks, opportunities} and
      // decision-record shape {analysis: {summary, recommendations}, nextSteps}
      setAnalysis({
        recommendation: result.recommendation || result.analysis?.summary || "",
        confidence: result.confidence || decision.aiConfidence || 0,
        risks: result.risks || [],
        opportunities: result.opportunities || [],
        keyFactors: result.keyFactors || [],
        nextSteps: result.nextSteps || result.analysis?.recommendations || [],
        dataLimitations: result.dataLimitations || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside className="hidden lg:block w-64 border-l border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200 dark:border-white/10">
          <Brain className="w-5 h-5 text-blue-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">AI Insights</h2>
          <Badge className="ml-auto bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-slate-300">
            <Sparkles className="w-3 h-3 mr-1" />Live
          </Badge>
        </div>

        {/* Decision info */}
        <Card className="p-4 mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border-0">
          <div className="flex items-start gap-2">
            <Brain className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium mb-1">Decision Status</p>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">{decision.status.replace('_', ' ')}</Badge>
                <Badge variant="outline">{decision.priority} priority</Badge>
              </div>
              {decision.aiConfidence && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">AI Confidence: {decision.aiConfidence}%</p>
                  <Progress value={decision.aiConfidence} className="h-1" />
                </div>
              )}
            </div>
          </div>
        </Card>

        {!analysis ? (
          <div className="text-center py-8">
            <Brain className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-4">Get AI-powered analysis for this decision</p>
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            <Button onClick={handleAnalyze} disabled={isLoading} className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isLoading ? "Analyzing..." : "Analyze Decision"}
            </Button>
          </div>
        ) : (
          <>
            {/* Recommendation */}
            <Card className="p-4 mb-4 bg-purple-50 dark:bg-purple-500/10 border-0">
              <div className="flex items-start gap-2">
                <Target className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium mb-1">AI Recommendation</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{analysis.recommendation}</p>
                  {analysis.confidence && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">Confidence: {analysis.confidence}%</p>
                      <Progress value={analysis.confidence} className="h-1" />
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Risks */}
            {analysis.risks?.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <h3 className="text-sm font-semibold">Risks</h3>
                </div>
                <div className="space-y-2">
                  {analysis.risks.map((risk: string, idx: number) => (
                    <div key={idx} className="p-2 rounded-lg bg-red-50 dark:bg-red-500/10">
                      <p className="text-xs text-gray-700 dark:text-gray-300">• {risk}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opportunities */}
            {analysis.opportunities?.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-green-500" />
                  <h3 className="text-sm font-semibold">Opportunities</h3>
                </div>
                <div className="space-y-2">
                  {analysis.opportunities.map((opp: string, idx: number) => (
                    <div key={idx} className="p-2 rounded-lg bg-green-50 dark:bg-green-500/10">
                      <p className="text-xs text-gray-700 dark:text-gray-300">• {opp}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Factors */}
            {analysis.keyFactors?.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-purple-500" />
                  <h3 className="text-sm font-semibold">Key Factors</h3>
                </div>
                <ul className="space-y-1">
                  {analysis.keyFactors.map((f: string, idx: number) => (
                    <li key={idx} className="text-xs text-gray-600 dark:text-gray-400">• {f}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next Steps */}
            {analysis.nextSteps?.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2">Next Steps</h3>
                <ol className="space-y-1 list-decimal list-inside">
                  {analysis.nextSteps.map((s: string, idx: number) => (
                    <li key={idx} className="text-xs text-gray-600 dark:text-gray-400">{s}</li>
                  ))}
                </ol>
              </div>
            )}

            {analysis.dataLimitations && (
              <p className="mb-4 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                Based on your decision record: {analysis.dataLimitations}
              </p>
            )}

            <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleAnalyze} disabled={isLoading}>
              <RefreshCw className="w-3 h-3" /> Re-analyze
            </Button>
          </>
        )}
      </div>
    </aside>
  );
}