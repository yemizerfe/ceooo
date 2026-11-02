"use client";
// app/faq/page.tsx

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { 
  HelpCircle, 
  Search, 
  MessageCircle, 
  Mail, 
  Phone,
  ChevronRight,
  Sparkles,
  Brain,
  Users,
  Shield,
  DollarSign,
  Calendar,
  Target,
  Clock,
  CheckCircle2,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const faqCategories = [
  {
    id: "all",
    name: "All Questions",
    icon: HelpCircle,
    color: "from-gray-500 to-gray-600"
  },
  {
    id: "getting-started",
    name: "Getting Started",
    icon: Sparkles,
    color: "from-blue-500 to-cyan-500",
    questions: [
      {
        q: "How do I get started with CEOOO?",
        a: "Getting started is easy! Sign up for a free trial, complete your onboarding wizard (5 minutes), connect your calendar and email, and you're ready to go. Our AI will start learning your preferences immediately.",
        helpful: 234
      },
      {
        q: "What's the onboarding process like?",
        a: "Onboarding includes: 1) Account setup, 2) Team member invitations, 3) Integration connections (calendar, email, CRM), 4) AI training session, 5) First dashboard review. Most CEOs complete it in under 15 minutes.",
        helpful: 189
      },
      {
        q: "Is there a free trial?",
        a: "Yes! We offer a 14-day free trial with full access to all features. No credit card required to start. You can cancel anytime during the trial period.",
        helpful: 456
      },
      {
        q: "Can I switch plans later?",
        a: "Absolutely! You can upgrade or downgrade your plan at any time. Changes are reflected in your next billing cycle. No penalties or hidden fees.",
        helpful: 167
      }
    ]
  },
  {
    id: "ai-decision",
    name: "AI & Decision Making",
    icon: Brain,
    color: "from-purple-500 to-pink-500",
    questions: [
      {
        q: "How accurate is the AI decision making?",
        a: "Our AI models achieve 94% accuracy in predictive analytics, validated by thousands of business decisions across various industries. The accuracy improves over time as the AI learns from your specific business context and historical decisions.",
        helpful: 567
      },
      {
        q: "Can I customize the AI for my industry?",
        a: "Absolutely! The AI can be trained on your industry-specific data, KPIs, and decision-making patterns. Enterprise plans include custom AI training with your proprietary data.",
        helpful: 234
      },
      {
        q: "How does the AI protect my data?",
        a: "We use bank-level 256-bit encryption. Your data is never used to train models for other customers. We're SOC 2 Type II compliant, GDPR ready, and offer on-premise deployment for enterprise clients.",
        helpful: 678
      },
      {
        q: "What types of decisions can the AI help with?",
        a: "The AI assists with strategic decisions like market expansion, product launches, resource allocation, pricing optimization, hiring decisions, investment opportunities, and risk assessment. It analyzes both quantitative and qualitative factors.",
        helpful: 345
      }
    ]
  },
  {
    id: "integrations",
    name: "Integrations",
    icon: Users,
    color: "from-green-500 to-emerald-500",
    questions: [
      {
        q: "What tools does CEOOO integrate with?",
        a: "We integrate with 50+ tools including Google Calendar, Outlook, Slack, Salesforce, HubSpot, Zoom, Asana, Trello, Monday.com, Jira, and many more. API access is available for custom integrations.",
        helpful: 456
      },
      {
        q: "Can I connect multiple calendars?",
        a: "Yes! You can connect personal and work calendars from different providers. Our AI automatically syncs events, resolves conflicts, and suggests optimal meeting times across all calendars.",
        helpful: 289
      },
      {
        q: "How long does integration setup take?",
        a: "Most integrations take less than 2 minutes to set up. Simply click 'Connect', authorize access, and the integration is ready. No technical expertise required.",
        helpful: 178
      }
    ]
  },
  {
    id: "billing",
    name: "Billing & Support",
    icon: Shield,
    color: "from-orange-500 to-red-500",
    questions: [
      {
        q: "Can I cancel anytime?",
        a: "Yes, you can cancel your subscription at any time from your account settings. No hidden fees or long-term contracts. Your data will be available for export for 30 days after cancellation.",
        helpful: 567
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers for Enterprise plans. Invoices are available upon request.",
        helpful: 234
      },
      {
        q: "What support options are available?",
        a: "All plans include email support with 24-hour response. Professional plans include 24/7 priority chat support. Enterprise plans include a dedicated account manager, phone support, and SLA guarantee.",
        helpful: 345
      }
    ]
  },
  {
    id: "features",
    name: "Features",
    icon: Target,
    color: "from-yellow-500 to-orange-500",
    questions: [
      {
        q: "Can I use CEOOO on mobile?",
        a: "Yes! We have responsive web design that works on all devices, plus native mobile apps for iOS and Android coming soon. You can access all features from your phone or tablet.",
        helpful: 456
      },
      {
        q: "Is there a team limit?",
        a: "Starter plan includes up to 5 team members. Professional and Enterprise plans offer unlimited team members with advanced permission controls.",
        helpful: 189
      },
      {
        q: "How often is data updated?",
        a: "Data syncs in real-time for most integrations. Dashboards refresh every 5 minutes by default, but you can manually refresh anytime. AI insights update as new data becomes available.",
        helpful: 278
      }
    ]
  }
];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const getFilteredFAQs = () => {
    const allQuestions = faqCategories
      .filter(cat => cat.id !== "all" && cat.questions)
      .flatMap(cat => (cat.questions || []).map(q => ({ ...q, category: cat.name, categoryId: cat.id })));

    if (activeCategory === "all") return allQuestions;
    return allQuestions.filter(q => q.categoryId === activeCategory);
  };

  const filteredFAQs = getFilteredFAQs().filter(faq =>
    faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <HelpCircle className="w-3.5 h-3.5 mr-2" />
              Frequently Asked Questions
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              How can we help you?
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
              Find answers to common questions about CEOOO
            </p>
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search for answers..."
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
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Categories */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 px-3">Categories</h3>
              {faqCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                      activeCategory === category.id
                        ? `bg-gradient-to-r ${category.color} text-white shadow-md`
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm flex-1 text-left">{category.name}</span>
                    {category.id !== "all" && (
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* FAQ Content */}
          <div className="lg:col-span-3">
            {searchQuery && (
              <div className="mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Found {filteredFAQs.length} results for "{searchQuery}"
                </p>
              </div>
            )}

            {filteredFAQs.length > 0 ? (
              <div className="space-y-4">
                {filteredFAQs.map((faq, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="border border-gray-200 dark:border-white/10 hover:shadow-md transition-shadow">
                      <CardContent className="p-0">
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value={`item-${idx}`} className="border-0">
                            <AccordionTrigger className="px-6 py-4 hover:no-underline">
                              <div className="flex items-start gap-3 text-left">
                                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-slate-300" />
                                </div>
                                <div>
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {faq.q}
                                  </span>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-[10px]">
                                      {faq.category}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-4">
                              <div className="pl-9">
                                <p className="text-gray-600 dark:text-gray-400 mb-3">
                                  {faq.a}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <ThumbsUp className="w-3 h-3" />
                                    <span>{faq.helpful} found helpful</span>
                                  </div>
                                  <button className="hover:text-blue-600 transition-colors">
                                    Was this helpful?
                                  </button>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No results found
                </h3>
                <p className="text-gray-500">
                  Try different keywords or browse our categories
                </p>
              </div>
            )}

            {/* Still Need Help */}
            <Alert className="mt-8 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-slate-700">
              <MessageCircle className="w-4 h-4 text-blue-500" />
              <AlertDescription className="flex items-center justify-between flex-wrap gap-4">
                <span className="text-gray-700 dark:text-gray-300">Still have questions? We're here to help!</span>
                <div className="flex gap-3">
                  <Button size="sm" variant="outline" className="border-blue-300 text-blue-600" asChild>
                    <Link href="/support/email">
                      <Mail className="w-4 h-4 mr-2" />
                      Email Support
                    </Link>
                  </Button>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700" asChild>
                    <Link href="/support/live-chat">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Live Chat
                    </Link>
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-12 p-8 rounded-2xl bg-gradient-to-r from-gray-100 to-gray-200 dark:from-white/5 dark:to-white/10 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Can't find what you're looking for?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-xl mx-auto">
            Our support team is available 24/7 to help you with any questions.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button className="bg-blue-600 hover:bg-blue-700" asChild>
              <Link href="/support/live-chat">
                <MessageCircle className="w-4 h-4 mr-2" />
                Start Live Chat
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/support/email">
                <Mail className="w-4 h-4 mr-2" />
                Email Support
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/support/schedule-call">
                <Phone className="w-4 h-4 mr-2" />
                Schedule Call
              </Link>
            </Button>
          </div>
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>24/7 Support</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              <span>Avg response: &lt; 2min</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-500" />
              <span>4.9/5 Rating</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
const ThumbsUp = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
  </svg>
);
