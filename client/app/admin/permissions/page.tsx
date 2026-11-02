"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useAdminData } from "@/hooks/useAdminData";
import { AdminPage, AdminLoading, AdminErrorState, AdminEmpty, adminCard } from "@/app/components/admin/AdminPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/app/components/ui/use-toast";
import { adminRequest, AdminError } from "@/lib/adminApi";
type Permission = { id: string; key: string; group: string; label: string; description: string | null; roleCount: number; roles: string[] };
type Role = { id: string; name: string; label: string; isProtected: boolean; permissions: string[] };
export default function AdminPermissionsPage() {
  const { data, loading, error, refetch } = useAdminData<{ groups: Array<{ group: string; permissions: Permission[] }>; total: number }>("/permissions");
  const { data: roles } = useAdminData<Role[]>("/roles"); const { toast } = useToast();
  const [roleId, setRoleId] = useState(""); const [selected, setSelected] = useState<string[]>([]); const [search, setSearch] = useState(""); const [busy, setBusy] = useState(false);
  const role = useMemo(() => roles?.find((item) => item.id === roleId), [roles, roleId]);
  const choose = (id: string) => { setRoleId(id); setSelected(roles?.find((item) => item.id === id)?.permissions ?? []); };
  const save = async () => { if (!role) return; setBusy(true); try { await adminRequest(`/roles/${role.id}/permissions`, { method: "PUT", body: JSON.stringify({ permissionKeys: selected }) }); toast({ title: "Permissions updated", variant: "success" }); await refetch(); } catch (e) { toast({ title: (e as AdminError).message, variant: "destructive" }); } finally { setBusy(false); } };
  return <AdminPage title="Permissions" description="Review permission groups and assign effective access by role.">
    {error ? <AdminErrorState message={error} retry={() => void refetch()} /> : loading ? <AdminLoading /> : <>
      <Card className={adminCard}><CardHeader><CardTitle>Permission Matrix</CardTitle></CardHeader><CardContent><div className="flex flex-col gap-3 sm:flex-row"><select className="h-9 rounded-lg border bg-transparent px-3 text-sm dark:bg-[#0d1f38]" value={roleId} onChange={(e) => choose(e.target.value)}><option value="">Select a role</option>{roles?.filter((item) => !item.isProtected).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search permissions" /></div><Button disabled={!role || busy} onClick={() => void save()}>{busy ? "Saving…" : "Save Permissions"}</Button></div></CardContent></Card>
      <div className="grid gap-4 lg:grid-cols-2">{data?.groups.map((group) => { const permissions = group.permissions.filter((item) => `${item.label} ${item.key}`.toLowerCase().includes(search.toLowerCase())); if (!permissions.length) return null; return <Card key={group.group} className={adminCard}><CardHeader><CardTitle>{group.group}</CardTitle></CardHeader><CardContent className="space-y-2">{permissions.map((permission) => { const checked = selected.includes(permission.key); return <label key={permission.id} className="flex items-start gap-3 rounded-lg border border-gray-100 dark:border-white/5 p-3"><input type="checkbox" className="mt-1" disabled={!role || role.isProtected} checked={checked} onChange={(e) => setSelected(e.target.checked ? [...selected, permission.key] : selected.filter((key) => key !== permission.key))} /><span className="flex-1"><span className="text-sm font-medium">{permission.label}</span><code className="block text-xs text-gray-500">{permission.key}</code>{permission.description && <span className="mt-1 block text-xs text-gray-500">{permission.description}</span>}</span><Badge variant="outline">{permission.roleCount} roles</Badge></label>; })}</CardContent></Card>; })}</div>
      {!data?.groups.length && <Card className={adminCard}><AdminEmpty message="No permissions are registered." /></Card>}
    </>}
  </AdminPage>;
}