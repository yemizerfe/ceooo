"use client";
import { useEffect, useState } from "react";
import { Save, ShieldCheck, KeyRound } from "lucide-react";
import { format } from "date-fns";
import { adminRequest, AdminError } from "@/lib/adminApi";
import { useAdminData } from "@/hooks/useAdminData";
import { useToast } from "@/app/components/ui/use-toast";
import { AdminPage, AdminLoading, AdminErrorState, adminCard } from "@/app/components/admin/AdminPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
type Profile = { id: string; name: string | null; email: string; role: string | null; avatarUrl: string | null; isActive: boolean; isVerified: boolean; lastLoginAt: string | null; createdAt: string; security: { authMethod: string; twoFactorEnabled: boolean; accountStatus: string }; permissions: { effectivePermissions: string[] } };
export default function AdminProfilePage() {
  const { data, loading, error, refetch } = useAdminData<Profile>("/profile"); const { toast } = useToast(); const [name, setName] = useState(""); const [avatarUrl, setAvatarUrl] = useState(""); const [currentPassword, setCurrentPassword] = useState(""); const [newPassword, setNewPassword] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) { setName(data.name ?? ""); setAvatarUrl(data.avatarUrl ?? ""); } }, [data]);
  const update = async () => { setBusy(true); try { await adminRequest("/profile", { method: "PATCH", body: JSON.stringify({ name, avatarUrl }) }); toast({ title: "Profile updated", variant: "success" }); await refetch(); } catch (e) { toast({ title: (e as AdminError).message, variant: "destructive" }); } finally { setBusy(false); } };
  const password = async () => { setBusy(true); try { await adminRequest("/profile/password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }); toast({ title: "Password changed", variant: "success" }); setCurrentPassword(""); setNewPassword(""); } catch (e) { toast({ title: (e as AdminError).message, variant: "destructive" }); } finally { setBusy(false); } };
  return <AdminPage title="Admin Profile" description="Manage your basic profile, password, and security status.">
    {error ? <AdminErrorState message={error} retry={() => void refetch()} /> : loading || !data ? <AdminLoading rows={3} /> : <div className="grid gap-5 lg:grid-cols-2">
      <Card className={adminCard}><CardHeader><CardTitle>Profile</CardTitle></CardHeader><CardContent className="space-y-4"><label className="block text-sm">Name<Input value={name} onChange={(e) => setName(e.target.value)} /></label><label className="block text-sm">Avatar URL<Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" /></label><p className="text-sm text-gray-500">{data.email}</p><Button onClick={() => void update()} disabled={busy || !name.trim()}><Save />Save Profile</Button></CardContent></Card>
      <Card className={adminCard}><CardHeader><CardTitle>Security</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4" />Account: <Badge variant="outline">{data.security.accountStatus}</Badge></div><p className="flex items-center gap-2 text-sm"><KeyRound className="h-4 w-4" />Authentication: {data.security.authMethod}</p><p className="text-sm text-gray-500">Last login: {data.lastLoginAt ? format(new Date(data.lastLoginAt), "PPp") : "Never"}</p><div className="border-t pt-4 space-y-3"><label className="block text-sm">Current password<Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></label><label className="block text-sm">New password<Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label><Button variant="outline" onClick={() => void password()} disabled={busy || !currentPassword || newPassword.length < 8}>Change Password</Button></div></CardContent></Card>
      <Card className={`${adminCard} lg:col-span-2`}><CardHeader><CardTitle>Effective Permissions</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{data.permissions.effectivePermissions.map((permission) => <Badge key={permission} variant="outline">{permission}</Badge>)}</CardContent></Card>
    </div>}
  </AdminPage>;
}