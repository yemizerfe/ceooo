"use client";
// app/request-demo/page.tsx

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Users,
  Building2,
  Mail,
  Phone,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Brain,
  Shield,
  Zap,
  Star,
  Video,
  Send,
  User,
  Briefcase,
  Target,
  TrendingUp,
  Award,
  ChevronRight,
  Play,
  Headphones
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

export default function RequestDemoPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    title: "",
    companySize: "",
    preferredDate: "",
    preferredTime: "",
    useCase: "",
    hearAbout: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";
      const response = await fetch(`${API_URL}/api/support/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "DEMO",
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          jobTitle: formData.title,
          companySize: formData.companySize,
          preferredDate: formData.preferredDate || undefined,
          preferredTime: formData.preferredTime || undefined,
          message: formData.useCase,
          source: "request-demo",
          metadata: { hearAbout: formData.hearAbout },
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        throw new Error(body?.message || "We could not save your request. Please try again.");
      }
      setReference(body.data?.reference ?? null);
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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
              <Video className="w-3.5 h-3.5 mr-2" />
              Live Demo
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              See CEOOO in Action
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Schedule a personalized 30-minute demo and discover how AI can transform your decision-making
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left Column - Demo Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Schedule Your Demo</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Fill out the form and our team will reach out within 24 hours
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>First Name *</Label>
                      <Input
                        name="firstName"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div>
                      <Label>Last Name *</Label>
                      <Input
                        name="lastName"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Work Email *</Label>
                      <Input
                        name="email"
                        type="email"
                        placeholder="john@company.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div>
                      <Label>Phone Number</Label>
                      <Input
                        name="phone"
                        placeholder="+1 (555) 000-0000"
                        value={formData.phone}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Company *</Label>
                      <Input
                        name="company"
                        placeholder="Your Company"
                        value={formData.company}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div>
                      <Label>Job Title</Label>
                      <Input
                        name="title"
                        placeholder="CEO, Founder, President"
                        value={formData.title}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Company Size</Label>
                      <Select
                        value={formData.companySize}
                        onValueChange={(v) => setFormData({ ...formData, companySize: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1-10 employees</SelectItem>
                          <SelectItem value="11-50">11-50 employees</SelectItem>
                          <SelectItem value="51-200">51-200 employees</SelectItem>
                          <SelectItem value="201-500">201-500 employees</SelectItem>
                          <SelectItem value="501-1000">501-1000 employees</SelectItem>
                          <SelectItem value="1000+">1000+ employees</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>How did you hear about us?</Label>
                      <Select
                        value={formData.hearAbout}
                        onValueChange={(v) => setFormData({ ...formData, hearAbout: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="google">Google Search</SelectItem>
                          <SelectItem value="linkedin">LinkedIn</SelectItem>
                          <SelectItem value="x">X</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                          <SelectItem value="podcast">Podcast</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Preferred Date</Label>
                      <Input
                        type="date"
                        name="preferredDate"
                        value={formData.preferredDate}
                        onChange={handleChange}
                      />
                    </div>
                    <div>
                      <Label>Preferred Time</Label>
                      <Select
                        value={formData.preferredTime}
                        onValueChange={(v) => setFormData({ ...formData, preferredTime: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="9-10">9:00 AM - 10:00 AM</SelectItem>
                          <SelectItem value="10-11">10:00 AM - 11:00 AM</SelectItem>
                          <SelectItem value="11-12">11:00 AM - 12:00 PM</SelectItem>
                          <SelectItem value="13-14">1:00 PM - 2:00 PM</SelectItem>
                          <SelectItem value="14-15">2:00 PM - 3:00 PM</SelectItem>
                          <SelectItem value="15-16">3:00 PM - 4:00 PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>What would you like to see? *</Label>
                    <Textarea
                      name="useCase"
                      placeholder="Tell us about your business challenges, team size, and what you'd like to learn during the demo..."
                      rows={3}
                      value={formData.useCase}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 gap-2 py-6 text-lg"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        Scheduling...
                      </>
                    ) : submitted ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Demo requested{reference ? ` — ${reference}` : ""}
                      </>
                    ) : (
                      <>
                        Schedule Your Free Demo
                        <Calendar className="w-5 h-5" />
                      </>
                    )}
                  </Button>
                  {submitted && (
                    <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                      Your demo request is in our queue{reference ? ` (reference ${reference})` : ""}. A member of the team
                      will reply to {formData.email} with times.
                    </p>
                  )}
                  {error && (
                    <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                      {error}
                    </p>
                  )}
                  <p className="text-xs text-center text-gray-500 mt-4">
                    By submitting, you agree to our terms and privacy policy. We'll never share your information.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Demo Benefits */}
          <div className="space-y-8">
            {/* What's Included */}
            <Card className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Sparkles className="w-6 h-6 text-blue-500" />
                  Your Demo Includes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { icon: Brain, text: "30-minute personalized walkthrough", color: "from-purple-500 to-pink-500" },
                    { icon: Users, text: "Q&A with product experts", color: "from-blue-500 to-cyan-500" },
                    { icon: Target, text: "Custom use-case examples", color: "from-green-500 to-emerald-500" },
                    { icon: Shield, text: "14-day free trial access", color: "from-orange-500 to-red-500" },
                    { icon: Headphones, text: "Pricing & implementation discussion", color: "from-indigo-500 to-purple-500" },
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{item.text}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Why CEOs Choose Us */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Why CEOs Choose CEOOO
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { value: "94%", label: "AI Decision Accuracy", icon: Brain },
                  { value: "87%", label: "Time Saved on Admin", icon: Clock },
                  { value: "500+", label: "Enterprise Clients", icon: Building2 },
                  { value: "24/7", label: "Priority Support", icon: Headphones },
                ].map((stat, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                    <div className="flex items-center gap-3">
                      <stat.icon className="w-5 h-5 text-blue-500" />
                      <span className="font-semibold text-2xl">{stat.value}</span>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Demo Preview */}
            <Card className="bg-gray-900 text-white overflow-hidden">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20" />
                <CardContent className="p-6 text-center relative">
                  <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                    <Play className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Watch Demo Preview</h3>
                  <p className="text-gray-300 text-sm mb-4">See CEOOO in 2 minutes</p>
                  <Button variant="outline" className="border-white text-white hover:bg-white/10">
                    Watch Now
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </div>
            </Card>

            {/* FAQ */}
            <div>
              <h3 className="font-semibold mb-4">Frequently Asked Questions</h3>
              <div className="space-y-3">
                {[
                  { q: "How long is the demo?", a: "30 minutes, customizable to your needs" },
                  { q: "Can I bring my team?", a: "Absolutely! Invite your leadership team" },
                  { q: "Is there a free trial?", a: "Yes, 14-day trial after the demo" },
                ].map((faq, idx) => (
                  <details key={idx} className="group">
                    <summary className="flex items-center justify-between cursor-pointer py-2 text-sm font-medium">
                      {faq.q}
                      <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
                    </summary>
                    <p className="text-sm text-gray-600 dark:text-gray-400 pt-1 pb-2">{faq.a}</p>
                  </details>
                ))}
              </div>
            </div>

            {/* Trust Badges */}
            <div className="pt-4 text-center">
              <p className="text-xs text-gray-500 mb-3">Trusted by leading companies</p>
              <div className="flex justify-center gap-6 flex-wrap opacity-60">
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">TechVision</span>
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">GlobalSoft</span>
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">InnovateCorp</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}