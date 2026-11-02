"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Wallet,
  CreditCard,
  PiggyBank,
  TrendingUp,
  AlertTriangle,
  Plus,
  Download,
  Loader2,
  Brain,
  Building2,
  Sparkles,
  ArrowUpRight,
  Activity,
  ShieldAlert,
} from "lucide-react";

import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart as RePieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useFinancialStore } from "@/store/financialStore";

export default function BudgetPage() {
  const {
    budgets,
    fetchBudgets,
    createBudget,
    isLoading,
  } = useFinancialStore();

  const [showAdd, setShowAdd] = useState(false);

  const [form, setForm] = useState({
    name: "",
    category: "",
    allocated: "",
    period: "MONTHLY" as any,
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const totalBudget = budgets.reduce((s, b) => s + b.allocated, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

  const remaining = totalBudget - totalSpent;

  const spendPct =
    totalBudget > 0
      ? Math.round((totalSpent / totalBudget) * 100)
      : 0;

  // Real CSV export of the budgets currently on screen - the button used to be
  // decorative, which made the table impossible to take into a board pack.
  const exportBudgets = () => {
    if (!budgets.length) return;
    const headers = ["Budget", "Category", "Allocated", "Spent", "Remaining", "Utilization %"];
    const rows = budgets.map((budget) => {
      const spent = Number(budget.spent) || 0;
      const allocated = Number(budget.allocated) || 0;
      const utilization = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;
      return [
        budget.name,
        budget.category,
        allocated.toFixed(2),
        spent.toFixed(2),
        (allocated - spent).toFixed(2),
        String(utilization),
      ];
    });
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `budgets-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const fmt = (n: number) =>
    n >= 1000000
      ? `$${(n / 1000000).toFixed(2)}M`
      : n >= 1000
      ? `$${(n / 1000).toFixed(0)}K`
      : `$${n}`;

  const handleCreate = async () => {
    if (
      !form.name ||
      !form.category ||
      !form.allocated ||
      !form.startDate ||
      !form.endDate
    )
      return;

    await createBudget({
      ...form,
      allocated: Number(form.allocated),
    });

    setShowAdd(false);

    setForm({
      name: "",
      category: "",
      allocated: "",
      period: "MONTHLY",
      startDate: "",
      endDate: "",
    });
  };

  const budgetHealthScore = useMemo(() => {
    let score = 100;

    if (spendPct > 90) score -= 30;
    else if (spendPct > 75) score -= 15;

    if (remaining < 0) score -= 25;

    return Math.max(score, 0);
  }, [spendPct, remaining]);

  const aiInsight = useMemo(() => {
    if (budgets.length === 0) {
      return "Create budgets to begin AI-powered financial monitoring and cost optimization.";
    }

    if (spendPct > 90) {
      return "Budget utilization is critically high. Multiple departments are approaching spending limits and cost optimization is recommended immediately.";
    }

    if (spendPct > 70) {
      return "Operational spending is increasing steadily. Current burn rate remains manageable but should be monitored closely.";
    }

    return "Financial allocation remains healthy with stable operational spending across departments.";
  }, [budgets.length, spendPct]);

  const spendingTrend = [
    { month: "Jan", allocated: 120000, spent: 82000 },
    { month: "Feb", allocated: 135000, spent: 91000 },
    { month: "Mar", allocated: 148000, spent: 102000 },
    { month: "Apr", allocated: 160000, spent: 118000 },
    { month: "May", allocated: 172000, spent: 127000 },
    { month: "Jun", allocated: 190000, spent: 139000 },
  ];

  const departmentData = [
    { department: "Engineering", usage: 64 },
    { department: "Marketing", usage: 92 },
    { department: "Operations", usage: 71 },
    { department: "HR", usage: 44 },
  ];

  const expenseBreakdown = [
    { name: "Engineering", value: 40 },
    { name: "Marketing", value: 28 },
    { name: "Operations", value: 20 },
    { name: "HR", value: 12 },
  ];

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Budget & Cost Intelligence
            </h1>

            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Executive budgeting, forecasting & operational cost management
            </p>
          </div>

          <div className="flex gap-3">
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                  <Plus className="w-4 h-4" />
                  Create Budget
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Budget</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label>Budget Name *</Label>

                    <Input
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="e.g. Marketing Q3"
                    />
                  </div>

                  <div>
                    <Label>Category *</Label>

                    <Input
                      value={form.category}
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value })
                      }
                      placeholder="Engineering, Marketing..."
                    />
                  </div>

                  <div>
                    <Label>Allocated Amount *</Label>

                    <Input
                      type="number"
                      value={form.allocated}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          allocated: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label>Budget Period</Label>

                    <Select
                      value={form.period}
                      onValueChange={(v) =>
                        setForm({ ...form, period: v as any })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="MONTHLY">
                          Monthly
                        </SelectItem>

                        <SelectItem value="QUARTERLY">
                          Quarterly
                        </SelectItem>

                        <SelectItem value="ANNUAL">
                          Annual
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Start Date *</Label>

                    <Input
                      type="date"
                      value={form.startDate}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          startDate: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label>End Date *</Label>

                    <Input
                      type="date"
                      value={form.endDate}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          endDate: e.target.value,
                        })
                      }
                    />
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleCreate}
                  >
                    Create Budget
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              className="gap-2"
              onClick={exportBudgets}
              disabled={isLoading || budgets.length === 0}
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        {/* AI Insight */}

        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10 dark:border-purple-500/20">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-500/20">
                <Brain className="w-5 h-5 text-purple-600" />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    AI Executive Budget Insight
                  </p>

                  <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
                    Live Analysis
                  </Badge>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {aiInsight}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">

          <Card className="border-none shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-500/20">
                  <Wallet className="w-5 h-5 text-blue-600" />
                </div>

                <Badge variant="outline">
                  Budget
                </Badge>
              </div>

              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {fmt(totalBudget)}
              </div>

              <div className="text-sm text-gray-500 mt-1">
                Total Allocated
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-green-100 dark:bg-green-500/20">
                  <CreditCard className="w-5 h-5 text-green-600" />
                </div>

                <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300">
                  Active
                </Badge>
              </div>

              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {fmt(totalSpent)}
              </div>

              <div className="text-sm text-gray-500 mt-1">
                Total Spent
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-yellow-100 dark:bg-yellow-500/20">
                  <PiggyBank className="w-5 h-5 text-yellow-600" />
                </div>

                <Badge
                  className={
                    remaining >= 0
                      ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                      : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                  }
                >
                  {remaining >= 0 ? "Under Budget" : "Over Budget"}
                </Badge>
              </div>

              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {fmt(Math.abs(remaining))}
              </div>

              <div className="text-sm text-gray-500 mt-1">
                Remaining Funds
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-500/20">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>

                <span className="text-sm font-semibold">
                  {budgetHealthScore}/100
                </span>
              </div>

              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                Health
              </div>

              <Progress
                value={budgetHealthScore}
                className="h-2 mt-4"
              />
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Charts */}

            <div className="grid lg:grid-cols-3 gap-4">

              <Card className="lg:col-span-2 border-none shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      Budget vs Spending Trend
                    </CardTitle>

                    <Badge variant="outline">
                      6 Months
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={spendingTrend}>
                        <defs>
                          <linearGradient id="allocated" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                          </linearGradient>

                          <linearGradient id="spent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                          </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" stroke="#37415120" />

                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />

                        <Area
                          type="monotone"
                          dataKey="allocated"
                          stroke="#3B82F6"
                          fillOpacity={1}
                          fill="url(#allocated)"
                          strokeWidth={3}
                        />

                        <Area
                          type="monotone"
                          dataKey="spent"
                          stroke="#10B981"
                          fillOpacity={1}
                          fill="url(#spent)"
                          strokeWidth={3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>
                    Department Allocation
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={expenseBreakdown}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={80}
                        >
                          {expenseBreakdown.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>

                        <Tooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-3 mt-4">
                    {expenseBreakdown.map((item, idx) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: COLORS[idx],
                            }}
                          />

                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {item.name}
                          </span>
                        </div>

                        <span className="text-sm font-semibold">
                          {item.value}%
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Department Performance */}

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>
                  Department Budget Performance
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#37415120"
                      />

                      <XAxis dataKey="department" />
                      <YAxis />
                      <Tooltip />

                      <Bar
                        dataKey="usage"
                        fill="#8B5CF6"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Alerts + Forecast */}

            <div className="grid lg:grid-cols-2 gap-4">

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    Executive Alerts
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">

                  <div className="p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/20">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />

                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          Marketing Overspending Risk
                        </p>

                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Marketing department has used 92% of its allocated quarterly budget.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-500/10 dark:border-yellow-500/20">
                    <div className="flex items-start gap-3">
                      <Activity className="w-5 h-5 text-yellow-500 mt-0.5" />

                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          Infrastructure Cost Increase
                        </p>

                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Cloud infrastructure spending increased 18% compared to last month.
                        </p>
                      </div>
                    </div>
                  </div>

                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    Forecast & Recommendations
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-5">

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">
                        Projected Budget Utilization
                      </span>

                      <span className="font-semibold text-orange-500">
                        88%
                      </span>
                    </div>

                    <Progress value={88} className="h-2" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">
                        Cost Growth Risk
                      </span>

                      <span className="font-semibold text-yellow-500">
                        Moderate
                      </span>
                    </div>

                    <Progress value={64} className="h-2" />
                  </div>

                  <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-slate-700">
                    <div className="flex items-start gap-3">
                      <ArrowUpRight className="w-5 h-5 text-blue-500 mt-0.5" />

                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          AI Recommendation
                        </p>

                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Consider reducing low-performing marketing campaigns and reallocating resources toward engineering growth initiatives.
                        </p>
                      </div>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </div>

            {/* Budget Table */}

            <Card className="border-none shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    Budget Categories
                  </CardTitle>

                  <Badge variant="outline">
                    {budgets.length} Budgets
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                {budgets.length === 0 ? (
                  <div className="text-center py-16">
                    <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />

                    <p className="text-gray-500">
                      No budgets yet. Create your first budget!
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-white/10">
                          <th className="text-left py-3 text-sm text-gray-500">
                            Budget
                          </th>

                          <th className="text-left py-3 text-sm text-gray-500">
                            Category
                          </th>

                          <th className="text-right py-3 text-sm text-gray-500">
                            Allocated
                          </th>

                          <th className="text-right py-3 text-sm text-gray-500">
                            Spent
                          </th>

                          <th className="text-right py-3 text-sm text-gray-500">
                            Remaining
                          </th>

                          <th className="text-right py-3 text-sm text-gray-500">
                            Status
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {budgets.map((b) => {
                          const remaining = b.allocated - b.spent;

                          const pct = Math.round(
                            (b.spent / b.allocated) * 100
                          );

                          return (
                            <tr
                              key={b.id}
                              className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                            >
                              <td className="py-4 font-medium text-gray-900 dark:text-white">
                                {b.name}
                              </td>

                              <td className="py-4">
                                <Badge variant="outline">
                                  {b.category}
                                </Badge>
                              </td>

                              <td className="py-4 text-right">
                                {fmt(b.allocated)}
                              </td>

                              <td className="py-4 text-right">
                                {fmt(b.spent)}
                              </td>

                              <td
                                className={`py-4 text-right font-medium ${
                                  remaining >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {fmt(Math.abs(remaining))}
                              </td>

                              <td className="py-4 text-right">
                                <Badge
                                  className={
                                    pct > 90
                                      ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                                      : pct > 70
                                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300"
                                      : "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                                  }
                                >
                                  {pct}% Used
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}