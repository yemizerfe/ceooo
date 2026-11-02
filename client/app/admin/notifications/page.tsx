"use client";
import { useState } from "react";
import { adminRequest, AdminError } from "@/lib/adminApi";
import { useAdminData } from "@/hooks/useAdminData";
import { useToast } from "@/app/components/ui/use-toast";
import { AdminPage, AdminLoading, AdminErrorState, AdminEmpty, adminCard } from "@/app/components/admin/AdminPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
type Notification = { id: string; key: string; label: string; description: string | null; category: string; enabled: boolean };
export default function AdminNotificationsPage() {
  const { data, loading, error, refetch } = useAdminData<{ categories: Array<{ key: string; label: string; description: string }>; items: Notification[]; enabledCount: number; total: number }>("/notifications"); const { toast } = useToast(); const [busy, setBusy] = useState<string | null>(null);
  const toggle = async (item: Notification, enabled: boolean) => { setBusy(item.key); try { await adminRequest(`/notifications/${encodeURIComponent(item.key)}`, { method: "PUT", body: JSON.stringify({ enabled }) }); toast({ title: "Notification setting saved", variant: "success" }); await refetch(); } catch (e) { toast({ title: (e as AdminError).message, variant: "destructive" }); } finally { setBusy(null); } };
  return <AdminPage title="Notifications" description="Configure system notifications that CEOOO actually emits.">
    {error ? <AdminErrorState message={error} retry={() => void refetch()} /> : loading ? <AdminLoading /> : data?.items.length ? <div className="space-y-5">{data.categories.map((category) => { const items = data.items.filter((item) => item.category === category.key); if (!items.length) return null; return <Card key={category.key} className={adminCard}><CardHeader><CardTitle>{category.label}</CardTitle><p className="text-sm text-gray-500">{category.description}</p></CardHeader><CardContent className="divide-y divide-gray-100 dark:divide-white/5">{items.map((item) => <div key={item.id} className="py-4 flex items-center justify-between gap-4"><div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-gray-500 mt-1">{item.description}</p></div><Switch aria-label={`Toggle ${item.label}`} checked={item.enabled} disabled={busy === item.key} onCheckedChange={(checked) => void toggle(item, checked)} /></div>)}</CardContent></Card>; })}</div> : <Card className={adminCard}><AdminEmpty message="No notification settings are available." /></Card>}
  </AdminPage>;
}