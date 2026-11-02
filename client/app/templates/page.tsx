"use client";
// app/templates/page.tsx

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutTemplate,
  Search,
  Download,
  Copy,
  Check,
  Star,
  Users,
  Eye,
  TrendingUp,
  Sparkles,
  Target,
  Calendar,
  DollarSign,
  GitBranch,
  Shield,
  FileText,
  Briefcase,
  ArrowRight,
  Filter,
  Grid3X3,
  List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

const templates = [
  {
    id: 1,
    name: "Strategic Planning Template",
    category: "Strategy",
    icon: Target,
    description: "Comprehensive template for annual strategic planning with OKR tracking, milestone mapping, and quarterly reviews.",
    popular: true,
    uses: 1234,
    rating: 4.8,
    features: ["OKR Tracking", "Milestone Mapping", "Quarterly Reviews", "Risk Assessment"],
    previewImage: "strategic-planning"
  },
  {
    id: 2,
    name: "Board Meeting Agenda",
    category: "Meetings",
    icon: Calendar,
    description: "Professional board meeting agenda template with decision tracking, action items, and follow-up sections.",
    uses: 892,
    rating: 4.7,
    features: ["Decision Tracking", "Action Items", "Minutes Template", "Voting System"],
    previewImage: "board-meeting"
  },
  {
    id: 3,
    name: "Decision Analysis Framework",
    category: "Decisions",
    icon: GitBranch,
    description: "AI-powered decision analysis template with risk assessment, outcome prediction, and stakeholder impact.",
    popular: true,
    uses: 2156,
    rating: 4.9,
    features: ["Risk Assessment", "Outcome Prediction", "Stakeholder Analysis", "ROI Calculator"],
    previewImage: "decision-framework"
  },
  {
    id: 4,
    name: "Financial Review Dashboard",
    category: "Financial",
    icon: DollarSign,
    description: "Monthly financial review template with KPI tracking, variance analysis, and forecasting.",
    uses: 567,
    rating: 4.6,
    features: ["KPI Tracking", "Variance Analysis", "Forecasting", "Budget vs Actual"],
    previewImage: "financial-review"
  },
  {
    id: 5,
    name: "Project Kickoff",
    category: "Project",
    icon: Briefcase,
    description: "Complete project kickoff template with roles, timeline, success metrics, and communication plan.",
    popular: true,
    uses: 987,
    rating: 4.8,
    features: ["Roles & Responsibilities", "Timeline", "Success Metrics", "Communication Plan"],
    previewImage: "project-kickoff"
  },
  {
    id: 6,
    name: "Stakeholder Update",
    category: "Communication",
    icon: Users,
    description: "Professional stakeholder update template with progress reports, metrics, and action requests.",
    uses: 734,
    rating: 4.7,
    features: ["Progress Reports", "Key Metrics", "Action Requests", "Q&A Section"],
    previewImage: "stakeholder-update"
  },
  {
    id: 7,
    name: "Risk Assessment Matrix",
    category: "Risk",
    icon: Shield,
    description: "Comprehensive risk assessment template with likelihood scoring, impact analysis, and mitigation strategies.",
    uses: 445,
    rating: 4.8,
    features: ["Likelihood Scoring", "Impact Analysis", "Mitigation Strategies", "Risk Register"],
    previewImage: "risk-assessment"
  },
  {
    id: 8,
    name: "Team Performance Review",
    category: "HR",
    icon: Users,
    description: "Quarterly team performance review template with OKR alignment, feedback collection, and development plans.",
    uses: 678,
    rating: 4.6,
    features: ["OKR Alignment", "Feedback Collection", "Development Plans", "Goal Setting"],
    previewImage: "team-performance"
  },
  {
    id: 9,
    name: "Market Expansion Plan",
    category: "Strategy",
    icon: TrendingUp,
    description: "Strategic market expansion template with market analysis, entry strategy, and resource allocation.",
    uses: 523,
    rating: 4.9,
    features: ["Market Analysis", "Entry Strategy", "Resource Allocation", "Timeline"],
    previewImage: "market-expansion"
  },
  {
    id: 10,
    name: "Product Launch Checklist",
    category: "Product",
    icon: Sparkles,
    description: "Complete product launch checklist with pre-launch, launch day, and post-launch activities.",
    uses: 876,
    rating: 4.8,
    features: ["Pre-launch Checklist", "Launch Day Tasks", "Post-launch Review", "Success Metrics"],
    previewImage: "product-launch"
  },
  {
    id: 11,
    name: "Executive Summary",
    category: "Reporting",
    icon: FileText,
    description: "Executive summary template for board reports, investor updates, and strategic reviews.",
    uses: 654,
    rating: 4.7,
    features: ["Executive Summary", "Key Metrics", "Strategic Initiatives", "Financial Highlights"],
    previewImage: "executive-summary"
  },
  {
    id: 12,
    name: "Quarterly Planning",
    category: "Strategy",
    icon: Calendar,
    description: "Quarterly planning template with goal setting, resource planning, and progress tracking.",
    popular: true,
    uses: 1123,
    rating: 4.8,
    features: ["Goal Setting", "Resource Planning", "Progress Tracking", "Retrospective"],
    previewImage: "quarterly-planning"
  }
];

