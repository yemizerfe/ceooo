"use client";
// app/documentation/page.tsx

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  BookOpen,
  Search,
  ChevronRight,
  Clock,
  Video,
  Download,
  ExternalLink,
  Sparkles,
  Brain,
  Target,
  DollarSign,
  Users,
  Shield,
  Calendar,
  FileText,
  Play,
  CheckCircle2,
  ArrowRight,
  Smartphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const documentationSections = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Sparkles,
    color: "from-blue-500 to-cyan-500",
    description: "Learn the basics of CEOOO and set up your account",
    articles: [
      { title: "Quick Start Guide", description: "Get up and running in 5 minutes", readTime: "5 min", difficulty: "Beginner", popular: true },
      { title: "Account Setup", description: "Configure your profile and preferences", readTime: "8 min", difficulty: "Beginner" },
      { title: "Team Management", description: "Invite and manage team members", readTime: "6 min", difficulty: "Beginner" },
      { title: "Workspace Configuration", description: "Customize your dashboard layout", readTime: "10 min", difficulty: "Intermediate" }
    ]
  },
  {
    id: "ai-features",
    title: "AI Features",
    icon: Brain,
    color: "from-purple-500 to-pink-500",
    description: "Master AI-powered decision making and insights",
    articles: [
      { title: "Using AI Decision Making", description: "How to get AI recommendations for business decisions", readTime: "12 min", difficulty: "Intermediate", popular: true },
      { title: "Understanding AI Insights", description: "Interpret AI-generated insights and predictions", readTime: "8 min", difficulty: "Beginner" },
      { title: "Custom AI Training", description: "Train AI on your business data", readTime: "15 min", difficulty: "Advanced" },
      { title: "AI Accuracy & Improvement", description: "Improve AI predictions over time", readTime: "6 min", difficulty: "Beginner" }
    ]
  },
  {
    id: "dashboard",
    title: "Dashboard & Analytics",
    icon: Target,
    color: "from-green-500 to-emerald-500",
    description: "Navigate your executive dashboard and track KPIs",
    articles: [
      { title: "Dashboard Overview", description: "Understand your executive dashboard", readTime: "10 min", difficulty: "Beginner", popular: true },
      { title: "KPI Tracking", description: "Set and monitor key performance indicators", readTime: "8 min", difficulty: "Intermediate" },
      { title: "Custom Reports", description: "Create and export custom reports", readTime: "12 min", difficulty: "Advanced" },
      { title: "Data Visualization", description: "Work with charts and graphs", readTime: "7 min", difficulty: "Intermediate" }
    ]
  },
  {
    id: "financial",
    title: "Financial Management",
    icon: DollarSign,
    color: "from-yellow-500 to-orange-500",
    description: "Track finances, forecast, and manage budgets",
    articles: [
      { title: "Financial Dashboard", description: "Monitor revenue, burn rate, and runway", readTime: "10 min", difficulty: "Intermediate" },
      { title: "Budget Planning", description: "Create and manage budgets", readTime: "15 min", difficulty: "Advanced" },
      { title: "Forecasting with AI", description: "Use AI for financial predictions", readTime: "12 min", difficulty: "Advanced" },
      { title: "Expense Tracking", description: "Track and categorize expenses", readTime: "8 min", difficulty: "Beginner" }
    ]
  },
  {
    id: "productivity",
    title: "Productivity Tools",
    icon: Calendar,
    color: "from-indigo-500 to-purple-500",
    description: "Master notes, calendar, and project management",
    articles: [
      { title: "Notes Board Guide", description: "Take and organize notes with AI", readTime: "7 min", difficulty: "Beginner", popular: true },
      { title: "Smart Calendar", description: "Manage meetings and schedule", readTime: "10 min", difficulty: "Intermediate" },
      { title: "Project Tracking", description: "Track initiatives and OKRs", readTime: "12 min", difficulty: "Intermediate" },
      { title: "Stakeholder Management", description: "Manage relationships and communications", readTime: "8 min", difficulty: "Intermediate" }
    ]
  },
  {
    id: "integrations",
    title: "Integrations & API",
    icon: Users,
    color: "from-red-500 to-pink-500",
    description: "Connect with your favorite tools",
    articles: [
      { title: "Available Integrations", description: "See all supported tools", readTime: "5 min", difficulty: "Beginner" },
      { title: "Setting Up Integrations", description: "Connect calendars, CRM, and more", readTime: "10 min", difficulty: "Intermediate" },
      { title: "API Documentation", description: "Build custom integrations", readTime: "20 min", difficulty: "Advanced" },
      { title: "Webhooks Guide", description: "Set up automated workflows", readTime: "15 min", difficulty: "Advanced" }
    ]
  }
];

