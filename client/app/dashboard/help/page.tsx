"use client";

import { debugError } from "@/lib/logger";
import { useState } from "react";
import { HelpCircle, MessageCircle, Mail, Phone, Video, BookOpen, FileText, Search, Send, Sparkles, Brain, CheckCircle2, ArrowRight, Calendar } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/authStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";

const faqs = [
  { question: "How do I get started with CEOOO?", answer: "Sign up, complete onboarding (5 min), and you're ready to go! The onboarding wizard will guide you through setting up your company profile.", category: "getting-started" },
  { question: "How accurate is the AI decision making?", answer: "Our AI uses Google Gemini and achieves high accuracy, validated across thousands of business decisions. Confidence scores are shown for each analysis.", category: "ai" },
  { question: "Is my data secure?", answer: "Yes, we use industry-standard encryption and your data is stored securely in our PostgreSQL database with proper access controls.", category: "security" },
  { question: "Can I cancel anytime?", answer: "Yes, cancel anytime with no hidden fees. Your data remains available for 30 days after cancellation.", category: "billing" },
  { question: "How do I invite team members?", answer: "Go to the Team section in the dashboard and use the 'Add Member' button to invite stakeholders and collaborators.", category: "getting-started" },
  { question: "What AI features are available?", answer: "AI Decision Analysis, Daily CEO Brief, AI Insights generation, Note Summarization, and AI Scheduling Optimizer are all available.", category: "ai" },
];

const supportChannels = [
  { icon: MessageCircle, name: "Live Chat", description: "24/7 instant support", action: "Start Chat", color: "from-blue-500 to-cyan-500" },
  { icon: Mail, name: "Email Support", description: "Response within 2 hours", action: "Send Email", color: "from-purple-500 to-pink-500" },
  { icon: Phone, name: "Phone Support", description: "Available 9am-6pm EST", action: "Schedule Call", color: "from-green-500 to-emerald-500" },
  { icon: Video, name: "Video Call", description: "Premium support", action: "Request Call", color: "from-orange-500 to-red-500" },
];

const guides = [
  { title: "Quick Start Guide", readTime: "5 min", type: "guide", popular: true },
  { title: "AI Decision Making Tutorial", readTime: "12 min", type: "video", popular: true },
  { title: "Dashboard Mastery", readTime: "8 min", type: "guide" },
  { title: "API Integration Guide", readTime: "15 min", type: "document" },
];

