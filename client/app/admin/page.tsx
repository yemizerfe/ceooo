"use client";
import Link from "next/link";
import { Activity, Building2, ShieldCheck, Users, AlertTriangle, Plus, UserCog, FileText, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAdminData } from "@/hooks/useAdminData";
import { useToast } from "@/app/components/ui/use-toast";
import { adminCard } from "@/app/components/admin/AdminPage";

type ActivityRow = { id: string; admin: { name: string | null; email: string } | null; action: string; targetType: string; targetId: string | null; result: string; timestamp: string };
type DashboardData = { stats: { users: { total: number; active: number; activeLast7Days: number }; organizations: { total: number; active: number } }; pendingActions: Array<{ id: string; title: string; description: string; severity: string; href: string }>; recentActivity: ActivityRow[]; system: null | { overall: string; checks: Array<{ key: string; name: string; state: string; detail: string; latencyMs: number | null; checkedAt: string }> } };
const quickActions = [
  { label: "Add User", href: "/admin/users?action=create", icon: Plus },
  { label: "Manage Users", href: "/admin/users", icon: Users },
  { label: "Manage Roles", href: "/admin/roles", icon: UserCog },
  { label: "View Audit Logs", href: "/admin/audit-logs", icon: FileText },
  { label: "System Health", href: "/admin/system-health", icon: Activity },
];
function healthClass(state: string) { return state === "operational" ? "bg-emerald-500" : state === "degraded" ? "bg-amber-500" : state === "down" ? "bg-red-500" : "bg-slate-500"; }

export default function AdminDashboardPage() {
  const { data, loading, error, refetch } = useAdminData<DashboardData>("/dashboard");
  const { toast } = useToast();
  const stats = data?.stats;
  const cards = [
    { title: "Total Users", value: stats?.users.total, detail: `${stats?.users.activeLast7Days ?? 0} active this week`, icon: Users },
    { title: "Active Users", value: stats?.users.active, detail: "Enabled accounts", icon: ShieldCheck },
    { title: "Organizations", value: stats?.organizations.total, detail: `${stats?.organizations.active ?? 0} active`, icon: Building2 },
    { title: "Pending Actions", value: data?.pendingActions.length, detail: "Items requiring attention", icon: AlertTriangle },
  ];
  return <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-400">Platform control</p><h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-[-0.03em] text-gray-900 dark:text-white">Admin Dashboard</h1><p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Platform health, accounts, and administrative activity.</p></div><Button variant="outline" onClick={() => { void refetch(); toast({ title: "Dashboard refreshed", variant: "success" }); }}><RefreshCw />Refresh</Button></div>
    {error && <Card className="border-red-500/30 bg-red-50 dark:bg-red-950/30"><CardContent className="p-4 flex justify-between text-red-700 dark:text-red-300"><span>{error}</span><Button size="sm" variant="outline" onClick={() => void refetch()}>Retry</Button></CardContent></Card>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ title, value, detail, icon: Icon }) => <Card key={title} className={adminCard}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm text-gray-500 dark:text-slate-400">{title}</CardTitle><Icon className="h-5 w-5 text-blue-500" /></CardHeader><CardContent>{loading ? <div className="h-8 w-20 animate-pulse rounded bg-gray-200 dark:bg-white/10" /> : <div className="text-2xl font-bold">{(value ?? 0).toLocaleString()}</div>}<p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{detail}</p></CardContent></Card>)}</div>
    <Card className={adminCard}><CardHeader><CardTitle>System Status</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{loading ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />) : data?.system?.checks.map((check) => <div key={check.key} className="rounded-lg border border-gray-200/70 dark:border-white/10 p-3"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${healthClass(check.state)}`} /><span className="font-medium text-sm">{check.name}</span></div><p className="text-xs capitalize text-gray-500 dark:text-slate-400 mt-2">{check.state}</p><p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">{check.detail}</p></div>)}</CardContent></Card>
    <div className="grid gap-6 xl:grid-cols-[1fr_1.5fr]">
      <Card className={adminCard}><CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader><CardContent className="grid gap-2">{quickActions.map(({ label, href, icon: Icon }) => <Button key={href} asChild variant="outline" className="justify-start"><Link href={href}><Icon />{label}</Link></Button>)}</CardContent></Card>
      <Card className={adminCard}><CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader><CardContent>{loading ? <div className="h-52 animate-pulse rounded bg-gray-100 dark:bg-white/5" /> : data?.recentActivity.length ? <div className="divide-y divide-gray-100 dark:divide-white/5">{data.recentActivity.map((log) => <div key={log.id} className="py-3 flex items-start justify-between gap-3"><div><p className="text-sm font-medium capitalize">{log.action.replace(/[._]/g, " ")}</p><p className="text-xs text-gray-500 dark:text-slate-400">{log.admin?.name || log.admin?.email || "System"} · {log.targetType}{log.targetId ? ` · ${log.targetId}` : ""}</p></div><div className="text-right"><Badge variant="outline">{log.result}</Badge><p className="text-[11px] text-gray-400 mt-1">{formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</p></div></div>)}</div> : <p className="py-10 text-center text-sm text-gray-500">No administrative activity recorded yet.</p>}</CardContent></Card>
    </div>
  </div>;
}