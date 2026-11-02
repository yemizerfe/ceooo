"use client";
// app/dashboard/network/page.tsx

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  UserPlus,
  MessageCircle,
  Calendar,
  Mail,
  Phone,
  Star,
  TrendingUp,
  Award,
  Activity,
  Search,
  Filter,
  Plus,
  MoreVertical,
  Send,
  Sparkles,
  Brain,
  Building2,
  Clock3,
  CheckCircle2,
  AlertCircle,
  Globe,
  Briefcase,
  Handshake,
  Target,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Stakeholder {
  id: string;
  name: string;
  role: string;
  company: string;
  email: string;
  phone: string;
  type: "Investor" | "Board" | "Partner" | "Client" | "Advisor";
  status: "active" | "inactive" | "pending";
  engagement: number;
  influence: number;
  lastContact: string;
  nextMeeting?: string;
  notes?: string;
  country: string;
  priority: "High" | "Medium" | "Low";
  relationshipHealth: number;
}

const initialStakeholders: Stakeholder[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    role: "Lead Investor",
    company: "Sequoia Capital",
    email: "sarah@sequoia.com",
    phone: "+1 202 555 0133",
    type: "Investor",
    status: "active",
    engagement: 85,
    influence: 95,
    lastContact: "2 days ago",
    nextMeeting: "May 25, 2026",
    country: "United States",
    priority: "High",
    relationshipHealth: 88,
    notes: "Interested in expansion roadmap and quarterly growth metrics.",
  },
  {
    id: "2",
    name: "Michael Chen",
    role: "Board Member",
    company: "TechAdvisors",
    email: "michael@techadvisors.com",
    phone: "+1 202 555 0177",
    type: "Board",
    status: "active",
    engagement: 92,
    influence: 90,
    lastContact: "Yesterday",
    nextMeeting: "May 20, 2026",
    country: "Singapore",
    priority: "High",
    relationshipHealth: 94,
    notes: "Strong strategic alignment. Prefers concise executive summaries.",
  },
  {
    id: "3",
    name: "Lisa Wong",
    role: "Strategic Partner",
    company: "Global Systems",
    email: "lisa@globalsystems.com",
    phone: "+44 7700 900111",
    type: "Partner",
    status: "pending",
    engagement: 45,
    influence: 70,
    lastContact: "1 week ago",
    nextMeeting: "Not scheduled",
    country: "United Kingdom",
    priority: "Medium",
    relationshipHealth: 52,
    notes: "Waiting for partnership proposal approval.",
  },
  {
    id: "4",
    name: "Daniel Bekele",
    role: "Enterprise Client",
    company: "Ethio Digital",
    email: "daniel@ethiodigital.com",
    phone: "+251 911 222 333",
    type: "Client",
    status: "active",
    engagement: 74,
    influence: 60,
    lastContact: "3 days ago",
    nextMeeting: "May 30, 2026",
    country: "Ethiopia",
    priority: "Medium",
    relationshipHealth: 79,
    notes: "Potential enterprise contract renewal next quarter.",
  },
];

