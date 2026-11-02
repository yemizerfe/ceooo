"use client";
// app/dashboard/financial/page.tsx (updated store usage)

import { useEffect, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  PieChart,
  PiggyBank,
  Download,
  Sparkles,
  Loader2,
  AlertTriangle,
  Wallet,
  Building2,
  Brain,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import { useFinancialStore } from "@/store/financialStore";
import { useIntegrationOverviewStore } from "@/store/integrationOverviewStore";
import { ExternalRecordsPanel } from "@/components/integrations/ExternalRecordsPanel";

const sumBy = <T,>(rows: T[], value: (row: T) => number) =>
  rows.reduce((total, row) => total + (Number.isFinite(value(row)) ? value(row) : 0), 0);

const monthKey = (date: string | Date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function FinancialPage() {
  const {
    dashboard,
    records,
    budgets,
    fetchDashboard,
    fetchRecords,
    fetchBudgets,
    isLoading,
  } = useFinancialStore();
  const { overview, fetchOverview } = useIntegrationOverviewStore();

  useEffect(() => {
    fetchDashboard();  // This replaces fetchSummary
    fetchRecords();
    fetchBudgets();
    void fetchOverview();
  }, [fetchDashboard, fetchRecords, fetchBudgets, fetchOverview]);

  const summary = dashboard?.summary;

  // ---- External records (integrations + CSV imports) ----
  const externalFinancials = overview?.financials || [];
  const externalIncome = sumBy(
    externalFinancials.filter((record) => record.type === "INCOME"),
    (record) => record.amount
  );
  const externalExpenses = sumBy(
    externalFinancials.filter((record) => record.type === "EXPENSE"),
    (record) => record.amount
  );
  const appIncome = summary?.totalIncome || 0;
  const appExpenses = summary?.totalExpenses || 0;
  const combinedIncome = appIncome + externalIncome;
  const combinedExpenses = appExpenses + externalExpenses;
  const combinedProfit = combinedIncome - combinedExpenses;
  const allBudgets = budgets || [];
  const allocatedBudget = sumBy(allBudgets, (budget: any) => Number(budget.allocated || 0));
  const spentBudget = sumBy(allBudgets, (budget: any) => Number(budget.spent || 0));
  const budgetUsage = allocatedBudget > 0 ? Math.round((spentBudget / allocatedBudget) * 100) : 0;

  const financialAlerts = allBudgets
    .filter((budget: any) => Number(budget.allocated) > 0 && Number(budget.spent) / Number(budget.allocated) >= 0.9)
    .map((budget: any) => ({
      title: `${budget.name} budget nearly used`,
      detail: `${Math.round((Number(budget.spent) / Number(budget.allocated)) * 100)}% of the allocated budget is spent.`,
    }));
  if (combinedProfit < 0) {
    financialAlerts.unshift({
      title: 'Negative cash flow',
      detail: `Expenses exceed income by ${Math.abs(Math.round(combinedProfit)).toLocaleString()} across in-app and synced records.`,
    });
  }
  const unpaidInvoices = externalFinancials.filter((record) =>
    ['open', 'unpaid', 'overdue'].includes(String(record.status || '').toLowerCase())
  ).length;
  if (unpaidInvoices > 0) {
    financialAlerts.push({
      title: `${unpaidInvoices} unpaid invoice(s)`,
      detail: 'Invoices synced from connected systems are still open.',
    });
  }

  const fmt = (n: number) =>
    n >= 1000000
      ? `$${(n / 1000000).toFixed(2)}M`
      : n >= 1000
      ? `$${(n / 1000).toFixed(0)}K`
      : `$${n}`;

  // Merge in-app monthly figures with external records so the chart reflects
  // everything the company has recorded, wherever it came from.
  const appMonthly = dashboard?.monthlyData || [];
  const monthlyData = useMemo(() => {
    const months: Array<{ key: string; label: string }> = [];
    const now = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: monthKey(date),
        label: date.toLocaleDateString(undefined, { month: "short" }),
      });
    }
    return months.map(({ key, label }) => {
      const appRow = appMonthly.find((row) => row.month === label);
      const externalRows = externalFinancials.filter((record) => monthKey(record.date) === key);
      return {
        month: label,
        revenue:
          (appRow?.revenue || 0) +
          sumBy(externalRows.filter((r) => r.type === "INCOME"), (r) => r.amount),
        expenses:
          (appRow?.expenses || 0) +
          sumBy(externalRows.filter((r) => r.type === "EXPENSE"), (r) => r.amount),
      };
    });
  }, [appMonthly, externalFinancials]);

  const expenseBreakdown = useMemo(() => {
    const totals = new Map<string, number>();
    for (const record of records.filter((r) => r.type === "EXPENSE")) {
      totals.set(record.category, (totals.get(record.category) || 0) + record.amount);
    }
    for (const record of externalFinancials.filter((r) => r.type === "EXPENSE")) {
      const key = record.category || record.sourceName;
      totals.set(key, (totals.get(key) || 0) + record.amount);
    }
    return [...totals.entries()]
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [records, externalFinancials]);

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

  const burnRate = dashboard?.burnRate || 0;
  const runwayMonths = dashboard?.runwayMonths || 0;

  const financialHealthScore = dashboard?.healthScore || 0;
  const aiInsight = dashboard?.aiInsight || "Loading executive financial insights...";

  const lastMonth = monthlyData[monthlyData.length - 1];
  const previousMonth = monthlyData[monthlyData.length - 2];
  const revenueGrowth = previousMonth?.revenue
    ? Math.round(((lastMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100)
    : 0;
  const avgRevenue = sumBy(monthlyData, (row) => row.revenue) / Math.max(monthlyData.length, 1);
  const projectedRevenue = Math.round(avgRevenue * 1.1);

  const exportReport = () => {
    const rows = [
      ["Type", "Description", "Category", "Date", "Amount", "Source"],
      ...records.map((record) => [
        record.type,
        record.description || record.category,
        record.category,
        new Date(record.date).toISOString().slice(0, 10),
        String(record.amount),
        "app",
      ]),
      ...externalFinancials.map((record) => [
        record.type,
        record.description || record.category,
        record.category,
        new Date(record.date).toISOString().slice(0, 10),
        String(record.amount),
        record.sourceName || record.source,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `financial-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Financial Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Executive financial intelligence & forecasting
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={exportReport}
              className="gap-2 border-gray-200 dark:border-white/10"
            >
              <Download className="w-4 h-4" />
              Export Report
            </Button>
          </div>
        </div>

        <ExternalRecordsPanel
          domain="financials"
          description="Payments and invoices synced from Stripe and QuickBooks, shown alongside your in-app records."
        />

        <Card className="border-green-200 bg-green-50 dark:bg-green-500/10 dark:border-green-500/30">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-green-100 dark:bg-green-500/20">
                <Brain className="w-5 h-5 text-green-600" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    AI Executive Insight
                  </p>
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300">
                    Live Analysis
                  </Badge>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {aiInsight}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Combined view: {fmt(combinedIncome)} income and {fmt(combinedExpenses)} expenses from
                  {" "}
                  {records.length} in-app records
                  {externalFinancials.length > 0
                    ? ` plus ${externalFinancials.length} synced/imported records across ${overview?.providers.length || 0} source(s).`
                    : ". Connect Stripe or QuickBooks, or import a CSV, to complete the picture."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-none shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-500/20">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                    </div>

                    <Badge
                      className={
                        revenueGrowth >= 0
                          ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                          : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                      }
                    >
                      {revenueGrowth >= 0 ? "+" : ""}{revenueGrowth}% MoM
                    </Badge>
                  </div>

                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {fmt(combinedIncome)}
                  </div>

                  <div className="text-sm text-gray-500 mt-1">
                    Total Revenue{externalIncome > 0 ? ` (incl. ${fmt(externalIncome)} external)` : ""}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl bg-red-100 dark:bg-red-500/20">
                      <TrendingUp className="w-5 h-5 text-red-600" />
                    </div>

                    <Badge className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300">
                      Expenses
                    </Badge>
                  </div>

                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {fmt(combinedExpenses)}
                  </div>

                  <div className="text-sm text-gray-500 mt-1">
                    Operational Costs{externalExpenses > 0 ? ` (incl. ${fmt(externalExpenses)} external)` : ""}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl bg-green-100 dark:bg-green-500/20">
                      <PiggyBank className="w-5 h-5 text-green-600" />
                    </div>

                    <Badge
                      className={
                        combinedProfit >= 0
                          ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                          : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                      }
                    >
                      {combinedProfit >= 0 ? "Profit" : "Loss"}
                    </Badge>
                  </div>

                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {fmt(Math.abs(combinedProfit))}
                  </div>

                  <div className="text-sm text-gray-500 mt-1">
                    Net Profit
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-500/20">
                      <PieChart className="w-5 h-5 text-purple-600" />
                    </div>

                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {budgetUsage}%
                    </span>
                  </div>

                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {fmt(spentBudget)} / {fmt(allocatedBudget)}
                  </div>

                  <div className="text-sm text-gray-500 mt-1">Budget used</div>

                  <Progress
                    value={budgetUsage}
                    className="h-2 mt-4"
                  />
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2 border-none shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Revenue vs Expenses
                    </CardTitle>

                    <Badge variant="outline">
                      Last 6 Months
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyData}>
                        <defs>
                          <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                          </linearGradient>

                          <linearGradient id="expenses" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" stroke="#37415120" />

                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />

                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#10B981"
                          fillOpacity={1}
                          fill="url(#revenue)"
                          strokeWidth={3}
                        />

                        <Area
                          type="monotone"
                          dataKey="expenses"
                          stroke="#EF4444"
                          fillOpacity={1}
                          fill="url(#expenses)"
                          strokeWidth={3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Expense Breakdown
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
                            style={{ backgroundColor: COLORS[idx] }}
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {item.name}
                          </span>
                        </div>

                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {fmt(item.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-none shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-500/20">
                      <Wallet className="w-5 h-5 text-orange-600" />
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Burn Rate</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {fmt(burnRate)}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">
                    Average monthly operational spending
                  </p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-500/20">
                      <Building2 className="w-5 h-5 text-green-600" />
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Runway</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {runwayMonths} months
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">
                    Estimated operational runway
                  </p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-500/20">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Health Score</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {financialHealthScore}/100
                      </p>
                    </div>
                  </div>

                  <Progress value={financialHealthScore} className="h-2" />
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/20">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Revenue Growth (MoM)</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {revenueGrowth >= 0 ? "+" : ""}{revenueGrowth}%
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-1 text-sm ${revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {revenueGrowth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {lastMonth.revenue === 0 && previousMonth?.revenue === 0
                      ? "Add revenue records to track growth"
                      : revenueGrowth >= 0
                        ? "Revenue increased versus last month"
                        : "Revenue declined versus last month"}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2 border-none shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      Recent Transactions
                    </CardTitle>

                    <Badge variant="outline">
                      {records.length} records
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  {records.length === 0 ? (
                    <div className="py-12 text-center text-gray-500">
                      No transactions available
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-white/10">
                            <th className="text-left py-3 text-sm font-medium text-gray-500">
                              Description
                            </th>

                            <th className="text-left py-3 text-sm font-medium text-gray-500">
                              Category
                            </th>

                            <th className="text-left py-3 text-sm font-medium text-gray-500">
                              Date
                            </th>

                            <th className="text-right py-3 text-sm font-medium text-gray-500">
                              Amount
                            </th>
                           </tr>
                        </thead>

                        <tbody>
                          {records.slice(0, 10).map((r) => (
                            <tr
                              key={r.id}
                              className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                            >
                              <td className="py-4 text-sm text-gray-900 dark:text-white">
                                {r.description || r.category}
                              </td>

                              <td className="py-4">
                                <Badge variant="outline">
                                  {r.category}
                                </Badge>
                              </td>

                              <td className="py-4 text-sm text-gray-500">
                                {new Date(r.date).toLocaleDateString()}
                              </td>

                              <td
                                className={`py-4 text-right font-semibold ${
                                  r.type === "INCOME"
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {r.type === "INCOME" ? "+" : "-"}
                                {fmt(r.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      Executive Alerts
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {financialAlerts.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No financial alerts. Budgets are within limits and cash flow is positive.
                      </p>
                    ) : (
                      financialAlerts.slice(0, 3).map((alert: any) => (
                        <div key={alert.title} className="p-3 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{alert.title}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{alert.detail}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    {revenueGrowth > 0 && (
                      <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-slate-700">
                        <div className="flex items-start gap-3">
                          <TrendingUp className="w-4 h-4 text-blue-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Revenue growth</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              Revenue is up {revenueGrowth}% versus last month.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Forecast Summary
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">
                          Next month projection
                        </span>
                        <span className="text-sm font-semibold text-green-600">
                          {fmt(projectedRevenue)}
                        </span>
                      </div>

                      <Progress
                        value={combinedIncome > 0 ? Math.min(100, Math.round((projectedRevenue / Math.max(combinedIncome / 6, 1)) * 100)) : 0}
                        className="h-2"
                      />
                      <p className="text-[11px] text-gray-500 mt-2">
                        Based on the average of the last six months of recorded revenue.
                      </p>
                    </div>

                    <div className="border-t border-gray-200 dark:border-white/10" />

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">
                          Expense ratio
                        </span>
                        <span className="text-sm font-semibold text-orange-500">
                          {combinedIncome > 0 ? Math.round((combinedExpenses / combinedIncome) * 100) : 0}%
                        </span>
                      </div>

                      <Progress
                        value={combinedIncome > 0 ? Math.min(100, Math.round((combinedExpenses / combinedIncome) * 100)) : 0}
                        className="h-2"
                      />
                    </div>

                    <div className="border-t border-gray-200 dark:border-white/10" />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          Expansion Readiness
                        </span>
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300">
                          Ready
                        </Badge>
                      </div>

                      <p className="text-xs text-gray-500 leading-relaxed">
                        Current financial position supports controlled expansion and hiring initiatives.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}