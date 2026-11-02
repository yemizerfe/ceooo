"use client";
import { debugError } from "@/lib/logger";
// app/dashboard/projects/page.tsx

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FolderKanban, 
  Plus, 
  Target, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Brain, 
  Loader2,
  Edit2,
  Trash2,
  Clock,
  Flag,
  Users,
  RefreshCw,
  Award,
  DollarSign,
  ExternalLink,
  Plug,
  ChevronLeft,
  ChevronRight,
  UserPlus
} from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProjectStore, Project, Task } from "@/store/projectStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";

interface IntegrationProject {
  id: string;
  name: string;
  source: string;
  sourceName?: string;
  sourceIcon?: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  rawStatus?: string | null;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  progress?: number;
  taskCount?: number;
  completedTaskCount?: number;
  startDate?: string;
  deadline?: string;
  url?: string;
  description?: string;
  workspace?: string;
  kind?: 'external';
}

const SOURCE_COLORS: Record<string, string> = {
  jira:    "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  asana:   "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300",
  trello:  "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
  monday:  "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
  github:  "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300",
  notion:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300",
};

function SourceBadge({ source }: { source: string }) {
  const cls = SOURCE_COLORS[source] || "bg-purple-100 text-purple-700";
  return <Badge className={cls}>{source}</Badge>;
}

