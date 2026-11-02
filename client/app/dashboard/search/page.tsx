"use client";
// app/dashboard/search/page.tsx
//
// Full results view behind the navbar search overlay. The overlay only shows
// the top hits; this page keeps the filters, shows every match with its snippet,
// and links to the module that owns each record.

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckSquare,
  FileText,
  GitBranch,
  Loader2,
  Search,
  Target,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";

type ResultType =
  | "projects"
  | "tasks"
  | "objectives"
  | "kpis"
  | "stakeholders"
  | "notes"
  | "decisions"
  | "calendar";

interface SearchResult {
  type: ResultType;
  id: string;
  title: string;
  snippet: string;
  url: string;
  score: number;
}

const TYPE_META: Record<ResultType, { label: string; icon: typeof Search }> = {
  projects: { label: "Projects", icon: BarChart3 },
  tasks: { label: "Tasks", icon: CheckSquare },
  objectives: { label: "Objectives", icon: Target },
  kpis: { label: "KPIs", icon: Target },
  stakeholders: { label: "Stakeholders", icon: Users },
  notes: { label: "Notes", icon: FileText },
  decisions: { label: "Decisions", icon: GitBranch },
  calendar: { label: "Calendar", icon: Calendar },
};

function SearchResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [activeType, setActiveType] = useState<"all" | ResultType>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const runSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      setError(null);
      return;
    }
    const current = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/api/search?q=${encodeURIComponent(term.trim())}&limit=50`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      const body = await response.json();
      if (current !== requestId.current) return;
      if (!response.ok || !body.success) {
        throw new Error(body.message || "Search failed");
      }
      setResults(Array.isArray(body.data) ? body.data : []);
    } catch (e) {
      if (current !== requestId.current) return;
      setResults([]);
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void runSearch(query);
      const next = query.trim() ? `/dashboard/search?q=${encodeURIComponent(query.trim())}` : "/dashboard/search";
      router.replace(next, { scroll: false });
    }, 250);
    return () => clearTimeout(timer);
  }, [query, runSearch, router]);

  const counts = useMemo(() => {
    return results.reduce<Record<string, number>>((acc, result) => {
      acc[result.type] = (acc[result.type] ?? 0) + 1;
      return acc;
    }, {});
  }, [results]);

  const visible = activeType === "all" ? results : results.filter((result) => result.type === activeType);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#071a2e]">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Search</h1>
          <p className="mt-1 text-gray-600 dark:text-slate-400">
            Everything in your workspace — decisions, projects, notes, KPIs and meetings.
          </p>
        </div>

        <div className="relative mb-5">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search decisions, notes, projects, people…"
            className="h-12 pl-12 pr-12 text-base dark:border-white/10 dark:bg-[#0d1f38]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={activeType === "all" ? "default" : "outline"}
            onClick={() => setActiveType("all")}
          >
            All {results.length ? `(${results.length})` : ""}
          </Button>
          {(Object.keys(TYPE_META) as ResultType[])
            .filter((type) => counts[type])
            .map((type) => {
              const Icon = TYPE_META[type].icon;
              return (
                <Button
                  key={type}
                  size="sm"
                  variant={activeType === type ? "default" : "outline"}
                  onClick={() => setActiveType(type)}
                >
                  <Icon className="mr-1.5 h-3.5 w-3.5" />
                  {TYPE_META[type].label} ({counts[type]})
                </Button>
              );
            })}
        </div>

        {error && (
          <Card className="mb-4 border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10">
            <CardContent className="flex items-center justify-between gap-4 p-4 text-sm text-red-700 dark:text-red-300">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={() => void runSearch(query)}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-500 dark:text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" /> Searching…
          </div>
        ) : visible.length ? (
          <div className="space-y-3">
            {visible.map((result) => {
              const meta = TYPE_META[result.type] ?? TYPE_META.notes;
              const Icon = meta.icon;
              return (
                <Link key={`${result.type}-${result.id}`} href={result.url} className="block">
                  <Card className="transition-shadow hover:shadow-md dark:border-white/10">
                    <CardContent className="flex items-start gap-4 p-4">
                      <span className="rounded-xl bg-blue-50 p-2.5 dark:bg-blue-500/10">
                        <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">{result.title}</span>
                          <Badge variant="outline" className="uppercase">
                            {meta.label}
                          </Badge>
                        </span>
                        {result.snippet && (
                          <span className="mt-1 block text-sm text-gray-600 dark:text-slate-400">
                            {result.snippet}
                          </span>
                        )}
                      </span>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : query.trim() ? (
          <Card className="dark:border-white/10">
            <CardContent className="py-16 text-center">
              <Search className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="font-medium text-gray-900 dark:text-white">No matches for “{query.trim()}”</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                Try a shorter phrase, or a record type filter once something matches.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="dark:border-white/10">
            <CardContent className="py-16 text-center">
              <Search className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="font-medium text-gray-900 dark:text-white">Search your workspace</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                Results include decisions, projects, tasks, objectives, KPIs, stakeholders, notes and calendar events.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#071a2e]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
