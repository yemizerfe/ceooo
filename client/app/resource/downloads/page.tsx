"use client";
// app/resources/downloads/page.tsx

import Link from "next/link";
import { useState } from "react";
import { generatePDF } from "@/lib/pdf/pdfGenerator";
import { AIPromptLibrary } from "./AIPromptLibrary";
import { MeetingEfficiencyToolkit } from "./MeetingEfficiencyToolkit";
import { StrategicPlanningCheatsheet } from "./StrategicPlanningCheatsheet";
import { motion } from "framer-motion";
import {
  Download,
  FileText,
  FileJson,
  FileSpreadsheet,
  FileImage,
  File,
  ChevronRight,
  Sparkles,
  Brain,
  Target,
  Calendar,
  DollarSign,
  Users,
  CheckCircle2,
  Star,
  Clock,
  TrendingUp,
  Shield,
  Zap,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Resource {
  id: string;
  title: string;
  description: string;
  type: "pdf" | "guide" | "cheatsheet" | "template" | "checklist";
  category: string;
  pages: number;
  downloads: number;
  popular: boolean;
  icon: any;
  color: string;
}

const resources: Resource[] = [
  {
    id: "1",
    title: "The CEO's Guide to AI Decision Making",
    description: "Learn how to leverage AI for strategic business decisions with real-world examples and frameworks.",
    type: "guide",
    category: "Decision Making",
    pages: 24,
    downloads: 1234,
    popular: true,
    icon: Brain,
    color: "from-purple-500 to-pink-500"
  },
  {
    id: "2",
    title: "Strategic Planning Cheat Sheet",
    description: "One-page reference for annual strategic planning, OKR setting, and milestone tracking.",
    type: "cheatsheet",
    category: "Strategy",
    pages: 1,
    downloads: 2345,
    popular: true,
    icon: Target,
    color: "from-blue-500 to-cyan-500"
  },
  {
    id: "3",
    title: "Meeting Efficiency Toolkit",
    description: "Templates and checklists for running effective executive meetings and board sessions.",
    type: "checklist",
    category: "Productivity",
    pages: 8,
    downloads: 1892,
    popular: true,
    icon: Calendar,
    color: "from-green-500 to-emerald-500"
  },
  {
    id: "4",
    title: "Financial Dashboard Guide",
    description: "Master key financial metrics: revenue, burn rate, runway, and profitability analysis.",
    type: "guide",
    category: "Financial",
    pages: 16,
    downloads: 987,
    popular: false,
    icon: DollarSign,
    color: "from-yellow-500 to-orange-500"
  },
  {
    id: "5",
    title: "Stakeholder Management Framework",
    description: "Map, analyze, and manage stakeholder relationships effectively.",
    type: "cheatsheet",
    category: "Stakeholders",
    pages: 2,
    downloads: 1456,
    popular: false,
    icon: Users,
    color: "from-indigo-500 to-purple-500"
  },
  {
    id: "6",
    title: "AI Prompt Library for CEOs",
    description: "100+ proven prompts to get the best results from AI decision assistants.",
    type: "guide",
    category: "AI",
    pages: 32,
    downloads: 876,
    popular: true,
    icon: Sparkles,
    color: "from-pink-500 to-rose-500"
  },
  {
    id: "7",
    title: "Weekly CEO Checklist",
    description: "Essential weekly tasks for effective leadership and team management.",
    type: "checklist",
    category: "Productivity",
    pages: 4,
    downloads: 2103,
    popular: true,
    icon: CheckCircle2,
    color: "from-teal-500 to-green-500"
  },
  {
    id: "8",
    title: "Risk Assessment Matrix",
    description: "Identify, evaluate, and mitigate business risks with this comprehensive template.",
    type: "template",
    category: "Risk",
    pages: 6,
    downloads: 654,
    popular: false,
    icon: Shield,
    color: "from-red-500 to-orange-500"
  },
  {
    id: "9",
    title: "Executive Dashboard Templates",
    description: "Ready-to-use dashboard templates for tracking KPIs and company performance.",
    type: "template",
    category: "Analytics",
    pages: 12,
    downloads: 1789,
    popular: true,
    icon: TrendingUp,
    color: "from-cyan-500 to-blue-500"
  }
];

const categories = ["All", "Decision Making", "Strategy", "Productivity", "Financial", "Stakeholders", "AI", "Risk", "Analytics"];

const resourcePDFIds: Record<string, { elementId: string; filename: string }> = {
  "2": { elementId: "strategic-planning-pdf", filename: "Strategic-Planning-Cheatsheet" },
  "3": { elementId: "meeting-efficiency-pdf", filename: "Meeting-Efficiency-Toolkit" },
  "6": { elementId: "ai-prompt-library-pdf", filename: "AI-Prompt-Library-for-CEOs" },
};

export default function DownloadableResourcesPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  const filteredResources = resources.filter(resource => {
    const matchesCategory = selectedCategory === "All" || resource.category === selectedCategory;
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          resource.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleDownload = async (resourceId: string) => {
    setDownloading(resourceId);
    const pdfConfig = resourcePDFIds[resourceId];
    if (pdfConfig) {
      await generatePDF(pdfConfig.elementId, pdfConfig.filename);
    }
    setDownloading(null);
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setEmailSubmitted(true);
      setTimeout(() => setEmailSubmitted(false), 3000);
    }
  };

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
              <Download className="w-3.5 h-3.5 mr-2" />
              Free Resources
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              Downloadable Resources
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Get free PDF guides, cheat sheets, and templates to master CEOOO
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Stats Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{resources.length}</div>
              <div className="text-xs text-gray-500">Resources Available</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">12,345+</div>
              <div className="text-xs text-gray-500">Total Downloads</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">100%</div>
              <div className="text-xs text-gray-500">Free Resources</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">Instant</div>
              <div className="text-xs text-gray-500">Download Access</div>
            </CardContent>
          </Card>
        </div>

        {/* Email Signup for Resource Updates */}
        <Card className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10 border-purple-200 dark:border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-purple-500" />
                <div>
                  <h3 className="font-semibold">Get New Resources Weekly</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Subscribe for free guides, templates, and updates</p>
                </div>
              </div>
              <form onSubmit={handleEmailSubmit} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-64"
                  required
                />
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  {emailSubmitted ? <CheckCircle2 className="w-4 h-4" /> : "Subscribe"}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                size="sm"
                className={selectedCategory === category ? "bg-blue-600" : ""}
              >
                {category}
              </Button>
            ))}
          </div>
          <div className="relative">
            <Input
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>
        </div>

        {/* Resources Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((resource, idx) => {
            const Icon = resource.icon;
            return (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="h-full hover:shadow-lg transition-all group">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${resource.color} flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      {resource.popular && (
                        <Badge className="bg-yellow-500 text-white">
                          <Star className="w-3 h-3 mr-1 fill-current" />
                          Popular
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="mt-3 text-lg">{resource.title}</CardTitle>
                    <p className="text-sm text-gray-500 line-clamp-2">{resource.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        <span>{resource.pages} pages</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        <span>{resource.downloads} downloads</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {resource.type}
                      </Badge>
                    </div>
                    <Button
                      onClick={() => handleDownload(resource.id)}
                      className="w-full gap-2"
                      variant="outline"
                      disabled={downloading === resource.id}
                    >
                      {downloading === resource.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                          Generating PDF...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Download PDF
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {filteredResources.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No resources found</h3>
            <p className="text-gray-500">Try adjusting your search or category filter</p>
          </div>
        )}

        {/* Resource Categories Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">Resource Categories</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Brain, title: "AI Guides", count: "3 resources", color: "from-purple-500 to-pink-500" },
              { icon: Target, title: "Strategy Templates", count: "2 resources", color: "from-blue-500 to-cyan-500" },
              { icon: CheckCircle2, title: "Productivity Tools", count: "2 resources", color: "from-green-500 to-emerald-500" },
              { icon: DollarSign, title: "Financial Resources", count: "1 resource", color: "from-yellow-500 to-orange-500" },
              { icon: Users, title: "Stakeholder Guides", count: "1 resource", color: "from-indigo-500 to-purple-500" },
              { icon: Shield, title: "Risk Management", count: "1 resource", color: "from-red-500 to-orange-500" },
            ].map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <Card key={idx} className="cursor-pointer hover:shadow-md transition-all">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${cat.color} flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{cat.title}</h3>
                      <p className="text-sm text-gray-500">{cat.count}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {[
              { q: "Are these resources really free?", a: "Yes, all resources are completely free. No credit card required." },
              { q: "What format are the downloads?", a: "All resources are in PDF format, compatible with any device." },
              { q: "Can I share these resources?", a: "Yes, feel free to share with your team and colleagues." },
              { q: "How often are new resources added?", a: "We add new resources weekly. Subscribe for updates." },
            ].map((faq, idx) => (
              <Card key={idx}>
                <CardContent className="p-4">
                  <p className="font-semibold mb-1">{faq.q}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Hidden components for PDF generation */}
      <div className="fixed -left-[9999px] -top-[9999px] pointer-events-none">
        <div id="strategic-planning-pdf"><StrategicPlanningCheatsheet /></div>
        <div id="meeting-efficiency-pdf"><MeetingEfficiencyToolkit /></div>
        <div id="ai-prompt-library-pdf"><AIPromptLibrary /></div>
      </div>
    </div>
  );
}