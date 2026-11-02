"use client";
import { debugError } from "@/lib/logger";
// app/support/schedule-call/page.tsx

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Video,
  Phone,
  Users,
  Mail,
  CheckCircle2,
  ArrowLeft,
  User,
  Briefcase,
  MessageCircle,
  Zap,
  Sparkles,
  Shield,
  Star,
  CalendarDays,
  Clock3,
  Globe,
  Copy,
  Check,
  Download,
  ExternalLink,
  Loader2,
  AlertCircle,
  ChevronRight
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

// Time confirmation step. The call request is already stored by the step-1
// form, so this step never pretends to hand the visitor to a booking service
// the app does not own. It confirms the requested slot and, for Google, offers
// a real "add to calendar" link the visitor can accept in one click.
function buildGoogleCalendarUrl({
  date,
  time,
  timezone,
  name,
  email,
  duration,
}: {
  date: string;
  time: string;
  timezone: string;
  name: string;
  email: string;
  duration: number;
}) {
  const toIcs = (value: Date) => value.toISOString().replace(/[-:]/g, '').replace(/.d{3}/, '');
  const fallbackStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const start = date ? new Date(`${date}T${(time || '10:00').padStart(5, '0')}:00Z`) : fallbackStart;
  const end = new Date(start.getTime() + (duration || 30) * 60 * 1000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `CEOOO call — ${name || 'CEOOO'}`,
    dates: `${toIcs(start)}/${toIcs(end)}`,
    details: `${duration || 30}-minute call with the CEOOO team.
Requested by ${name} (${email}).
Timezone: ${timezone}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const CallScheduling = ({
  method,
  date,
  time,
  timezone,
  name,
  email,
  duration,
  reference,
  onSuccess,
}: {
  method: "calendly" | "google";
  date: string;
  time: string;
  timezone: string;
  name: string;
  email: string;
  duration: number;
  reference: string | null;
  onSuccess: () => void;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const hasSlot = Boolean(date && time);
  const slotLabel = hasSlot ? `${date} at ${time} (${timezone})` : `the next available slot (${timezone})`;
  const googleCalendarUrl = buildGoogleCalendarUrl({ date, time, timezone, name, email, duration });

  const confirm = () => {
    setIsLoading(true);
    onSuccess();
  };

  return (
    <div className="space-y-4">
      <Alert>
        {method === "calendly" ? <Calendar className="w-4 h-4" /> : <CalendarDays className="w-4 h-4" />}
        <AlertDescription>
          {method === "calendly"
            ? `We'll email a Calendly invitation for ${slotLabel} to ${email || "your inbox"}. Confirm below to lock the request in.`
            : `Your slot is ${slotLabel}. Add it to Google Calendar now, and we'll still email a confirmation to ${email || "your inbox"}.`}
        </AlertDescription>
      </Alert>

      {reference && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Request reference: <span className="font-mono font-semibold">{reference}</span>
        </p>
      )}

      {method === "google" ? (
        <div className="space-y-3">
          <a href={googleCalendarUrl} target="_blank" rel="noopener noreferrer" className="block">
            <Button className="w-full gap-2 py-6 text-lg bg-blue-600 hover:bg-blue-700">
              <CalendarDays className="w-5 h-5" />
              Add to Google Calendar
            </Button>
          </a>
          <Button variant="outline" className="w-full gap-2 py-6" onClick={confirm} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            I've added it — finish
          </Button>
        </div>
      ) : (
        <Button onClick={confirm} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 gap-2 w-full py-6 text-lg">
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calendar className="w-5 h-5" />}
          Confirm {hasSlot ? `${date} · ${time}` : "call request"}
        </Button>
      )}

      <p className="text-xs text-gray-500 text-center">
        {method === "calendly"
          ? "Powered by Calendly • calendar sync included with the invite"
          : "Opens Google Calendar with the time and details pre-filled"}
      </p>
    </div>
  );
};

const meetingTypes = [
  { id: "discovery", name: "Discovery Call", duration: 30, icon: MessageCircle, color: "from-blue-500 to-cyan-500", description: "Learn how CEOOO can help your business" },
  { id: "demo", name: "Product Demo", duration: 45, icon: Video, color: "from-purple-500 to-pink-500", description: "See CEOOO in action with live demo" },
  { id: "sales", name: "Sales Consultation", duration: 60, icon: Phone, color: "from-green-500 to-emerald-500", description: "Discuss pricing, plans, and implementation" },
  { id: "enterprise", name: "Enterprise Planning", duration: 90, icon: Users, color: "from-orange-500 to-red-500", description: "Custom solutions for large organizations" },
];

