"use client";
// app/admin/users/page.tsx

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Users,
  UserCheck,
  PauseCircle,
  Clock,
  Eye,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
  Building2,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminRequest, AdminError } from "@/lib/adminApi";
import { useAdminAuth } from "@/app/components/admin/AdminRoute";
import type { AdminUserRow, AdminOrgRow } from "@/types/admin";
import { format } from "date-fns";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "pending", label: "Pending" },
];

const ROLE_OPTIONS = [
  { value: "all", label: "All Roles" },
  { value: "ADMIN", label: "ADMIN" },
  { value: "SUPER_ADMIN", label: "SUPER_ADMIN" },
  { value: "CEO", label: "CEO" },
  { value: "MANAGER", label: "MANAGER" },
  { value: "EMPLOYEE", label: "EMPLOYEE" },
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/30",
  suspended: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30",
};

function AdminUsersPage() {
  const router = useRouter();
  // The signed-in administrator's own row must not offer destructive actions:
  // the API refuses self-suspend/self-role-change, so the UI mirrors that.
  const { admin } = useAdminAuth();
  const currentAdminId = admin?.id;
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<{
    items: AdminUserRow[];
    total: number;
    page: number;
    limit: number;
  } | null>(null);
  const [orgs, setOrgs] = useState<AdminOrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");
  const [sort, setSort] = useState("created");

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<AdminUserRow | null>(null);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", role: "CEO", organizationId: "" });
  const [roleTarget, setRoleTarget] = useState<AdminUserRow | null>(null);
  const [nextRole, setNextRole] = useState("CEO");

  const createUser = async () => {
    setActionLoading("create");
    try {
      await adminRequest("/users", { method: "POST", body: JSON.stringify({ ...createForm, organizationId: createForm.organizationId || null }) });
      setCreateOpen(false);
      setCreateForm({ name: "", email: "", password: "", role: "CEO", organizationId: "" });
      await fetchUsers();
    } catch (e) { setError((e as AdminError).message || "Failed to create user"); }
    finally { setActionLoading(null); }
  };

  const changeRole = async () => {
    if (!roleTarget) return;
    setActionLoading(roleTarget.id);
    try {
      await adminRequest(`/users/${roleTarget.id}/role`, { method: "PATCH", body: JSON.stringify({ role: nextRole }) });
      setRoleTarget(null);
      await fetchUsers();
    } catch (e) { setError((e as AdminError).message || "Failed to change role"); }
    finally { setActionLoading(null); }
  };

  const resetAccess = async (target: AdminUserRow) => {
    setActionLoading(target.id);
    try {
      const result = await adminRequest<{ temporaryPassword?: string }>(`/users/${target.id}/reset-access`, { method: "POST", body: JSON.stringify({}) });
      window.prompt("Temporary password (shown once):", result.temporaryPassword || "Generated — check the API response");
      await fetchUsers();
    } catch (e) { setError((e as AdminError).message || "Failed to reset access"); }
    finally { setActionLoading(null); }
  };

  const limit = 25;

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, roleFilter, orgFilter, page]);

  useEffect(() => { setPage(1); }, [search, statusFilter, roleFilter, orgFilter]);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (orgFilter !== "all") params.set("organization", orgFilter);
      params.set("sort", sort);
      params.set("order", "desc");
      params.set("page", String(page));
      params.set("limit", String(limit));

      const data = await adminRequest<{
        items: AdminUserRow[];
        total: number;
        page: number;
        limit: number;
      }>(`/users?${params.toString()}`);
      setUsers(data);
    } catch (e) {
      const err = e as AdminError;
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  // Load organizations for the filter dropdown
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const data = await adminRequest<{ items: AdminOrgRow[] }>(
          `/organizations?limit=200`
        );
        setOrgs(data.items || []);
      } catch {
        // non-fatal
      }
    };
    fetchOrgs();
  }, []);

  async function changeStatus(target: AdminUserRow, nextStatus: "active" | "suspended") {
    setActionLoading(target.id);
    try {
      await adminRequest(`/users/${target.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: nextStatus === "active" }),
      });
      await fetchUsers();
      setSuspendOpen(false);
      setSuspendTarget(null);
    } catch (e) {
      const err = e as AdminError;
      setError(err.message || "Failed to update user");
    } finally {
      setActionLoading(null);
    }
  }

  const getStatusBadge = (u: AdminUserRow) => {
    const variant = u.status.toLowerCase();
    return (
      <Badge
        variant="outline"
        className={STATUS_COLORS[variant] || STATUS_COLORS.active}
      >
        {u.status}
      </Badge>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white">
              Users
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Search and manage all platform users
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}><Plus />Add User</Button>
        </div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Filters */}
      <Card className="bg-white dark:bg-[#0b1f33]/50 border-gray-200 dark:border-white/10">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
              <Input
                placeholder="Search by name, email, or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 border-gray-200 dark:border-white/10 dark:bg-[#0d1f38]"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-gray-200 dark:border-white/10 dark:bg-[#0d1f38]">
                <Filter className="w-4 h-4 mr-2 text-gray-400" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#0b1f33] border-gray-200 dark:border-white/10">
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="border-gray-200 dark:border-white/10 dark:bg-[#0d1f38]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#0b1f33] border-gray-200 dark:border-white/10">
                {ROLE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="border-gray-200 dark:border-white/10 dark:bg-[#0d1f38]"><Clock className="w-4 h-4 mr-2 text-gray-400" /><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#0b1f33] border-gray-200 dark:border-white/10"><SelectItem value="created">Newest first</SelectItem><SelectItem value="lastActive">Recently active</SelectItem><SelectItem value="name">Name</SelectItem></SelectContent>
            </Select>

            <Select value={orgFilter} onValueChange={setOrgFilter}>
              <SelectTrigger className="border-gray-200 dark:border-white/10 dark:bg-[#0d1f38]">
                <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                <SelectValue placeholder="Organization" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#0b1f33] border-gray-200 dark:border-white/10">
                <SelectItem value="all">All Organizations</SelectItem>
                                {orgs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white dark:bg-[#0b1f33]/50 border-gray-200 dark:border-white/10">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200 dark:border-white/10 hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="h-4 w-32 bg-gray-200 dark:bg-[#1e3a5f] rounded animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : users?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-gray-500 dark:text-slate-400">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users?.items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-medium">
                          {u.name?.charAt(0) || u.email?.charAt(0) || "?"}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {u.name || u.email?.split("@")[0]}
                        </span>
                        {u.id === currentAdminId && (
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                            You
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-slate-300">{u.email}</TableCell>
                    <TableCell className="text-gray-600 dark:text-slate-300">
                      {u.organization?.name || u.companyName || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit font-mono text-[10px]">
                          {u.accessRole || "CEO"}
                        </Badge>
                        {u.role && u.role !== u.accessRole && (
                          <span className="text-[11px] text-gray-500 dark:text-slate-400">{u.role}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(u)}</TableCell>
                    <TableCell className="text-gray-600 dark:text-slate-400">
                      {u.lastLoginAt ? format(new Date(u.lastLoginAt), "PPp") : "Never"}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-slate-400">
                      {format(new Date(u.createdAt), "PPp")}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white dark:bg-[#0b1f33] border-gray-200 dark:border-white/10">
                           <DropdownMenuItem onSelect={() => router.push(`/admin/users/${u.id}`)} className="dark:text-slate-300 dark:focus:bg-[#122b46]"><Eye className="w-4 h-4 mr-2" />View user</DropdownMenuItem>
                           <DropdownMenuItem onSelect={() => { setRoleTarget(u); setNextRole(u.role || "CEO"); }} disabled={u.id === currentAdminId} title={u.id === currentAdminId ? "You cannot change your own role" : undefined} className="dark:text-slate-300 dark:focus:bg-[#122b46]"><Users className="w-4 h-4 mr-2" />Change role</DropdownMenuItem>
                           <DropdownMenuItem onSelect={() => void resetAccess(u)} disabled={actionLoading === u.id || u.id === currentAdminId} title={u.id === currentAdminId ? "You cannot reset your own access" : undefined} className="dark:text-slate-300 dark:focus:bg-[#122b46]"><RotateCcw className="w-4 h-4 mr-2" />Reset access</DropdownMenuItem>
                          {u.status !== "active" && (
                            <DropdownMenuItem
                              onSelect={() => changeStatus(u, "active")}
                              disabled={actionLoading === u.id || u.id === currentAdminId}
                              className="dark:text-slate-300 dark:focus:bg-[#122b46]"
                            >
                              <UserCheck className="w-4 h-4 mr-2 text-green-600" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          {u.status === "active" && (
                            <DropdownMenuItem
                              onSelect={() => {
                                setSuspendTarget(u);
                                setSuspendOpen(true);
                              }}
                              disabled={u.id === currentAdminId}
                              title={u.id === currentAdminId ? "You cannot suspend your own account" : undefined}
                              className="dark:text-red-300 dark:focus:bg-red-900/30"
                            >
                              <PauseCircle className="w-4 h-4 mr-2 text-red-600" />
                              Suspend
                            </DropdownMenuItem>
                          )}
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


      {/* Pagination */}
      {users && users.total > 0 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Showing {users.items.length} of {users.total} users
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={users.page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="border-gray-200 dark:border-white/10"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600 dark:text-slate-400">
              Page {users.page}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={users.page * users.limit >= users.total || loading}
              onClick={() => setPage((current) => current + 1)}
              className="border-gray-200 dark:border-white/10"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create User */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent><DialogHeader><DialogTitle>Add User</DialogTitle><DialogDescription>Create a platform account with a hashed server-side password.</DialogDescription></DialogHeader><div className="space-y-3"><Input placeholder="Full name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} /><Input type="email" placeholder="Email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} /><Input type="password" placeholder="Temporary password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} /><Select value={createForm.role} onValueChange={(role) => setCreateForm({ ...createForm, role })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ROLE_OPTIONS.filter((role) => role.value !== "all").map((role) => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}</SelectContent></Select><Select value={createForm.organizationId || "none"} onValueChange={(organizationId) => setCreateForm({ ...createForm, organizationId: organizationId === "none" ? "" : organizationId })}><SelectTrigger><SelectValue placeholder="Organization" /></SelectTrigger><SelectContent><SelectItem value="none">No organization</SelectItem>{orgs.map((org) => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}</SelectContent></Select></div><DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={() => void createUser()} disabled={actionLoading === "create" || !createForm.name || !createForm.email || createForm.password.length < 8}>Create User</Button></DialogFooter></DialogContent></Dialog>

      {/* Change Role */}
      <Dialog open={!!roleTarget} onOpenChange={(open) => !open && setRoleTarget(null)}><DialogContent><DialogHeader><DialogTitle>Change Role</DialogTitle><DialogDescription>Assign a new role to {roleTarget?.email}. Server-side last-admin safeguards still apply.</DialogDescription></DialogHeader><Select value={nextRole} onValueChange={setNextRole}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ROLE_OPTIONS.filter((role) => role.value !== "all").map((role) => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}</SelectContent></Select><DialogFooter><Button variant="outline" onClick={() => setRoleTarget(null)}>Cancel</Button><Button onClick={() => void changeRole()} disabled={!roleTarget || actionLoading === roleTarget.id}>Change Role</Button></DialogFooter></DialogContent></Dialog>

      {/* Suspend Confirmation */}
      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent className="bg-white dark:bg-[#0b1f33] border-gray-200 dark:border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle>Suspend User?</DialogTitle>
            <DialogDescription>
              This will suspend{" "}
              <strong>{suspendTarget?.name || suspendTarget?.email?.split("@")[0]}</strong>
              {" "}and revoke their ability to access the platform. You can
              re-activate them later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSuspendOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!suspendTarget || actionLoading === suspendTarget.id}
              onClick={() =>
                suspendTarget && changeStatus(suspendTarget, "suspended")
              }
            >
              {actionLoading === suspendTarget?.id ? "Suspending…" : "Suspend User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminUsersPage;
