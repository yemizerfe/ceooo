"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useProjectStore } from "@/store/projectStore";

export function ProgressTracker() {
  const { projects, fetchProjects, isLoading } = useProjectStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const getStatus = (project: any) => {
    if (project.status === "COMPLETED") return "ahead";
    if (project.status === "PAUSED" || project.status === "CANCELLED") return "at-risk";
    if (project.progress >= 70) return "on-track";
    if (project.progress >= 40) return "delayed";
    return "at-risk";
  };

  const getBadgeStyle = (status: string) => {
    switch (status) {
      case "on-track": case "ahead": return "border-green-500 text-green-600";
      case "delayed": return "border-yellow-500 text-yellow-600";
      default: return "border-red-500 text-red-600";
    }
  };

  const top = projects.slice(0, 4);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <TrendingUp className="w-5 h-5 text-green-500" />
          Initiative Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : top.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No projects to track yet</p>
        ) : (
          <div className="space-y-4">
            {top.map((project, idx) => {
              const status = getStatus(project);
              return (
                <motion.div key={project.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{project.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">{project.progress}%</span>
                      <Badge variant="outline" className={getBadgeStyle(status)}>
                        {status === "at-risk" && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {status === "on-track" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {status}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
