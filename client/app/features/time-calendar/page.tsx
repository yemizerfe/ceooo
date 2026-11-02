"use client";
// app/features/time-calendar/page.tsx

import { motion } from "framer-motion";
import { 
  Calendar, 
  Clock, 
  AlarmClock,
  CalendarDays,
  CalendarRange,
  Timer,
  Bell,
  Zap,
  Brain,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Shield,
  Target,
  Activity,
  BarChart3,
  Settings,
  Sun,
  Moon,
  Coffee,
  Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";

export default function TimeCalendarPage() {
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
              <Calendar className="w-3.5 h-3.5 mr-2" />
              Smart Time Management
            </Badge>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
              Master Your Time
              <span className="block text-blue-100">
                AI Calendar Intelligence
              </span>
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
              AI-powered scheduling, time tracking, productivity analytics, and smart calendar management 
              to optimize your most valuable resource.
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

      {/* Core Features */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {[
            {
              icon: CalendarDays,
              title: "Smart Scheduling",
              desc: "AI finds optimal meeting times across time zones",
              color: "from-indigo-500 to-purple-500"
            },
            {
              icon: Timer,
              title: "Time Tracking",
              desc: "Auto-track work hours and project time",
              color: "from-blue-500 to-cyan-500"
            },
            {
              icon: Brain,
              title: "Productivity AI",
              desc: "Insights on focus time and distractions",
              color: "from-green-500 to-emerald-500"
            }
          ].map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card key={idx} className="hover:shadow-lg transition-all">
                <CardContent className="pt-6 text-center">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} bg-opacity-20 flex items-center justify-center mx-auto mb-4`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{feature.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Calendar Views */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Multiple Calendar Views
          </h2>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { view: "Day", icon: Sun, desc: "Hour-by-hour breakdown" },
              { view: "Week", icon: CalendarDays, desc: "Weekly overview" },
              { view: "Month", icon: CalendarRange, desc: "Monthly planning" },
              { view: "Year", icon: Calendar, desc: "Annual roadmap" }
            ].map((view, idx) => {
              const Icon = view.icon;
              return (
                <div key={idx} className="p-4 text-center rounded-xl bg-gray-50 dark:bg-white/5">
                  <Icon className="w-8 h-8 text-slate-800 mx-auto mb-2" />
                  <div className="font-semibold text-gray-900 dark:text-white">{view.view}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{view.desc}</div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* AI Scheduling Features */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="p-6 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10"
          >
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-6 h-6 text-slate-800 dark:text-indigo-400" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">AI Scheduling Assistant</h3>
            </div>
            <ul className="space-y-3">
              {[
                "Auto-find optimal meeting times",
                "Buffer time between meetings",
                "Focus block scheduling",
                "Meeting type detection",
                "Smart rescheduling suggestions"
              ].map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10"
          >
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-6 h-6 text-blue-600 dark:text-slate-300" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Time Analytics</h3>
            </div>
            <ul className="space-y-3">
              {[
                "Time distribution insights",
                "Productivity score tracking",
                "Meeting efficiency metrics",
                "Focus time optimization",
                "Weekly performance reports"
              ].map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Integrations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="p-8 rounded-2xl bg-gray-50 dark:bg-white/5"
        >
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-6 h-6 text-slate-800 dark:text-indigo-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar Integrations</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              "Google Calendar",
              "Outlook",
              "Apple Calendar",
              "Calendly",
              "Zoom",
              "Teams",
              "Slack",
              "Asana",
              "Trello",
              "Notion"
            ].map((integration) => (
              <div key={integration} className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-white/5">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span className="text-xs text-gray-700 dark:text-gray-300">{integration}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Productivity Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mt-8 grid md:grid-cols-4 gap-4"
        >
          {[
            { value: "4.2h", label: "Avg. Focus Time", icon: Timer },
            { value: "32%", label: "Meeting Efficiency", icon: Users },
            { value: "87%", label: "Schedule Adherence", icon: Calendar },
            { value: "15h", label: "Time Saved/Week", icon: Zap }
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <Card key={idx}>
                <CardContent className="pt-6 text-center">
                  <Icon className="w-6 h-6 text-slate-800 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{stat.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}