const timezoneOptions = [
  "America/Los_Angeles (PST)",
  "America/Denver (MST)",
  "America/Chicago (CST)",
  "America/New_York (EST)",
  "Europe/London (GMT)",
  "Europe/Paris (CET)",
  "Asia/Dubai (GST)",
  "Asia/Tokyo (JST)",
  "Australia/Sydney (AEST)",
];

export default function ScheduleCallPage() {
  const [step, setStep] = useState(1);
  const [schedulingMethod, setSchedulingMethod] = useState<"calendly" | "google">("calendly");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    meetingType: "discovery",
    timezone: "America/New_York (EST)",
    preferredDate: "",
    preferredTime: "10:00",
    topic: "",
    phoneNumber: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Store user info for the calendar step
    localStorage.setItem("ceo_user_name", formData.name);
    localStorage.setItem("ceo_user_email", formData.email);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";
      const response = await fetch(`${API_URL}/api/support/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "CALL",
          name: formData.name,
          email: formData.email,
          company: formData.company,
          jobTitle: formData.role,
          phone: formData.phoneNumber,
          meetingType: formData.meetingType,
          timezone: formData.timezone,
          preferredDate: formData.preferredDate || undefined,
          preferredTime: formData.preferredTime || undefined,
          message: formData.topic,
          source: "support-schedule-call",
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        throw new Error(body?.message || "Could not save your call request. Please try again.");
      }
      setReference(body.data?.reference ?? null);
      setStep(2);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedMeetingType = meetingTypes.find(m => m.id === formData.meetingType);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="min-h-screen pt-0 bg-gray-50 dark:bg-slate-900"
    >
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/support/live-chat">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Schedule a Call</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Book a time to speak with our team using Calendly or Google Calendar</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${step >= 1 ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-white/10 text-gray-500"}`}>
            1
          </div>
          <div className={`w-32 h-0.5 ${step > 1 ? "bg-blue-600" : "bg-gray-200 dark:bg-white/10"}`} />
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${step >= 2 ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-white/10 text-gray-500"}`}>
            2
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Form Area */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Tell us about yourself</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">We'll use this information to prepare for our call</p>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label>Full Name *</Label>
                            <Input
                              name="name"
                              placeholder="John Doe"
                              value={formData.name}
                              onChange={handleChange}
                              required
                            />
                          </div>
                          <div>
                            <Label>Email Address *</Label>
                            <Input
                              name="email"
                              type="email"
                              placeholder="john@company.com"
                              value={formData.email}
                              onChange={handleChange}
                              required
                            />
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label>Company</Label>
                            <Input
                              name="company"
                              placeholder="Your Company"
                              value={formData.company}
                              onChange={handleChange}
                            />
                          </div>
                          <div>
                            <Label>Job Title</Label>
                            <Input
                              name="role"
                              placeholder="CEO, Founder, etc."
                              value={formData.role}
                              onChange={handleChange}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Phone Number (Optional)</Label>
                          <Input
                            name="phoneNumber"
                            placeholder="+1 (555) 000-0000"
                            value={formData.phoneNumber}
                            onChange={handleChange}
                          />
                        </div>
                        <div>
                          <Label>Meeting Type *</Label>
                          <div className="grid grid-cols-2 gap-3 mt-2">
                            {meetingTypes.map((type) => {
                              const Icon = type.icon;
                              const isSelected = formData.meetingType === type.id;
                              return (
                                <button
                                  key={type.id}
                                  type="button"
                                  onClick={() => setFormData({ ...formData, meetingType: type.id })}
                                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                                    isSelected
                                      ? `border-blue-500 bg-blue-50 dark:bg-blue-500/10`
                                      : "border-gray-200 dark:border-white/10 hover:border-blue-300"
                                  }`}
                                >
                                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${type.color} flex items-center justify-center mb-2`}>
                                    <Icon className="w-5 h-5 text-white" />
                                  </div>
                                  <p className="font-semibold text-sm">{type.name}</p>
                                  <p className="text-xs text-gray-500">{type.duration} minutes</p>
                                  <p className="text-xs text-gray-400 mt-1">{type.description}</p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <Label>Timezone</Label>
                          <Select
                            value={formData.timezone}
                            onValueChange={(v) => setFormData({ ...formData, timezone: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {timezoneOptions.map((tz) => (
                                <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label>Preferred Date</Label>
                            <Input
                              name="preferredDate"
                              type="date"
                              min={new Date().toISOString().slice(0, 10)}
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
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"].map((slot) => (
                                  <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label>What would you like to discuss? (Optional)</Label>
                          <Textarea
                            name="topic"
                            placeholder="Share any specific topics or questions you'd like to cover..."
                            rows={3}
                            value={formData.topic}
                            onChange={handleChange}
                          />
                        </div>
                        {error && (
                          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                            {error}
                          </p>
                        )}
                        <Button
                          type="submit"
                          className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg"
                          disabled={!formData.name || !formData.email || submitting}
                        >
                          Continue to Scheduling
                          <ChevronRight className="w-5 h-5 ml-2" />
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="scheduling"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Choose Your Scheduling Method</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">Select how you'd like to schedule your call</p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Scheduling Method Tabs */}
                      <Tabs value={schedulingMethod} onValueChange={(v) => setSchedulingMethod(v as any)} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="calendly" className="py-3">
                            <Calendar className="w-4 h-4 mr-2" />
                            Calendly
                          </TabsTrigger>
                          <TabsTrigger value="google" className="py-3">
                            <CalendarDays className="w-4 h-4 mr-2" />
                            Google Calendar
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="calendly" className="mt-6">
                          <CallScheduling
                            method="calendly"
                            date={formData.preferredDate}
                            time={formData.preferredTime}
                            timezone={formData.timezone}
                            name={formData.name}
                            email={formData.email}
                            duration={selectedMeetingType?.duration ?? 30}
                            reference={reference}
                            onSuccess={() => setSubmitted(true)}
                          />
                        </TabsContent>

                        <TabsContent value="google" className="mt-6">
                          <CallScheduling
                            method="google"
                            date={formData.preferredDate}
                            time={formData.preferredTime}
                            timezone={formData.timezone}
                            name={formData.name}
                            email={formData.email}
                            duration={selectedMeetingType?.duration ?? 30}
                            reference={reference}
                            onSuccess={() => setSubmitted(true)}
                          />
                        </TabsContent>
                      </Tabs>

                      {!submitted && (
                        <div className="pt-4">
                          <Button variant="outline" onClick={() => setStep(1)} className="w-full">
                            ← Back to Information
                          </Button>
                        </div>
                      )}

                      {/* Success Message */}
                      {submitted && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-center pt-4"
                        >
                          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-10 h-10 text-green-600" />
                          </div>
                          <h3 className="text-2xl font-semibold mb-2">Call Scheduled!</h3>
                          {reference && (
                            <p className="text-sm text-gray-500 mb-2">
                              Reference: <span className="font-mono font-semibold">{reference}</span>
                            </p>
                          )}
                          <p className="text-gray-600 dark:text-gray-400 mb-4">
                            {schedulingMethod === "calendly" &&
                              `Your call request is confirmed${formData.preferredDate ? ` for ${formData.preferredDate} at ${formData.preferredTime}` : ""}. We'll email a Calendly invitation to ${formData.email} so you can finalise the time.`}
                            {schedulingMethod === "google" &&
                              `Your call request is confirmed. The Google Calendar link for ${formData.preferredDate || "the next available slot"}${formData.preferredDate ? ` at ${formData.preferredTime}` : ""} stays on this page — add it again from the tabs if you closed it.`}
                          </p>
                          <div className="flex gap-3">
                            <Button
                              variant="outline"
                              className="flex-1 gap-2"
                              onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                              }}
                            >
                              <Copy className="w-4 h-4" />
                              Copy Link
                            </Button>
                            <Button
                              className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                              onClick={() => window.location.reload()}
                            >
                              Schedule Another
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column - Info */}
          <div className="space-y-6">
            {/* Meeting Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  Meeting Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="flex-1">{formData.name || "Your Name"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="flex-1">{formData.email || "your@email.com"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">
                  <Clock3 className="w-4 h-4 text-gray-400" />
                  <span className="flex-1">{selectedMeetingType?.name} ({selectedMeetingType?.duration} min)</span>
                </div>
                <div className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <span className="flex-1">{formData.timezone}</span>
                </div>
                {formData.company && (
                  <div className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <span className="flex-1">{formData.company} • {formData.role}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* What's Included */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What's Included</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Personalized demo based on your needs</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Q&A with product experts</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Custom pricing discussion (if applicable)</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Implementation roadmap overview</span>
                </div>
              </CardContent>
            </Card>

            {/* Preparation Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-500" />
                  Preparation Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-600">1</span>
                    </div>
                    <span>Prepare your questions in advance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-600">2</span>
                    </div>
                    <span>Invite relevant team members</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-600">3</span>
                    </div>
                    <span>Test your camera and microphone</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Trust Badges */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-500/10 dark:to-purple-500/10">
              <CardContent className="p-4 text-center">
                <div className="flex justify-center gap-4 mb-3">
                  <Shield className="w-5 h-5 text-green-500" />
                  <Star className="w-5 h-5 text-yellow-500" />
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-sm font-medium">Trusted by 500+ CEOs</p>
                <p className="text-xs text-gray-500 mt-1">98% customer satisfaction rate</p>
              </CardContent>
            </Card>

            {/* Alternative Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/support/live-chat">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Live Chat Support
                  </Button>
                </Link>
                <Link href="/support/email">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Mail className="w-4 h-4" />
                    Email Support
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </motion.div>
  );
}