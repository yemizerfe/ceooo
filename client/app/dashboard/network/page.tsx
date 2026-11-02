"use client";
// app/dashboard/network/page.tsx

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserPlus,
  MessageCircle,
  Calendar,
  Mail,
  Brain,
  Search,
  Loader2,
  Sparkles,
  Phone,
  Building2,
  Clock,
  Star,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Globe,
  Save,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { useStakeholderStore } from "@/store/stakeholderStore";
import { ExternalRecordsPanel } from "@/components/integrations/ExternalRecordsPanel";

export default function NetworkPage() {
  const {
    stakeholders = [],
    fetchStakeholders,
    createStakeholder,
    updateStakeholder,
    deleteStakeholder,
    isLoading,
  } = useStakeholderStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedPriority, setSelectedPriority] = useState("ALL");

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedStakeholder, setSelectedStakeholder] = useState<any | null>(null);
  const [stakeholderToDelete, setStakeholderToDelete] = useState<any | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    role: "",
    website: "",
    linkedin: "",
    notes: "",
    type: "CLIENT" as any,
    priority: "MEDIUM" as any,
    engagementScore: 50,
    nextFollowUp: "",
  });

  const [editForm, setEditForm] = useState<any>({
    name: "",
    email: "",
    phone: "",
    company: "",
    role: "",
    website: "",
    linkedin: "",
    notes: "",
    type: "CLIENT",
    priority: "MEDIUM",
    engagementScore: 0,
    nextFollowUp: "",
  });

  useEffect(() => {
    fetchStakeholders();
  }, [fetchStakeholders]);

  const filtered = useMemo(() => {
    return stakeholders.filter((s: any) => {
      const query = searchQuery.toLowerCase();

      const matchesSearch =
        s.name?.toLowerCase().includes(query) ||
        s.company?.toLowerCase().includes(query) ||
        s.role?.toLowerCase().includes(query) ||
        s.email?.toLowerCase().includes(query);

      const matchesType = selectedType === "ALL" || s.type === selectedType;
      const matchesPriority = selectedPriority === "ALL" || s.priority === selectedPriority;

      return matchesSearch && matchesType && matchesPriority;
    });
  }, [stakeholders, searchQuery, selectedType, selectedPriority]);

  const handleCreate = async () => {
    if (!form.name) return;

    const stakeholderData = {
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      company: form.company || undefined,
      role: form.role || undefined,
      website: form.website || undefined,
      linkedin: form.linkedin || undefined,
      notes: form.notes || undefined,
      type: form.type,
      priority: form.priority,
      engagementScore: Number(form.engagementScore) || 0,
      nextFollowUp: form.nextFollowUp || undefined,
    };

    const result = await createStakeholder(stakeholderData);

    setShowAdd(false);
    setForm({
      name: "",
      email: "",
      phone: "",
      company: "",
      role: "",
      website: "",
      linkedin: "",
      notes: "",
      type: "CLIENT",
      priority: "MEDIUM",
      engagementScore: 50,
      nextFollowUp: "",
    });
    
    await fetchStakeholders();
  };

  const handleEdit = async () => {
    if (!selectedStakeholder) return;

    const updateData = {
      name: editForm.name,
      email: editForm.email || undefined,
      phone: editForm.phone || undefined,
      company: editForm.company || undefined,
      role: editForm.role || undefined,
      website: editForm.website || undefined,
      linkedin: editForm.linkedin || undefined,
      notes: editForm.notes || undefined,
      type: editForm.type,
      priority: editForm.priority,
      engagementScore: Number(editForm.engagementScore) || 0,
      nextFollowUp: editForm.nextFollowUp || undefined,
    };

    await updateStakeholder(selectedStakeholder.id, updateData);

    setShowEdit(false);
    setSelectedStakeholder(null);
    await fetchStakeholders();
  };

  const handleDelete = async () => {
    if (!stakeholderToDelete) return;
    await deleteStakeholder(stakeholderToDelete.id);
    setShowDeleteConfirm(false);
    setStakeholderToDelete(null);
    if (selectedStakeholder?.id === stakeholderToDelete.id) {
      setSelectedStakeholder(null);
    }
    await fetchStakeholders();
  };

  const openEditModal = (stakeholder: any) => {
    setEditForm({
      name: stakeholder.name || "",
      email: stakeholder.email || "",
      phone: stakeholder.phone || "",
      company: stakeholder.company || "",
      role: stakeholder.role || "",
      website: stakeholder.website || "",
      linkedin: stakeholder.linkedin || "",
      notes: stakeholder.notes || "",
      type: stakeholder.type || "CLIENT",
      priority: stakeholder.priority || "MEDIUM",
      engagementScore: stakeholder.engagementScore || 0,
      nextFollowUp: stakeholder.nextFollowUp ? stakeholder.nextFollowUp.split("T")[0] : "",
    });
    setSelectedStakeholder(stakeholder);
    setShowEdit(true);
  };

  const openDeleteConfirm = (stakeholder: any) => {
    setStakeholderToDelete(stakeholder);
    setShowDeleteConfirm(true);
  };

  const getStatusColor = (score: number) => {
    if (score >= 70) return "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400";
    if (score >= 40) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400";
    return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH": return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400";
      case "MEDIUM": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400";
      default: return "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300";
    }
  };

  const stats = {
    total: stakeholders.length,
    highEngagement: stakeholders.filter((s: any) => s.engagementScore >= 70).length,
    highPriority: stakeholders.filter((s: any) => s.priority === "HIGH").length,
    followUps: stakeholders.filter((s: any) => s.nextFollowUp && new Date(s.nextFollowUp) <= new Date()).length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#071a2e]">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Stakeholder Network</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage investors, clients, advisors & strategic relationships</p>
          </div>

          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                <UserPlus className="w-4 h-4" />
                Add Stakeholder
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Stakeholder</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Name *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@company.com" />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+251..." />
                  </div>
                  <div>
                    <Label>Company</Label>
                    <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company name" />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Role</Label>
                    <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="CEO, Investor, Advisor..." />
                  </div>
                  <div>
                    <Label>Website</Label>
                    <Input 
                      value={form.website} 
                      onChange={(e) => setForm({ ...form, website: e.target.value })} 
                      placeholder="https://..." 
                    />
                  </div>
                </div>

                <div>
                  <Label>LinkedIn</Label>
                  <Input value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} placeholder="LinkedIn profile URL" />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["INVESTOR", "BOARD_MEMBER", "PARTNER", "CLIENT", "ADVISOR", "VENDOR", "OTHER"].map((t) => (
                          <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="LOW">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Engagement Score</Label>
                    <Input 
                      type="number" 
                      value={form.engagementScore} 
                      onChange={(e) => setForm({ ...form, engagementScore: Number(e.target.value) })} 
                      min="0" 
                      max="100"
                    />
                  </div>
                </div>

                <div>
                  <Label>Next Follow-up</Label>
                  <Input type="date" value={form.nextFollowUp} onChange={(e) => setForm({ ...form, nextFollowUp: e.target.value })} />
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Relationship notes, meeting outcomes, opportunities..." />
                </div>

                <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleCreate}>Add Stakeholder</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* AI Insight */}
        <ExternalRecordsPanel
          domain="stakeholders"
          description="Contacts synced from HubSpot, Salesforce, Zoho, Stripe, and Slack. Manage them in the source tool."
        />

        <Card className="mb-6 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">AI Relationship Insight</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {stakeholders.length > 0
                    ? `You have ${stakeholders.length} stakeholders tracked. ${stats.followUps} require immediate follow-up and ${stats.highEngagement} maintain strong engagement.`
                    : "Add stakeholders to start tracking strategic relationships and engagement."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-5 h-5 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-gray-500">Total Stakeholders</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-5 h-5 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold">{stats.highEngagement}</div>
              <div className="text-xs text-gray-500">High Engagement</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Star className="w-5 h-5 mx-auto mb-2 text-yellow-500" />
              <div className="text-2xl font-bold">{stats.highPriority}</div>
              <div className="text-xs text-gray-500">High Priority</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <AlertCircle className="w-5 h-5 mx-auto mb-2 text-red-500" />
              <div className="text-2xl font-bold">{stats.followUps}</div>
              <div className="text-xs text-gray-500">Need Follow-up</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Search stakeholders..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  {["INVESTOR", "BOARD_MEMBER", "PARTNER", "CLIENT", "ADVISOR", "VENDOR", "OTHER"].map((t) => (
                    <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Priorities</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stakeholders */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No stakeholders found</h3>
                <p className="text-gray-500">Add your first stakeholder to build your network.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((s: any) => (
                  <Card key={s.id} className="hover:shadow-md transition-all">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-14 h-14">
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                            {s.name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <h3 className="font-semibold text-lg">{s.name}</h3>
                              <p className="text-sm text-gray-500">{s.role}{s.company ? ` at ${s.company}` : ""}</p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              <Badge className={getStatusColor(s.engagementScore || 0)}>
                                {s.type?.replace("_", " ")}
                              </Badge>
                              <Badge className={getPriorityColor(s.priority)}>{s.priority}</Badge>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-3 mt-4 text-sm">
                            {s.email && (
                              <div className="flex items-center gap-2 text-gray-500">
                                <Mail className="w-4 h-4" />
                                <span className="truncate">{s.email}</span>
                              </div>
                            )}
                            {s.phone && (
                              <div className="flex items-center gap-2 text-gray-500">
                                <Phone className="w-4 h-4" />
                                <span>{s.phone}</span>
                              </div>
                            )}
                            {s.company && (
                              <div className="flex items-center gap-2 text-gray-500">
                                <Building2 className="w-4 h-4" />
                                <span>{s.company}</span>
                              </div>
                            )}
                            {s.website && (
                              <div className="flex items-center gap-2 text-gray-500">
                                <Globe className="w-4 h-4" />
                                <span className="truncate">{s.website}</span>
                              </div>
                            )}
                            {s.nextFollowUp && (
                              <div className="flex items-center gap-2 text-gray-500">
                                <Clock className="w-4 h-4" />
                                <span>Follow-up: {new Date(s.nextFollowUp).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-4">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Engagement Score</span>
                              <span className="font-medium">{s.engagementScore || 0}%</span>
                            </div>
                            <Progress value={s.engagementScore || 0} className="h-2" />
                          </div>

                          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-white/10">
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => openEditModal(s)}>
                              <Edit2 className="w-4 h-4" />
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => openDeleteConfirm(s)}>
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </Button>
                            {s.email && (
                              <Button size="sm" variant="outline" className="gap-1" asChild>
                                <a
                                  href={`mailto:${s.email}?subject=${encodeURIComponent(
                                    `Following up${s.company ? ` with ${s.company}` : ""}`
                                  )}`}
                                >
                                  <Mail className="w-4 h-4" />
                                  Email
                                </a>
                              </Button>
                            )}
                            {s.email && (
                              <Button size="sm" variant="outline" className="gap-1" asChild>
                                <a
                                  href={`https://slack.com/app_redirect?channel=${encodeURIComponent(
                                    s.email.split("@")[0]
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  Slack
                                </a>
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="gap-1" asChild>
                              <a href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer">
                                <Calendar className="w-4 h-4" />
                                Meet
                              </a>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Engagement Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: "Investors", value: stakeholders.filter((s: any) => s.type === "INVESTOR").length },
                    { label: "Clients", value: stakeholders.filter((s: any) => s.type === "CLIENT").length },
                    { label: "Partners", value: stakeholders.filter((s: any) => s.type === "PARTNER").length },
                    { label: "Advisors", value: stakeholders.filter((s: any) => s.type === "ADVISOR").length },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">{item.label}</span>
                      <span className="font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  AI Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  {stakeholders.filter((s: any) => s.engagementScore < 40).slice(0, 3).map((s: any) => (
                    <li key={s.id} className="flex items-start gap-2">
                      <ArrowUpRight className="w-4 h-4 mt-0.5 text-purple-500" />
                      <span>Follow up with <span className="font-medium">{s.name}</span> — engagement is decreasing.</span>
                    </li>
                  ))}
                  {stakeholders.filter((s: any) => s.engagementScore < 40).length === 0 && (
                    <li className="text-gray-500">All stakeholder relationships are healthy.</li>
                  )}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upcoming Follow-ups</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stakeholders.filter((s: any) => s.nextFollowUp).slice(0, 5).map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                      <div>
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-gray-500">{new Date(s.nextFollowUp).toLocaleDateString()}</p>
                      </div>
                      <Calendar className="w-4 h-4 text-gray-400" />
                    </div>
                  ))}
                  {stakeholders.filter((s: any) => s.nextFollowUp).length === 0 && (
                    <p className="text-sm text-gray-500">No scheduled follow-ups.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit Stakeholder Dialog */}
        <Dialog open={showEdit} onOpenChange={setShowEdit}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Stakeholder</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Name *</Label>
                  <Input 
                    value={editForm.name} 
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} 
                    placeholder="Full name" 
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input 
                    value={editForm.email} 
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} 
                    placeholder="email@company.com" 
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input 
                    value={editForm.phone} 
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} 
                    placeholder="+251..." 
                  />
                </div>
                <div>
                  <Label>Company</Label>
                  <Input 
                    value={editForm.company} 
                    onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} 
                    placeholder="Company name" 
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Role</Label>
                  <Input 
                    value={editForm.role} 
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} 
                    placeholder="CEO, Investor, Advisor..." 
                  />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input 
                    value={editForm.website} 
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} 
                    placeholder="https://..." 
                  />
                </div>
              </div>

              <div>
                <Label>LinkedIn</Label>
                <Input 
                  value={editForm.linkedin} 
                  onChange={(e) => setEditForm({ ...editForm, linkedin: e.target.value })} 
                  placeholder="LinkedIn profile URL" 
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={editForm.type} onValueChange={(v) => setEditForm({ ...editForm, type: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["INVESTOR", "BOARD_MEMBER", "PARTNER", "CLIENT", "ADVISOR", "VENDOR", "OTHER"].map((t) => (
                        <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Priority</Label>
                  <Select value={editForm.priority} onValueChange={(v) => setEditForm({ ...editForm, priority: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Engagement Score</Label>
                  <Input 
                    type="number" 
                    value={editForm.engagementScore} 
                    onChange={(e) => setEditForm({ ...editForm, engagementScore: Number(e.target.value) })} 
                    min="0" 
                    max="100"
                  />
                </div>
              </div>

              <div>
                <Label>Next Follow-up</Label>
                <Input 
                  type="date" 
                  value={editForm.nextFollowUp} 
                  onChange={(e) => setEditForm({ ...editForm, nextFollowUp: e.target.value })} 
                />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea 
                  rows={4} 
                  value={editForm.notes} 
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} 
                  placeholder="Relationship notes, meeting outcomes, opportunities..." 
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setShowEdit(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2" 
                  onClick={handleEdit}
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-600 dark:text-gray-300">
                Are you sure you want to delete <span className="font-semibold">{stakeholderToDelete?.name}</span>?
                This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1 gap-2" 
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}