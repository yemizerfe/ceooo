"use client";
// app/features/stakeholder-connection/page.tsx

import { motion } from "framer-motion";
import { 
  Users, 
  Handshake, 
  MessageCircle, 
  Calendar, 
  Mail, 
  BarChart3,
  CheckCircle2,
  Star,
  ArrowRight,
  Sparkles,
  Shield,
  Clock,
  FileText,
  Bell,
  Share2,
  Video,
  Phone,
  Inbox,
  Target,
  TrendingUp,
  Activity,
  Globe,
  Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";

export default function StakeholderConnectionPage() {
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
              <Users className="w-3.5 h-3.5 mr-2" />
              Stakeholder Management
            </Badge>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
              Connect with Stakeholders
              <span className="block text-blue-100">
                Seamlessly & Intelligently
              </span>
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
              AI-powered stakeholder mapping, communication tracking, and relationship intelligence 
              to keep everyone aligned and engaged.
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

      {/* Key Features */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Everything You Need to Manage Stakeholders
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            From investors to partners, keep all your stakeholder relationships organized and thriving.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {[
            {
              icon: Handshake,
              title: "Stakeholder Mapping",
              description: "Visualize relationships, influence levels, and engagement priorities",
              color: "from-green-500 to-emerald-500"
            },
            {
              icon: MessageCircle,
              title: "Communication Hub",
              description: "Track all interactions across email, meetings, calls in one place",
              color: "from-blue-500 to-cyan-500"
            },
            {
              icon: Calendar,
              title: "Smart Scheduling",
              description: "AI-powered meeting coordination with timezone intelligence",
              color: "from-purple-500 to-pink-500"
            },
            {
              icon: BarChart3,
              title: "Engagement Analytics",
              description: "Measure stakeholder satisfaction and engagement scores",
              color: "from-orange-500 to-red-500"
            },
            {
              icon: Shield,
              title: "Relationship Health",
              description: "AI predicts relationship risks before they become problems",
              color: "from-indigo-500 to-purple-500"
            },
            {
              icon: Target,
              title: "Action Tracking",
              description: "Follow up on commitments and track resolution status",
              color: "from-teal-500 to-green-500"
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
                  <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            How Stakeholder Connection Works
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Import Contacts", desc: "Connect email, CRM, and address books" },
              { step: "2", title: "AI Analysis", desc: "Map relationships and influence networks" },
              { step: "3", title: "Track Engagement", desc: "Monitor all interactions automatically" },
              { step: "4", title: "Get Insights", desc: "Receive AI-powered relationship recommendations" }
            ].map((step, idx) => (
              <div key={idx} className="text-center">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {step.step}
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Integration Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="p-8 rounded-2xl bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-500/10 dark:to-blue-500/10"
        >
          <div className="flex items-center gap-3 mb-4">
            <Share2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Seamless Integrations
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Connect with your favorite tools for a unified stakeholder experience.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Salesforce', 'HubSpot', 'Slack', 'Microsoft Teams', 'Gmail', 'Outlook', 'Zoom', 'Calendly'].map((tool) => (
              <div key={tool} className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-white/5">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{tool}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

