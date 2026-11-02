"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, ShieldCheck, KeyRound, Laptop, UserCheck, PauseCircle, RotateCcw, Trash2 } from "lucide-react";
import { adminRequest, AdminError } from "@/lib/adminApi";
import { useAdminData } from "@/hooks/useAdminData";
import { useToast } from "@/app/components/ui/use-toast";
import { AdminPage, AdminLoading, AdminErrorState, adminCard } from "@/app/components/admin/AdminPage";
import { useAdminAuth } from "@/app/components/admin/AdminRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
type PermissionInfo = { role: string | null; isAdmin: boolean; rolePermissionKeys: string[]; effectivePermissions: string[] };
type User = { id: string; name: string | null; email: string; avatarUrl: string | null; role: string | null; accessRole?: string | null; status: string; isActive: boolean; isVerified: boolean; createdAt: string; lastLoginAt: string | null; organization: { id: string; name: string } | null; permissions?: PermissionInfo };
export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>(); const router = useRouter(); const { toast } = useToast();
  // Admins cannot suspend, reset or delete their own account: mirror that
  // server-side rule in the UI instead of letting the action fail.
  const { admin } = useAdminAuth();
  const isSelf = !!admin?.id && admin.id === id; const { data, loading, error, refetch } = useAdminData<User>(`/users/${id}`); const [busy, setBusy] = useState(false); const [deleteOpen, setDeleteOpen] = useState(false); const [confirmation, setConfirmation] = useState("");
  const act = async (path: string, method: string, body?: object) => {
    setBusy(true);
    try {
      await adminRequest(`/users/${id}${path}`, {
        method,
        body: body ? JSON.stringify(body) : undefined,
      });
      toast({ title: "User updated successfully", variant: "success" });
      await refetch();
    } catch (e) {
      toast({ title: (e as AdminError).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => { setBusy(true); try { await adminRequest(`/users/${id}`, { method: "DELETE", body: JSON.stringify({ confirmation }) }); toast({ title: "User deleted", variant: "success" }); router.push("/admin/users"); } catch (e) { toast({ title: (e as AdminError).message, variant: "destructive" }); setBusy(false); } };
  return <AdminPage title="User Details" description="Account profile, effective permissions, and safe security information." actions={<Button variant="outline" onClick={() => router.push("/admin/users")}><ArrowLeft />Back to Users</Button>}>
    {error ? <AdminErrorState message={error} retry={() => void refetch()} /> : loading || !data ? <AdminLoading rows={4} /> : <div className="space-y-5">
      <Card className={adminCard}><CardHeader><div className="flex items-center justify-between"><CardTitle>Profile</CardTitle><Badge variant="outline">{data.status}</Badge></div></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[["Name", data.name || "—"], ["Email", data.email], ["Access role", data.accessRole || data.permissions?.role || "—"], ["Job title", data.role || "—"], ["Organization", data.organization?.name || "—"], ["Created", format(new Date(data.createdAt), "PPp")], ["Last login", data.lastLoginAt ? format(new Date(data.lastLoginAt), "PPp") : "Never"]].map(([label, value]) => <div key={label}><p className="text-xs text-gray-500">{label}</p><p className="mt-1 font-medium break-words">{value}</p></div>)}</CardContent></Card>
      <Card className={adminCard}><CardHeader><CardTitle>Permissions</CardTitle></CardHeader><CardContent>{data.permissions?.effectivePermissions.length ? <div className="flex flex-wrap gap-2">{data.permissions.effectivePermissions.map((permission) => <Badge key={permission} variant="outline"><ShieldCheck className="h-3 w-3" />{permission}</Badge>)}</div> : <p className="text-sm text-gray-500">No effective permissions.</p>}</CardContent></Card>
      <Card className={adminCard}><CardHeader><CardTitle>Security</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><div className="flex items-center gap-2 text-sm"><KeyRound className="h-4 w-4" />Authentication: Password</div><div className="flex items-center gap-2 text-sm"><Laptop className="h-4 w-4" />Last login: {data.lastLoginAt ? format(new Date(data.lastLoginAt), "PPp") : "Never"}</div><div className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4" />Status: {data.status}</div><p className="sm:col-span-3 text-xs text-gray-500">Passwords, hashes, API keys, tokens, and authentication secrets are never displayed.</p></CardContent></Card>
      <Card className={adminCard}><CardHeader><CardTitle>Administrative Actions</CardTitle></CardHeader><CardContent className="space-y-3">{isSelf && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">This is your own account. Suspend, reset access and delete are disabled so you cannot lock yourself out.</p>}<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void act("/status", "PATCH", { isActive: !data.isActive })} disabled={busy || isSelf}><PauseCircle />{data.isActive ? "Suspend User" : "Activate User"}</Button><Button variant="outline" onClick={() => void act("/reset-access", "POST", {})} disabled={busy || isSelf}><RotateCcw />Reset Access</Button><Button variant="destructive" onClick={() => setDeleteOpen(true)} disabled={busy || isSelf}><Trash2 />Delete User</Button></div></CardContent></Card>
    </div>}
    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}><DialogContent><DialogHeader><DialogTitle>Delete User?</DialogTitle><DialogDescription>This permanently deletes the account. Type <strong>{data?.email}</strong> to confirm.</DialogDescription></DialogHeader><input className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm dark:bg-[#0d1f38]" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /><DialogFooter><Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button><Button variant="destructive" disabled={busy || confirmation !== data?.email} onClick={() => void remove()}>Delete Permanently</Button></DialogFooter></DialogContent></Dialog>
  </AdminPage>;
}