"use client";
// app/support/email/page.tsx

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Trash2,
  SendHorizontal,
  HelpCircle,
  Sparkles,
  Shield,
  Zap,
  Star,
  ArrowLeft,
  FileText,
  Image,
  Phone,
  X,
  MessageCircle
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
}

const categories = [
  { value: "general", label: "General Inquiry" },
  { value: "technical", label: "Technical Issue" },
  { value: "billing", label: "Billing Question" },
  { value: "feature", label: "Feature Request" },
  { value: "bug", label: "Bug Report" },
  { value: "enterprise", label: "Enterprise Sales" },
];

const priorityOptions = [
  { value: "low", label: "Low - General question" },
  { value: "medium", label: "Medium - Need assistance" },
  { value: "high", label: "High - Urgent issue" },
  { value: "critical", label: "Critical - System down" },
];

const responseTimes = {
  low: "24 hours",
  medium: "12 hours",
  high: "4 hours",
  critical: "1 hour",
};

export default function EmailSupportPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    category: "",
    priority: "medium",
    message: "",
  });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newAttachments: Attachment[] = Array.from(files).map((file, idx) => ({
        id: Date.now().toString() + idx,
        name: file.name,
        size: `${(file.size / 1024).toFixed(0)} KB`,
        type: file.type,
      }));
      setAttachments([...attachments, ...newAttachments]);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id));
  };

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
          type: "EMAIL",
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          category: formData.category,
          priority: formData.priority,
          message: formData.message,
          source: "support-email",
          metadata: { attachments: attachments.map((attachment) => attachment.name) },
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        throw new Error(body?.message || "Could not send your request. Please try again.");
      }
      setTicketId(body.data?.reference ?? "");
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="min-h-screen pt-0 bg-gray-50 dark:bg-slate-900"
    >
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/support/live-chat">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Email Support</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Send us a message and we'll get back to you within 24 hours</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Submit a Support Ticket</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Fill out the form below and our support team will assist you</p>
              </CardHeader>
              <CardContent>
                {!submitted ? (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Your Name *</Label>
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

                    <div>
                      <Label>Subject *</Label>
                      <Input
                        name="subject"
                        placeholder="Brief description of your issue"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Category *</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(v) => setFormData({ ...formData, category: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Priority *</Label>
                        <Select
                          value={formData.priority}
                          onValueChange={(v) => setFormData({ ...formData, priority: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            {priorityOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">
                          Expected response: {responseTimes[formData.priority as keyof typeof responseTimes]}
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label>Message *</Label>
                      <Textarea
                        name="message"
                        placeholder="Please describe your issue in detail..."
                        rows={6}
                        value={formData.message}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    {/* File Attachments */}
                    <div>
                      <Label>Attachments (Optional)</Label>
                      <div className="mt-2">
                        <label className="flex items-center gap-2 p-3 border-2 border-dashed border-gray-300 dark:border-white/20 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                          <Paperclip className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-500">Click to upload files (Max 10MB)</span>
                          <input
                            type="file"
                            multiple
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                      {attachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {attachments.map((file) => (
                            <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-white/5 rounded-lg">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-500" />
                                <span className="text-sm">{file.name}</span>
                                <span className="text-xs text-gray-400">({file.size})</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeAttachment(file.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {error && (
                      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                        {error}
                      </p>
                    )}
                    <Button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 gap-2 py-6"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <SendHorizontal className="w-5 h-5" />
                          Send Support Request
                        </>
                      )}
                    </Button>
                  </form>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                  >
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Ticket Submitted Successfully!</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      Your support ticket has been received.
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      Ticket ID: <span className="font-mono font-semibold">{ticketId}</span>
                    </p>
                    <p className="text-sm text-gray-500">
                      We'll send updates to <strong>{formData.email}</strong>
                    </p>
                    <Button
                      variant="outline"
                      className="mt-6"
                      onClick={() => window.location.reload()}
                    >
                      Submit Another Request
                    </Button>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Info */}
          <div className="space-y-6">
            {/* Response Times */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Response Times
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Standard (Low priority)</span>
                  <Badge variant="outline">24 hours</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Medium priority</span>
                  <Badge variant="outline">12 hours</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">High priority</span>
                  <Badge variant="outline">4 hours</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Critical priority</span>
                  <Badge className="bg-red-500">1 hour</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Alternative Support */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alternative Support Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/support/live-chat">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Live Chat (Faster Response)
                  </Button>
                </Link>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Phone className="w-4 h-4" />
                  Request Callback
                </Button>
                <Link href="/resources/downloads">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <FileText className="w-4 h-4" />
                    Browse Documentation
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Support Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Support Hours</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Monday - Friday</span>
                  <span className="font-medium">9am - 9pm EST</span>
                </div>
                <div className="flex justify-between">
                  <span>Saturday</span>
                  <span className="font-medium">10am - 6pm EST</span>
                </div>
                <div className="flex justify-between">
                  <span>Sunday</span>
                  <span className="font-medium">Emergency only</span>
                </div>
                <div className="pt-3 mt-3 border-t">
                  <p className="text-xs text-gray-500">Enterprise plans include 24/7 priority support</p>
                </div>
              </CardContent>
            </Card>

            {/* Trust Badges */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-500/10 dark:to-purple-500/10">
              <CardContent className="p-4 text-center">
                <div className="flex justify-center gap-4 mb-3">
                  <Shield className="w-5 h-5 text-green-500" />
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <Star className="w-5 h-5 text-purple-500" />
                </div>
                <p className="text-sm font-medium">Trusted by 500+ CEOs</p>
                <p className="text-xs text-gray-500 mt-1">98% customer satisfaction rate</p>
              </CardContent>
            </Card>

            {/* Email Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-green-500" />
                  Tips for Faster Resolution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Include screenshots or screen recordings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Describe steps to reproduce the issue</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Mention your account type and plan</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Check our documentation first</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </motion.div>
  );
}