"use client";
import { useEffect, useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useAdminData } from "@/hooks/useAdminData";
import { AdminPage, AdminLoading, AdminErrorState, AdminEmpty, adminCard, adminTableWrap } from "@/app/components/admin/AdminPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
type Log = { id: string; adminUserId: string | null; adminName: string | null; adminEmail: string | null; action: string; targetType: string; targetId: string | null; result: string; ipAddress: string | null; userAgent: string | null; timestamp: string };
export default function AdminAuditLogsPage() {
  const [search, setSearch] = useState(""); const [action, setAction] = useState(""); const [actor, setActor] = useState(""); const [result, setResult] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [query, setQuery] = useState("");
  const { data: actions } = useAdminData<string[]>("/audit-logs/actions"); const { data: actors } = useAdminData<Array<{ id: string; name: string | null; email: string }>>("/audit-logs/actors");
  // Only send filters that are actually set: empty strings are not valid
  // values for the enum/ISO query validators on the API.
  const params = new URLSearchParams();
  if (query.trim()) params.set("search", query.trim());
  if (action) params.set("action", action);
  if (actor) params.set("actorId", actor);
  if (result) params.set("result", result);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  params.set("page", "1");
  params.set("limit", "50");
  const { data, loading, error, refetch } = useAdminData<{ items: Log[]; total: number; page: number; limit: number }>(`/audit-logs?${params}`);
  useEffect(() => { const timer = setTimeout(() => setQuery(search), 300); return () => clearTimeout(timer); }, [search]);
  return <AdminPage title="Audit Logs" description="Review administrative actions, results, and intentionally collected request context." actions={<Button variant="outline" onClick={() => void refetch()}><RefreshCw />Refresh</Button>}>
    <Card className={adminCard}><CardContent className="grid gap-3 md:grid-cols-3 xl:grid-cols-6"><div className="relative xl:col-span-2"><Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search actor, action, resource…" /></div><select className="h-8 rounded-lg border bg-transparent px-2 text-sm dark:bg-[#0d1f38]" value={action} onChange={(e) => setAction(e.target.value)}><option value="">All actions</option>{actions?.map((value) => <option key={value}>{value}</option>)}</select><select className="h-8 rounded-lg border bg-transparent px-2 text-sm dark:bg-[#0d1f38]" value={actor} onChange={(e) => setActor(e.target.value)}><option value="">All users</option>{actors?.map((value) => <option key={value.id} value={value.id}>{value.name || value.email}</option>)}</select><select className="h-8 rounded-lg border bg-transparent px-2 text-sm dark:bg-[#0d1f38]" value={result} onChange={(e) => setResult(e.target.value)}><option value="">All results</option><option value="SUCCESS">Success</option><option value="FAILURE">Failure</option></select><div className="flex gap-2"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div></CardContent></Card>
    {error ? <AdminErrorState message={error} retry={() => void refetch()} /> : loading ? <AdminLoading /> : data?.items.length ? <Card className={adminCard}><CardContent className={adminTableWrap}><Table><TableHeader><TableRow><TableHead>Timestamp</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Resource</TableHead><TableHead>Result</TableHead><TableHead>IP / device</TableHead></TableRow></TableHeader><TableBody>{data.items.map((log) => <TableRow key={log.id}><TableCell className="whitespace-nowrap">{format(new Date(log.timestamp), "PPp")}</TableCell><TableCell>{log.adminName || log.adminEmail || "System"}</TableCell><TableCell className="font-medium">{log.action}</TableCell><TableCell>{log.targetType}{log.targetId ? <p className="text-xs text-gray-500">{log.targetId}</p> : null}</TableCell><TableCell><Badge variant="outline" className={log.result === "FAILURE" ? "text-red-600" : "text-emerald-600"}>{log.result}</Badge></TableCell><TableCell className="max-w-xs text-xs text-gray-500">{log.ipAddress || "—"}{log.userAgent ? <p className="truncate">{log.userAgent}</p> : null}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card> : <Card className={adminCard}><AdminEmpty message="No audit logs match these filters." /></Card>}
  </AdminPage>;
}