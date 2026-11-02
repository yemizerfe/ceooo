"use client";
// app/features/notes-board/page.tsx

import { motion } from "framer-motion";
import { 
  FileText, 
  Brain, 
  Mic, 
  CheckSquare,
  Tag,
  Users,
  Sparkles,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";

const FolderIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

export default function NotesBoardPage() {
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
              <FileText className="w-3.5 h-3.5 mr-2" />
              Smart Notes & Documentation
            </Badge>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
              AI-Powered Notes Board
              <span className="block text-blue-100">
                Capture. Organize. Act.
              </span>
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
              Combine manual note-taking with AI-powered insights. Auto-summarize meetings, extract action items, 
              and turn ideas into executable plans.
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

      {/* Features Overview */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          {/* Manual Notes Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600 dark:text-slate-300" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manual Note-Taking</h2>
            </div>
            <div className="space-y-4">
              {[
                "Rich text editor with formatting",
                "Voice-to-text transcription",
                "Image and file attachments",
                "Tagging and categorization",
                "Search and filter capabilities",
                "Version history and recovery"
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* AI Notes Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-purple-500/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-slate-800 dark:text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI-Powered Features</h2>
            </div>
            <div className="space-y-4">
              {[
                "Auto-summarize long documents",
                "Extract action items and tasks",
                "Smart categorization and tagging",
                "Sentiment analysis on notes",
                "Generate follow-up emails",
                "Predict next steps and recommendations"
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                  <Sparkles className="w-5 h-5 text-slate-800" />
                  <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Live Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Smart Notes in Action
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Meeting Notes",
                desc: "Auto-transcribe and summarize team meetings",
                icon: Mic,
                color: "from-blue-500 to-cyan-500"
              },
              {
                title: "Brain Dump",
                desc: "Capture ideas and AI organizes them",
                icon: Brain,
                color: "from-purple-500 to-pink-500"
              },
              {
                title: "Action Board",
                desc: "Turn notes into trackable tasks",
                icon: CheckSquare,
                color: "from-green-500 to-emerald-500"
              }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <Card key={idx} className="hover:shadow-lg transition-all">
                  <CardContent className="pt-6">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} bg-opacity-20 flex items-center justify-center mb-4`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{item.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>

        {/* Organization Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="p-8 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-500/10 dark:to-yellow-500/10"
        >
          <div className="flex items-center gap-3 mb-6">
            <Tag className="w-6 h-6 text-slate-800 dark:text-amber-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Smart Organization</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { label: "Projects", count: "24", icon: FolderIcon },
              { label: "Tags", count: "156", icon: Tag },
              { label: "Team Notes", count: "89", icon: Users },
              { label: "AI Summaries", count: "342", icon: Brain }
            ].map((stat, idx) => (
              <div key={idx} className="text-center p-4 rounded-lg bg-white dark:bg-white/5">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.count}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}