const videoTutorials = [
  { title: "How AI is Changing Business Decision Making", duration: "10:24", views: "245K", youtubeId: "aircAruvnKk" },
  { title: "CEO Productivity Tips & Tools", duration: "14:32", views: "189K", youtubeId: "LAn1zZFV4QQ" },
  { title: "How to Build an Executive Dashboard", duration: "8:47", views: "98K", youtubeId: "K2bFVSng-Zk" },
  { title: "AI Tools for Business Leaders in 2024", duration: "12:15", views: "312K", youtubeId: "hfIUstzHs9A" }
];

const quickGuides = [
  { title: "Keyboard Shortcuts", icon: Sparkles, description: "Boost your productivity with shortcuts" },
  { title: "Mobile App Guide", icon: Smartphone, description: "Use CEOOO on the go" },
  { title: "Security Best Practices", icon: Shield, description: "Keep your data secure" },
  { title: "Export Your Data", icon: Download, description: "Backup and export your information" }
];

export default function DocumentationPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("all");

  const filteredSections = documentationSections.filter(section => {
    if (activeSection !== "all" && section.id !== activeSection) return false;
    const matchesSearch = section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          section.articles.some(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="min-h-screen pt-0 bg-gray-50 dark:bg-slate-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <Badge className="mb-4 bg-white/20 text-white border-0">
              <BookOpen className="w-3.5 h-3.5 mr-2" />
              Documentation
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Documentation
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
          Comprehensive guides to help you master CEOOO
            </p>
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 py-6 bg-white text-gray-900 rounded-xl"
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          <Button
            variant={activeSection === "all" ? "default" : "outline"}
            onClick={() => setActiveSection("all")}
            className={activeSection === "all" ? "bg-blue-600" : ""}
          >
            All
          </Button>
          {documentationSections.map((section) => (
            <Button
              key={section.id}
              variant={activeSection === section.id ? "default" : "outline"}
              onClick={() => setActiveSection(section.id)}
              className={activeSection === section.id ? "bg-blue-600" : ""}
            >
              {section.title}
            </Button>
          ))}
        </div>

        {/* Documentation Sections */}
        <div className="space-y-8">
          {filteredSections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${section.color} flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{section.title}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{section.description}</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {section.articles.map((article, articleIdx) => (
                    <Card key={articleIdx} className="hover:shadow-md transition-all cursor-pointer group">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <FileText className="w-4 h-4 text-blue-500" />
                          {article.popular && (
                            <Badge variant="outline" className="text-[10px]">Popular</Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 transition-colors">
                          {article.title}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                          {article.description}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{article.readTime}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{article.difficulty}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Video Tutorials Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-500" />
            Video Tutorials
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {videoTutorials.map((video, idx) => (
              <a key={idx} href={`https://www.youtube.com/watch?v=${video.youtubeId}`} target="_blank" rel="noopener noreferrer">
                <Card className="cursor-pointer hover:shadow-lg transition-all group">
                  <div className="aspect-video rounded-t-xl overflow-hidden relative">
                    <img
                      src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                      <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                        <Play className="w-5 h-5 text-white ml-1" />
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{video.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{video.duration}</span>
                      <span>{video.views} views</span>
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>

        {/* Quick Guides */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            Quick Guides
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickGuides.map((guide, idx) => {
              const Icon = guide.icon;
              return (
                <Card key={idx} className="cursor-pointer hover:shadow-md transition-all">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-blue-600 dark:text-slate-300" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{guide.title}</h3>
                      <p className="text-xs text-gray-500">{guide.description}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Download Resources */}
        <div className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-gray-100 to-gray-200 dark:from-white/5 dark:to-white/10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Downloadable Resources</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Get PDF guides and cheat sheets</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="gap-2" asChild>
                <Link href="/resource/downloads">
                  <Download className="w-4 h-4" />
                  User Guide PDF
                </Link>
              </Button>
              <Button variant="outline" className="gap-2" asChild>
                <Link href="/resource/downloads">
                  <Download className="w-4 h-4" />
                  API Reference
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


