"use client";
// app/admin/support/page.tsx
//
// Real inbox for the public support surfaces: demo requests, scheduled calls,
// email tickets and live-chat handoffs. Backed by GET /api/admin/support-requests.

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Inbox, Mail, Phone, RefreshCw } from "lucide-react";
import { adminRequest, AdminError } from "@/lib/adminApi";
import { useAdminData } from "@/hooks/useAdminData";
import { useToast } from "@/app/components/ui/use-toast";
import {
  AdminPage,
  AdminLoading,
  AdminErrorState,
  AdminEmpty,
  adminCard,
} from "@/app/components/admin/AdminPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SupportRequest = {
  id: string;
  reference: string;
  type: "DEMO" | "CALL" | "EMAIL" | "CHAT";
  status: "OPEN" | "CONTACTED" | "CLOSED";
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  subject: string | null;
  category: string | null;
  priority: string | null;
  message: string | null;
  meetingType: string | null;
  timezone: string | null;
  preferredDate: string | null;
  preferredTime: string | null;
  source: string | null;
  createdAt: string;
};

const TYPE_LABEL: Record<string, string> = {
  DEMO: "Demo",
  CALL: "Call",
  EMAIL: "Ticket",
  CHAT: "Chat",
};

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30",
  CONTACTED: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
  CLOSED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30",
};

export default function AdminSupportPage() {
  const { toast } = useToast();
  const [status, setStatus] = useState("OPEN");
  const [type, setType] = useState("all");
  const [selected, setSelected] = useState<SupportRequest | null>(null);
  const [busy, setBusy] = useState(false);

  const params = new URLSearchParams({ limit: "50" });
  if (status !== "all") params.set("status", status);
  if (type !== "all") params.set("type", type);

  const { data, loading, error, refetch } = useAdminData<{
    items: SupportRequest[];
    total: number;
    page: number;
    limit: number;
  }>(`/support-requests?${params.toString()}`);

  const updateStatus = async (request: SupportRequest, next: SupportRequest["status"]) => {
    setBusy(true);
    try {
      await adminRequest(`/support-requests/${request.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      toast({ title: `${request.reference} → ${next.toLowerCase()}`, variant: "success" });
      setSelected(null);
      await refetch();
    } catch (e) {
      toast({ title: (e as AdminError).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminPage
      title="Support Inbox"
      description="Demo requests, scheduled calls, tickets and live-chat handoffs submitted from the public site."
      actions={
        <Button variant="outline" onClick={() => void refetch()}>
          <RefreshCw /> Refresh
        </Button>
      }
    >
      <Card className={adminCard}>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="CONTACTED">Contacted</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="DEMO">Demo</SelectItem>
              <SelectItem value="CALL">Call</SelectItem>
              <SelectItem value="EMAIL">Ticket</SelectItem>
              <SelectItem value="CHAT">Chat</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-500 dark:text-slate-400">
            {data?.total ?? 0} request{data?.total === 1 ? "" : "s"}
          </span>
        </CardContent>
      </Card>

      {error ? (
        <AdminErrorState message={error} retry={() => void refetch()} />
      ) : loading ? (
        <AdminLoading rows={5} />
      ) : data?.items.length ? (
        <div className="space-y-3">
          {data.items.map((request) => (
            <Card key={request.id} className={adminCard}>
              <CardContent className="flex flex-wrap items-start justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-gray-500">{request.reference}</span>
                    <Badge variant="outline">{TYPE_LABEL[request.type] ?? request.type}</Badge>
                    <Badge variant="outline" className={STATUS_STYLE[request.status] ?? ""}>
                      {request.status.toLowerCase()}
                    </Badge>
                    {request.priority === "HIGH" && <Badge variant="destructive">High</Badge>}
                  </div>
                  <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                    {request.subject || `${TYPE_LABEL[request.type] ?? request.type} request from ${request.name}`}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    {request.name}
                    {request.company ? ` · ${request.company}` : ""} · {request.email}
                  </p>
                  {request.message && (
                    <p className="mt-2 line-clamp-2 text-sm text-gray-500 dark:text-slate-400">
                      {request.message}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">
                    {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                    {request.source ? ` · ${request.source}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {request.status !== "CONTACTED" && (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => void updateStatus(request, "CONTACTED")}>
                      Mark contacted
                    </Button>
                  )}
                  {request.status !== "CLOSED" && (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => void updateStatus(request, "CLOSED")}>
                      Close
                    </Button>
                  )}
                  <Button size="sm" onClick={() => setSelected(request)}>
                    Open
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className={adminCard}>
          <AdminEmpty message="No support requests match these filters." />
        </Card>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.reference}</DialogTitle>
            <DialogDescription>
              {selected ? `${TYPE_LABEL[selected.type] ?? selected.type} · ${format(new Date(selected.createdAt), "PPp")}` : ""}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name" value={selected.name} />
                <Field label="Email" value={selected.email} />
                <Field label="Company" value={selected.company} />
                <Field label="Phone" value={selected.phone} />
                <Field label="Meeting" value={selected.meetingType} />
                <Field label="Timezone" value={selected.timezone} />
                <Field label="Preferred date" value={selected.preferredDate ? format(new Date(selected.preferredDate), "PP") : null} />
                <Field label="Preferred time" value={selected.preferredTime} />
                <Field label="Category" value={selected.category} />
                <Field label="Status" value={selected.status} />
              </div>
              {selected.message && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Message</p>
                  <p className="mt-1 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-gray-700 dark:bg-white/5 dark:text-slate-300">
                    {selected.message}
                  </p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <a href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.reference)}`}>
                    <Mail /> Reply by email
                  </a>
                </Button>
                {selected.phone && (
                  <Button asChild variant="outline">
                    <a href={`tel:${selected.phone}`}>
                      <Phone /> Call
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              <Inbox /> Close
            </Button>
            {selected && selected.status !== "CLOSED" && (
              <Button disabled={busy} onClick={() => void updateStatus(selected, "CLOSED")}>
                Mark closed
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 font-medium break-words text-gray-800 dark:text-slate-200">{value || "—"}</p>
    </div>
  );
}
