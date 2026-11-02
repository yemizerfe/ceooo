"use client";
// app/features/project-management/page.tsx

import { motion } from "framer-motion";
import { 
  FolderKanban, 
  CheckSquare, 
  Clock, 
  Users, 
  BarChart3, 
  Calendar,
  AlertCircle,
  Target,
  GitBranch,
  Zap,
  Award,
  Activity,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";

export default function ProjectManagementPage() {
  const { isAuthenticated } = useAuthStore();
  return (
    <div className="min-h-screen pt-0 bg-white dark:bg-slate-900">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[size:50px_50px]" />
        
        <div className="relative max-w-6xl mx-auto px-4 py-24 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <Badge className="mb-6 px-4 py-2 bg-white/20 text-white border-0">
              <FolderKanban className="w-3.5 h-3.5 mr-2" />
              AI Project Management
            </Badge>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
              Manage Projects with AI
              <span className="block text-blue-100">
                Smarter & Faster
              </span>
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
              AI-powered project planning, resource allocation, risk prediction, and automated workflows 
              to deliver projects on time and under budget.
            </p>
            
            <div className="flex gap-4 justify-center flex-wrap">
              {isAuthenticated ? (
                <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50" asChild>
                  <a href="/dashboard">Open Dashboard</a>
                </Button>
              ) : (
                <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50" asChild>
                  <a href="/signup">Start Free Trial <Sparkles className="ml-2 w-4 h-4" /></a>
                </Button>
              )}
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Watch Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {[
            {
              icon: Target,
              title: "Smart Planning",
              desc: "AI creates optimal project timelines and resource allocation",
              color: "from-purple-500 to-pink-500"
            },
            {
              icon: AlertCircle,
              title: "Risk Prediction",
              desc: "Identify potential delays before they happen",
              color: "from-red-500 to-orange-500"
            },
            {
              icon: GitBranch,
              title: "Task Automation",
              desc: "Automate repetitive tasks and workflows",
              color: "from-blue-500 to-cyan-500"
            },
            {
              icon: Activity,
              title: "Real-time Tracking",
              desc: "Live dashboards for project progress and KPIs",
              color: "from-green-500 to-emerald-500"
            },
            {
              icon: Users,
              title: "Team Collaboration",
              desc: "AI-powered team matching and workload balancing",
              color: "from-yellow-500 to-orange-500"
            },
            {
              icon: Award,
              title: "Performance Analytics",
              desc: "Measure team productivity and project success rates",
              color: "from-indigo-500 to-purple-500"
            }
          ].map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card key={idx} className="hover:shadow-lg transition-all">
                <CardContent className="pt-6">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} bg-opacity-20 flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{feature.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Key Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-4 gap-6 mb-16"
        >
          {[
            { value: "94%", label: "On-time Delivery", icon: Clock },
            { value: "87%", label: "Resource Efficiency", icon: BarChart3 },
            { value: "2.5x", label: "Faster Completion", icon: Zap },
            { value: "99%", label: "Client Satisfaction", icon: Award }
          ].map((metric, idx) => {
            const Icon = metric.icon;
            return (
              <Card key={idx} className="text-center">
                <CardContent className="pt-6">
                  <Icon className="w-8 h-8 text-slate-800 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{metric.value}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{metric.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>

        {/* Templates Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            AI-Powered Project Templates
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              "Product Launch",
              "Software Development",
              "Marketing Campaign",
              "Event Planning",
              "Business Transformation",
              "Research & Development"
            ].map((template) => (
              <div key={template} className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                <CheckSquare className="w-4 h-4 text-slate-800" />
                <span className="text-gray-700 dark:text-gray-300">{template}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