export default function ProjectsPage() {
  const { projects, fetchProjects, createProject, updateProject, deleteProject, refreshProject, isLoading } = useProjectStore();
  const [selected, setSelected] = useState<Project | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [integrationProjects, setIntegrationProjects] = useState<IntegrationProject[]>([]);
  const [selectedExternal, setSelectedExternal] = useState<IntegrationProject | null>(null);
  const [intLoading, setIntLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'internal' | 'integrations'>('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 5;
  const [form, setForm] = useState<{
    name: string;
    description: string;
    priority: "MEDIUM" | "HIGH" | "LOW";
    deadline: string;
    startDate: string;
    budget: string;
    teamSize: string;
  }>({
    name: "",
    description: "",
    priority: "MEDIUM",
    deadline: "",
    startDate: "",
    budget: "",
    teamSize: ""
  });    const [editForm, setEditForm] = useState<Partial<Project>>({});
  const [newTask, setNewTask] = useState({ title: "", description: "", assignedTo: "", dueDate: "" });

  useEffect(() => { 
    fetchProjects(); 
  }, [fetchProjects]);

  useEffect(() => { 
    if (projects.length > 0 && !selected) setSelected(projects[0]); 
  }, [projects]);

  const fetchIntegrationProjects = async () => {
    setIntLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/integrations/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setIntegrationProjects(data.data || []);
    } catch { /* silent */ } finally {
      setIntLoading(false);
    }
  };

  useEffect(() => { fetchIntegrationProjects(); }, []);

  // Returning to the first page whenever the filter changes avoids showing an
  // empty page after switching to a smaller tab.
  useEffect(() => { setPage(0); }, [activeTab]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400";
      case "PAUSED": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400";
      case "CANCELLED": return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400";
      case "COMPLETED": return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-slate-300";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400";
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case "DONE": return "bg-green-100 text-green-700";
      case "IN_PROGRESS": return "bg-blue-100 text-blue-700";
      case "REVIEW": return "bg-yellow-100 text-yellow-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH": return "border-red-500 text-red-600";
      case "MEDIUM": return "border-yellow-500 text-yellow-600";
      case "LOW": return "border-green-500 text-green-600";
      default: return "";
    }
  };

  const isProjectCompleted = (project: Project) => {
    return project.status === "COMPLETED" || project.progress >= 100;
  };

  const handleCreate = async () => {
    if (!form.name) return;
    setUpdating(true);
    const newProject = await createProject({
      ...form,
      deadline: form.deadline || undefined,
      startDate: form.startDate || undefined,
      budget: form.budget ? parseFloat(form.budget) : undefined,
      teamSize: form.teamSize ? parseInt(form.teamSize, 10) : undefined,
      progress: 0,
      status: "ACTIVE" as const,
      tasks: []
    });
    if (newProject) {
      setSelected(newProject);
      await fetchProjects();
    }
    setUpdating(false);
    setShowCreate(false);
    setForm({ name: "", description: "", priority: "MEDIUM", deadline: "", startDate: "", budget: "", teamSize: "" });
  };

  const handleEdit = async () => {
    if (!selected) return;
    setUpdating(true);    const updatedData: Partial<Project> = {
      name: editForm.name ?? selected?.name ?? "",
      description: editForm.description ?? selected?.description ?? "",
      priority: editForm.priority ?? selected?.priority ?? ("MEDIUM" as const),
      status: editForm.status ?? selected?.status ?? ("ACTIVE" as const),
      deadline: editForm.deadline ?? selected?.deadline ?? undefined,
    } as Partial<Project>;

    // Only include budget if it has a value
    if (editForm.budget !== undefined && editForm.budget !== null) {
      const parsedBudget = parseFloat(String(editForm.budget));
      if (!Number.isNaN(parsedBudget)) {
        (updatedData as any).budget = parsedBudget;
      }
    }

    // Only include teamSize if it has a value
    if (editForm.teamSize !== undefined && editForm.teamSize !== null) {
      const parsedTeamSize = parseInt(String(editForm.teamSize), 10);
      if (!Number.isNaN(parsedTeamSize)) {
        (updatedData as any).teamSize = parsedTeamSize;
      }
    }
    
    const updatedProject = await updateProject(selected.id, updatedData);
    if (updatedProject) {
      setSelected(updatedProject);
      await fetchProjects();
    }
    setUpdating(false);
    setShowEdit(false);
  };

  const handleDeleteProject = async () => {
    if (!selected || !confirm("Are you sure you want to delete this project?")) return;
    setUpdating(true);
    await deleteProject(selected.id);
    const remainingProjects = projects.filter(p => p.id !== selected.id);
    setSelected(remainingProjects[0] || null);
    await fetchProjects();
    setUpdating(false);
  };

  const handleUpdateProgress = async (increment: number) => {
    if (!selected || isProjectCompleted(selected)) return;
    setUpdating(true);
    const newProgress = Math.min(100, Math.max(0, selected.progress + increment));
    const newStatus = newProgress >= 100 ? "COMPLETED" : selected.status;
    const updatedProject = await updateProject(selected.id, { progress: newProgress, status: newStatus });
    if (updatedProject) {
      setSelected(updatedProject);
      await fetchProjects();
    }
    setUpdating(false);
  };

  const handleMarkComplete = async () => {
    if (!selected || isProjectCompleted(selected)) return;
    setUpdating(true);
    const updatedProject = await updateProject(selected.id, { status: "COMPLETED", progress: 100 });
    if (updatedProject) {
      setSelected(updatedProject);
      await fetchProjects();
    }
    setUpdating(false);
  };

  const handleAddTask = async () => {
    if (!selected || !newTask.title || isProjectCompleted(selected)) return;
    setUpdating(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010"}/api/projects/${selected.id}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description || undefined,
          assignedTo: newTask.assignedTo || undefined,
          dueDate: newTask.dueDate || undefined
        }),
      });

      if (!response.ok) throw new Error('Failed to add task');

      const data = await response.json();
      const addedTask = data.data;

      const updatedTasks = [...(selected.tasks || []), addedTask];
      setSelected({ ...selected, tasks: updatedTasks });
      await fetchProjects();
      
      setShowAddTask(false);
      setNewTask({ title: "", description: "", assignedTo: "", dueDate: "" });
    } catch (error) {
      debugError('Add task error:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    if (!selected || isProjectCompleted(selected)) return;
    setUpdating(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010"}/api/projects/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update task');

      const data = await response.json();
      const updatedTask: Task = data.data as Task;

      const updatedTasks = selected.tasks.map((task) =>
        task.id === taskId ? updatedTask : task
      );
      
      setSelected({ ...selected, tasks: updatedTasks });
      await fetchProjects();
    } catch (error) {
      debugError('Update task error:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "DONE": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "IN_PROGRESS": return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case "REVIEW": return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getDaysRemaining = (deadline: string) => {
    if (!deadline) return null;
    const days = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return "Overdue";
    if (days === 0) return "Due today";
    return `${days} days remaining`;
  };

  const calculateTaskProgress = (tasks: Task[]) => {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.status === "DONE").length;
    return Math.round((completed / tasks.length) * 100);
  };

  const visibleInternal = activeTab === 'integrations' ? [] : projects;
  const visibleExternal = activeTab === 'internal' ? [] : integrationProjects;

  // Paginate the merged list once there are more than five cards, so the list
  // panel stays readable with large portfolios (in-app + integrations).
  const allCards = [
    ...visibleInternal.map((project) => ({ kind: 'app' as const, id: project.id })),
    ...visibleExternal.map((project) => ({ kind: 'external' as const, id: project.id })),
  ];
  const totalPages = Math.max(1, Math.ceil(allCards.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageCards = allCards.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);
  const pageInternalIds = new Set(pageCards.filter((c) => c.kind === 'app').map((c) => c.id));
  const pageExternalIds = new Set(pageCards.filter((c) => c.kind === 'external').map((c) => c.id));
  const pagedInternal = visibleInternal.filter((p) => pageInternalIds.has(p.id));
  const pagedExternal = visibleExternal.filter((p) => pageExternalIds.has(p.id));

  if (isLoading && projects.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Project Management</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Track and manage strategic initiatives</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild className="gap-2">
              <Link href="/dashboard/team">
                <UserPlus className="w-4 h-4" /> Add team
              </Link>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => { fetchProjects(); fetchIntegrationProjects(); }} 
              disabled={isLoading || intLoading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${(isLoading || intLoading) ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 gap-2"><Plus className="w-4 h-4" />New Project</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Create New Project</DialogTitle></DialogHeader>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                  <div><Label>Project Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Q4 Product Launch" /></div>
                  <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the project" rows={3} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Priority</Label>
                      <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as "MEDIUM" | "HIGH" | "LOW" })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HIGH">High Priority</SelectItem>
                          <SelectItem value="MEDIUM">Medium Priority</SelectItem>
                          <SelectItem value="LOW">Low Priority</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
                    <div><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
                    <div><Label>Budget ($)</Label><Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="e.g., 50000" /></div>
                    <div><Label>Team Size</Label><Input type="number" value={form.teamSize} onChange={(e) => setForm({ ...form, teamSize: e.target.value })} placeholder="Number of team members" /></div>
                  </div>
                  <Button className="w-full" onClick={handleCreate} disabled={!form.name || updating}>Create Project</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="mb-6 bg-purple-50 dark:bg-purple-500/10 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-purple-500" />
              <p className="text-sm">
                {projects.length > 0
                  ? `${projects.filter((p) => p.status === "ACTIVE").length} active projects. ${projects.filter((p) => p.progress < 40 && p.status === "ACTIVE").length} need attention.`
                  : "Create your first project to get AI insights."}
                {integrationProjects.length > 0 && ` · ${integrationProjects.length} project${integrationProjects.length === 1 ? '' : 's'} from connected integrations.`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tab switcher */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={activeTab === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('all')}
          >
            <FolderKanban className="w-4 h-4 mr-1" />
            All Projects ({projects.length + integrationProjects.length})
          </Button>
          <Button
            variant={activeTab === 'internal' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('internal')}
          >
            In App ({projects.length})
          </Button>
          <Button
            variant={activeTab === 'integrations' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('integrations')}
          >
            <Plug className="w-4 h-4 mr-1" />
            From Integrations ({integrationProjects.length})
          </Button>
          {intLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400 self-center" />}
        </div>

        {visibleInternal.length === 0 && visibleExternal.length === 0 ? (
          <div className="text-center py-16">
            <FolderKanban className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No projects yet.</p>
            <p className="text-sm text-gray-400">Create one here, or connect Jira, Asana, Trello, Monday, or GitHub to sync projects automatically.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-3">
              {pagedInternal.map((p) => (
                <Card key={p.id} className={`cursor-pointer transition-all hover:shadow-md ${selected?.id === p.id && !selectedExternal ? "ring-2 ring-blue-500" : ""}`} onClick={() => { setSelected(p); setSelectedExternal(null); }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold line-clamp-1">{p.name}</h3>
                      <Badge variant={p.priority === "HIGH" ? "destructive" : "default"}>{p.priority.toLowerCase()}</Badge>
                    </div>
                    <div className="mb-2">
                      <div className="flex justify-between text-sm mb-1"><span>Progress</span><span>{p.progress}%</span></div>
                      <Progress value={p.progress} className="h-2" />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {p.deadline && <span>Due: {new Date(p.deadline).toLocaleDateString()}</span>}
                      <Badge className={getStatusColor(p.status)}>{p.status.toLowerCase()}</Badge>
                    </div>
                    {p.deadline && (
                      <p className={`text-xs mt-2 ${getDaysRemaining(p.deadline) === "Overdue" ? "text-red-500" : "text-gray-400"}`}>
                        {getDaysRemaining(p.deadline)}
                      </p>
                    )}
                    {isProjectCompleted(p) && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                        <Award className="w-3 h-3" />
                        <span>Completed</span>
                      </div>
                    )}
                    {p.tasks && p.tasks.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        {p.tasks.filter(t => t.status === "DONE").length}/{p.tasks.length} tasks done
                      </div>
                    )}
                    <div className="mt-2 flex gap-2 text-xs text-gray-400">
                      {p.budget != null && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" /> ${p.budget.toLocaleString()}
                        </span>
                      )}
                      {p.teamSize != null && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {p.teamSize} members
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {pagedExternal.map((p) => (
                <Card
                  key={p.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedExternal?.id === p.id ? "ring-2 ring-purple-500" : ""}`}
                  onClick={() => { setSelectedExternal(p); setSelected(null); }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <h3 className="font-semibold line-clamp-1">{p.name}</h3>
                      <SourceBadge source={p.source} />
                    </div>
                    <div className="mb-2">
                      <div className="flex justify-between text-sm mb-1"><span>Progress</span><span>{p.progress ?? 0}%</span></div>
                      <Progress value={p.progress ?? 0} className="h-2" />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {p.deadline && <span>Due: {new Date(p.deadline).toLocaleDateString()}</span>}
                      <Badge className={getStatusColor(p.status)}>{String(p.status).toLowerCase()}</Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                      <span>{p.sourceName || p.source}{p.taskCount ? ` · ${p.completedTaskCount || 0}/${p.taskCount} tasks` : ''}</span>
                      {p.url && (
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {allCards.length > PAGE_SIZE && (
                <div className="flex items-center justify-between gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </Button>
                  <span className="text-xs text-gray-500">
                    Page {currentPage + 1} of {totalPages} · {allCards.length} projects
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className="gap-1"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              {selectedExternal && (
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 flex-wrap">
                        {selectedExternal.name}
                        <SourceBadge source={selectedExternal.source} />
                      </CardTitle>
                      {selectedExternal.description && (
                        <p className="text-sm text-gray-500 mt-1">{selectedExternal.description}</p>
                      )}
                    </div>
                    {selectedExternal.url && (
                      <a href={selectedExternal.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-2">
                          Open in {selectedExternal.sourceName || selectedExternal.source}
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                        <div className="text-sm text-gray-500">Status</div>
                        <Badge className={getStatusColor(selectedExternal.status)}>{String(selectedExternal.status).toLowerCase()}</Badge>
                      </div>
                      <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                        <div className="text-sm text-gray-500">Priority</div>
                        <div className={`font-medium border-l-2 pl-2 ${getPriorityColor(selectedExternal.priority || 'MEDIUM')}`}>
                          {String(selectedExternal.priority || 'MEDIUM').toLowerCase()}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                        <div className="text-sm text-gray-500">Progress</div>
                        <div className="font-medium">{selectedExternal.progress ?? 0}%</div>
                        <Progress value={selectedExternal.progress ?? 0} className="h-1 mt-1" />
                      </div>
                      <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                        <div className="text-sm text-gray-500">Tasks</div>
                        <div className="font-medium">{selectedExternal.completedTaskCount || 0}/{selectedExternal.taskCount || 0} done</div>
                      </div>
                      {selectedExternal.deadline && (
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                          <div className="text-sm text-gray-500">Deadline</div>
                          <div className="font-medium">{new Date(selectedExternal.deadline).toLocaleDateString()}</div>
                        </div>
                      )}
                      {selectedExternal.startDate && (
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                          <div className="text-sm text-gray-500">Start Date</div>
                          <div className="font-medium">{new Date(selectedExternal.startDate).toLocaleDateString()}</div>
                        </div>
                      )}
                      {selectedExternal.workspace && (
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                          <div className="text-sm text-gray-500">Workspace</div>
                          <div className="font-medium">{selectedExternal.workspace}</div>
                        </div>
                      )}
                    </div>
                    <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 flex items-start gap-3">
                      <Plug className="w-5 h-5 text-purple-500 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-purple-800 dark:text-purple-200">Synced from {selectedExternal.sourceName || selectedExternal.source}</p>
                        <p className="text-purple-700 dark:text-purple-300">
                          This project lives in your connected tool. Changes made there sync back here; edit it at the source.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!selectedExternal && selected && (
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{selected.name}</CardTitle>
                      {selected.description && <p className="text-sm text-gray-500 mt-1">{selected.description}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Dialog open={showEdit} onOpenChange={setShowEdit}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => {
                            if (!selected) return;
                            setEditForm({
                              name: selected.name,
                              description: selected.description || "",
                              priority: selected.priority,
                              status: selected.status,
                              deadline: selected.deadline ? selected.deadline.split('T')[0] : "",
                              budget: selected.budget != null ? Number(selected.budget) : undefined,
                              teamSize: selected.teamSize != null ? Number(selected.teamSize) : undefined
                            });
                          }} disabled={isProjectCompleted(selected)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>
                          <div className="space-y-4">
                            <div><Label>Name</Label><Input value={editForm.name ?? ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
                            <div><Label>Description</Label><Textarea value={editForm.description ?? ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} /></div>
                            <div className="grid grid-cols-2 gap-4">
                              <div><Label>Priority</Label>
                                <Select value={editForm.priority ?? "MEDIUM"} onValueChange={(v) => setEditForm({ ...editForm, priority: v as "MEDIUM" | "HIGH" | "LOW" | undefined })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="HIGH">High</SelectItem>
                                    <SelectItem value="MEDIUM">Medium</SelectItem>
                                    <SelectItem value="LOW">Low</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div><Label>Status</Label>
                                <Select value={editForm.status ?? "ACTIVE"} onValueChange={(v) => setEditForm({ ...editForm, status: v as "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED" | undefined })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                    <SelectItem value="PAUSED">Paused</SelectItem>
                                    <SelectItem value="COMPLETED">Completed</SelectItem>
                                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div><Label>Deadline</Label><Input type="date" value={editForm.deadline ?? ""} onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value || undefined })} /></div>
                              <div><Label>Budget ($)</Label><Input type="number" value={editForm.budget ?? ""} onChange={(e) => setEditForm({ ...editForm, budget: e.target.value ? Number(e.target.value) : undefined })} placeholder="Enter budget amount" /></div>
                              <div><Label>Team Size</Label><Input type="number" value={editForm.teamSize ?? ""} onChange={(e) => setEditForm({ ...editForm, teamSize: e.target.value ? Number(e.target.value) : undefined })} placeholder="Number of team members" /></div>
                            </div>
                            <div className="flex gap-2">
                              <Button className="flex-1" onClick={() => handleEdit()} disabled={updating || selected == null}>Save Changes</Button>
                              <Button variant="destructive" className="flex-1" onClick={handleDeleteProject} disabled={updating}>
                                <Trash2 className="w-4 h-4 mr-2" />Delete
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isProjectCompleted(selected) && (
                      <div className="p-4 bg-green-50 dark:bg-green-500/10 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-3">
                          <Award className="w-6 h-6 text-green-600" />
                          <div>
                            <h4 className="font-semibold text-green-700 dark:text-green-400">Project Completed!</h4>
                            <p className="text-sm text-green-600 dark:text-green-300">This project has been successfully completed.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                        <div className="text-sm text-gray-500">Status</div>
                        <Badge className={getStatusColor(selected.status)}>{selected.status.toLowerCase()}</Badge>
                      </div>
                      <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                        <div className="text-sm text-gray-500">Priority</div>
                        <div className={`font-medium border-l-2 pl-2 ${getPriorityColor(selected.priority)}`}>
                          {selected.priority.toLowerCase()}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                        <div className="text-sm text-gray-500">Progress</div>
                        <div className="font-medium">{selected.progress}%</div>
                        <Progress value={selected.progress} className="h-1 mt-1" />
                      </div>
                      {selected.deadline && (
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                          <div className="text-sm text-gray-500">Deadline</div>
                          <div className="font-medium">{new Date(selected.deadline).toLocaleDateString()}</div>
                          <p className={`text-xs mt-1 ${getDaysRemaining(selected.deadline) === "Overdue" ? "text-red-500" : "text-gray-400"}`}>
                            {getDaysRemaining(selected.deadline)}
                          </p>
                        </div>
                      )}
                      {selected.startDate && (
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                          <div className="text-sm text-gray-500">Start Date</div>
                          <div className="font-medium">{new Date(selected.startDate).toLocaleDateString()}</div>
                        </div>
                      )}
                      <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                        <div className="text-sm text-gray-500">Tasks</div>
                        <div className="font-medium">{selected.tasks?.filter((t) => t.status === "DONE").length || 0}/{selected.tasks?.length || 0} done</div>
                        <div className="text-xs text-gray-400 mt-1">Task progress: {calculateTaskProgress(selected.tasks)}%</div>
                      </div>                      {selected.budget != null && (
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                          <div className="text-sm text-gray-500">Budget</div>
                          <div className="font-medium flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> ${selected.budget.toLocaleString()}
                          </div>
                        </div>
                      )}
                      {selected.teamSize != null && (
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                          <div className="text-sm text-gray-500">Team Size</div>
                          <div className="font-medium flex items-center gap-1">
                            <Users className="w-3 h-3" /> {String(selected.teamSize)} members
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Tasks Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium">Tasks ({selected.tasks?.length || 0})</h3>
                        <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="gap-1" 
                              disabled={isProjectCompleted(selected)}
                            >
                              <Plus className="w-3 h-3" />Add Task
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
                            <div className="space-y-4">
                              <div><Label>Task Title *</Label><Input value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} /></div>
                              <div><Label>Description</Label><Textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} rows={2} /></div>
                              <div className="grid grid-cols-2 gap-4">
                                <div><Label>Assigned To</Label><Input value={newTask.assignedTo} onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })} placeholder="Team member name" /></div>
                                <div><Label>Due Date</Label><Input type="date" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} /></div>
                              </div>
                              <Button className="w-full" onClick={handleAddTask} disabled={!newTask.title || updating || isProjectCompleted(selected)}>Add Task</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                      {selected.tasks && selected.tasks.length > 0 ? (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {selected.tasks.map((task) => (
                            <div key={task.id} className="flex flex-col p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                              <div className="flex items-center gap-3">
                                <button 
                                  onClick={() => handleUpdateTaskStatus(task.id, task.status === "DONE" ? "TODO" : "DONE")} 
                                  disabled={updating || isProjectCompleted(selected)}
                                  className="focus:outline-none"
                                >
                                  {getStatusIcon(task.status)}
                                </button>
                                <div className="flex-1">
                                  <span className={`text-sm font-medium ${task.status === "DONE" ? "line-through text-gray-400" : ""}`}>{task.title}</span>
                                  {task.description && <p className="text-xs text-gray-400 mt-0.5">{task.description}</p>}
                                </div>
                                <Select 
                                  value={task.status} 
                                  onValueChange={(v) => handleUpdateTaskStatus(task.id, v)} 
                                  disabled={updating || isProjectCompleted(selected)}
                                >
                                  <SelectTrigger className="w-24 h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="TODO">To Do</SelectItem>
                                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                    <SelectItem value="REVIEW">Review</SelectItem>
                                    <SelectItem value="DONE">Done</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-center gap-4 mt-2 ml-7 text-xs text-gray-400">
                                {task.assignedTo && (
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3" /> {task.assignedTo}
                                  </span>
                                )}
                                {task.dueDate && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Due: {new Date(task.dueDate).toLocaleDateString()}
                                  </span>
                                )}
                                <Badge className={getTaskStatusColor(task.status)}>
                                  {task.status.replace('_', ' ').toLowerCase()}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No tasks yet. Click "Add Task" to create your first task!</p>
                        </div>
                      )}
                    </div>

                    {/* Progress Update Buttons */}
                    <div className="flex gap-3 pt-4">
                      <Button 
                        className="flex-1 gap-2" 
                        onClick={() => handleUpdateProgress(10)} 
                        disabled={updating || selected.progress >= 100 || isProjectCompleted(selected)}
                      >
                        {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                        Update Progress +10%
                      </Button>
                      <Button 
                        className="flex-1 gap-2" 
                        onClick={() => handleUpdateProgress(20)} 
                        disabled={updating || selected.progress >= 100 || isProjectCompleted(selected)}
                      >
                        {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                        Update Progress +20%
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1 gap-2" 
                        onClick={handleMarkComplete}
                        disabled={updating || isProjectCompleted(selected)}
                      >
                        <CheckCircle2 className="w-4 h-4" />Mark Complete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
