"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Calendar,
  Brain,
  Loader2,
  Phone,
  Building2,
  Briefcase,
  TrendingUp,
  Clock,
  Star,
  CheckCircle2,
  Activity,
  MessageCircle,
  MoreVertical,
  Sparkles,
  ShieldCheck,
  Flame,
  Target,
  FolderKanban,
  BarChart3,
  UserCheck,
  TimerReset,
  ArrowUpRight,
  Zap,
  Video,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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

import { Progress } from "@/components/ui/progress";

import { Textarea } from "@/components/ui/textarea";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useTeamStore } from "@/store/teamStore";

export default function TeamNetworkPage() {
  const {
    members,
    fetchMembers,
    createMember,
    updateMember,
    isLoading,
  } = useTeamStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const [selectedDepartment, setSelectedDepartment] = useState("ALL");

  const [selectedMember, setSelectedMember] = useState<any | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    department: "",
    location: "",
    notes: "",
    managerName: "",
    status: "AVAILABLE",
    priority: "MEDIUM",
    engagementScore: 72,
    performanceScore: 76,
    workload: 58,
    burnoutRisk: 24,
    activeTasks: 5,
    meetingsThisWeek: 4,
    projects: "",
    skills: "",
  });

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const filtered = useMemo(() => {
    return members.filter((m: any) => {
      const matchesSearch =
        m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.department?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDepartment =
        selectedDepartment === "ALL" ||
        m.department === selectedDepartment;

      return matchesSearch && matchesDepartment;
    });
  }, [members, searchQuery, selectedDepartment]);

  const departments = [
    "ALL",
    ...Array.from(
      new Set(
        members
          .map((m: any) => m.department)
          .filter(Boolean)
      )
    ),
  ];

  const handleCreate = async () => {
    if (!form.name) return;

    await createMember({
      ...form,
      projects: form.projects
        ? form.projects.split(",").map((p) => p.trim())
        : [],
      skills: form.skills
        ? form.skills.split(",").map((s) => s.trim())
        : [],
      joinedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    });

    setShowAdd(false);

    setForm({
      name: "",
      email: "",
      phone: "",
      role: "",
      department: "",
      location: "",
      notes: "",
      managerName: "",
      status: "AVAILABLE",
      priority: "MEDIUM",
      engagementScore: 72,
      performanceScore: 76,
      workload: 58,
      burnoutRisk: 24,
      activeTasks: 5,
      meetingsThisWeek: 4,
      projects: "",
      skills: "",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "bg-green-500";
      case "FOCUSED":
        return "bg-blue-500";
      case "IN_MEETING":
        return "bg-yellow-500";
      case "OFFLINE":
        return "bg-gray-500";
      case "PTO":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const highPerformers = members.filter(
    (m: any) => m.performanceScore >= 80
  ).length;

  const burnoutRisk = members.filter(
    (m: any) => m.burnoutRisk >= 70
  ).length;

  const focusedMembers = members.filter(
    (m: any) => m.status === "FOCUSED"
  ).length;

  const avgPerformance =
    members.length > 0
      ? Math.round(
          members.reduce(
            (acc: number, m: any) => acc + (m.performanceScore || 0),
            0
          ) / members.length
        )
      : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#071a2e]">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Team Intelligence
            </h1>

            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Executive workforce operations & performance management
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="gap-2" asChild>
              <a href="/dashboard/calendar">
                <Zap className="w-4 h-4" /> Focus Session
              </a>
            </Button>

            <Dialog open={showAdd} onOpenChange={setShowAdd}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                  <UserPlus className="w-4 h-4" />
                  Add Member
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Team Member</DialogTitle>
                </DialogHeader>

                <div className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>

                      <Input
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <Label>Email</Label>

                      <Input
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                        placeholder="john@company.com"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Phone</Label>

                      <Input
                        value={form.phone}
                        onChange={(e) =>
                          setForm({ ...form, phone: e.target.value })
                        }
                        placeholder="+251..."
                      />
                    </div>

                    <div>
                      <Label>Location</Label>

                      <Input
                        value={form.location}
                        onChange={(e) =>
                          setForm({ ...form, location: e.target.value })
                        }
                        placeholder="Addis Ababa"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Role</Label>

                      <Input
                        value={form.role}
                        onChange={(e) =>
                          setForm({ ...form, role: e.target.value })
                        }
                        placeholder="Product Lead"
                      />
                    </div>

                    <div>
                      <Label>Department</Label>

                      <Input
                        value={form.department}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            department: e.target.value,
                          })
                        }
                        placeholder="Engineering"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Manager</Label>

                      <Input
                        value={form.managerName}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            managerName: e.target.value,
                          })
                        }
                        placeholder="CEO"
                      />
                    </div>

                    <div>
                      <Label>Status</Label>

                      <Select
                        value={form.status}
                        onValueChange={(v) =>
                          setForm({ ...form, status: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="AVAILABLE">
                            AVAILABLE
                          </SelectItem>

                          <SelectItem value="FOCUSED">
                            FOCUSED
                          </SelectItem>

                          <SelectItem value="IN_MEETING">
                            IN MEETING
                          </SelectItem>

                          <SelectItem value="OFFLINE">
                            OFFLINE
                          </SelectItem>

                          <SelectItem value="PTO">
                            PTO
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label>Performance</Label>

                      <Input
                        type="number"
                        value={form.performanceScore}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            performanceScore: Number(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label>Workload</Label>

                      <Input
                        type="number"
                        value={form.workload}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            workload: Number(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label>Burnout Risk</Label>

                      <Input
                        type="number"
                        value={form.burnoutRisk}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            burnoutRisk: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Projects</Label>

                    <Input
                      value={form.projects}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          projects: e.target.value,
                        })
                      }
                      placeholder="Executive OS, Investor Portal"
                    />
                  </div>

                  <div>
                    <Label>Skills</Label>

                    <Input
                      value={form.skills}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          skills: e.target.value,
                        })
                      }
                      placeholder="Leadership, Strategy, React"
                    />
                  </div>

                  <div>
                    <Label>Notes</Label>

                    <Textarea
                      rows={5}
                      value={form.notes}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          notes: e.target.value,
                        })
                      }
                      placeholder="Performance observations, leadership notes..."
                    />
                  </div>

                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={handleCreate}
                  >
                    Add Team Member
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* AI INSIGHT */}
        <Card className="mb-6 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-purple-500" />

                <div>
                  <p className="text-sm font-medium">
                    AI Workforce Intelligence
                  </p>

                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {focusedMembers} team members are currently in focus mode.
                    Burnout risk detected in {burnoutRisk} members.
                  </p>
                </div>
              </div>

              <Button variant="outline" size="sm">
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Insights
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="border-none shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-gray-500">Team Members</p>

              <div className="text-3xl font-bold mt-1">
                {members.length}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-gray-500">High Performers</p>

              <div className="text-3xl font-bold text-green-600 mt-1">
                {highPerformers}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-gray-500">Avg Performance</p>

              <div className="text-3xl font-bold text-blue-600 mt-1">
                {avgPerformance}%
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-gray-500">Focus Mode</p>

              <div className="text-3xl font-bold text-purple-600 mt-1">
                {focusedMembers}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-gray-500">Burnout Risk</p>

              <div className="text-3xl font-bold text-red-600 mt-1">
                {burnoutRisk}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SEARCH + FILTER */}
        <div className="flex gap-4 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

            <Input
              placeholder="Search team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select
            value={selectedDepartment}
            onValueChange={setSelectedDepartment}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              {departments.map((dep) => (
                <SelectItem key={dep} value={dep}>
                  {dep}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* CONTENT */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />

            <p className="text-gray-500">No team members found.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((member: any) => (
              <Card
                key={member.id}
                className="border-none shadow-sm hover:shadow-xl transition-all overflow-hidden"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="w-14 h-14">
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                            {member.name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>

                        <div
                          className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${getStatusColor(
                            member.status
                          )}`}
                        />
                      </div>

                      <div>
                        <h3 className="font-semibold text-lg">
                          {member.name}
                        </h3>

                        <p className="text-sm text-gray-500">
                          {member.role}
                        </p>

                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">
                            {member.department}
                          </Badge>

                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-slate-300">
                            {member.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-2 text-gray-500">
                        <span>Performance</span>
                        <span>{member.performanceScore}%</span>
                      </div>

                      <Progress
                        value={member.performanceScore}
                        className="h-2"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-2 text-gray-500">
                        <span>Workload</span>
                        <span>{member.workload}%</span>
                      </div>

                      <Progress
                        value={member.workload}
                        className="h-2"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 text-center">
                        <Target className="w-4 h-4 mx-auto mb-1 text-blue-500" />

                        <div className="text-lg font-bold">
                          {member.activeTasks}
                        </div>

                        <div className="text-[11px] text-gray-500">
                          Tasks
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 text-center">
                        <Calendar className="w-4 h-4 mx-auto mb-1 text-purple-500" />

                        <div className="text-lg font-bold">
                          {member.meetingsThisWeek}
                        </div>

                        <div className="text-[11px] text-gray-500">
                          Meetings
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 text-center">
                        <Flame className="w-4 h-4 mx-auto mb-1 text-red-500" />

                        <div className="text-lg font-bold">
                          {member.burnoutRisk}%
                        </div>

                        <div className="text-[11px] text-gray-500">
                          Burnout
                        </div>
                      </div>
                    </div>

                    {member.projects?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                          <FolderKanban className="w-4 h-4 text-blue-500" />
                          Projects
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {member.projects
                            .slice(0, 3)
                            .map((project: string, idx: number) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="text-xs"
                              >
                                {project}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-6 pt-5 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1"
                    >
                      <Calendar className="w-4 h-4" />
                      1:1
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1"
                    >
                      <TimerReset className="w-4 h-4" />
                      Focus
                    </Button>

                    <Button
                      size="sm"
                      className="flex-1 gap-1 bg-blue-600 hover:bg-blue-700"
                      onClick={() => setSelectedMember(member)}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      Open
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* MEMBER DETAILS */}
        <Dialog
          open={!!selectedMember}
          onOpenChange={() => setSelectedMember(null)}
        >
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            {selectedMember && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-4">
                    <Avatar className="w-14 h-14">
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-lg">
                        {selectedMember.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <h2 className="text-2xl font-bold">
                        {selectedMember.name}
                      </h2>

                      <p className="text-sm text-gray-500 font-normal">
                        {selectedMember.role}
                      </p>
                    </div>
                  </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="overview" className="mt-4">
                  <TabsList className="grid grid-cols-4">
                    <TabsTrigger value="overview">
                      Overview
                    </TabsTrigger>

                    <TabsTrigger value="performance">
                      Performance
                    </TabsTrigger>

                    <TabsTrigger value="projects">
                      Projects
                    </TabsTrigger>

                    <TabsTrigger value="notes">
                      Notes
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-5 mt-6">
                    <div className="grid md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-5">
                          <div className="flex items-center gap-2 mb-2">
                            <BarChart3 className="w-4 h-4 text-blue-500" />
                            <span className="text-sm">
                              Performance
                            </span>
                          </div>

                          <div className="text-3xl font-bold">
                            {selectedMember.performanceScore}%
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-5">
                          <div className="flex items-center gap-2 mb-2">
                            <Activity className="w-4 h-4 text-green-500" />
                            <span className="text-sm">Workload</span>
                          </div>

                          <div className="text-3xl font-bold">
                            {selectedMember.workload}%
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-5">
                          <div className="flex items-center gap-2 mb-2">
                            <Flame className="w-4 h-4 text-red-500" />
                            <span className="text-sm">
                              Burnout Risk
                            </span>
                          </div>

                          <div className="text-3xl font-bold">
                            {selectedMember.burnoutRisk}%
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardContent className="p-5 space-y-4">
                        {selectedMember.email && (
                          <div className="flex items-center gap-3">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span>{selectedMember.email}</span>
                          </div>
                        )}

                        {selectedMember.phone && (
                          <div className="flex items-center gap-3">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{selectedMember.phone}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          <Briefcase className="w-4 h-4 text-gray-400" />
                          <span>{selectedMember.department}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <UserCheck className="w-4 h-4 text-gray-400" />
                          <span>
                            Reports to {selectedMember.managerName || "CEO"}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-white/10">
                          {selectedMember.email && (
                            <Button size="sm" variant="outline" className="gap-1" asChild>
                              <a href={`mailto:${selectedMember.email}`}>
                                <Mail className="w-4 h-4" /> Email
                              </a>
                            </Button>
                          )}
                          {selectedMember.email && (
                            <Button size="sm" variant="outline" className="gap-1" asChild>
                              <a
                                href={`https://slack.com/app_redirect?channel=${encodeURIComponent(
                                  selectedMember.email.split("@")[0]
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <MessageCircle className="w-4 h-4" /> Slack
                              </a>
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="gap-1" asChild>
                            <a href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer">
                              <Video className="w-4 h-4" /> Meet
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="performance" className="mt-6">
                    <Card>
                      <CardContent className="p-6 space-y-6">
                        <div>
                          <div className="flex justify-between mb-2 text-sm">
                            <span>Performance Score</span>
                            <span>
                              {selectedMember.performanceScore}%
                            </span>
                          </div>

                          <Progress
                            value={selectedMember.performanceScore}
                            className="h-3"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between mb-2 text-sm">
                            <span>Engagement</span>
                            <span>
                              {selectedMember.engagementScore}%
                            </span>
                          </div>

                          <Progress
                            value={selectedMember.engagementScore}
                            className="h-3"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between mb-2 text-sm">
                            <span>Workload</span>
                            <span>{selectedMember.workload}%</span>
                          </div>

                          <Progress
                            value={selectedMember.workload}
                            className="h-3"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="projects" className="mt-6">
                    <div className="grid gap-4">
                      {selectedMember.projects?.map(
                        (project: string, idx: number) => (
                          <Card key={idx}>
                            <CardContent className="p-5 flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold">
                                  {project}
                                </h3>

                                <p className="text-sm text-gray-500 mt-1">
                                  Strategic initiative assignment
                                </p>
                              </div>

                              <Badge>ACTIVE</Badge>
                            </CardContent>
                          </Card>
                        )
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="notes" className="mt-6">
                    <Card className="bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Brain className="w-4 h-4 text-purple-500" />

                          <h3 className="font-medium">
                            Leadership Notes
                          </h3>
                        </div>

                        <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                          {selectedMember.notes ||
                            "No executive notes yet."}
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}