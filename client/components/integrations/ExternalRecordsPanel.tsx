"use client";

// components/integrations/ExternalRecordsPanel.tsx
// Read-only block that surfaces records synced from connected integrations in
// the same visual language as the rest of the app. Each page picks a domain.

import { useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, Plug, RefreshCw } from "lucide-react";
import { useIntegrationOverviewStore } from "@/store/integrationOverviewStore";

export type ExternalDomain = "projects" | "tasks" | "stakeholders" | "financials" | "events" | "notes" | "deals";

interface Props {
  domain: ExternalDomain;
  title?: string;
  description?: string;
  limit?: number;
}

const SOURCE_COLORS: Record<string, string> = {
  hubspot: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
  salesforce: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  zoho: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  jira: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
  asana: "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300",
  trello: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
  monday: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  github: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300",
  notion: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300",
  stripe: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  quickbooks: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  "google-calendar": "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  "google-drive": "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  dropbox: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  slack: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300",
};

function SourceBadge({ source, label }: { source: string; label?: string }) {
  return (
    <Badge className={SOURCE_COLORS[source] || "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"}>
      {label || source}
    </Badge>
  );
}

const money = (value: number, currency = "USD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(value || 0);

const day = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
};

export function ExternalRecordsPanel({ domain, title, description, limit = 8 }: Props) {
  const { overview, isLoading, fetchOverview, refresh } = useIntegrationOverviewStore();

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  const connected = overview?.providers?.filter((p) => p.records > 0 || p.source !== "none") || [];
  const records: any[] = (overview?.[domain] as any[]) || [];
  const visible = records.slice(0, limit);

  // Nothing connected yet — don't add noise to the page.
  if (!isLoading && connected.length === 0) return null;

  const heading =
    title ||
    ({
      projects: "Projects from connected tools",
      tasks: "Tasks from connected tools",
      stakeholders: "Contacts from connected tools",
      financials: "Financials from connected tools",
      events: "Events from connected calendars",
      notes: "Documents from connected tools",
      deals: "Deals from connected CRMs",
    } as Record<ExternalDomain, string>)[domain];

  return (
    <Card className="mb-6 border-purple-200 dark:border-purple-500/30 bg-purple-50/40 dark:bg-purple-500/5">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plug className="w-4 h-4 text-purple-500" />
            {heading}
            <Badge variant="outline" className="ml-1">{records.length}</Badge>
          </CardTitle>
          {description ? (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              Read-only data synced from {connected.map((p) => p.name).join(", ") || "your integrations"}.
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={isLoading}>
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && !overview ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading connected data…
          </div>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No {domain} synced yet.{" "}
            <Link href="/dashboard/integrations" className="text-blue-600 hover:underline">
              Sync your integrations
            </Link>{" "}
            to see them here.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {visible.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 p-3"
              >
                {domain === "stakeholders" && (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <SourceBadge source={item.source} label={item.sourceName} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {[item.role, item.company].filter(Boolean).join(" · ") || item.email || "Contact"}
                    </p>
                    {item.email && <p className="text-xs text-muted-foreground truncate">{item.email}</p>}
                  </>
                )}

                {domain === "financials" && (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <p className={`font-medium text-sm ${item.type === "INCOME" ? "text-green-600" : "text-red-600"}`}>
                        {item.type === "INCOME" ? "+" : "-"}
                        {money(item.amount, item.currency)}
                      </p>
                      <SourceBadge source={item.source} label={item.sourceName} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.category}
                      {item.status ? ` · ${item.status}` : ""} · {day(item.date)}
                    </p>
                  </>
                )}

                {domain === "events" && (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm truncate">{item.title}</p>
                      <SourceBadge source={item.source} label={item.sourceName} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.startTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                    {item.location && <p className="text-xs text-muted-foreground truncate">{item.location}</p>}
                  </>
                )}

                {domain === "notes" && (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm truncate">{item.title}</p>
                      <SourceBadge source={item.source} label={item.sourceName} />
                    </div>
                    <p className="text-xs text-muted-foreground capitalize">
                      {item.kind}
                      {item.updatedAt ? ` · updated ${day(item.updatedAt)}` : ""}
                    </p>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mt-1"
                      >
                        Open <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </>
                )}

                {domain === "deals" && (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <SourceBadge source={item.source} label={item.sourceName} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {money(item.amount)} {item.stage ? `· ${item.stage}` : ""}
                    </p>
                    {item.closeDate && <p className="text-xs text-muted-foreground">Close {day(item.closeDate)}</p>}
                  </>
                )}

                {domain === "tasks" && (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm truncate">{item.title}</p>
                      <SourceBadge source={item.source} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.status}
                      {item.project ? ` · ${item.project}` : ""}
                      {item.dueDate ? ` · due ${day(item.dueDate)}` : ""}
                    </p>
                  </>
                )}

                {domain === "projects" && (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <SourceBadge source={item.source} label={item.sourceName} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.status}
                      {item.taskCount ? ` · ${item.completedTaskCount}/${item.taskCount} tasks` : ""}
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {records.length > visible.length && (
          <p className="text-xs text-muted-foreground mt-3">
            Showing {visible.length} of {records.length}. Open the integrations page to sync more.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
