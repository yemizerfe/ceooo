"use client";
// app/admin/organizations/page.tsx

import { useState, useEffect } from "react";
import {
  Search,
  Building2,
  Users,
  PauseCircle,
  UserCheck,
  MoreHorizontal,
  Eye,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminRequest, AdminError } from "@/lib/adminApi";
import type { AdminOrgRow, AdminOrgDetail } from "@/types/admin";
import { format } from "date-fns";
import { AdminLoading } from "@/app/components/admin/AdminPage";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

const PLAN_OPTIONS = [
  { value: "all", label: "All Plans" },
  { value: "free", label: "Free" },
  { value: "pro", label: "Pro" },
  { value: "business", label: "Business" },
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/30",
  suspended: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30",
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-500/30",
  pro: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
  business: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30",
};

function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<{
    items: AdminOrgRow[];
    total: number;
    page: number;
    limit: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<AdminOrgDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<AdminOrgRow | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const page = 1;
  const limit = 25;

  useEffect(() => {
    fetchOrgs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, planFilter, page]);

    async function fetchOrgs() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (planFilter !== "all") params.set("plan", planFilter);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const data = await adminRequest<{
        items: AdminOrgRow[];
        total: number;
        page: number;
        limit: number;
      }>(`/organizations?${params.toString()}`);
      setOrgs(data);
    } catch (e) {
      const err = e as AdminError;
      setError(err.message || "Failed to load organizations");
    } finally {
      setLoading(false);
    }
  }

  async function openOrgDetail(id: string) {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const data = await adminRequest<AdminOrgDetail>(
        `/organizations/${id}`
      );
      setSelectedOrg(data);
    } catch {
      setSelectedOrg(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function changeOrgStatus(
    target: AdminOrgRow,
    nextStatus: "active" | "suspended"
  ) {
    setActionLoading(target.id);
    try {
      await adminRequest(`/organizations/${target.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: nextStatus === "active" }),
      });
      await fetchOrgs();
      setSuspendOpen(false);
      setSuspendTarget(null);
        } catch (e) {
      const err = e as AdminError;
      setError(err.message || "Failed to update organization");
    } finally {
      setActionLoading(null);
    }
  }

  const getStatusBadge = (o: AdminOrgRow) => (
    <Badge variant="outline" className={STATUS_COLORS[o.subscriptionStatus] || STATUS_COLORS.active}>
      {o.isActive ? o.subscriptionStatus : "suspended"}
    </Badge>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">
            Organizations
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Manage all companies using the platform
          </p>
        </div>
        <Badge variant="outline" className="border-gray-200 dark:border-white/10">
          {orgs?.total ?? 0} organizations
        </Badge>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Filters */}
      <Card className="bg-white dark:bg-[#0b1f33]/50 border-gray-200 dark:border-white/10">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
              <Input
                placeholder="Search by company name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 border-gray-200 dark:border-white/10 dark:bg-[#0d1f38]"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-gray-200 dark:border-white/10 dark:bg-[#0d1f38]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#0b1f33] border-gray-200 dark:border-white/10">
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="border-gray-200 dark:border-white/10 dark:bg-[#0d1f38]">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#0b1f33] border-gray-200 dark:border-white/10">
                {PLAN_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white dark:bg-[#0b1f33]/50 border-gray-200 dark:border-white/10">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200 dark:border-white/10 hover:bg-transparent">
                <TableHead>Company</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 w-32 bg-gray-200 dark:bg-[#1e3a5f] rounded animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 w-20 bg-gray-200 dark:bg-[#1e3a5f] rounded animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 w-12 bg-gray-200 dark:bg-[#1e3a5f] rounded animate-pulse" /></TableCell>
                  </TableRow>
                ))
              ) : orgs?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-gray-500 dark:text-slate-400">
                    No organizations found.
                  </TableCell>
                </TableRow>
              ) : (
                orgs?.items.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <span className="font-medium text-gray-900 dark:text-white">{o.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-slate-300">
                      {o.ownerName || o.ownerEmail || "—"}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-slate-300">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{o.memberCount}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={PLAN_COLORS[o.plan] || PLAN_COLORS.free}>
                        {o.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[o.subscriptionStatus] || STATUS_COLORS.active}>
                        {o.subscriptionStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(o)}</TableCell>
                    <TableCell className="text-gray-600 dark:text-slate-400">
                      {format(new Date(o.createdAt), "PPp")}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white dark:bg-[#0b1f33] border-gray-200 dark:border-white/10">
                          <DropdownMenuItem
                            onSelect={() => openOrgDetail(o.id)}
                            className="dark:text-slate-300 dark:focus:bg-[#122b46]"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View organization
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => changeOrgStatus(o, "active")}
                            disabled={actionLoading === o.id}
                            className="dark:text-slate-300 dark:focus:bg-[#122b46]"
                          >
                            <UserCheck className="w-4 h-4 mr-2 text-green-600" />
                            Activate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              setSuspendTarget(o);
                              setSuspendOpen(true);
                            }}
                            className="dark:text-red-300 dark:focus:bg-red-900/30"
                          >
                            <PauseCircle className="w-4 h-4 mr-2 text-red-600" />
                            Suspend
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}><DialogContent><DialogHeader><DialogTitle>{selectedOrg?.name || "Organization"}</DialogTitle><DialogDescription>Platform organization details and members.</DialogDescription></DialogHeader>{detailLoading ? <AdminLoading rows={3} /> : selectedOrg ? <div className="max-h-80 space-y-4"><div className="grid grid-cols-2 gap-3 text-sm"><div><p className="text-gray-500">Industry</p><p>{selectedOrg.industry || "—"}</p></div><div><p className="text-gray-500">Plan</p><p>{selectedOrg.plan}</p></div><div><p className="text-gray-500">Members</p><p>{selectedOrg.memberCount}</p></div><div><p className="text-gray-500">Status</p><p>{selectedOrg.isActive ? "Active" : "Suspended"}</p></div></div><div><p className="mb-2 text-sm font-medium">Members</p><div className="space-y-2">{selectedOrg.members.map((member) => <div key={member.id} className="flex justify-between rounded border p-2 text-sm"><span>{member.name || member.email}</span><Badge variant="outline">{member.role || "Member"}</Badge></div>)}</div></div></div> : <p className="text-sm text-gray-500">Organization not found.</p>}<DialogFooter><Button onClick={() => setDetailOpen(false)}>Close</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}><DialogContent><DialogHeader><DialogTitle>Suspend Organization?</DialogTitle><DialogDescription>This blocks workspace access for {suspendTarget?.name}. You can reactivate it later.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setSuspendOpen(false)}>Cancel</Button><Button variant="destructive" disabled={actionLoading === suspendTarget?.id} onClick={() => suspendTarget && void changeOrgStatus(suspendTarget, "suspended")}>Suspend Organization</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

export default AdminOrganizationsPage;