const categories = ["All", "Strategy", "Meetings", "Decisions", "Financial", "Project", "Communication", "Risk", "HR", "Product", "Reporting"];

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const copyTemplateLink = (id: number) => {
    setCopiedId(id);
    navigator.clipboard.writeText(`https://ceooo.com/templates/${id}`);
    setTimeout(() => setCopiedId(null), 2000);
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
              <LayoutTemplate className="w-3.5 h-3.5 mr-2" />
              Templates Library
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Ready-to-Use Templates
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
              Save time with professionally designed templates for every business need
            </p>
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search templates..."
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
        {/* Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                className={selectedCategory === category ? "bg-blue-600" : ""}
                size="sm"
              >
                {category}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "bg-blue-600" : ""}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "bg-blue-600" : ""}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Templates Grid/List */}
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={viewMode === "grid" 
              ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6" 
              : "space-y-4"
            }
          >
            {filteredTemplates.map((template, idx) => {
              const Icon = template.icon;
              return (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  {viewMode === "grid" ? (
                    <Card className="h-full hover:shadow-lg transition-all group">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
                              <Icon className="w-5 h-5 text-blue-600 dark:text-slate-300" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{template.name}</CardTitle>
                              <Badge variant="outline" className="mt-1">{template.category}</Badge>
                            </div>
                          </div>
                          {template.popular && (
                            <Badge className="bg-yellow-500 text-white">
                              <Star className="w-3 h-3 mr-1 fill-current" />
                              Popular
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          {template.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {template.features.slice(0, 2).map((feature, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                          {template.features.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{template.features.length - 2} more
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              <span>{template.uses} uses</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500" />
                              <span>{template.rating}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="gap-1">
                              <Download className="w-3 h-3" />
                              Use
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyTemplateLink(template.id)}
                              className="relative"
                            >
                              {copiedId === template.id ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-6 h-6 text-blue-600 dark:text-slate-300" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900 dark:text-white">{template.name}</h3>
                              <Badge variant="outline" className="text-xs">{template.category}</Badge>
                              {template.popular && (
                                <Badge className="bg-yellow-500 text-white text-xs">Popular</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{template.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <span>{template.uses} uses</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-yellow-500" />
                                <span>{template.rating}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="gap-1">
                              <Download className="w-3 h-3" />
                              Use Template
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyTemplateLink(template.id)}
                            >
                              {copiedId === template.id ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <LayoutTemplate className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No templates found
            </h3>
            <p className="text-gray-500">
              Try adjusting your search or category filter
            </p>
          </div>
        )}

        {/* Template Request */}
        <Alert className="mt-8 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <AlertDescription className="flex items-center justify-between flex-wrap gap-4">
            <span className="text-gray-700 dark:text-gray-300">Don't see a template you need? Request it and we'll build it for you!</span>
            <Button size="sm" variant="outline" className="border-purple-300 text-purple-600">
              Request Template
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </AlertDescription>
        </Alert>

        {/* Stats */}
        <div className="mt-8 p-4 rounded-lg bg-gray-100 dark:bg-white/5 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-bold text-blue-600">{templates.length}</span> templates available •
            <span className="font-bold text-blue-600 ml-1">12,345+</span> templates used by CEOs worldwide
          </p>
        </div>
      </div>
    </div>
  );
}

