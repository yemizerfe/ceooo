"use client";

import { debugError } from "@/lib/logger";
import { useEffect, useMemo, useState } from "react";
import {
  Target,
  Brain,
  Loader2,
  Plus,
  Download,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Calendar,
  Sparkles,
  DollarSign,
  Users,
  Building2,
  Activity,
  Flame,
  Zap,
  Shield,
  Eye,
  LineChart,
  PieChart,
  TrendingDown,
  Award,
  Clock,
  UserCheck,
  Heart,
  Smile,
  Briefcase,
  Flag,
  XCircle,
  CheckCircle,
  HelpCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useFinancialStore } from "@/store/financialStore";

// Types
interface KeyResult {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
}

interface OKR {
  id: string;
  objective: string;
  description: string;
  owner: string;
  quarter: string;
  year: number;
  keyResults: KeyResult[];
  status: "on_track" | "at_risk" | "behind" | "completed";
}

interface KPI {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: "up" | "down" | "stable";
  category: "financial" | "customer" | "employee" | "operational";
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";

export default function CEOPerformancePage() {
  const {
    okrs = [],
    fetchOKRs,
    createOKR,
    isLoading,
  } = useFinancialStore();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState("Q2");
  const [selectedYear, setSelectedYear] = useState(2026);
  const [activeTab, setActiveTab] = useState("overview");

  const [form, setForm] = useState({
    objective: "",
    description: "",
    owner: "",
    quarter: "Q2",
    year: 2026,
  });

  useEffect(() => {
    fetchOKRs();
  }, [fetchOKRs]);

  // ---- Real company data: every page plus connected integrations ----
  const [context, setContext] = useState<any>(null);
  const [supervisor, setSupervisor] = useState<any>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const [contextRes, supervisorRes] = await Promise.all([
          fetch(`${API_BASE}/api/ai/company-context`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/api/ai/supervisor`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const contextJson = await contextRes.json();
        const supervisorJson = await supervisorRes.json();
        if (!active) return;
        if (contextJson.success) setContext(contextJson.data);
        if (supervisorJson.success) setSupervisor(supervisorJson.data);
      } catch (error) {
        debugError("Performance data load failed:", error);
      } finally {
        if (active) setDataLoaded(true);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const areaScore = (name: string) =>
    Math.round(supervisor?.areas?.find((area: any) => area.area === name)?.score || 0);
  const teamScore = context?.team?.length
    ? Math.round(
        context.team.reduce((total: number, member: any) => total + (member.performanceScore || 0), 0) /
          context.team.length
      )
    : 0;

  // Company Health Score — derived from the AI supervisor's scored areas.
  const companyHealthScore = useMemo(() => {
    const financial = areaScore("Financial health");
    const customer = areaScore("Relationships");
    const employee = teamScore;
    const operational = areaScore("Execution");
    const score = supervisor?.healthScore ?? Math.round((financial + customer + employee + operational) / 4);
    return {
      score,
      financial,
      customer,
      employee,
      operational,
      rating:
        (supervisor?.coverage?.score ?? 0) < 40
          ? "Limited data"
          : score >= 80
            ? "Excellent"
            : score >= 60
              ? "Good"
              : score >= 40
                ? "Warning"
                : "Critical",
    };
  }, [supervisor, teamScore]);

  const financialKPIs: KPI[] = useMemo(() => {
    if (!context) return [];
    const f = context.financials;
    return [
      {
        id: "profit-margin",
        name: "Profit Margin",
        value: f.profitMargin,
        target: 25,
        unit: "%",
        trend: f.profitMargin >= 0 ? "up" : "down",
        category: "financial",
      },
      {
        id: "budget-usage",
        name: "Budget Utilization",
        value: f.budgetUtilization,
        target: 100,
        unit: "%",
        trend: f.budgetUtilization > 90 ? "down" : "stable",
        category: "financial",
      },
      {
        id: "net-profit",
        name: "Net Profit",
        value: Math.round(f.profit),
        target: Math.max(Math.round(f.income), 1),
        unit: "",
        trend: f.profit >= 0 ? "up" : "down",
        category: "financial",
      },
      {
        id: "monthly-burn",
        name: "Monthly Spend",
        value: Math.round(f.monthExpense),
        target: Math.max(Math.round(f.monthIncome), Math.round(f.monthExpense), 1),
        unit: "",
        trend: f.monthIncome >= f.monthExpense ? "up" : "down",
        category: "financial",
      },
    ];
  }, [context]);

  const customerKPIs: KPI[] = useMemo(() => {
    if (!context) return [];
    const total = context.counts.stakeholders || 0;
    const healthy = total - (context.counts.lowEngagementStakeholders || 0);
    const deals = context.external?.deals?.length || 0;
    return [
      {
        id: "engagement",
        name: "Stakeholder Engagement",
        value: total ? Math.round((healthy / total) * 100) : 0,
        target: 100,
        unit: "%",
        trend: "stable",
        category: "customer",
      },
      {
        id: "pipeline",
        name: "External Pipeline Deals",
        value: deals,
        target: Math.max(deals, 1),
        unit: "",
        trend: deals > 0 ? "up" : "stable",
        category: "customer",
      },
      {
        id: "contacts",
        name: "Synced Contacts",
        value: context.external?.stakeholders?.length || 0,
        target: Math.max(context.external?.stakeholders?.length || 0, 1),
        unit: "",
        trend: "stable",
        category: "customer",
      },
    ];
  }, [context]);

  const employeeKPIs: KPI[] = useMemo(() => {
    if (!context) return [];
    return [
      {
        id: "team-performance",
        name: "Average Team Performance",
        value: teamScore,
        target: 100,
        unit: "/100",
        trend: teamScore >= 70 ? "up" : "down",
        category: "employee",
      },
      {
        id: "team-size",
        name: "Team Members",
        value: context.counts.teamMembers || 0,
        target: Math.max(context.counts.teamMembers || 0, 1),
        unit: "",
        trend: "stable",
        category: "employee",
      },
    ];
  }, [context, teamScore]);

  const operationalKPIs: KPI[] = useMemo(() => {
    if (!context) return [];
    const projectProgress = context.projects?.length
      ? Math.round(
          context.projects.reduce((total: number, project: any) => total + (project.progress || 0), 0) /
            context.projects.length
        )
      : 0;
    const taskCompletion = context.counts.tasks
      ? Math.round(((context.counts.tasks - context.counts.openTasks) / context.counts.tasks) * 100)
      : 0;
    const okrProgress = context.okrs?.length
      ? Math.round(
          context.okrs.reduce((total: number, okr: any) => total + (okr.progress || 0), 0) /
            context.okrs.length
        )
      : 0;
    return [
      {
        id: "okr-progress",
        name: "OKR Progress",
        value: okrProgress,
        target: 100,
        unit: "%",
        trend: okrProgress >= 60 ? "up" : "down",
        category: "operational",
      },
      {
        id: "project-progress",
        name: "Portfolio Progress",
        value: projectProgress,
        target: 100,
        unit: "%",
        trend: projectProgress >= 50 ? "up" : "down",
        category: "operational",
      },
      {
        id: "task-completion",
        name: "Task Completion",
        value: taskCompletion,
        target: 100,
        unit: "%",
        trend: taskCompletion >= 60 ? "up" : "down",
        category: "operational",
      },
      {
        id: "overdue-tasks",
        name: "Overdue Tasks",
        value: context.counts.overdueTasks || 0,
        target: Math.max(context.counts.openTasks || 0, 1),
        unit: "",
        trend: (context.counts.overdueTasks || 0) === 0 ? "up" : "down",
        category: "operational",
      },
    ];
  }, [context]);

  // Strategic Initiatives — real projects, including synced ones.
  const strategicInitiatives = useMemo<Array<{
    id: string;
    name: string;
    status: string;
    progress: number;
    owner: string;
    deadline: string;
    priority: string;
  }>>(() => {
    if (!context?.projects?.length) return [];
    return context.projects.slice(0, 6).map((project: any, index: number) => ({
      id: `${project.source}-${index}`,
      name: project.name,
      status:
        project.progress >= 100
          ? "completed"
          : project.progress >= 60
            ? "on_track"
            : project.progress >= 35
              ? "at_risk"
              : "behind",
      progress: project.progress || 0,
      owner: project.source === "app" ? "In-app project" : project.source,
      deadline: project.deadline ? new Date(project.deadline).toLocaleDateString() : "No deadline",
      priority: (project.priority || "MEDIUM").toLowerCase(),
    }));
  }, [context]);

  // Risk Register — supervisor risks plus real overdue/negative signals.
  const risks = useMemo(() => {
    const items: Array<{ id: string; name: string; severity: string; probability: number; impact: string; mitigation: string }> = [];
    (supervisor?.risks || []).forEach((risk: string, index: number) => {
      items.push({
        id: `risk-${index}`,
        name: risk,
        severity: "medium",
        probability: 50,
        impact: "Medium",
        mitigation: "Assign an owner and a review date on the relevant page.",
      });
    });
    if (context?.financials?.profit < 0) {
      items.push({
        id: "cash-flow",
        name: "Negative cash flow",
        severity: "critical",
        probability: 70,
        impact: "Critical",
        mitigation: "Reduce committed spend or accelerate collections.",
      });
    }
    if (context?.counts?.overdueTasks > 0) {
      items.push({
        id: "overdue",
        name: `${context.counts.overdueTasks} overdue tasks`,
        severity: "high",
        probability: 80,
        impact: "High",
        mitigation: "Re-plan execution in the Execution Tracker.",
      });
    }
    return items;
  }, [supervisor, context]);

  const exportPerformance = () => {
    const rows = [
      ["Metric", "Value", "Target", "Unit"],
      ...[...financialKPIs, ...customerKPIs, ...employeeKPIs, ...operationalKPIs].map((kpi) => [
        kpi.name,
        String(kpi.value),
        String(kpi.target),
        kpi.unit,
      ]),
      [],
      ["OKR", "Progress"],
      ...(okrs || []).map((okr) => [okr.objective, `${okr.progress}%`]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `company-performance-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const performanceMetrics = useMemo(() => {
    const safeOkrs = okrs || [];

    const totalOKRs = safeOkrs.length;

    const completed = safeOkrs.filter((o) => {
      if (!o.keyResults || o.keyResults.length === 0) return false;

      const avg =
        o.keyResults.reduce(
          (sum, kr) => sum + (kr.current / kr.target) * 100,
          0
        ) / o.keyResults.length;

      return avg >= 100;
    }).length;

    const onTrack = safeOkrs.filter((o) => {
      if (!o.keyResults || o.keyResults.length === 0) return false;

      const avg =
        o.keyResults.reduce(
          (sum, kr) => sum + (kr.current / kr.target) * 100,
          0
        ) / o.keyResults.length;

      return avg >= 70;
    }).length;

    const atRisk = safeOkrs.filter((o) => {
      if (!o.keyResults || o.keyResults.length === 0) return true;

      const avg =
        o.keyResults.reduce(
          (sum, kr) => sum + (kr.current / kr.target) * 100,
          0
        ) / o.keyResults.length;

      return avg < 40;
    }).length;

    const avgProgress =
      totalOKRs > 0
        ? Math.round(
            safeOkrs.reduce((sum, okr) => {
              if (!okr.keyResults || okr.keyResults.length === 0) return sum;

              const progress =
                okr.keyResults.reduce(
                  (s, kr) => s + (kr.current / kr.target) * 100,
                  0
                ) / okr.keyResults.length;

              return sum + progress;
            }, 0) / totalOKRs
          )
        : 0;

    return {
      totalOKRs,
      completed,
      onTrack,
      atRisk,
      avgProgress,
    };
  }, [okrs]);

  const handleCreate = async () => {
    if (!form.objective) return;

    await createOKR({
      objective: form.objective,
      description: form.description,
      owner: form.owner,
      quarter: form.quarter,
      year: form.year,
    });

    setShowCreate(false);
    setForm({
      objective: "",
      description: "",
      owner: "",
      quarter: "Q2",
      year: 2026,
    });
  };

  const getProgressColor = (value: number) => {
    if (value >= 80) return "text-green-600 dark:text-green-400";
    if (value >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "on_track":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">On Track</Badge>;
      case "at_risk":
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">At Risk</Badge>;
      case "behind":
        return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400">Behind</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-slate-300">In Progress</Badge>;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getKPIProgress = (current: number, target: number) => {
    return Math.min(100, Math.round((current / target) * 100));
  };

  const renderKPIList = (kpis: KPI[]) => (
    <div className="grid gap-4">
      {kpis.map((kpi) => {
        const progress = getKPIProgress(kpi.value, kpi.target);
        return (
          <div key={kpi.id} className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{kpi.name}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold">
                    {kpi.value}{kpi.unit}
                  </span>
                  <span className="text-sm text-gray-500">
                    / {kpi.target}{kpi.unit}
                  </span>
                  {getTrendIcon(kpi.trend)}
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {progress}%
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              CEO Performance Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Executive overview of company health, OKRs, KPIs & strategic performance
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <div className="flex gap-2">
              <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Q1">Q1</SelectItem>
                  <SelectItem value="Q2">Q2</SelectItem>
                  <SelectItem value="Q3">Q3</SelectItem>
                  <SelectItem value="Q4">Q4</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2027">2027</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={exportPerformance} className="gap-2 border-gray-200 dark:border-white/10">
              <Download className="w-4 h-4" />
              Export Report
            </Button>
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                  <Plus className="w-4 h-4" />
                  Add OKR
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create New OKR</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Objective *</Label>
                    <Input
                      value={form.objective}
                      onChange={(e) => setForm({ ...form, objective: e.target.value })}
                      placeholder="Increase enterprise revenue growth"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      rows={4}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Describe the objective and expected outcome..."
                    />
                  </div>
                  <div>
                    <Label>Owner</Label>
                    <Input
                      value={form.owner}
                      onChange={(e) => setForm({ ...form, owner: e.target.value })}
                      placeholder="CEO / COO / Growth Team"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Quarter</Label>
                      <Select value={form.quarter} onValueChange={(v) => setForm({ ...form, quarter: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Q1">Q1</SelectItem>
                          <SelectItem value="Q2">Q2</SelectItem>
                          <SelectItem value="Q3">Q3</SelectItem>
                          <SelectItem value="Q4">Q4</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Year</Label>
                      <Input
                        type="number"
                        value={form.year}
                        onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreate} className="w-full bg-blue-600 hover:bg-blue-700">
                    Create OKR
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Company Health Score */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          <Card className="lg:col-span-2 bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm opacity-90">Company Health Score</p>
                  <p className="text-5xl font-bold mt-1">{companyHealthScore.score}</p>
                </div>
                <Award className="w-12 h-12 opacity-90" />
              </div>
              <Badge className="bg-white/20 text-white border-0">
                {companyHealthScore.rating}
              </Badge>
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="opacity-75">Financial</span>
                    <p className="font-semibold">{companyHealthScore.financial}%</p>
                  </div>
                  <div>
                    <span className="opacity-75">Customer</span>
                    <p className="font-semibold">{companyHealthScore.customer}%</p>
                  </div>
                  <div>
                    <span className="opacity-75">Employee</span>
                    <p className="font-semibold">{companyHealthScore.employee}%</p>
                  </div>
                  <div>
                    <span className="opacity-75">Operational</span>
                    <p className="font-semibold">{companyHealthScore.operational}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-blue-500" />
                <h3 className="font-semibold">Key Financials</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Recorded income</span>
                    <span className="font-medium">${Math.round(context?.financials?.income || 0).toLocaleString()}</span>
                  </div>
                  <Progress value={context?.financials?.income ? 100 : 0} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Profit margin</span>
                    <span className="font-medium">{context?.financials?.profitMargin || 0}% / 25%</span>
                  </div>
                  <Progress value={Math.min(100, Math.max(0, context?.financials?.profitMargin || 0) * 3)} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Budget used</span>
                    <span className="font-medium">{context?.financials?.budgetUtilization || 0}%</span>
                  </div>
                  <Progress value={context?.financials?.budgetUtilization || 0} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-green-500" />
                <h3 className="font-semibold">Customer Health</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Stakeholder engagement</span>
                    <span className="font-medium">
                      {context?.counts?.stakeholders
                        ? Math.round(
                            ((context.counts.stakeholders - context.counts.lowEngagementStakeholders) /
                              context.counts.stakeholders) *
                              100
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      context?.counts?.stakeholders
                        ? Math.round(
                            ((context.counts.stakeholders - context.counts.lowEngagementStakeholders) /
                              context.counts.stakeholders) *
                              100
                          )
                        : 0
                    }
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Synced contacts</span>
                    <span className="font-medium">{context?.external?.stakeholders?.length || 0}</span>
                  </div>
                  <Progress value={context?.external?.stakeholders?.length ? 100 : 0} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Pipeline deals</span>
                    <span className="font-medium">{context?.external?.deals?.length || 0}</span>
                  </div>
                  <Progress value={context?.external?.deals?.length ? 100 : 0} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4 text-purple-500" />
                <h3 className="font-semibold">Employee Health</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Average performance</span>
                    <span className="font-medium">{teamScore} / 100</span>
                  </div>
                  <Progress value={teamScore} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Team members</span>
                    <span className="font-medium">{context?.counts?.teamMembers || 0}</span>
                  </div>
                  <Progress value={context?.counts?.teamMembers ? 100 : 0} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>OKR progress</span>
                    <span className="font-medium">
                      {context?.okrs?.length
                        ? Math.round(
                            context.okrs.reduce((total: number, okr: any) => total + (okr.progress || 0), 0) /
                              context.okrs.length
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      context?.okrs?.length
                        ? Math.round(
                            context.okrs.reduce((total: number, okr: any) => total + (okr.progress || 0), 0) /
                              context.okrs.length
                          )
                        : 0
                    }
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Insight */}
        <Card className="mb-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-purple-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">AI Executive Insight</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Company health score is {companyHealthScore.score} - {companyHealthScore.rating}. 
                  {context?.counts?.overdueTasks > 0
                    ? `${context.counts.overdueTasks} tasks are overdue.`
                    : "No overdue tasks across the portfolio."}{" "}
                  {context?.counts?.externalProviders
                    ? `${context.counts.externalRecords} records from ${context.counts.externalProviders} connected system(s) are included.`
                    : "Connect integrations to include external data."} 
                  {supervisor?.coverage?.score < 60
                    ? `Data coverage is ${supervisor?.coverage?.score}% — add ${supervisor?.coverage?.missing?.join(", ") || "more records"} for a sharper assessment.`
                    : "Every data source has records, so this score reflects the whole company."}{" "}
                  {supervisor?.recommendations?.[0]
                    ? `Next action: ${supervisor.recommendations[0].title} — ${supervisor.recommendations[0].detail}`
                    : "No blocking actions detected."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid grid-cols-5 lg:w-auto w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="okrs">OKRs</TabsTrigger>
            <TabsTrigger value="kpis">KPIs</TabsTrigger>
            <TabsTrigger value="initiatives">Initiatives</TabsTrigger>
            <TabsTrigger value="risks">Risks</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* OKR Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <Target className="w-5 h-5 text-blue-500" />
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <div className="text-3xl font-bold">{performanceMetrics.totalOKRs}</div>
                  <p className="text-sm text-gray-500 mt-1">Total OKRs</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <Badge className="bg-green-100 text-green-700">Completed</Badge>
                  </div>
                  <div className="text-3xl font-bold">{performanceMetrics.completed}</div>
                  <p className="text-sm text-gray-500 mt-1">OKRs Completed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <TrendingUp className="w-5 h-5 text-yellow-500" />
                    <Badge className="bg-yellow-100 text-yellow-700">On Track</Badge>
                  </div>
                  <div className="text-3xl font-bold">{performanceMetrics.onTrack}</div>
                  <p className="text-sm text-gray-500 mt-1">OKRs On Track</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <Badge className="bg-red-100 text-red-700">At Risk</Badge>
                  </div>
                  <div className="text-3xl font-bold">{performanceMetrics.atRisk}</div>
                  <p className="text-sm text-gray-500 mt-1">OKRs At Risk</p>
                </CardContent>
              </Card>
            </div>

            {/* Strategic Initiatives Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Strategic Initiatives</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {strategicInitiatives.slice(0, 3).map((initiative) => (
                    <div key={initiative.id} className="p-4 rounded-xl border border-gray-200 dark:border-white/10">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{initiative.name}</p>
                          <p className="text-sm text-gray-500">Owner: {initiative.owner}</p>
                        </div>
                        {getStatusBadge(initiative.status)}
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{initiative.progress}%</span>
                        </div>
                        <Progress value={initiative.progress} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* OKRs Tab */}
          <TabsContent value="okrs" className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : okrs.length === 0 ? (
              <div className="text-center py-20">
                <Target className="w-14 h-14 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No OKRs Yet</h3>
                <p className="text-gray-500 mb-6">Create your first OKR to begin tracking company performance.</p>
                <Button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700">
                  Add First OKR
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {okrs.map((okr) => {
                  const progress = okr.keyResults && okr.keyResults.length > 0
                    ? Math.round(okr.keyResults.reduce((sum, kr) => sum + (kr.current / kr.target) * 100, 0) / okr.keyResults.length)
                    : 0;

                  return (
                    <Card key={okr.id} className="border-gray-200 dark:border-white/10">
                      <CardHeader>
                        <div className="flex items-start justify-between flex-wrap gap-4">
                          <div>
                            <CardTitle className="text-xl">{okr.objective}</CardTitle>
                            {okr.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{okr.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline">{okr.quarter}</Badge>
                            <Badge variant="secondary">{okr.year}</Badge>
                            <Badge className={progress >= 80 ? "bg-green-100 text-green-700" : progress >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}>
                              {progress >= 80 ? "On Track" : progress >= 50 ? "Moderate" : "At Risk"}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Overall Progress</span>
                            <span className={`text-sm font-semibold ${getProgressColor(progress)}`}>{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        <div className="grid md:grid-cols-3 gap-4 mb-6">
                          <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                              <Calendar className="w-4 h-4" />
                              Quarter
                            </div>
                            <div className="font-semibold">{okr.quarter} {okr.year}</div>
                          </div>
                          <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                              <Sparkles className="w-4 h-4" />
                              Key Results
                            </div>
                            <div className="font-semibold">{okr.keyResults?.length || 0}</div>
                          </div>
                          <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                              <Target className="w-4 h-4" />
                              Owner
                            </div>
                            <div className="font-semibold">{okr.owner || "Not Assigned"}</div>
                          </div>
                        </div>

                        {okr.keyResults && okr.keyResults.length > 0 ? (
                          <div className="space-y-4">
                            <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Key Results</h4>
                            {okr.keyResults.map((kr) => {
                              const pct = Math.min(100, Math.round((kr.current / kr.target) * 100));
                              return (
                                <div key={kr.id} className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.03]">
                                  <div className="flex items-start justify-between mb-2 gap-4">
                                    <div>
                                      <p className="font-medium">{kr.title}</p>
                                      <p className="text-sm text-gray-500 mt-1">{kr.current} / {kr.target} {kr.unit}</p>
                                    </div>
                                    <span className={`text-sm font-semibold ${getProgressColor(pct)}`}>{pct}%</span>
                                  </div>
                                  <Progress value={pct} className="h-1.5" />
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                              <div>
                                <p className="font-medium text-sm">No Key Results Added</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Add measurable key results to properly track progress.</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* KPIs Tab */}
          <TabsContent value="kpis" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-500" />
                  Financial KPIs
                </h3>
                {renderKPIList(financialKPIs)}
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-500" />
                  Customer KPIs
                </h3>
                {renderKPIList(customerKPIs)}
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-purple-500" />
                  Employee KPIs
                </h3>
                {renderKPIList(employeeKPIs)}
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-500" />
                  Operational KPIs
                </h3>
                {renderKPIList(operationalKPIs)}
              </div>
            </div>
          </TabsContent>

          {/* Strategic Initiatives Tab */}
          <TabsContent value="initiatives" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Strategic Initiatives</CardTitle>
                <p className="text-sm text-gray-500">Key company-wide strategic projects and their progress</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {strategicInitiatives.map((initiative) => (
                    <div key={initiative.id} className="p-5 rounded-xl border border-gray-200 dark:border-white/10">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Flag className="w-4 h-4 text-blue-500" />
                            <h3 className="font-semibold text-lg">{initiative.name}</h3>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span>Owner: {initiative.owner}</span>
                            <span>Deadline: {initiative.deadline}</span>
                          </div>
                        </div>
                        {getStatusBadge(initiative.status)}
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span className="font-medium">{initiative.progress}%</span>
                        </div>
                        <Progress value={initiative.progress} className="h-2" />
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/10">
                        <div className="flex items-center gap-2">
                          <Badge variant={initiative.priority === "critical" ? "destructive" : initiative.priority === "high" ? "default" : "secondary"}>
                            {initiative.priority.toUpperCase()} Priority
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Risks Tab */}
          <TabsContent value="risks" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Risk Register</CardTitle>
                <p className="text-sm text-gray-500">Identified risks and mitigation strategies</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {risks.map((risk) => (
                    <div key={risk.id} className="p-5 rounded-xl border border-gray-200 dark:border-white/10">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-orange-500" />
                          <h3 className="font-semibold">{risk.name}</h3>
                        </div>
                        <Badge className={
                          risk.severity === "critical" ? "bg-red-100 text-red-700" :
                          risk.severity === "high" ? "bg-orange-100 text-orange-700" :
                          "bg-yellow-100 text-yellow-700"
                        }>
                          {risk.severity.toUpperCase()} Severity
                        </Badge>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4 text-sm mb-3">
                        <div className="p-2 rounded-lg bg-gray-50 dark:bg-white/5">
                          <span className="text-gray-500">Probability:</span>
                          <span className="ml-2 font-medium">{risk.probability}%</span>
                        </div>
                        <div className="p-2 rounded-lg bg-gray-50 dark:bg-white/5">
                          <span className="text-gray-500">Impact:</span>
                          <span className="ml-2 font-medium">{risk.impact}</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
                        <p className="text-sm">
                          <span className="font-medium">Mitigation:</span> {risk.mitigation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}