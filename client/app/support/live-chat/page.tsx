"use client";
// app/support/live-chat/page.tsx

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Send,
  Bot,
  User,
  Headphones,
  Sparkles,
  Clock,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  Copy,
  FileText,
  Volume2,
  RefreshCw,
  Phone,
  Mail,
  ExternalLink,
  Minimize2,
  Maximize2,
  X,
  Paperclip,
  Smile,
  Mic,
  MoreHorizontal,
  Shield,
  Zap,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface Message {
  id: string;
  type: "user" | "ai" | "human";
  content: string;
  timestamp: Date;
  status?: "sent" | "delivered" | "read";
  attachments?: string[];
}

const suggestedQuestions = [
  "How do I get started with CEOOO?",
  "How accurate is the AI decision making?",
  "Can I integrate with my existing tools?",
  "What's the pricing for enterprise plans?",
  "How do I invite team members?",
  "Is my data secure?",
];

export default function LiveChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "ai",
      content: "Hello! I'm your AI assistant. How can I help you today? You can ask me anything about CEOOO, or click the 'Talk to Human' button to speak with our support team.",
      timestamp: new Date(),
      status: "read",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isHumanMode, setIsHumanMode] = useState(false);
  const [isHumanAvailable, setIsHumanAvailable] = useState(true);
  const [handoffEmail, setHandoffEmail] = useState("");
  const [handoffStatus, setHandoffStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [handoffReference, setHandoffReference] = useState<string | null>(null);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Get an AI answer. The support endpoint uses Gemini when a key is configured
  // and falls back to grounded product answers otherwise.
  const getAIResponse = async (userMessage: string) => {
    setIsTyping(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";
      const history = messages
        .filter((message) => message.type !== "user" || message.content !== userMessage)
        .slice(-8)
        .map((message) => ({
          role: message.type === "user" ? "user" : "assistant",
          content: message.content,
        }));
      const res = await fetch(`${API_URL}/api/support/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, history }),
      });
      const data = await res.json();
      const response = data.success && data.data?.message
        ? data.data.message
        : "I'm here to help with questions about CEOOO. How can I assist you?";

      const newMessage: Message = {
        id: Date.now().toString(),
        type: isHumanMode ? "human" : "ai",
        content: response,
        timestamp: new Date(),
        status: "read",
      };

      setMessages(prev => [...prev, newMessage]);
    } catch (error) {
      const newMessage: Message = {
        id: Date.now().toString(),
        type: "ai",
        content: "I'm having trouble connecting right now. You can browse our documentation or try again in a moment.",
        timestamp: new Date(),
        status: "read",
      };
      setMessages(prev => [...prev, newMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputMessage,
      timestamp: new Date(),
      status: "sent",
    };
    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputMessage;
    setInputMessage("");

    // Get response
    await getAIResponse(messageToSend);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const submitHandoff = async () => {
    if (!handoffEmail.trim()) return;
    setHandoffStatus("sending");
    setHandoffError(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";
      const transcript = messages
        .map((message) => `${message.type === "user" ? "Visitor" : "Assistant"}: ${message.content}`)
        .join("\n");
      const response = await fetch(`${API_URL}/api/support/handoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: handoffEmail.trim(), message: transcript, name: "Live chat visitor" }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        throw new Error(body?.message || "Could not send the transcript. Please try again.");
      }
      setHandoffReference(body.data?.reference ?? null);
      setHandoffStatus("sent");
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: "human",
          content: `Transcript sent to support${body.data?.reference ? ` (reference ${body.data.reference})` : ""}. A teammate will reply to ${handoffEmail.trim()} during support hours.`,
          timestamp: new Date(),
          status: "read",
        },
      ]);
    } catch (error) {
      setHandoffStatus("error");
      setHandoffError(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  const toggleHumanMode = () => {
    if (!isHumanMode && isHumanAvailable) {
      setIsHumanMode(true);
      // Honest handoff: the transcript is emailed to the support team instead of
      // pretending an agent is already in the room.
      const systemMessage: Message = {
        id: Date.now().toString(),
        type: "ai",
        content: "To reach a person, leave the email address we should reply to and I'll send the whole conversation to the support team. Replies arrive by email during support hours.",
        timestamp: new Date(),
        status: "read",
      };
      setMessages(prev => [...prev, systemMessage]);
    } else if (isHumanMode) {
      setIsHumanMode(false);
      const systemMessage: Message = {
        id: Date.now().toString(),
        type: "ai",
        content: "You've switched back to AI assistant mode. How can I help you?",
        timestamp: new Date(),
        status: "read",
      };
      setMessages(prev => [...prev, systemMessage]);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Live Chat Support</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Get instant help from our AI assistant or connect with a human agent</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Chat Interface */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col">
              {/* Chat Header */}
              <CardHeader className="border-b flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                        {isHumanMode ? <Headphones className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                      </div>
                      {!isHumanMode && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />}
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {isHumanMode ? "Human Support" : "AI Assistant"}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {isHumanMode 
                          ? isHumanAvailable ? "Agent available" : "Queue position: 1" 
                          : "Online • Ready to help"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="human-mode" className="text-sm">
                        {isHumanMode ? "Human Mode" : "AI Mode"}
                      </Label>
                      <Switch
                        id="human-mode"
                        checked={isHumanMode}
                        onCheckedChange={toggleHumanMode}
                        disabled={!isHumanAvailable}
                      />
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Minimize2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {/* Messages Area */}
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`flex gap-3 max-w-[80%] ${message.type === "user" ? "flex-row-reverse" : ""}`}>
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          {message.type === "user" && (
                            <AvatarFallback className="bg-blue-600 text-white">U</AvatarFallback>
                          )}
                          {message.type === "ai" && (
                            <AvatarFallback className="bg-purple-600 text-white">AI</AvatarFallback>
                          )}
                          {message.type === "human" && (
                            <AvatarFallback className="bg-green-600 text-white">H</AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <div className={`rounded-lg p-3 ${
                            message.type === "user" 
                              ? "bg-blue-600 text-white" 
                              : message.type === "ai"
                              ? "bg-purple-100 dark:bg-purple-500/20 text-gray-900 dark:text-white"
                              : "bg-green-100 dark:bg-green-500/20 text-gray-900 dark:text-white"
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                            <span>{formatTime(message.timestamp)}</span>
                            {message.type === "user" && message.status === "sent" && <CheckCircle2 className="w-3 h-3" />}
                            {message.type === "user" && message.status === "delivered" && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-purple-600 text-white">AI</AvatarFallback>
                      </Avatar>
                      <div className="bg-purple-100 dark:bg-purple-500/20 rounded-lg p-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </CardContent>

              {/* Human handoff */}
              {isHumanMode && handoffStatus !== "sent" && (
                <div className="border-t bg-blue-50/60 p-4 dark:bg-blue-500/5">
                  <p className="mb-2 text-sm font-medium text-gray-900 dark:text-slate-100">
                    Send this conversation to the support team
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      value={handoffEmail}
                      onChange={(event) => setHandoffEmail(event.target.value)}
                      placeholder="you@company.com"
                      className="flex-1"
                    />
                    <Button
                      onClick={submitHandoff}
                      disabled={handoffStatus === "sending" || !handoffEmail.trim()}
                    >
                      {handoffStatus === "sending" ? "Sending…" : "Send transcript"}
                    </Button>
                  </div>
                  {handoffError && (
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">{handoffError}</p>
                  )}
                </div>
              )}
              {isHumanMode && handoffStatus === "sent" && handoffReference && (
                <p className="border-t bg-emerald-50 px-4 py-2 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  Transcript delivered — reference {handoffReference}. Replies go to {handoffEmail}.
                </p>
              )}

              {/* Input Area */}
              <div className="p-4 border-t flex-shrink-0">
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="flex-shrink-0">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Input
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={isHumanMode ? "Add anything else for the team…" : "Ask me anything about CEOOO..."}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} className="bg-blue-600 hover:bg-blue-700 flex-shrink-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  {isHumanMode
                    ? "Your transcript is emailed to the support team, which replies by email."
                    : "AI responds instantly • Switch on Human Mode to reach the team"}
                </p>
              </div>
            </Card>
          </div>

          {/* Right Column - Info & Quick Actions */}
          <div className="space-y-6">
            {/* Support Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Support Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-purple-500" />
                    <span className="text-sm">AI Assistant</span>
                  </div>
                  <Badge className="bg-green-500">Available 24/7</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Headphones className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Human Support</span>
                  </div>
                  <Badge className={isHumanAvailable ? "bg-green-500" : "bg-yellow-500"}>
                    {isHumanAvailable ? "Available" : "Busy"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">Avg Response</span>
                  </div>
                  <span className="text-sm font-medium">&lt; 2 minutes</span>
                </div>
              </CardContent>
            </Card>

            {/* Suggested Questions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  Suggested Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {suggestedQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputMessage(question);
                        inputRef.current?.focus();
                      }}
                      className="w-full text-left p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-sm transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Phone className="w-4 h-4" />
                  Request Callback
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" asChild>
                  <a href="/support/email">
                    <Mail className="w-4 h-4" />
                    Send Email
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <FileText className="w-4 h-4" />
                  View Documentation
                </Button>
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
                <p className="text-sm font-medium">Rated 4.9/5 by 500+ CEOs</p>
                <p className="text-xs text-gray-500 mt-1">24/7 support • Enterprise SLA available</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </motion.div>
  );
}