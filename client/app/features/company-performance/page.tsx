"use client";
// app/features/company-performance/page.tsx

import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart,
  LineChart,
  Activity,
  Target,
  Award,
  Users,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Shield,
  Zap,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";

export default function CompanyPerformancePage() {
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
              <BarChart3 className="w-3.5 h-3.5 mr-2" />
              Performance Intelligence
            </Badge>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
              Track Company Performance
              <span className="block text-blue-100">
                Real-time Analytics
              </span>
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
              Monitor KPIs, track OKRs, visualize trends, and get AI-powered insights to drive business growth.
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

      {/* Key Metrics */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {[
            { label: "Revenue", value: "$2.4M", change: "+23%", trend: "up", icon: DollarSign },
            { label: "Profit Margin", value: "34%", change: "+5%", trend: "up", icon: TrendingUp },
            { label: "Customer Growth", value: "1,234", change: "+18%", trend: "up", icon: Users },
            { label: "Employee NPS", value: "72", change: "+8", trend: "up", icon: Award }
          ].map((metric, idx) => (
            <Card key={idx}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-3">
                  <metric.icon className="w-5 h-5 text-slate-800" />
                  <Badge className={metric.trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                    {metric.change}
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{metric.value}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{metric.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* OKR Tracking */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="flex items-center gap-3 mb-6">
            <Target className="w-6 h-6 text-slate-800 dark:text-cyan-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">OKR & KPI Tracking</h2>
          </div>
          <div className="space-y-4">
            {[
              { name: "Annual Revenue Goal", current: 78, target: 100, unit: "M", status: "on-track" },
              { name: "Customer Acquisition", current: 234, target: 500, unit: "", status: "behind" },
              { name: "Product Adoption", current: 67, target: 80, unit: "%", status: "on-track" },
              { name: "Team Satisfaction", current: 85, target: 90, unit: "%", status: "ahead" }
            ].map((okr, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-gray-50 dark:bg-white/5">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-900 dark:text-white">{okr.name}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {okr.current} / {okr.target}{okr.unit}
                  </span>
                </div>
                <div className="relative h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(okr.current / okr.target) * 100}%` }}
                    transition={{ duration: 1, delay: idx * 0.1 }}
                    className={`absolute h-full rounded-full ${
                      okr.status === 'ahead' ? 'bg-green-500' : 
                      okr.status === 'behind' ? 'bg-red-500' : 'bg-cyan-500'
                    }`}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <Badge variant={okr.status === 'ahead' ? 'default' : 'outline'} 
                    className={okr.status === 'ahead' ? 'bg-green-500' : ''}>
                    {okr.status === 'ahead' ? 'Ahead' : okr.status === 'behind' ? 'Behind' : 'On Track'}
                  </Badge>
                  <span className="text-xs text-gray-500">Target: {okr.target}{okr.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* AI Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-2 gap-6 mb-16"
        >
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-500/10 dark:to-emerald-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <TrendingUp className="w-5 h-5 text-green-600" />
                AI Growth Predictions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">Q4 revenue projected to grow 28%</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">Customer churn risk decreased by 15%</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">Market expansion opportunity detected</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-500/10 dark:to-orange-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                Risk Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">Supply chain disruption possible</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">Competitor pricing strategy change</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">Talent retention risk in tech dept</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* Benchmarking */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="p-8 rounded-2xl bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-500/10 dark:to-blue-500/10"
        >
          <div className="flex items-center gap-3 mb-6">
            <Award className="w-6 h-6 text-slate-800 dark:text-cyan-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Industry Benchmarking</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { metric: "Revenue Growth", your: "23%", industry: "15%", position: "Top 10%" },
              { metric: "Profit Margin", your: "34%", industry: "22%", position: "Top 15%" },
              { metric: "Customer Retention", your: "89%", industry: "76%", position: "Top 5%" }
            ].map((bench, idx) => (
              <div key={idx} className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{bench.metric}</p>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{bench.your}</div>
                <div className="text-xs text-gray-500">vs industry {bench.industry}</div>
                <Badge className="mt-2 bg-green-100 text-green-700">{bench.position}</Badge>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

