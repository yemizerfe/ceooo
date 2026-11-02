"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  FileText,
  FilePlus2,
  Search,
  Pin,
  Trash2,
  Edit2,
  Clock,
  Brain,
  Sparkles,
  CheckCircle2,
  Users,
  Loader2,
  Calendar,
  Link2,
  Activity,
  Wand2,
  AlertTriangle,
  Save,
  X,
  Plus,
  PanelRightClose,
  PanelRightOpen,
  MoreVertical,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Progress } from "@/components/ui/progress";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { formatDistanceToNow } from "date-fns";
import { useNotesStore, Note } from "@/store/notesStore";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";
import { ExternalRecordsPanel } from "@/components/integrations/ExternalRecordsPanel";

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  );
}

const categories = [
  { id: "all", label: "All Notes", icon: FileText },
  { id: "MEETING", label: "Meetings", icon: Users },
  { id: "IDEA", label: "Ideas", icon: LightbulbIcon },
  { id: "DECISION", label: "Decisions", icon: CheckCircle2 },
  { id: "TASK", label: "Tasks", icon: Clock },
];

const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const NOTE_CATEGORIES = ["MEETING", "IDEA", "DECISION", "TASK", "GENERAL"] as const;
const NOTE_PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;

// The editor keeps its fields as plain strings; narrow them to the category and
// priority values the notes API actually accepts before sending.
const toNoteCategory = (value: string): Note["category"] =>
  (NOTE_CATEGORIES as readonly string[]).includes(value.toUpperCase())
    ? (value.toUpperCase() as Note["category"])
    : "GENERAL";

const toNotePriority = (value: string): "HIGH" | "MEDIUM" | "LOW" =>
  (NOTE_PRIORITIES as readonly string[]).includes(value.toUpperCase())
    ? (value.toUpperCase() as "HIGH" | "MEDIUM" | "LOW")
    : "MEDIUM";

