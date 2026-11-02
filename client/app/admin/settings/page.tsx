"use client";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { adminRequest, AdminError } from "@/lib/adminApi";
import { useAdminData } from "@/hooks/useAdminData";
import { useToast } from "@/app/components/ui/use-toast";
import { AdminPage, AdminLoading, AdminErrorState, adminCard } from "@/app/components/admin/AdminPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
type Section = "general" | "security" | "ai" | "notifications" | "system";
type Data = Record<string, unknown> & { options?: { timezones: string[]; dateFormats: string[]; currencies: string[] }; providers?: string[]; notificationDefaults?: Record<string, boolean>; featureFlags?: Array<{ key: string; label: string; enabled: boolean }> };
export default function AdminSettingsPage() {
  const [section, setSection] = useState<Section>("general"); const [form, setForm] = useState<Data>({}); const [busy, setBusy] = useState(false); const { toast } = useToast();
  const { data, loading, error, refetch } = useAdminData<Data>(`/settings/${section}`);
  useEffect(() => { if (data) setForm(data); }, [data]);
  const save = async () => { setBusy(true); try { await adminRequest(`/settings/${section}`, { method: "PATCH", body: JSON.stringify(form) }); toast({ title: "Settings saved", variant: "success" }); await refetch(); } catch (e) { toast({ title: (e as AdminError).message, variant: "destructive" }); } finally { setBusy(false); } };
  const value = (key: string) => String(form[key] ?? ""); const checked = (key: string) => Boolean(form[key]);
  return <AdminPage title="System Settings" description="Configure only settings that are enforced by the platform." actions={<Button onClick={() => void save()} disabled={busy}><Save />{busy ? "Saving…" : "Save Changes"}</Button>}>
    <div className="flex gap-2 overflow-x-auto pb-1">{(["general", "security", "ai", "notifications", "system"] as Section[]).map((item) => <Button key={item} variant={section === item ? "default" : "outline"} onClick={() => setSection(item)} className="capitalize">{item}</Button>)}</div>
    {error ? <AdminErrorState message={error} retry={() => void refetch()} /> : loading ? <AdminLoading /> : <Card className={adminCard}><CardHeader><CardTitle className="capitalize">{section} Settings</CardTitle></CardHeader><CardContent className="space-y-5">
      {section === "general" && <><Field label="Application name" value={value("applicationName")} onChange={(v) => setForm({ ...form, applicationName: v })} /><Field label="Organization name" value={value("organizationName")} onChange={(v) => setForm({ ...form, organizationName: v })} /><div className="grid gap-4 sm:grid-cols-3"><Choice label="Time zone" value={value("defaultTimezone")} options={form.options?.timezones} onChange={(v) => setForm({ ...form, defaultTimezone: v })} /><Choice label="Date format" value={value("defaultDateFormat")} options={form.options?.dateFormats} onChange={(v) => setForm({ ...form, defaultDateFormat: v })} /><Choice label="Currency" value={value("defaultCurrency")} options={form.options?.currencies} onChange={(v) => setForm({ ...form, defaultCurrency: v })} /></div></>}
      {section === "security" && <><Toggle label="Require strong passwords" value={checked("requireStrongPassword")} onChange={(v) => setForm({ ...form, requireStrongPassword: v })} /><Field label="Session timeout (minutes)" type="number" value={value("sessionTimeoutMinutes")} onChange={(v) => setForm({ ...form, sessionTimeoutMinutes: Number(v) })} /><Toggle label="Allow new registrations" value={checked("allowRegistration")} onChange={(v) => setForm({ ...form, allowRegistration: v })} /><Field label="Maximum login attempts (0 disables)" type="number" value={value("maxLoginAttempts")} onChange={(v) => setForm({ ...form, maxLoginAttempts: Number(v) })} /></>}
      {section === "ai" && <><Toggle label="AI features enabled" value={checked("aiEnabled")} onChange={(v) => setForm({ ...form, aiEnabled: v })} /><Choice label="AI provider" value={value("aiProvider")} options={form.providers} onChange={(v) => setForm({ ...form, aiProvider: v })} /><Field label="Model" value={value("aiModel")} onChange={(v) => setForm({ ...form, aiModel: v })} /><p className="text-xs text-gray-500">Credentials remain in secure server environment variables and are never displayed here.</p></>}
      {section === "notifications" && Object.entries(form.notificationDefaults ?? {}).map(([key, enabled]) => <Toggle key={key} label={key} value={enabled} onChange={(v) => setForm({ ...form, notificationDefaults: { ...form.notificationDefaults, [key]: v } })} />)}
      {section === "system" && <><Toggle label="Maintenance mode" value={checked("maintenanceMode")} onChange={(v) => setForm({ ...form, maintenanceMode: v })} /><p className="text-sm font-medium">Feature flags</p>{form.featureFlags?.map((flag) => <Toggle key={flag.key} label={flag.label} value={flag.enabled} onChange={(v) => setForm({ ...form, featureFlags: form.featureFlags?.map((item) => item.key === flag.key ? { ...item, enabled: v } : item) })} />)}</>}
    </CardContent></Card>}
  </AdminPage>;
}
function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="block text-sm">{label}<Input className="mt-1" type={type} value={value} onChange={(e) => onChange(e.target.value)} /></label>; }
function Choice({ label, value, options, onChange }: { label: string; value: string; options?: string[]; onChange: (value: string) => void }) { return <label className="text-sm">{label}<select className="mt-1 h-9 w-full rounded-lg border bg-transparent px-2 dark:bg-[#0d1f38]" value={value} onChange={(e) => onChange(e.target.value)}>{options?.map((option) => <option key={option}>{option}</option>)}</select></label>; }
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) { return <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-white/10 p-3"><span className="text-sm font-medium">{label}</span><Switch checked={value} onCheckedChange={onChange} /></div>; }