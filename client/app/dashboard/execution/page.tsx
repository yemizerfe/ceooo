"use client";

import { debugError } from "@/lib/logger";
import { useState, useEffect } from "react";
import {
  Target,
  Brain,
  Play,
  Flag,
  CheckCircle2,
  Loader2,
  Plus,
  AlertTriangle,
  Clock3,
  Activity,
  KanbanSquare,
  Users,
  PauseCircle,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Minus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Textarea } from "@/components/ui/textarea";

import { useProjectStore, Project, Task } from "@/store/projectStore";
import { useFinancialStore } from "@/store/financialStore";

const PROJECTS_PER_PAGE = 5;
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";

export default function ExecutionPage() {
  const {
    projects,
    fetchProjects,
    createProject,
    updateProject,
    isLoading,
  } = useProjectStore();

  const [selected, setSelected] = useState<Project | null>(null);
  const [page, setPage] = useState(0);

  const { okrs, fetchOKRs } = useFinancialStore();

  const [showCreate, setShowCreate] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    priority: "MEDIUM" as any,
    deadline: "",
  });

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchOKRs();
  }, [fetchOKRs]);

  const pageCount = Math.max(1, Math.ceil(projects.length / PROJECTS_PER_PAGE));
  const currentPage = Math.min(page, pageCount - 1);
  const pagedProjects = projects.slice(
    currentPage * PROJECTS_PER_PAGE,
    currentPage * PROJECTS_PER_PAGE + PROJECTS_PER_PAGE
  );

  const adjustKeyResult = async (keyResultId: string, amount: number) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/api/performance/key-results/${keyResultId}/increment`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });
      await fetchOKRs();
    } catch (error) {
      debugError("Key result update failed:", error);
    }
  };

  useEffect(() => {
    if (projects.length > 0 && !selected) {
      setSelected(projects[0]);
    }
  }, [projects]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400";

      case "PAUSED":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400";

      case "CANCELLED":
        return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400";

      case "COMPLETED":
        return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-slate-300";

      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400";
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case "DONE":
        return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400";

      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-slate-300";

      case "REVIEW":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400";

      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400";
    }
  };

  const isProjectCompleted = (project: Project) => {
    return project.status === "COMPLETED" || project.progress >= 100;
  };

  const handleCreate = async () => {
    if (!form.name) return;

    const created = await createProject({
      ...form,
      deadline: form.deadline || undefined,
      progress: 0,
      status: "ACTIVE",
    });

    if (created) {
      setSelected(created);
    }

    setShowCreate(false);

    setForm({
      name: "",
      description: "",
      priority: "MEDIUM",
      deadline: "",
    });
  };

  const handleProgressUpdate = async (
    project: Project,
    delta: number
  ) => {
    if (isProjectCompleted(project)) return;
    
    const newProgress = Math.min(
      100,
      Math.max(0, project.progress + delta)
    );

    const newStatus =
      newProgress >= 100 ? "COMPLETED" : project.status;

    const updated = await updateProject(project.id, {
      progress: newProgress,
      status: newStatus,
    });

    if (updated) {
      setSelected(updated);
    }
  };

  const handleMarkComplete = async (project: Project) => {
    if (isProjectCompleted(project)) return;
    
    const updated = await updateProject(project.id, {
      progress: 100,
      status: "COMPLETED",
    });

    if (updated) {
      setSelected(updated);
    }
  };

  const getDaysRemaining = (deadline?: string) => {
    if (!deadline) return null;

    const days = Math.ceil(
      (new Date(deadline).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (days < 0) return "Overdue";

    if (days === 0) return "Due today";

    return `${days} days remaining`;
  };

  const activeProjects = projects.filter(
    (p) => p.status === "ACTIVE"
  );

  const completedProjects = projects.filter(
    (p) => p.status === "COMPLETED"
  );

  const overdueProjects = projects.filter((p) => {
    if (!p.deadline) return false;

    return (
      new Date(p.deadline).getTime() < Date.now() &&
      p.status !== "COMPLETED"
    );
  });

  const lowExecutionProjects = projects.filter(
    (p) => p.progress < 40 && p.status === "ACTIVE"
  );

  const allTasks = projects.flatMap((p) => p.tasks || []);

  const completedTasks = allTasks.filter(
    (t) => t.status === "DONE"
  );

  const inProgressTasks = allTasks.filter(
    (t) => t.status === "IN_PROGRESS"
  );

  const blockedTasks = allTasks.filter(
    (t) => t.status === "REVIEW"
  );

  const executionRate =
    allTasks.length > 0
      ? Math.round((completedTasks.length / allTasks.length) * 100)
      : 0;

  const kanbanColumns = [
    {
      title: "To Do",
      status: "TODO",
    },
    {
      title: "In Progress",
      status: "IN_PROGRESS",
    },
    {
      title: "Review",
      status: "REVIEW",
    },
    {
      title: "Done",
      status: "DONE",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header */}

        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Execution Tracker
            </h1>

            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Monitor operational execution and strategic delivery
            </p>
          </div>

          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                <Plus className="w-4 h-4" />
                New Initiative
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Initiative</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Name *</Label>

                  <Input
                    value={form.name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        name: e.target.value,
                      })
                    }
                    placeholder="Initiative name"
                  />
                </div>

                <div>
                  <Label>Description</Label>

                  <Textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        description: e.target.value,
                      })
                    }
                    placeholder="Brief description"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Priority</Label>

                  <Select
                    value={form.priority}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        priority: v as any,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="HIGH">
                        High
                      </SelectItem>

                      <SelectItem value="MEDIUM">
                        Medium
                      </SelectItem>

                      <SelectItem value="LOW">
                        Low
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Deadline</Label>

                  <Input
                    type="date"
                    value={form.deadline}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        deadline: e.target.value,
                      })
                    }
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleCreate}
                >
                  Create Initiative
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* AI Banner */}

        <Card className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-500/10 dark:to-blue-500/10 border-purple-200 dark:border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-purple-500" />

              <div>
                <p className="text-sm font-medium">
                  AI Execution Insight
                </p>

                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {projects.length > 0
                    ? `${lowExecutionProjects.length} initiatives require attention. ${blockedTasks.length} tasks are waiting for review. Execution efficiency is currently ${executionRate}%.`
                    : "Create your first initiative to unlock AI execution insights."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrics */}

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/20">
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>

                <Badge variant="outline">
                  Active
                </Badge>
              </div>

              <div className="text-2xl font-bold">
                {activeProjects.length}
              </div>

              <div className="text-sm text-gray-500">
                Active Initiatives
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-500/20">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </div>

                <Badge className="bg-green-100 text-green-700">
                  Completed
                </Badge>
              </div>

              <div className="text-2xl font-bold">
                {completedTasks.length}
              </div>

              <div className="text-sm text-gray-500">
                Tasks Completed
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-500/20">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>

                <Badge className="bg-red-100 text-red-700">
                  Risk
                </Badge>
              </div>

              <div className="text-2xl font-bold">
                {overdueProjects.length}
              </div>

              <div className="text-sm text-gray-500">
                Overdue Initiatives
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-500/20">
                  <Target className="w-4 h-4 text-purple-600" />
                </div>

                <span className="text-sm font-medium">
                  {executionRate}%
                </span>
              </div>

              <div className="text-2xl font-bold">
                Efficiency
              </div>

              <Progress
                value={executionRate}
                className="h-2 mt-2"
              />
            </CardContent>
          </Card>
        </div>

        {/* Main Layout */}

        <div className="grid lg:grid-cols-3 gap-6">

          {/* Left Panel */}

          <div className="lg:col-span-1 space-y-4">

            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Strategic Initiatives
              </h2>

              <Badge variant="outline">
                {projects.length}
              </Badge>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : projects.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <KanbanSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />

                  <p className="text-sm text-gray-500">
                    No initiatives yet
                  </p>
                </CardContent>
              </Card>
            ) : (
              pagedProjects.map((project) => (
                <Card
                  key={project.id}
                  onClick={() => setSelected(project)}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selected?.id === project.id
                      ? "ring-2 ring-blue-500"
                      : ""
                  }`}
                >
                  <CardContent className="p-4">

                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold line-clamp-1">
                        {project.name}
                      </h3>

                      <Badge className={getStatusColor(project.status)}>
                        {project.status.toLowerCase()}
                      </Badge>
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Execution</span>
                        <span>{project.progress}%</span>
                      </div>

                      <Progress
                        value={project.progress}
                        className="h-2"
                      />
                    </div>

                    <div className="space-y-1 text-xs text-gray-500">

                      {project.deadline && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3" />

                          <span>
                            {new Date(
                              project.deadline
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span>
                          Priority:{" "}
                          {project.priority.toLowerCase()}
                        </span>

                        <span>
                          {project.tasks?.length || 0} tasks
                        </span>
                      </div>

                      {project.deadline && (
                        <div
                          className={`pt-1 ${
                            getDaysRemaining(project.deadline) ===
                            "Overdue"
                              ? "text-red-500"
                              : "text-gray-400"
                          }`}
                        >
                          {getDaysRemaining(project.deadline)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            {projects.length > PROJECTS_PER_PAGE && (
              <div className="flex items-center justify-between gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </Button>
                <span className="text-xs text-gray-500">
                  Page {currentPage + 1} of {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(pageCount - 1, currentPage + 1))}
                  disabled={currentPage >= pageCount - 1}
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Right Panel */}

          <div className="lg:col-span-2">

            {selected ? (
              <div className="space-y-6">

                {/* Overview */}

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{selected.name}</span>

                      <Badge className={getStatusColor(selected.status)}>
                        {selected.status.toLowerCase()}
                      </Badge>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-5">

                    {selected.description && (
                      <p className="text-gray-600 dark:text-gray-400">
                        {selected.description}
                      </p>
                    )}

                    <div className="grid md:grid-cols-3 gap-4">

                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5">
                        <div className="text-sm text-gray-500 mb-1">
                          Progress
                        </div>

                        <div className="text-2xl font-bold">
                          {selected.progress}%
                        </div>

                        <Progress
                          value={selected.progress}
                          className="mt-2"
                        />
                      </div>

                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5">
                        <div className="text-sm text-gray-500 mb-1">
                          Tasks
                        </div>

                        <div className="text-2xl font-bold">
                          {selected.tasks?.length || 0}
                        </div>

                        <div className="text-xs text-gray-400 mt-1">
                          {selected.tasks?.filter(
                            (t) => t.status === "DONE"
                          ).length || 0} completed
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5">
                        <div className="text-sm text-gray-500 mb-1">
                          Deadline
                        </div>

                        <div className="text-sm font-medium">
                          {selected.deadline
                            ? new Date(
                                selected.deadline
                              ).toLocaleDateString()
                            : "No deadline"}
                        </div>

                        {selected.deadline && (
                          <div className="text-xs text-gray-400 mt-1">
                            {getDaysRemaining(
                              selected.deadline
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions - Buttons disabled when project is completed */}
                    <div className="flex flex-wrap gap-3">

                      <Button
                        className="gap-2"
                        onClick={() =>
                          handleProgressUpdate(selected, 10)
                        }
                        disabled={isProjectCompleted(selected)}
                      >
                        <Play className="w-4 h-4" />
                        Progress +10%
                      </Button>

                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() =>
                          handleProgressUpdate(selected, -10)
                        }
                        disabled={isProjectCompleted(selected)}
                      >
                        <PauseCircle className="w-4 h-4" />
                        Rollback
                      </Button>

                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() =>
                          handleMarkComplete(selected)
                        }
                        disabled={isProjectCompleted(selected)}
                      >
                        <Flag className="w-4 h-4" />
                        Mark Complete
                      </Button>
                    </div>
                    
                    {/* Completed badge */}
                    {isProjectCompleted(selected) && (
                      <div className="p-3 bg-green-50 dark:bg-green-500/10 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-700 dark:text-green-300">
                            This initiative has been completed
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Kanban */}

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <KanbanSquare className="w-5 h-5" />
                      Execution Board
                    </CardTitle>
                  </CardHeader>

                  <CardContent>

                    <div className="grid md:grid-cols-4 gap-4">

                      {kanbanColumns.map((column) => (
                        <div
                          key={column.status}
                          className="rounded-xl bg-gray-100 dark:bg-white/5 p-3"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-medium text-sm">
                              {column.title}
                            </h3>

                            <Badge variant="outline">
                              {
                                selected.tasks?.filter(
                                  (t) =>
                                    t.status === column.status
                                ).length
                              }
                            </Badge>
                          </div>

                          <div className="space-y-2">

                            {selected.tasks
                              ?.filter(
                                (t) =>
                                  t.status === column.status
                              )
                              .map((task: Task) => (
                                <div
                                  key={task.id}
                                  className="p-3 rounded-lg bg-white dark:bg-[#112B4A] border border-gray-200 dark:border-white/5"
                                >
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <p className="text-sm font-medium">
                                      {task.title}
                                    </p>

                                    <Badge
                                      className={getTaskStatusColor(
                                        task.status
                                      )}
                                    >
                                      {task.status}
                                    </Badge>
                                  </div>

                                  {task.description && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                                      {task.description}
                                    </p>
                                  )}

                                  <div className="space-y-1 text-xs text-gray-400">

                                    {task.assignedTo && (
                                      <div className="flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        {task.assignedTo}
                                      </div>
                                    )}

                                    {task.dueDate && (
                                      <div className="flex items-center gap-1">
                                        <Clock3 className="w-3 h-3" />
                                        {new Date(
                                          task.dueDate
                                        ).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}

                            {selected.tasks?.filter(
                              (t) =>
                                t.status === column.status
                            ).length === 0 && (
                              <div className="text-center py-6 text-xs text-gray-400">
                                No tasks
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Activity Feed */}

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Execution Activity
                    </CardTitle>
                  </CardHeader>

                  <CardContent>

                    <div className="space-y-3">

                      {selected.tasks?.slice(0, 6).map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/5"
                        >
                          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/20">
                            <Activity className="w-4 h-4 text-blue-600" />
                          </div>

                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {task.title}
                            </p>

                            <p className="text-xs text-gray-500">
                              Status updated to{" "}
                              {task.status.replace("_", " ")}
                            </p>
                          </div>

                          <Badge
                            className={getTaskStatusColor(
                              task.status
                            )}
                          >
                            {task.status}
                          </Badge>
                        </div>
                      ))}

                      {selected.tasks?.length === 0 && (
                        <div className="text-center py-8">
                          <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />

                          <p className="text-sm text-gray-500">
                            No execution activity yet
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />

                  <p className="text-gray-500">
                    Select an initiative to monitor execution
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* OKR execution — key results are updated in place so progress is
            tracked alongside initiatives. */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              Objective Tracking
              <Badge variant="outline" className="ml-auto">{okrs.length} OKRs</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {okrs.length === 0 ? (
              <p className="text-sm text-gray-500">
                No objectives yet. Create them on the Performance page — progress
                recorded there shows up here automatically.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {okrs.slice(0, 4).map((okr) => (
                  <div key={okr.id} className="rounded-lg border border-gray-200 dark:border-white/10 p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-medium text-sm">{okr.objective}</p>
                      <Badge variant="outline">{okr.progress}%</Badge>
                    </div>
                    <Progress value={okr.progress} className="h-1.5 mb-3" />
                    <div className="space-y-2">
                      {okr.keyResults?.map((kr) => {
                        const pct = kr.target > 0 ? Math.min(100, Math.round((kr.current / kr.target) * 100)) : 0;
                        return (
                          <div key={kr.id} className="flex items-center gap-2 text-xs">
                            <span className="flex-1 text-gray-600 dark:text-gray-400 line-clamp-1">{kr.title}</span>
                            <span className="text-gray-500">{kr.current}/{kr.target}{kr.unit}</span>
                            <Button size="icon-xs" variant="outline" onClick={() => adjustKeyResult(kr.id, -1)} title="Decrease">
                              <Minus className="w-3 h-3" />
                            </Button>
                            <Button size="icon-xs" variant="outline" onClick={() => adjustKeyResult(kr.id, 1)} title="Increase">
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}