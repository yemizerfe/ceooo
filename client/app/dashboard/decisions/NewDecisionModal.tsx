"use client";

import { debugError } from "@/lib/logger";
import { useState } from "react";
import { useDecisionStore } from "@/store/decisionStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, GitBranch, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface NewDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function NewDecisionModal({ isOpen, onClose, onSuccess }: NewDecisionModalProps) {
  // Fix: Change addDecision to createDecision
  const { createDecision } = useDecisionStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [impact, setImpact] = useState<"high" | "medium" | "low">("medium");
  const [status, setStatus] = useState<"pending" | "in-progress" | "decided" | "executing" | "cancelled">("pending");
  const [deadline, setDeadline] = useState("");
  const [owner, setOwner] = useState("");
  const [category, setCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});

  const validateForm = () => {
    const newErrors: { title?: string; description?: string } = {};
    
    if (!title.trim()) {
      newErrors.title = "Decision title is required";
    }
    
    if (!description.trim()) {
      newErrors.description = "Description is required for AI analysis";
    } else if (description.trim().length < 20) {
      newErrors.description = "Description must be at least 20 characters for AI analysis";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setImpact("medium");
    setStatus("pending");
    setDeadline("");
    setOwner("");
    setCategory("");
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      const extendedData = {
        category: category || null,
        owner: owner || null,
        thoughts: "",
        problemStatement: "",
        desiredOutcome: "",
        constraints: "",
        successMetrics: "",
        budgetLimit: "",
        teamSize: "",
        options: [],
        risks: [],
        swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
        comments: [],
        decisionHistory: [{ 
          date: new Date().toISOString().split('T')[0], 
          action: "Decision Created", 
          user: "CEO", 
          details: "Initial decision entry" 
        }],
        aiRecommendation: null,
      };
      
      // Fix: Use createDecision instead of addDecision
      await createDecision({
        title: title.trim(),
        description: description.trim(),
        status: (status === 'in-progress' ? 'in_progress' : status) as any,
        priority: priority.toLowerCase() as "high" | "medium" | "low",
        impact: impact.toLowerCase() as "high" | "medium" | "low",
        deadline: deadline || undefined,
        notes: JSON.stringify(extendedData),
      });
      
      resetForm();
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      debugError("Failed to create decision:", error);
      setErrors({ title: "Failed to create decision. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-900 z-10 flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                  <GitBranch className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    New Decision
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Create a new decision for AI-powered analysis
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-5" onKeyDown={handleKeyDown}>
              {/* Title - Required */}
              <div>
                <Label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Decision Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  autoFocus
                  placeholder="e.g., Should we expand to the European market?"
                  value={title}
                  onChange={e => {
                    setTitle(e.target.value);
                    if (errors.title) setErrors({ ...errors, title: undefined });
                  }}
                  className={`mt-1.5 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 ${errors.title ? 'border-red-500' : ''}`}
                />
                {errors.title && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.title}
                  </p>
                )}
              </div>

              {/* Description - Required for AI */}
              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 ml-2">(Required for AI analysis - minimum 20 characters)</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Provide a detailed description of your decision. Include context, background, key considerations, and desired outcomes. This will help our AI provide better insights..."
                  value={description}
                  onChange={e => {
                    setDescription(e.target.value);
                    if (errors.description) setErrors({ ...errors, description: undefined });
                  }}
                  rows={4}
                  className={`mt-1.5 border-gray-300 dark:border-gray-600 resize-none ${errors.description ? 'border-red-500' : ''}`}
                />
                {errors.description && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.description}
                  </p>
                )}
                {description && !errors.description && (
                  <p className="text-xs text-green-500 mt-1">
                    ✓ {description.length}/20+ characters
                  </p>
                )}
              </div>

              {/* Category, Priority, Impact, Status Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Category
                  </Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="border-gray-300 dark:border-gray-600">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="market-expansion">Market Expansion</SelectItem>
                      <SelectItem value="product-launch">Product Launch</SelectItem>
                      <SelectItem value="hiring">Hiring</SelectItem>
                      <SelectItem value="investment">Investment</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Priority
                  </Label>
                  <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                    <SelectTrigger className="border-gray-300 dark:border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          High Priority
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          Medium Priority
                        </div>
                      </SelectItem>
                      <SelectItem value="low">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          Low Priority
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Impact
                  </Label>
                  <Select value={impact} onValueChange={(v: any) => setImpact(v)}>
                    <SelectTrigger className="border-gray-300 dark:border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          High Impact
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          Medium Impact
                        </div>
                      </SelectItem>
                      <SelectItem value="low">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          Low Impact
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Status
                  </Label>
                  <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                    <SelectTrigger className="border-gray-300 dark:border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="decided">Decided</SelectItem>
                      <SelectItem value="executing">Executing</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Deadline and Owner Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="deadline" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Deadline
                  </Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="border-gray-300 dark:border-gray-600"
                  />
                </div>
                <div>
                  <Label htmlFor="owner" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Owner
                  </Label>
                  <Input
                    id="owner"
                    placeholder="Assign owner (e.g., John Doe)"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    className="border-gray-300 dark:border-gray-600"
                  />
                </div>
              </div>

              {/* AI Requirement Notice */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-slate-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>A detailed description is required for AI-powered analysis. The AI will generate insights, recommendations, risk assessment, and SWOT analysis based on your description.</span>
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-slate-900 flex gap-3 p-6 border-t border-gray-200 dark:border-white/10">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!title.trim() || !description.trim() || description.trim().length < 20 || isSubmitting}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <GitBranch className="w-4 h-4 mr-2" />
                    Create Decision
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}