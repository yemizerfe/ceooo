import { ReactNode } from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function AdminPage({ title, description, actions, children }: { title: string; description: string; actions?: ReactNode; children: ReactNode }) {
  return <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-400">Platform control</p><h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-[-0.03em] text-gray-900 dark:text-white">{title}</h1><p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{description}</p></div>{actions}</div>
    {children}
  </div>;
}

export function AdminLoading({ rows = 5 }: { rows?: number }) {
  return <div className="space-y-3" aria-label="Loading">{Array.from({ length: rows }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200/60 dark:bg-white/5" />)}</div>;
}

export function AdminErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <Card className="border-red-500/30 bg-red-50 dark:bg-red-950/30"><CardContent className="p-5 flex flex-wrap items-center justify-between gap-3 text-red-700 dark:text-red-300"><span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{message}</span>{retry && <Button size="sm" variant="outline" onClick={retry}>Retry</Button>}</CardContent></Card>;
}

export function AdminEmpty({ message, action }: { message: string; action?: ReactNode }) {
  return <div className="py-14 text-center"><Inbox className="mx-auto h-8 w-8 text-gray-400" /><p className="mt-3 text-sm text-gray-500 dark:text-slate-400">{message}</p>{action && <div className="mt-4">{action}</div>}</div>;
}

export const adminCard = "bg-white dark:bg-[#0b1f33] border-gray-200/70 dark:border-white/10 shadow-sm dark:shadow-blue-950/20";
export const adminTableWrap = "overflow-x-auto";