export default function NetworkPage() {
  const [stakeholders, setStakeholders] =
    useState<Stakeholder[]>(initialStakeholders);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStakeholder, setSelectedStakeholder] =
    useState<Stakeholder | null>(initialStakeholders[0]);

  const [showCreate, setShowCreate] = useState(false);

  const [form, setForm] = useState({
    name: "",
    role: "",
    company: "",
    email: "",
    phone: "",
    type: "Investor" as Stakeholder["type"],
    priority: "Medium" as Stakeholder["priority"],
    country: "",
  });

  const filteredStakeholders = useMemo(() => {
    return stakeholders.filter((stakeholder) => {
      const q = searchQuery.toLowerCase();

      return (
        stakeholder.name.toLowerCase().includes(q) ||
        stakeholder.company.toLowerCase().includes(q) ||
        stakeholder.role.toLowerCase().includes(q) ||
        stakeholder.type.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, stakeholders]);

  const getStatusColor = (status: Stakeholder["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300";
      case "inactive":
        return "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300";
      case "pending":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300";
    }
  };

  const getPriorityColor = (priority: Stakeholder["priority"]) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300";
      case "Medium":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300";
      case "Low":
        return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-slate-400";
    }
  };

  const handleCreateStakeholder = () => {
    if (!form.name || !form.company) return;

    const stakeholder: Stakeholder = {
      id: Date.now().toString(),
      name: form.name,
      role: form.role,
      company: form.company,
      email: form.email,
      phone: form.phone,
      type: form.type,
      priority: form.priority,
      country: form.country,
      status: "active",
      engagement: 65,
      influence: 60,
      relationshipHealth: 70,
      lastContact: "Just now",
      nextMeeting: "Not scheduled",
      notes: "",
    };

    setStakeholders((prev) => [stakeholder, ...prev]);
    setSelectedStakeholder(stakeholder);

    setForm({
      name: "",
      role: "",
      company: "",
      email: "",
      phone: "",
      type: "Investor",
      priority: "Medium",
      country: "",
    });

    setShowCreate(false);
  };

  const averageEngagement = Math.round(
    stakeholders.reduce((acc, item) => acc + item.engagement, 0) /
      stakeholders.length
  );

  const highPriorityCount = stakeholders.filter(
    (s) => s.priority === "High"
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Stakeholder Network
            </h1>

            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage investors, board members, strategic partners and executive
              relationships
            </p>
          </div>

          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                <UserPlus className="w-4 h-4" />
                Add Stakeholder
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Stakeholder</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Full Name</label>
                  <Input
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    placeholder="John Doe"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Role</label>
                    <Input
                      value={form.role}
                      onChange={(e) =>
                        setForm({ ...form, role: e.target.value })
                      }
                      placeholder="Lead Investor"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Company</label>
                    <Input
                      value={form.company}
                      onChange={(e) =>
                        setForm({ ...form, company: e.target.value })
                      }
                      placeholder="Company Name"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <Input
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    placeholder="+251..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Country</label>
                    <Input
                      value={form.country}
                      onChange={(e) =>
                        setForm({ ...form, country: e.target.value })
                      }
                      placeholder="Country"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      Stakeholder Type
                    </label>

                    <select
                      value={form.type}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          type: e.target.value as Stakeholder["type"],
                        })
                      }
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="Investor">Investor</option>
                      <option value="Board">Board</option>
                      <option value="Partner">Partner</option>
                      <option value="Client">Client</option>
                      <option value="Advisor">Advisor</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Priority</label>

                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        priority: e.target.value as Stakeholder["priority"],
                      })
                    }
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <Button
                  onClick={handleCreateStakeholder}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Create Stakeholder
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Top Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/80 dark:bg-white/5 border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Stakeholders</p>
                  <h3 className="text-3xl font-bold mt-1">
                    {stakeholders.length}
                  </h3>
                </div>

                <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-500/20">
                  <Users className="w-5 h-5 text-blue-600 dark:text-slate-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-white/5 border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Average Engagement
                  </p>
                  <h3 className="text-3xl font-bold mt-1">
                    {averageEngagement}%
                  </h3>
                </div>

                <div className="p-3 rounded-xl bg-green-100 dark:bg-green-500/20">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-white/5 border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">High Priority</p>
                  <h3 className="text-3xl font-bold mt-1">
                    {highPriorityCount}
                  </h3>
                </div>

                <div className="p-3 rounded-xl bg-red-100 dark:bg-red-500/20">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-white/5 border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Board Members</p>
                  <h3 className="text-3xl font-bold mt-1">
                    {
                      stakeholders.filter((s) => s.type === "Board").length
                    }
                  </h3>
                </div>

                <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-500/20">
                  <Award className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Insight */}
        <Card className="mb-6 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-blue-500" />

                <div>
                  <p className="text-sm font-medium">
                    AI Relationship Insight
                  </p>

                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Michael Chen has the strongest engagement and influence
                    score. Schedule a strategic board alignment session this
                    week.
                  </p>
                </div>
              </div>

              <Button variant="outline" size="sm">
                Schedule Meeting
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search stakeholders..."
                  className="pl-9"
                />
              </div>

              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
            </div>

            {filteredStakeholders.map((stakeholder) => (
              <motion.div
                key={stakeholder.id}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  onClick={() => setSelectedStakeholder(stakeholder)}
                  className={`cursor-pointer transition-all border-0 shadow-sm hover:shadow-md bg-white/80 dark:bg-white/5 ${
                    selectedStakeholder?.id === stakeholder.id
                      ? "ring-2 ring-blue-500"
                      : ""
                  }`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-14 h-14">
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-lg">
                          {stakeholder.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-lg">
                                {stakeholder.name}
                              </h3>

                              <Badge
                                className={getStatusColor(
                                  stakeholder.status
                                )}
                              >
                                {stakeholder.status}
                              </Badge>

                              <Badge
                                className={getPriorityColor(
                                  stakeholder.priority
                                )}
                              >
                                {stakeholder.priority} Priority
                              </Badge>
                            </div>

                            <p className="text-sm text-gray-500 mt-1">
                              {stakeholder.role} at {stakeholder.company}
                            </p>
                          </div>

                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-3 mt-4 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            <span>{stakeholder.email}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{stakeholder.phone}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            <span>{stakeholder.country}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock3 className="w-4 h-4" />
                            <span>{stakeholder.lastContact}</span>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 mt-5">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Engagement</span>
                              <span>{stakeholder.engagement}%</span>
                            </div>

                            <Progress
                              value={stakeholder.engagement}
                              className="h-2"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Relationship Health</span>
                              <span>{stakeholder.relationshipHealth}%</span>
                            </div>

                            <Progress
                              value={stakeholder.relationshipHealth}
                              className="h-2"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 mt-5 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                          >
                            <MessageCircle className="w-3 h-3" />
                            Message
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                          >
                            <Calendar className="w-3 h-3" />
                            Schedule
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                          >
                            <Mail className="w-3 h-3" />
                            Email
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                          >
                            <Send className="w-3 h-3" />
                            Update
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            {/* Selected Stakeholder */}
            {selectedStakeholder && (
              <Card className="border-0 shadow-sm bg-white/80 dark:bg-white/5">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Stakeholder Profile
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xl">
                        {selectedStakeholder.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <h3 className="font-semibold text-lg">
                        {selectedStakeholder.name}
                      </h3>

                      <p className="text-sm text-gray-500">
                        {selectedStakeholder.role}
                      </p>

                      <p className="text-sm text-gray-500">
                        {selectedStakeholder.company}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                      <div className="text-xs text-gray-500">
                        Influence Score
                      </div>

                      <div className="text-2xl font-bold mt-1">
                        {selectedStakeholder.influence}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                      <div className="text-xs text-gray-500">
                        Engagement
                      </div>

                      <div className="text-2xl font-bold mt-1">
                        {selectedStakeholder.engagement}%
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span>{selectedStakeholder.company}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="w-4 h-4 text-gray-400" />
                      <span>{selectedStakeholder.type}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>
                        Next Meeting: {selectedStakeholder.nextMeeting}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Target className="w-4 h-4 text-gray-400" />
                      <span>
                        Priority: {selectedStakeholder.priority}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      <span className="font-medium text-sm">
                        Executive Notes
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedStakeholder.notes}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity */}
            <Card className="border-0 shadow-sm bg-white/80 dark:bg-white/5">
              <CardHeader>
                <CardTitle className="text-lg">
                  Recent Activity
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      action: "Board strategy meeting scheduled",
                      stakeholder: "Michael Chen",
                      time: "2 hours ago",
                    },
                    {
                      action: "Investment update shared",
                      stakeholder: "Sarah Johnson",
                      time: "Yesterday",
                    },
                    {
                      action: "Partnership proposal reviewed",
                      stakeholder: "Lisa Wong",
                      time: "2 days ago",
                    },
                  ].map((activity, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/20">
                        <Activity className="w-4 h-4 text-blue-600 dark:text-slate-400" />
                      </div>

                      <div>
                        <p className="text-sm font-medium">
                          {activity.action}
                        </p>

                        <p className="text-xs text-gray-500 mt-1">
                          {activity.stakeholder} • {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Recommendations */}
            <Card className="bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  AI Recommendations
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-white/60 dark:bg-white/5">
                    <p className="text-sm">
                      Follow up with Lisa Wong regarding pending strategic
                      partnership approval.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/60 dark:bg-white/5">
                    <p className="text-sm">
                      Prepare investor growth metrics before Sarah Johnson's next
                      meeting.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/60 dark:bg-white/5">
                    <p className="text-sm">
                      Michael Chen engagement trend increased by 12% this month.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}