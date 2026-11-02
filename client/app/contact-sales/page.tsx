"use client";
// app/contact-sales/page.tsx

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Brain,
  Shield,
  Zap,
  Star,
  MessageCircle,
  Send,
  User,
  Briefcase,
  DollarSign,
  Target,
  TrendingUp,
  Award,
  Heart,
  Globe,
  Clock,
  Headphones,
  FileText,
  Users,
  Calendar,
  CreditCard,
  Settings
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";

export default function ContactSalesPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    title: "",
    companySize: "",
    annualRevenue: "",
    teamSize: "",
    currentTools: "",
    useCase: "",
    timeline: "",
    budget: "",
    contactMethod: "email",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    // Enterprise inquiries land in the same support inbox as every other
    // footer form, so sales sees one queue instead of a second mailbox.
    const name = [formData.firstName, formData.lastName].filter(Boolean).join(" ").trim();
    const details = [
      formData.title && `Title: ${formData.title}`,
      formData.companySize && `Company size: ${formData.companySize}`,
      formData.annualRevenue && `Annual revenue: ${formData.annualRevenue}`,
      formData.teamSize && `Team size: ${formData.teamSize}`,
      formData.currentTools && `Current tools: ${formData.currentTools}`,
      formData.useCase && `Use case: ${formData.useCase}`,
      formData.timeline && `Timeline: ${formData.timeline}`,
      formData.budget && `Budget: ${formData.budget}`,
      `Preferred contact: ${formData.contactMethod}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const response = await fetch(`${API_URL}/api/support/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "EMAIL",
          name,
          email: formData.email,
          company: formData.company,
          phone: formData.phone,
          jobTitle: formData.title,
          companySize: formData.companySize,
          subject: `Enterprise sales inquiry — ${formData.company || name}`,
          category: "sales",
          priority: "high",
          message: details || "Enterprise sales inquiry submitted from the contact-sales page.",
          source: "contact-sales",
        }),
      });

      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        throw new Error(body?.message || "We couldn't send your inquiry. Please try again.");
      }

      setReference(body.data?.reference || body.data?.id || "");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't send your inquiry. Please try again.");
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
              <MessageCircle className="w-3.5 h-3.5 mr-2" />
              Enterprise Sales
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              Talk to Our Sales Team
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Get custom pricing, enterprise solutions, and dedicated support for your organization
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left Column - Sales Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Enterprise Inquiry</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Fill out the form and a sales representative will contact you within 24 hours
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
                      <Label>Job Title *</Label>
                      <Input
                        name="title"
                        placeholder="CEO, President, VP"
                        value={formData.title}
                        onChange={handleChange}
                        required
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
                          <SelectItem value="1-50">1-50 employees</SelectItem>
                          <SelectItem value="51-200">51-200 employees</SelectItem>
                          <SelectItem value="201-500">201-500 employees</SelectItem>
                          <SelectItem value="501-1000">501-1000 employees</SelectItem>
                          <SelectItem value="1000+">1000+ employees</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Annual Revenue</Label>
                      <Select
                        value={formData.annualRevenue}
                        onValueChange={(v) => setFormData({ ...formData, annualRevenue: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="<1M">Less than $1M</SelectItem>
                          <SelectItem value="1M-10M">$1M - $10M</SelectItem>
                          <SelectItem value="10M-50M">$10M - $50M</SelectItem>
                          <SelectItem value="50M-100M">$50M - $100M</SelectItem>
                          <SelectItem value="100M+">$100M+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Team Size for CEOOO</Label>
                    <Select
                      value={formData.teamSize}
                      onValueChange={(v) => setFormData({ ...formData, teamSize: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="How many users?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1-10 users</SelectItem>
                        <SelectItem value="11-25">11-25 users</SelectItem>
                        <SelectItem value="26-50">26-50 users</SelectItem>
                        <SelectItem value="51-100">51-100 users</SelectItem>
                        <SelectItem value="100+">100+ users</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Current Tools & Platforms</Label>
                    <Textarea
                      name="currentTools"
                      placeholder="e.g., Salesforce, Asana, Google Workspace, Slack, Zoom..."
                      rows={2}
                      value={formData.currentTools}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Label>Tell us about your needs *</Label>
                    <Textarea
                      name="useCase"
                      placeholder="What challenges are you looking to solve? What features are most important to you?"
                      rows={3}
                      value={formData.useCase}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Implementation Timeline</Label>
                      <Select
                        value={formData.timeline}
                        onValueChange={(v) => setFormData({ ...formData, timeline: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select timeline" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate (ASAP)</SelectItem>
                          <SelectItem value="1month">Within 1 month</SelectItem>
                          <SelectItem value="3months">1-3 months</SelectItem>
                          <SelectItem value="6months">3-6 months</SelectItem>
                          <SelectItem value="planning">Just exploring</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Budget Range (Optional)</Label>
                      <Select
                        value={formData.budget}
                        onValueChange={(v) => setFormData({ ...formData, budget: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="<5k">Less than $5k/year</SelectItem>
                          <SelectItem value="5k-15k">$5k - $15k/year</SelectItem>
                          <SelectItem value="15k-30k">$15k - $30k/year</SelectItem>
                          <SelectItem value="30k-50k">$30k - $50k/year</SelectItem>
                          <SelectItem value="50k+">$50k+/year</SelectItem>
                          <SelectItem value="custom">Need custom quote</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Preferred Contact Method</Label>
                    <RadioGroup
                      value={formData.contactMethod}
                      onValueChange={(v:any) => setFormData({ ...formData, contactMethod: v })}
                      className="flex gap-6 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="email" id="email" />
                        <Label htmlFor="email">Email</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="phone" id="phone" />
                        <Label htmlFor="phone">Phone</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="both" id="both" />
                        <Label htmlFor="both">Both</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 gap-2 py-6 text-lg"
                    disabled={submitting || submitted}
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        Submitting...
                      </>
                    ) : submitted ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Message Sent! We'll contact you soon.
                      </>
                    ) : (
                      <>
                        Contact Sales Team
                        <Send className="w-5 h-5" />
                      </>
                    )}
                  </Button>
                  {error && (
                    <p className="text-sm text-red-600 dark:text-red-400 text-center" role="alert">
                      {error}
                    </p>
                  )}
                  {submitted && reference && (
                    <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                      Reference: <span className="font-mono font-semibold">{reference}</span>
                    </p>
                  )}
                  <p className="text-xs text-center text-gray-500 mt-4">
                    By submitting, you agree to our terms and privacy policy. A sales representative will reach out within 24 hours.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Enterprise Benefits */}
          <div className="space-y-8">
            {/* Why Enterprise */}
            <Card className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Sparkles className="w-6 h-6 text-blue-500" />
                  Enterprise Benefits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { icon: Shield, text: "Custom AI training on your data", color: "from-purple-500 to-pink-500" },
                    { icon: Headphones, text: "Dedicated account manager", color: "from-blue-500 to-cyan-500" },
                    { icon: Clock, text: "99.9% SLA guarantee", color: "from-green-500 to-emerald-500" },
                    { icon: Shield, text: "SOC 2 & GDPR compliant", color: "from-orange-500 to-red-500" },
                    { icon: Users, text: "Unlimited team members", color: "from-indigo-500 to-purple-500" },
                    { icon: Settings, text: "Custom integrations & API access", color: "from-pink-500 to-rose-500" },
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

            {/* Direct Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Direct Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email Us</p>
                    <a href="mailto:sales@ceooo.com" className="text-blue-600 hover:underline">
                      sales@ceooo.com
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                    <Phone className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Call Us</p>
                    <a href="tel:+15551234567" className="text-green-600 hover:underline">
                      +1 (555) 123-4567
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">
                  <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Schedule a Call</p>
                    <p className="text-sm text-gray-500">Book time with our sales team</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enterprise Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">500+</div>
                  <div className="text-xs text-gray-500">Enterprise Clients</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">98%</div>
                  <div className="text-xs text-gray-500">Customer Retention</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">24/7</div>
                  <div className="text-xs text-gray-500">Premium Support</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">99.9%</div>
                  <div className="text-xs text-gray-500">Uptime SLA</div>
                </CardContent>
              </Card>
            </div>

            {/* Enterprise Features */}
            <Card>
              <CardHeader>
                <CardTitle>Enterprise Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <span>Custom AI Training</span>
                    <Badge>Available</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span>On-premise Deployment</span>
                    <Badge>Available</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span>SSO & SAML</span>
                    <Badge>Available</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span>Audit Logs</span>
                    <Badge>Available</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Office Hours */}
            <div className="text-center text-sm text-gray-500">
              <p>Sales Hours: Monday-Friday, 9am - 6pm EST</p>
              <p className="mt-1">Emergency support available 24/7 for enterprise clients</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}