export default function NotesPage() {
  const {
    notes = [],
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
    summarizeNote,
    isLoading,
  } = useNotesStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const [showRightPanel, setShowRightPanel] = useState(true);

  const [isSummarizing, setIsSummarizing] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createNotice, setCreateNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [summary, setSummary] = useState("");

  const [isCreating, setIsCreating] = useState(false);

  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "GENERAL",
    tags: "",
    priority: "MEDIUM",
    linkedProject: "",
    participants: "",
  });

  const [editMode, setEditMode] = useState(false);

  const [editForm, setEditForm] = useState({
    title: "",
    content: "",
    category: "",
    priority: "",
    tags: "",
  });

  useEffect(() => {
    fetchNotes?.();
  }, [fetchNotes]);

  const filtered = useMemo(() => {
    return notes.filter((n: any) => {
      const matchSearch =
        n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCat =
        selectedCategory === "all" || n.category === selectedCategory;

      return matchSearch && matchCat;
    });
  }, [notes, searchQuery, selectedCategory]);

  const pinned = filtered.filter((n: any) => n.isPinned);
  const unpinned = filtered.filter((n: any) => !n.isPinned);

  // AI recommendations derived from this workspace's real notes.
  const aiRecommendations = useMemo(() => {
    const list: string[] = [];
    const critical = notes.filter((n: any) => n.priority === "CRITICAL");
    if (critical.length) {
      list.push(
        `${critical.length} critical note${critical.length === 1 ? "" : "s"} need an owner and a deadline: ${critical
          .slice(0, 2)
          .map((n: any) => n.title)
          .join(", ")}.`
      );
    }
    const meetings = notes.filter((n: any) => n.category === "MEETING");
    const meetingsWithoutSummary = meetings.filter((n: any) => !n.aiSummary);
    if (meetingsWithoutSummary.length) {
      list.push(
        `${meetingsWithoutSummary.length} meeting note${meetingsWithoutSummary.length === 1 ? "" : "s"} have no AI summary yet — summarise them to extract action items.`
      );
    }
    const untagged = notes.filter((n: any) => {
      const tags = Array.isArray(n.tags) ? n.tags : [];
      return tags.length === 0;
    });
    if (untagged.length) {
      list.push(`${untagged.length} note${untagged.length === 1 ? "" : "s"} are untagged, which weakens search and AI context.`);
    }
    const staleCutoff = Date.now() - 30 * 24 * 3600 * 1000;
    const stale = notes.filter(
      (n: any) => n.updatedAt && new Date(n.updatedAt).getTime() < staleCutoff
    );
    if (stale.length) {
      list.push(`${stale.length} note${stale.length === 1 ? "" : "s"} have not been updated in 30+ days — confirm they are still accurate.`);
    }
    if (!list.length) {
      list.push(
        notes.length
          ? "Knowledge base is healthy: every note is tagged, summarised, and current."
          : "Add your first note to start building the company knowledge base."
      );
    }
    return list.slice(0, 4);
  }, [notes]);

  const knowledgeHealth = useMemo(() => {
    const total = notes.length || 1;
    const tagged = notes.filter((n: any) => (Array.isArray(n.tags) ? n.tags.length : 0) > 0).length;
    const summarized = notes.filter((n: any) => n.aiSummary).length;
    return {
      coverage: Math.round((tagged / total) * 100),
      optimized: Math.round((summarized / total) * 100),
    };
  }, [notes]);

  // Activity feed derived from the notes that actually exist in this workspace.
  const recentActivity = useMemo(() => {
    return [...notes]
      .filter((n: any) => n.updatedAt || n.createdAt)
      .sort((a: any, b: any) => {
        const aTime = new Date(a.updatedAt || a.createdAt).getTime();
        const bTime = new Date(b.updatedAt || b.createdAt).getTime();
        return bTime - aTime;
      })
      .slice(0, 4)
      .map((n: any) => {
        const created = new Date(n.createdAt || n.updatedAt).getTime();
        const updated = new Date(n.updatedAt || n.createdAt).getTime();
        const isNew = Math.abs(updated - created) < 60_000;
        return {
          id: n.id,
          title: n.title || "Untitled note",
          isNew,
          pinned: Boolean(n.isPinned),
          category: n.category as string,
          at: new Date(n.updatedAt || n.createdAt),
        };
      });
  }, [notes]);

  const handleCreate = async () => {
    if (!form.title.trim()) {
      setCreateError("Add a title before saving this note.");
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    setCreateNotice(null);

    try {
      await createNote({
        ...form,
        category: toNoteCategory(form.category),
        priority: toNotePriority(form.priority),
        tags: form.tags
          ? form.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      });

      setForm({
        title: "",
        content: "",
        category: "GENERAL",
        tags: "",
        priority: "MEDIUM",
        linkedProject: "",
        participants: "",
      });

      setCreateNotice("Note saved");
      setTimeout(() => setCreateNotice(null), 2500);
      await fetchNotes?.();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Could not save this note. Please try again.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const runNoteAssist = async (
    mode: "improve" | "tasks" | "stakeholders" | "action-plan",
    source?: { title: string; content: string; noteId?: string }
  ) => {
    const title = source?.title ?? selectedNote?.title ?? form.title;
    const content = source?.content ?? selectedNote?.content ?? form.content;
    if (!content?.trim()) {
      setSummary("Write some content first so the AI has something to work with.");
      return null;
    }
    setIsSummarizing(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/ai/note-assist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mode, title, content, noteId: source?.noteId ?? selectedNote?.id }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "AI assist failed");
      return data.data.result as string;
    } catch (error) {
      setSummary(error instanceof Error ? error.message : "AI assist failed");
      return null;
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSummarize = async () => {
    if (!selectedNote) return;

    setIsSummarizing(true);

    try {
      const result = await summarizeNote(selectedNote.id);
      setSummary(result?.summary || "No summary generated.");
    } catch {
      setSummary("Failed to summarize note.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handlePin = async (note: any) => {
    await updateNote(note.id, {
      isPinned: !note.isPinned,
    });

    await fetchNotes?.();
  };

  const handleDelete = async (id: string) => {
    await deleteNote(id);
    setSelectedNote(null);
    await fetchNotes?.();
  };

  const openEdit = () => {
    if (!selectedNote) return;

    setEditForm({
      title: selectedNote.title || "",
      content: selectedNote.content || "",
      category: selectedNote.category || "GENERAL",
      priority: (selectedNote as any).priority || "MEDIUM",
      tags: ((selectedNote.tags as string[]) || []).join(", "),
    });

    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedNote) return;

    if (!editForm.title.trim()) {
      setSaveError("Give the note a title before saving.");
      return;
    }

    setSavingNote(true);
    setSaveError(null);
    try {
      await updateNote(selectedNote.id, {
        title: editForm.title.trim(),
        content: editForm.content,
        category: toNoteCategory(editForm.category),
        priority: toNotePriority(editForm.priority),
        tags: editForm.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });

      // Read the *fresh* store state: the `notes` captured in this render is
      // stale, and re-selecting from it silently reverts the saved changes.
      const updated = useNotesStore
        .getState()
        .notes.find((n) => n.id === selectedNote.id);

      setSelectedNote(updated ?? null);
      setEditMode(false);
      setSaveNotice("Changes saved");
      setTimeout(() => setSaveNotice(null), 2500);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Could not save this note. Please try again.",
      );
    } finally {
      setSavingNote(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400";

      case "HIGH":
        return "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400";

      case "MEDIUM":
        return "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-slate-300";

      case "LOW":
        return "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#071a2e]">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Notes Board
            </h1>

            <p className="text-gray-500 dark:text-gray-400 mt-1">
              AI-powered executive knowledge management
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShowRightPanel(!showRightPanel)}
            >
              {showRightPanel ? (
                <PanelRightClose className="w-4 h-4" />
              ) : (
                <PanelRightOpen className="w-4 h-4" />
              )}

              Insights
            </Button>

            <Button
              className="bg-blue-600 hover:bg-blue-700 gap-2"
              onClick={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}

              Save Note
            </Button>
          </div>
        </div>

        {(createError || createNotice) && (
          <div
            role={createError ? "alert" : "status"}
            className={`mb-4 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
              createError
                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
                : "border-green-200 bg-green-50 text-green-700 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-300"
            }`}
          >
            {createError ? (
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            <span className="flex-1">{createError || createNotice}</span>
            <button
              type="button"
              aria-label="Dismiss"
              className="opacity-60 hover:opacity-100"
              onClick={() => {
                setCreateError(null);
                setCreateNotice(null);
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <ExternalRecordsPanel
          domain="notes"
          description="Pages and documents synced from Notion, Google Drive, Dropbox, and Airtable."
        />

        {/* AI INSIGHT */}
        <Card className="mb-6 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-purple-500" />

              <div>
                <p className="text-sm font-medium">
                  AI Executive Insight
                </p>

                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You have{" "}
                  {
                    notes.filter(
                      (n: any) => n.priority === "CRITICAL"
                    ).length
                  }{" "}
                  critical notes requiring executive attention.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* STATS */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">Total Notes</div>
              <div className="text-2xl font-bold">{notes.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">Pinned</div>
              <div className="text-2xl font-bold">{pinned.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">Meetings</div>
              <div className="text-2xl font-bold">
                {
                  notes.filter((n: any) => n.category === "MEETING")
                    .length
                }
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">
                AI Summaries
              </div>
              <div className="text-2xl font-bold">
                {notes.filter((n: any) => n.aiSummary).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <div
          className={`grid gap-6 ${
            showRightPanel
              ? "lg:grid-cols-[280px_1fr_340px]"
              : "lg:grid-cols-[280px_1fr]"
          }`}
        >
          {/* LEFT SIDEBAR */}
          <div className="space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

              <Input
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(e.target.value)
                }
                className="pl-9"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Categories
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-1">
                {categories.map((cat) => {
                  const Icon = cat.icon;

                  const count = notes.filter(
                    (n: any) =>
                      cat.id === "all" ||
                      n.category === cat.id
                  ).length;

                  return (
                    <button
                      key={cat.id}
                      onClick={() =>
                        setSelectedCategory(cat.id)
                      }
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${
                        selectedCategory === cat.id
                          ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600"
                          : "hover:bg-gray-100 dark:hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span>{cat.label}</span>
                      </div>

                      <Badge
                        variant="secondary"
                        className="text-xs"
                      >
                        {count}
                      </Badge>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            {/* ACTIVITY */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Recent Activity
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No activity yet. Notes you create or edit appear here.
                  </p>
                ) : (
                  recentActivity.map((item) => (
                    <div key={item.id} className="flex gap-2 text-sm">
                      {item.isNew ? (
                        <FilePlus2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      ) : item.pinned ? (
                        <Pin className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                      ) : (
                        <Edit2 className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      )}

                      <div className="min-w-0">
                        <p className="truncate text-gray-700 dark:text-gray-300">
                          {item.isNew ? "Created" : "Updated"}: {item.title}
                        </p>

                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(item.at, { addSuffix: true })}
                          {item.category ? ` · ${item.category.toLowerCase()}` : ""}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* MAIN EDITOR + NOTES */}
          <div className="space-y-6">
            {/* REAL NOTE EDITOR */}
            <Card className="border-blue-200 dark:border-slate-700 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    Executive Workspace
                  </CardTitle>

                  <Badge className="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-slate-300">
                    Live Draft
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      title: e.target.value,
                    })
                  }
                  placeholder="Untitled note..."
                  className="text-lg font-semibold border-none shadow-none px-0 focus-visible:ring-0 bg-transparent"
                />

                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <Label className="mb-2 block">
                      Category
                    </Label>

                    <Select
                      value={form.category}
                      onValueChange={(v) =>
                        setForm({
                          ...form,
                          category: v,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        {[
                          "MEETING",
                          "IDEA",
                          "DECISION",
                          "TASK",
                          "GENERAL",
                        ].map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-2 block">
                      Priority
                    </Label>

                    <Select
                      value={form.priority}
                      onValueChange={(v) =>
                        setForm({
                          ...form,
                          priority: v,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        {priorities.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-2 block">
                      Project
                    </Label>

                    <Input
                      value={form.linkedProject}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          linkedProject: e.target.value,
                        })
                      }
                      placeholder="Project"
                    />
                  </div>

                  <div>
                    <Label className="mb-2 block">
                      Participants
                    </Label>

                    <Input
                      value={form.participants}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          participants: e.target.value,
                        })
                      }
                      placeholder="Team members"
                    />
                  </div>
                </div>

                <Textarea
                  rows={16}
                  value={form.content}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      content: e.target.value,
                    })
                  }
                  placeholder="Start writing your executive notes, meeting summaries, decisions, strategy plans..."
                  className="resize-none border-none shadow-none focus-visible:ring-0 bg-transparent text-base leading-7"
                />

                <div className="flex items-center justify-between gap-4 flex-wrap pt-2 border-t">
                  <div className="flex-1">
                    <Input
                      value={form.tags}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          tags: e.target.value,
                        })
                      }
                      placeholder="Tags: strategy, board, roadmap..."
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      disabled={isSummarizing}
                      onClick={async () => {
                        const result = await runNoteAssist("improve", {
                          title: form.title,
                          content: form.content,
                        });
                        if (result) {
                          setForm({ ...form, content: result });
                          setSummary(result);
                        }
                      }}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {isSummarizing ? "Improving..." : "AI Improve"}
                    </Button>

                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={handleCreate}
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}

                      Save Note
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* NOTES LIST */}
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                {pinned.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
                      <Pin className="w-3 h-3" />
                      PINNED
                    </h2>

                    <div className="grid gap-4">
                      {pinned.map((note: any) => (
                        <motion.div
                          key={note.id}
                          layout
                        >
                          <Card
                            className="cursor-pointer hover:shadow-md transition-all"
                            onClick={() => {
                              setSelectedNote(note);
                              setSummary("");
                            }}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex gap-3 flex-1">
                                  <Avatar className="w-10 h-10">
                                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                                      {note.title?.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>

                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h3 className="font-semibold">
                                        {note.title}
                                      </h3>

                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {note.category}
                                      </Badge>

                                      <Badge
                                        className={getPriorityColor(
                                          note.priority || "MEDIUM"
                                        )}
                                      >
                                        {note.priority || "MEDIUM"}
                                      </Badge>
                                    </div>

                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-3">
                                      {note.content}
                                    </p>

                                    <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
                                      <div className="flex items-center gap-4 flex-wrap">
                                        <span>
                                          {new Date(
                                            note.createdAt
                                          ).toLocaleDateString()}
                                        </span>

                                        <div className="flex items-center gap-1">
                                          <Link2 className="w-3 h-3" />

                                          <span>
                                            {note.linkedProject ||
                                              "No Project"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>

                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handlePin(note)
                                      }
                                    >
                                      <Pin className="w-4 h-4 mr-2" />
                                      Unpin
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleDelete(note.id)
                                      }
                                      className="text-red-500"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h2 className="text-sm font-semibold text-gray-500 mb-3">
                    RECENT NOTES
                  </h2>

                  <div className="grid gap-4">
                    {unpinned.map((note: any) => (
                      <motion.div
                        key={note.id}
                        layout
                      >
                        <Card
                          className="cursor-pointer hover:shadow-md transition-all"
                          onClick={() => {
                            setSelectedNote(note);
                            setSummary("");
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex gap-3 flex-1">
                                <Avatar className="w-10 h-10">
                                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                                    {note.title?.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-semibold">
                                      {note.title}
                                    </h3>

                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {note.category}
                                    </Badge>

                                    <Badge
                                      className={getPriorityColor(
                                        note.priority || "MEDIUM"
                                      )}
                                    >
                                      {note.priority || "MEDIUM"}
                                    </Badge>
                                  </div>

                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-3">
                                    {note.content}
                                  </p>

                                  <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
                                    <span>
                                      {new Date(
                                        note.createdAt
                                      ).toLocaleDateString()}
                                    </span>

                                    <span>
                                      {note.tags?.length || 0} tags
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handlePin(note)
                                    }
                                  >
                                    <Pin className="w-4 h-4 mr-2" />
                                    Pin
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleDelete(note.id)
                                    }
                                    className="text-red-500"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* RIGHT PANEL */}
          {showRightPanel && (
            <div className="space-y-6">
              {/* AI RECOMMENDATIONS */}
              <Card className="bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    AI Recommendations
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3 text-sm">
                  {aiRecommendations.map((recommendation, index) => (
                    <div key={index} className="p-3 rounded-lg bg-white dark:bg-white/5">
                      {recommendation}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* HEALTH */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Knowledge Health
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Documentation Coverage</span>
                        <span>{knowledgeHealth.coverage}%</span>
                      </div>

                      <Progress value={knowledgeHealth.coverage} className="h-2" />
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>AI Optimization</span>
                        <span>{knowledgeHealth.optimized}%</span>
                      </div>

                      <Progress value={knowledgeHealth.optimized} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ALERTS */}
              <Card className="bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    Priority Alerts
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-2 text-sm">
                  {notes
                    .filter((n: any) => n.priority === "CRITICAL")
                    .slice(0, 3)
                    .map((n: any) => (
                      <div
                        key={n.id}
                        className="p-2 rounded-lg bg-white dark:bg-white/5"
                      >
                        {n.title}
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* NOTE MODAL */}
        <Dialog
          open={!!selectedNote}
          onOpenChange={() => {
            setSelectedNote(null);
            setSummary("");
            setEditMode(false);
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedNote && (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {editMode ? (
                        <Input
                          value={editForm.title}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              title: e.target.value,
                            })
                          }
                        />
                      ) : (
                        <DialogTitle className="text-2xl">
                          {selectedNote.title}
                        </DialogTitle>
                      )}

                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <Badge variant="outline">
                          {selectedNote.category}
                        </Badge>

                        <Badge
                          className={getPriorityColor(
                            (selectedNote as any).priority ||
                              "MEDIUM"
                          )}
                        >
                          {(selectedNote as any).priority ||
                            "MEDIUM"}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePin(selectedNote)}
                      >
                        <Pin className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={openEdit}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleDelete(selectedNote.id)
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-6">
                  <div>
                    {editMode ? (
                      <div className="space-y-4">
                        <Textarea
                          rows={10}
                          value={editForm.content}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              content: e.target.value,
                            })
                          }
                        />

                        <div className="flex gap-2 items-center flex-wrap">
                          <Button onClick={handleSaveEdit} disabled={savingNote}>
                            {savingNote ? "Saving..." : "Save Changes"}
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditMode(false);
                              setSaveError(null);
                            }}
                            disabled={savingNote}
                          >
                            Cancel
                          </Button>

                          {saveNotice && (
                            <span className="text-sm text-emerald-600 dark:text-emerald-400">
                              {saveNotice}
                            </span>
                          )}
                          {saveError && (
                            <span className="text-sm text-red-600 dark:text-red-400">
                              {saveError}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                        {selectedNote.content}
                      </p>
                    )}
                  </div>

                  {/* AI ACTIONS */}
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-3">
                      AI Actions
                    </p>

                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSummarize}
                        disabled={isSummarizing}
                      >
                        <Brain className="w-4 h-4 mr-1" />

                        {isSummarizing
                          ? "Summarizing..."
                          : "Summarize"}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSummarizing}
                        onClick={async () => {
                          const result = await runNoteAssist("tasks");
                          if (result) setSummary(`Action items\n\n${result}`);
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Generate Tasks
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSummarizing}
                        onClick={async () => {
                          const result = await runNoteAssist("stakeholders");
                          if (result) setSummary(`People mentioned\n\n${result}`);
                        }}
                      >
                        <Users className="w-4 h-4 mr-1" />
                        Extract Stakeholders
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSummarizing}
                        onClick={async () => {
                          const result = await runNoteAssist("action-plan");
                          if (result) setSummary(result);
                        }}
                      >
                        <Wand2 className="w-4 h-4 mr-1" />
                        Generate Action Plan
                      </Button>
                    </div>

                    {summary && (
                      <div className="mt-4 p-4 rounded-lg bg-purple-50 dark:bg-purple-500/10">
                        <p className="text-sm font-medium mb-2">
                          AI Summary
                        </p>

                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {summary}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}