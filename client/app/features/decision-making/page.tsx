"use client";
// app/features/decision-making/page.tsx

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { 
  Brain, 
  Zap, 
  Shield, 
  TrendingUp, 
  BarChart3, 
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Crown,
  Users,
  Clock,
  Database,
  Lock,
  Cloud,
  GitBranch,
  LineChart,
  PieChart,
  Target,
  Lightbulb,
  Star,
  Play,
  FileText,
  Share2,
  Bell,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/authStore";

export default function DecisionMakingInfoPage() {
  const { isAuthenticated } = useAuthStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  return (
    <div ref={containerRef} className="min-h-screen bg-white dark:bg-slate-900 overflow-hidden">
      {/* Hero Section */}
      <motion.div 
        style={{ opacity, scale }}
        className="relative bg-gradient-to-r from-blue-600 to-indigo-600"
      >
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
              AI-Powered Decision Making
            </Badge>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
              Make Smarter Decisions
              <span className="block text-blue-100">
                With AI Intelligence
              </span>
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
              Transform complex data into actionable insights. Our AI analyzes millions of data points 
              to help you make confident, data-driven decisions in seconds.
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
                <Play className="mr-2 w-4 h-4" />
                Watch Demo
              </Button>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
              No credit card required • Free 14-day trial
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Trusted By Section */}
      <div className="border-y border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
            Trusted by executives at leading companies
          </p>
          <div className="flex justify-center items-center gap-8 flex-wrap opacity-60">
            {['Microsoft', 'Google', 'Amazon', 'Meta', 'Salesforce'].map((company) => (
              <span key={company} className="text-gray-600 dark:text-gray-400 font-semibold text-lg">
                {company}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content - Notion Style */}
      <div className="max-w-4xl mx-auto px-4 py-16 md:py-24">
        
        {/* Introduction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            What is AI Decision Making?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            AI Decision Making is an intelligent assistant that helps CEOs and executives analyze complex business scenarios, 
            predict outcomes, and make data-driven decisions with confidence. It combines advanced machine learning algorithms 
            with real-time data to provide actionable insights.
          </p>
        </motion.div>

        {/* Key Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
            Key Features
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: Brain,
                title: "Real-time Analysis",
                description: "Process millions of data points in seconds to identify patterns and trends"
              },
              {
                icon: TrendingUp,
                title: "Predictive Forecasting",
                description: "Predict future outcomes with 94% accuracy using advanced ML models"
              },
              {
                icon: Shield,
                title: "Risk Assessment",
                description: "Identify potential risks and get mitigation strategies"
              },
              {
                icon: BarChart3,
                title: "Data Visualization",
                description: "Beautiful, interactive charts and dashboards for insights"
              },
              {
                icon: GitBranch,
                title: "Scenario Planning",
                description: "Compare multiple scenarios and their potential outcomes"
              },
              {
                icon: Zap,
                title: "Instant Recommendations",
                description: "Get actionable recommendations in real-time"
              }
            ].map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={idx} className="flex gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-blue-600 dark:text-slate-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{feature.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
            How It Works
          </h2>
          <div className="space-y-8">
            {[
              {
                step: "01",
                title: "Connect Your Data",
                description: "Integrate with your existing tools - CRM, ERP, financial systems, and more. Our AI analyzes your historical data to understand your business patterns.",
                icon: Database
              },
              {
                step: "02",
                title: "Ask Your Question",
                description: "Simply type your business question in natural language. For example: 'What's the best strategy for Q4 growth?' or 'Should we expand to Europe?'",
                icon: Lightbulb
              },
              {
                step: "03",
                title: "Get AI Insights",
                description: "Our AI processes your question, analyzes relevant data, and provides comprehensive insights with confidence scores and actionable recommendations.",
                icon: Brain
              },
              {
                step: "04",
                title: "Make Confident Decisions",
                description: "Review the analysis, compare scenarios, and make data-driven decisions with full confidence. Share insights with your team instantly.",
                icon: Share2
              }
            ].map((item, idx) => (
              <div key={idx} className="flex gap-6">
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
                  {item.step}
                </div>
                <div>
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center mb-3">
                    <item.icon className="w-5 h-5 text-blue-600 dark:text-slate-300" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Use Cases */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
            Common Use Cases
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              "Market expansion strategy",
              "Product launch timing",
              "Investment decisions",
              "Resource allocation",
              "Competitive analysis",
              "Risk management",
              "Pricing optimization",
              "Talent acquisition",
              "Budget planning",
              "Partnership evaluation"
            ].map((useCase, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">{useCase}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Integration Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
            Seamless Integrations
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Salesforce", icon: Cloud },
              { name: "HubSpot", icon: Users },
              { name: "Slack", icon: Bell },
              { name: "Google Analytics", icon: BarChart3 },
              { name: "Tableau", icon: PieChart },
              { name: "Power BI", icon: LineChart },
              { name: "Zapier", icon: Zap },
              { name: "API Access", icon: Settings }
            ].map((integration, idx) => {
              const Icon = integration.icon;
              return (
                <div key={idx} className="flex flex-col items-center p-4 rounded-xl bg-gray-50 dark:bg-white/5 text-center">
                  <Icon className="w-8 h-8 text-gray-600 dark:text-gray-400 mb-2" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{integration.name}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Security Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          viewport={{ once: true }}
          className="mb-16 p-8 rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-500/10 dark:to-purple-500/10"
        >
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-6 h-6 text-blue-600 dark:text-slate-300" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Enterprise-Grade Security
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Your data is protected with bank-level encryption. We're SOC 2 Type II compliant and GDPR ready.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Badge variant="outline" className="bg-white dark:bg-transparent">SOC 2 Compliant</Badge>
            <Badge variant="outline" className="bg-white dark:bg-transparent">GDPR Ready</Badge>
            <Badge variant="outline" className="bg-white dark:bg-transparent">Encryption at Rest</Badge>
            <Badge variant="outline" className="bg-white dark:bg-transparent">SSO Available</Badge>
          </div>
        </motion.div>

        {/* Testimonials */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            What CEOs Are Saying
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                quote: "This AI tool has transformed how we make strategic decisions. We've increased our accuracy by 40%.",
                author: "Sarah Chen",
                title: "CEO, TechVision Inc.",
                rating: 5
              },
              {
                quote: "The scenario planning feature alone is worth the investment. We saved millions by avoiding a risky expansion.",
                author: "Michael Rodriguez",
                title: "CEO, GlobalSoft",
                rating: 5
              }
            ].map((testimonial, idx) => (
              <Card key={idx} className="bg-gray-50 dark:bg-white/5 border-0">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 italic mb-4">"{testimonial.quote}"</p>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{testimonial.author}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.title}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Pricing Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Start with a 14-day free trial. No credit card required.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Starter",
                price: "$49",
                period: "/month",
                features: ["Basic AI analysis", "Up to 5 users", "Email support", "2GB storage"]
              },
              {
                name: "Professional",
                price: "$99",
                period: "/month",
                features: ["Advanced AI analysis", "Unlimited users", "Priority support", "50GB storage", "API access"],
                highlighted: true
              },
              {
                name: "Enterprise",
                price: "Custom",
                period: "",
                features: ["Custom AI models", "Dedicated support", "SLA guarantee", "Unlimited storage", "On-premise deployment"]
              }
            ].map((plan, idx) => (
              <Card key={idx} className={`${plan.highlighted ? 'border-blue-500 shadow-lg' : 'border-gray-200 dark:border-white/10'}`}>
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white">{plan.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                    <span className="text-gray-500 dark:text-gray-400">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full mt-6 ${plan.highlighted ? 'bg-slate-800 hover:bg-[#245a8f]' : 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white'}`}
                    asChild
                  >
                    <a href="/signup">{plan.name === "Enterprise" ? "Contact Sales" : "Start Free Trial"}</a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "How accurate is the AI?",
                a: "Our AI models achieve 94% accuracy in predictive analytics, validated by thousands of business decisions across various industries."
              },
              {
                q: "Can I try it before committing?",
                a: "Yes! We offer a 14-day free trial with full access to all features. No credit card required."
              },
              {
                q: "Is my data secure?",
                a: "Absolutely. We use bank-level 256-bit encryption and comply with SOC 2, GDPR, and CCPA standards."
              },
              {
                q: "What integrations are available?",
                a: "We integrate with 50+ tools including Salesforce, HubSpot, Slack, Google Analytics, and more."
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes, you can cancel your subscription at any time. No hidden fees or long-term contracts."
              }
            ].map((faq, idx) => (
              <details key={idx} className="group border-b border-gray-200 dark:border-white/10 pb-4">
                <summary className="flex justify-between items-center cursor-pointer list-none py-4">
                  <span className="font-semibold text-gray-900 dark:text-white">{faq.q}</span>
                  <span className="text-gray-500 dark:text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="text-gray-600 dark:text-gray-400 pb-4">{faq.a}</p>
              </details>
            ))}
          </div>
        </motion.div>

        {/* Final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          viewport={{ once: true }}
          className="text-center py-12 px-8 rounded-2xl bg-gradient-to-r from-slate-800 to-[#2d5a8e]"
        >
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to make better decisions?
          </h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">
            Join thousands of CEOs who trust our AI to guide their most important business decisions.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100" asChild>
              <a href="/signup">Start Free Trial <ArrowRight className="ml-2 w-4 h-4" /></a>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              Contact Sales
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