export default function HelpSupportPage() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [faqTab, setFaqTab] = useState("all");

  const handleSubmitTicket = async () => {
    if (!ticketSubject || !ticketMessage) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      // Create a support notification in the system
      await fetch(`${API_URL}/api/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: `Support Request: ${ticketSubject}`,
          message: ticketMessage,
          type: "SYSTEM",
          priority: "MEDIUM",
        }),
      });
      setTicketSubmitted(true);
      setTicketSubject("");
      setTicketMessage("");
      setTimeout(() => setTicketSubmitted(false), 4000);
    } catch (e) {
      debugError("Failed to submit ticket:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFaqs = faqs.filter((f) => {
    const matchesTab = faqTab === "all" || f.category === faqTab;
    const matchesSearch = !searchQuery || f.question.toLowerCase().includes(searchQuery.toLowerCase()) || f.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Help & Support</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {user?.name ? `Hi ${user.name}, how can we help you today?` : "How can we help you today?"}
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search for help, guides, tutorials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 py-6 text-lg"
            />
          </div>
        </div>

        {/* AI Banner */}
        <Card className="mb-8 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Brain className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="font-semibold">AI Support Assistant</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Get instant answers powered by Gemini AI</p>
                </div>
              </div>
              <Button className="gap-2"><Sparkles className="w-4 h-4" />Ask AI Assistant</Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left — Support Channels */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader><CardTitle>Support Channels</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {supportChannels.map((ch, idx) => {
                  const Icon = ch.icon;
                  return (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${ch.color} flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{ch.name}</p>
                        <p className="text-xs text-gray-500">{ch.description}</p>
                      </div>
                      <Button variant="ghost" size="sm">{ch.action}</Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Response Times</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Live Chat", time: "< 2 minutes", color: "bg-green-100 text-green-700" },
                  { label: "Email Support", time: "< 2 hours", color: "bg-blue-100 text-blue-700" },
                  { label: "Phone Support", time: "Scheduled", color: "bg-yellow-100 text-yellow-700" },
                  { label: "Enterprise", time: "24/7 Priority", color: "bg-purple-100 text-purple-700" },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between">
                    <span className="text-sm">{r.label}</span>
                    <Badge className={r.color}>{r.time}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>System Status</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium">All Systems Operational</span>
                </div>
                <div className="space-y-2 text-sm">
                  {[["API", "99.99%"], ["Dashboard", "Operational"], ["AI Services", "Operational"]].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span>{k}</span><span className="text-green-600">{v}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right — FAQ & Contact */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Links */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: BookOpen, label: "Documentation", count: "45 articles" },
                { icon: Video, label: "Video Tutorials", count: "12 videos" },
                { icon: FileText, label: "API Docs", count: "Complete" },
                { icon: Calendar, label: "Webinars", count: "Upcoming" },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <Card key={idx} className="cursor-pointer hover:shadow-md transition-all">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/20">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-xs text-gray-500">{item.count}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* FAQ */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Frequently Asked Questions</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={faqTab} onValueChange={setFaqTab} className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
                    <TabsTrigger value="ai">AI Features</TabsTrigger>
                    <TabsTrigger value="billing">Billing</TabsTrigger>
                  </TabsList>
                  <TabsContent value={faqTab} className="space-y-3">
                    {filteredFaqs.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No FAQs match your search</p>
                    ) : filteredFaqs.map((faq, idx) => (
                      <details key={idx} className="group border-b border-gray-200 dark:border-white/10 pb-3">
                        <summary className="flex justify-between items-center cursor-pointer py-2">
                          <span className="font-medium">{faq.question}</span>
                          <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <p className="text-sm text-gray-600 dark:text-gray-400 pt-2 pb-1">{faq.answer}</p>
                      </details>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Popular Guides */}
            <Card>
              <CardHeader><CardTitle>Popular Guides & Tutorials</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {guides.map((guide, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer">
                      <div className="flex items-center gap-3">
                        {guide.type === "video" && <Video className="w-5 h-5 text-blue-500" />}
                        {guide.type === "guide" && <BookOpen className="w-5 h-5 text-green-500" />}
                        {guide.type === "document" && <FileText className="w-5 h-5 text-purple-500" />}
                        <div>
                          <p className="font-medium">{guide.title}</p>
                          <p className="text-xs text-gray-500">{guide.readTime} read</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {guide.popular && <Badge variant="outline" className="text-yellow-600">Popular</Badge>}
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Contact Form — real submission */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Support</CardTitle>
                <p className="text-sm text-gray-500">Can't find what you're looking for? Send us a message.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {ticketSubmitted && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-500/10 text-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm">Your message has been submitted! We'll respond within 2 hours.</span>
                  </div>
                )}
                <div>
                  <Label>Subject</Label>
                  <Input placeholder="Brief description of your issue" value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} />
                </div>
                <div>
                  <Label>Message</Label>
                  <Textarea rows={4} placeholder="Please provide details about your question or issue..." value={ticketMessage} onChange={(e) => setTicketMessage(e.target.value)} />
                </div>
                <div className="flex items-center gap-3">
                  <Button onClick={handleSubmitTicket} className="gap-2" disabled={!ticketSubject || !ticketMessage || submitting}>
                    <Send className="w-4 h-4" />
                    {submitting ? "Sending..." : "Send Message"}
                  </Button>
                  <p className="text-xs text-gray-500">Response within 2 hours</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
