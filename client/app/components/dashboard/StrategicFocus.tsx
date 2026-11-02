"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Target, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useProjectStore } from "@/store/projectStore";

export function StrategicFocus() {
  const { projects, fetchProjects, isLoading } = useProjectStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // The store returns every status; strategic focus is about what is currently running.
  const top = projects.filter((p) => p.status === "ACTIVE").slice(0, 3);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE": return <CheckCircle2 className="w-4 h-4 text-yellow-500" />;
      case "PAUSED": return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "HIGH": return "bg-red-100 text-red-700";
      case "LOW": return "bg-blue-100 text-blue-700";
      default: return "bg-orange-100 text-orange-700";
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <Target className="w-5 h-5 text-blue-500" />
          Strategic Focus
        </CardTitle>
        <Link href="/dashboard/execution">
          <Button variant="ghost" size="sm" className="text-blue-600">
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : top.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No active projects yet</p>
        ) : (
          <div className="space-y-4">
            {top.map((project, idx) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(project.status)}
                    <h3 className="font-semibold text-gray-900 dark:text-white">{project.name}</h3>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityStyle(project.priority)}`}>
                    {project.priority.toLowerCase()} priority
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  {project.deadline && <span>Due: {new Date(project.deadline).toLocaleDateString()}</span>}
                  <span>{project.progress}% complete</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
