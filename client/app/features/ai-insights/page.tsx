"use client";
// app/features/ai-insights/page.tsx

import { motion } from "framer-motion";
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Zap,
  Target,
  Shield,
  Award,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Database,
  Cloud,
  Eye,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";

export default function AIInsightsPage() {
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
              <Brain className="w-3.5 h-3.5 mr-2" />
              AI-Powered Analytics
            </Badge>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
              Uncover Hidden Insights
              <span className="block text-blue-100">
                With AI Analytics
              </span>
            </h1>
            
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
              Transform raw data into actionable intelligence. Our AI analyzes patterns, predicts trends, 
              and delivers insights that drive business growth.
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

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        
        {/* Insight Types */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {[
            {
              title: "Predictive Analytics",
              description: "Forecast future trends, customer behavior, and market shifts with 92% accuracy",
              icon: TrendingUp,
              color: "from-blue-500 to-cyan-500"
            },
            {
              title: "Anomaly Detection",
              description: "Instantly identify unusual patterns, fraud, and operational issues",
              icon: AlertTriangle,
              color: "from-red-500 to-orange-500"
            },
            {
              title: "Sentiment Analysis",
              description: "Understand customer feedback, team morale, and market perception",
              icon: Activity,
              color: "from-purple-500 to-pink-500"
            },
            {
              title: "Recommendation Engine",
              description: "Get AI-powered recommendations for business decisions",
              icon: Lightbulb,
              color: "from-yellow-500 to-orange-500"
            }
          ].map((insight, idx) => {
            const Icon = insight.icon;
            return (
              <Card key={idx} className="hover:shadow-lg transition-all">
                <CardContent className="pt-6">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${insight.color} bg-opacity-20 flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{insight.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{insight.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Data Sources */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Connect Any Data Source
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Databases", icon: Database },
              { name: "CRMs", icon: Cloud },
              { name: "Analytics", icon: BarChart3 },
              { name: "Social Media", icon: Eye },
              { name: "Financial Systems", icon: PieChart },
              { name: "IoT Devices", icon: Activity },
              { name: "Log Files", icon: FileText },
              { name: "APIs", icon: Zap }
            ].map((source, idx) => {
              const Icon = source.icon;
              return (
                <div key={idx} className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                  <Icon className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{source.name}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Real-time Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="p-8 rounded-2xl bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-500/10 dark:to-yellow-500/10"
        >
          <div className="flex items-center gap-3 mb-4">
            <Eye className="w-6 h-6 text-slate-800 dark:text-orange-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Real-time Intelligence Dashboard
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Monitor key metrics, receive alerts, and explore insights with our interactive dashboard.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-white dark:bg-white/5">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">+34%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Revenue Growth</div>
              <TrendingUp className="w-4 h-4 text-green-500 mt-2" />
            </div>
            <div className="p-4 rounded-lg bg-white dark:bg-white/5">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">92%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Forecast Accuracy</div>
              <Target className="w-4 h-4 text-blue-500 mt-2" />
            </div>
            <div className="p-4 rounded-lg bg-white dark:bg-white/5">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">5.2x</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">ROI on Insights</div>
              <Award className="w-4 h-4 text-slate-800 mt-2" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

