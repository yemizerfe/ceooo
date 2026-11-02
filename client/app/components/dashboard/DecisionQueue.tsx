"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { GitBranch, Clock, ArrowRight, TrendingUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useDecisionStore } from "@/store/decisionStore";

export function DecisionQueue() {
  const { decisions, fetchDecisions, isLoading } = useDecisionStore();

  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions]);

  const pending = decisions
    .filter((d) => d.status === "pending" || d.status === "in_progress" || d.status === "in-progress")
    .slice(0, 3);

  const getPriorityBadge = (priority: string) => {
    if (priority === "high") return <Badge variant="destructive" className="text-xs">Urgent</Badge>;
    if (priority === "medium") return <Badge className="bg-yellow-500 text-white text-xs">Medium</Badge>;
    return null;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <GitBranch className="w-5 h-5 text-purple-500" />
          Pending Decisions
        </CardTitle>
        <Link href="/dashboard/decisions">
          <Button variant="ghost" size="sm" className="text-purple-600">
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : pending.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No pending decisions</p>
        ) : (
          <div className="space-y-4">
            {pending.map((decision, idx) => (
              <motion.div
                key={decision.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{decision.title}</h3>
                    {getPriorityBadge(decision.priority)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    {decision.deadline && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Due {new Date(decision.deadline).toLocaleDateString()}</span>
                      </div>
                    )}
                    {decision.aiConfidence && (
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>AI: {decision.aiConfidence}% confidence</span>
                      </div>
                    )}
                  </div>
                </div>
                <Link href="/dashboard/decisions">
                  <Button size="sm" variant="ghost">Analyze</Button>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
