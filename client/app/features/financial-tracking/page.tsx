"use client";
// app/features/financial-tracking/page.tsx

import { motion } from "framer-motion";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PieChart,
  BarChart3,
  CreditCard,
  Wallet,
  PiggyBank,
  AlertCircle,
  Target,
  Shield,
  Award,
  Calendar,
  Receipt,
  LineChart,
  Activity,
  CheckCircle2,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";

export default function FinancialTrackingPage() {
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
              <DollarSign className="w-3.5 h-3.5 mr-2" />
              Financial Intelligence
            </Badge>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
              Track Finances with AI
              <span className="block text-blue-100">
                Real-time & Predictive
              </span>
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
              AI-powered financial tracking, fraud detection, cash flow forecasting, and investment insights 
              to optimize your business finances.
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
              icon: TrendingUp,
              title: "Cash Flow Forecasting",
              desc: "AI predicts cash flow with 96% accuracy up to 12 months ahead",
              color: "from-emerald-500 to-teal-500"
            },
            {
              icon: AlertCircle,
              title: "Fraud Detection",
              desc: "Real-time anomaly detection for suspicious transactions",
              color: "from-red-500 to-orange-500"
            },
            {
              icon: PieChart,
              title: "Expense Categorization",
              desc: "Automatic tagging and analysis of all business expenses",
              color: "from-blue-500 to-cyan-500"
            },
            {
              icon: Target,
              title: "Budget Optimization",
              desc: "AI recommendations for cost reduction and savings",
              color: "from-purple-500 to-pink-500"
            },
            {
              icon: LineChart,
              title: "Investment Insights",
              desc: "ROI analysis and investment opportunity scoring",
              color: "from-yellow-500 to-orange-500"
            },
            {
              icon: Shield,
              title: "Compliance Monitoring",
              desc: "Automated regulatory compliance and reporting",
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

        {/* Financial Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-4 gap-6 mb-16"
        >
          {[
            { value: "$2.4M", label: "Cash on Hand", icon: Wallet, trend: "+12%" },
            { value: "$847K", label: "Monthly Revenue", icon: DollarSign, trend: "+8%" },
            { value: "34%", label: "Profit Margin", icon: TrendingUp, trend: "+5%" },
            { value: "$156K", label: "Monthly Savings", icon: PiggyBank, trend: "+23%" }
          ].map((metric, idx) => {
            const Icon = metric.icon;
            return (
              <Card key={idx}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-3">
                    <Icon className="w-5 h-5 text-emerald-500" />
                    <span className="text-xs text-green-500">{metric.trend}</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{metric.value}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{metric.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>

        {/* Integration & Security */}
        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="p-6 rounded-2xl bg-gray-50 dark:bg-white/5"
          >
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-6 h-6 text-slate-800 dark:text-emerald-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bank & Payment Integration</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Connect with 10,000+ financial institutions worldwide.
            </p>
            <div className="flex flex-wrap gap-2">
              {['Stripe', 'PayPal', 'Plaid', 'QuickBooks', 'SAP', 'Oracle', 'Microsoft Dynamics'].map((bank) => (
                <Badge key={bank} variant="outline">{bank}</Badge>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="p-6 rounded-2xl bg-gray-50 dark:bg-white/5"
          >
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-slate-800 dark:text-emerald-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bank-Level Security</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              256-bit encryption, SOC 2 Type II certified, and PCI compliant.
            </p>
            <div className="flex flex-wrap gap-2">
              {['256-bit SSL', 'SOC 2', 'PCI DSS', 'GDPR', 'CCPA'].map((cert) => (
                <Badge key={cert} variant="outline" className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400">
                  {cert}
                </Badge>
              ))}
            </div>
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mt-16 text-center p-12 rounded-2xl bg-gradient-to-r from-slate-800 to-[#2d5a8e]"
        >
          <h2 className="text-3xl font-bold text-white mb-4">
            Take Control of Your Finances
          </h2>
          <p className="text-emerald-100 mb-8 max-w-xl mx-auto">
            Join thousands of businesses using AI to optimize their financial operations.
          </p>
          <Button size="lg" variant="secondary" className="bg-white text-slate-800 hover:bg-gray-100" asChild>
            <a href="/signup">Start Free Trial <ArrowRight className="ml-2 w-4 h-4" /></a>
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

