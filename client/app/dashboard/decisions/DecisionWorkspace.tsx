"use client";

import { debugError } from "@/lib/logger";
import { useState, useEffect, useCallback } from "react";
import { Decision, useDecisionStore } from "@/store/decisionStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Save, Sparkles, AlertCircle, Clock, Target, Loader2, 
  Users, Shield, GitBranch, 
  ThumbsUp, ThumbsDown, History, Brain, PieChart, Activity, Database,
  PenLine, X, CheckCircle2, TrendingUp, TrendingDown, Lightbulb
} from "lucide-react";

interface DecisionWorkspaceProps {
  currentDecision: Decision | undefined;
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
}

// AI Insight types
interface AIInsight {
  id: string;
  type: "recommendation" | "risk" | "opportunity" | "analysis" | "decision";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  action?: string;
  confidence: number;
}

export function DecisionWorkspace({ currentDecision, onError, onSuccess }: DecisionWorkspaceProps) {
  const { updateDecision } = useDecisionStore();
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [impact, setImpact] = useState<"high" | "medium" | "low">("medium");
  const [status, setStatus] = useState<"pending" | "in-progress" | "in_progress" | "decided" | "executing" | "cancelled">("pending");
  const [deadline, setDeadline] = useState("");
  const [owner, setOwner] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showToast, setShowToast] = useState<{ message: string; type: string } | null>(null);
  
  // Thought Writing Area
  const [thoughts, setThoughts] = useState("");
  
  // Problem/Goal section
  const [problemStatement, setProblemStatement] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [constraints, setConstraints] = useState("");
  const [successMetrics, setSuccessMetrics] = useState("");
  const [budgetLimit, setBudgetLimit] = useState("");
  const [teamSize, setTeamSize] = useState("");
  
  // AI Insights state
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null);
  
  // Options comparison
  const [options, setOptions] = useState<any[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  
  // Risk analysis
  const [risks, setRisks] = useState<any[]>([]);
  
  // SWOT Analysis
  const [swot, setSwot] = useState({
    strengths: [] as string[],
    weaknesses: [] as string[],
    opportunities: [] as string[],
    threats: [] as string[],
  });
  const [newSwotItem, setNewSwotItem] = useState({ category: "", value: "" });
  
  // Comments/Voting
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  
  // Decision History
  const [decisionHistory, setDecisionHistory] = useState<any[]>([]);

  // Number field validation functions
  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/[^0-9.-]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    setBudgetLimit(value);
    setHasChanges(true);
  };

  const handleTeamSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/[^0-9]/g, '');
    if (value && parseInt(value) > 10000) {
      value = "10000";
    }
    setTeamSize(value);
    setHasChanges(true);
  };

  // Parse extended data from notes
  const getExtendedData = useCallback((decision: Decision) => {
    if (!decision || !decision.notes) {
      return {};
    }
    try {
      if (typeof decision.notes === 'string') {
        return JSON.parse(decision.notes);
      }
      return decision.notes;
    } catch (e) {
      debugError("Failed to parse notes:", e);
      return {};
    }
  }, []);

  // Load data from currentDecision
  const loadDecisionData = useCallback((decision: Decision) => {
    if (!decision) return;
    
    const extendedData = getExtendedData(decision);
    
    setTitle(decision.title || "");
    setDescription(decision.description || "");
    setCategory(extendedData.category || "");
    setPriority(decision.priority?.toLowerCase() as any || "medium");
    setImpact(decision.impact?.toLowerCase() as any || "medium");
    setStatus(decision.status === 'in_progress' ? 'in_progress' : decision.status?.toLowerCase() as any || "pending");
    setDeadline(decision.deadline ? new Date(decision.deadline).toISOString().split('T')[0] : "");
    setOwner(extendedData.owner || "");
    setThoughts(extendedData.thoughts || "");
    setProblemStatement(extendedData.problemStatement || "");
    setDesiredOutcome(extendedData.desiredOutcome || "");
    setConstraints(extendedData.constraints || "");
    setSuccessMetrics(extendedData.successMetrics || "");
    setBudgetLimit(extendedData.budgetLimit || "");
    setTeamSize(extendedData.teamSize || "");
    setOptions(extendedData.options || []);
    setRisks(extendedData.risks || []);
    setSwot(extendedData.swot || { strengths: [], weaknesses: [], opportunities: [], threats: [] });
    setComments(extendedData.comments || []);
    setDecisionHistory(extendedData.decisionHistory || []);
    setAiInsights(extendedData.aiInsights || []);
    setSelectedOption(decision.selectedOption ? parseInt(decision.selectedOption) : null);
    
    setHasChanges(false);
  }, [getExtendedData]);

  // Update when currentDecision changes
  useEffect(() => {
    if (currentDecision) {
      loadDecisionData(currentDecision);
    }
  }, [currentDecision, loadDecisionData]);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const handleSave = async () => {
    if (!currentDecision) {
      setShowToast({ message: "No decision selected", type: "error" });
      if (onError) onError("No decision selected");
      return;
    }

    setIsSaving(true);
    try {
      const existingData = getExtendedData(currentDecision);
      
      const extendedData = {
        ...existingData,
        category: category || null,
        owner: owner || null,
        thoughts: thoughts || null,
        problemStatement: problemStatement || null,
        desiredOutcome: desiredOutcome || null,
        constraints: constraints || null,
        successMetrics: successMetrics || null,
        budgetLimit: budgetLimit || null,
        teamSize: teamSize ? parseInt(teamSize) : null,
        options: options,
        risks: risks,
        swot: swot,
        comments: comments,
        decisionHistory: decisionHistory,
        aiInsights: aiInsights,
      };
      
      // The API normalises case (and maps IN_PROGRESS) itself, so send the store's own shape.
      const updateData: Partial<Decision> = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority: priority as "high" | "medium" | "low",
        impact: impact as "high" | "medium" | "low",
        status: (status === "in-progress" ? "in_progress" : status) as Decision["status"],
        deadline: deadline || undefined,
        notes: JSON.stringify(extendedData),
        selectedOption: selectedOption ? String(selectedOption) : undefined,
      };
      
      const updatedDecision = await updateDecision(currentDecision.id, updateData);
      
      if (updatedDecision) {
        loadDecisionData(updatedDecision);
        setShowToast({ message: "Decision saved successfully!", type: "success" });
        if (onSuccess) onSuccess("Decision saved successfully!");
      } else {
        throw new Error("Update failed");
      }
    } catch (error: any) {
      debugError("Save error:", error);
      const errorMsg = error.message || "Failed to save decision";
      setShowToast({ message: errorMsg, type: "error" });
      if (onError) onError(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateAIInsights = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      const errorMsg = "Please login again";
      setShowToast({ message: errorMsg, type: "error" });
      if (onError) onError(errorMsg);
      return;
    }
    
    if (!title && !description && !thoughts && !problemStatement) {
      const errorMsg = "Please provide decision title and description for AI analysis";
      setShowToast({ message: errorMsg, type: "error" });
      if (onError) onError(errorMsg);
      return;
    }
    
    setIsGeneratingAI(true);
    try {
      // Prepare comprehensive context for AI
      const contextForAI = `
        DECISION CONTEXT:
        Title: ${title || "Not specified"}
        Description: ${description || "Not specified"}
        Category: ${category || "Not specified"}
        Priority: ${priority}
        Impact: ${impact}
        
        PROBLEM STATEMENT:
        ${problemStatement || "Not specified"}
        
        DESIRED OUTCOME:
        ${desiredOutcome || "Not specified"}
        
        CONSTRAINTS:
        ${constraints || "Not specified"}
        
        SUCCESS METRICS:
        ${successMetrics || "Not specified"}
        
        BUDGET LIMIT:
        ${budgetLimit || "Not specified"}
        
        TEAM SIZE:
        ${teamSize || "Not specified"}
        
        STRATEGIC THOUGHTS:
        ${thoughts || "Not specified"}
        
        SWOT ANALYSIS:
        Strengths: ${swot.strengths.join(", ") || "None specified"}
        Weaknesses: ${swot.weaknesses.join(", ") || "None specified"}
        Opportunities: ${swot.opportunities.join(", ") || "None specified"}
        Threats: ${swot.threats.join(", ") || "None specified"}
      `;
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010"}/api/ai/analyze-decision-deep`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          decisionId: currentDecision?.id,
          title: title,
          description: description,
          deadline: deadline || '',
          context: contextForAI,
          swot: swot,
          options: options.map((opt: any) => opt.name),
          problemStatement,
          desiredOutcome,
          constraints,
          successMetrics,
          budgetLimit,
          teamSize,
          thoughts,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to generate AI insights");
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Process AI insights
        const generatedInsights: AIInsight[] = [];
        
        // Add recommendation insight
        if (data.data.recommendation) {
          generatedInsights.push({
            id: `insight_rec_${Date.now()}`,
            type: "recommendation",
            title: "AI Recommendation",
            description: data.data.recommendation,
            priority: "high",
            confidence: data.data.confidence || 85
          });
        }
        
        // Add decision analysis
        if (data.data.decisionAnalysis) {
          generatedInsights.push({
            id: `insight_analysis_${Date.now()}`,
            type: "analysis",
            title: "Decision Analysis",
            description: data.data.decisionAnalysis,
            priority: "medium",
            confidence: data.data.confidence || 80
          });
        }
        
        // Add risks as insights
        if (data.data.risks && data.data.risks.length > 0) {
          data.data.risks.forEach((risk: any, idx: number) => {
            generatedInsights.push({
              id: `insight_risk_${Date.now()}_${idx}`,
              type: "risk",
              title: `Risk: ${risk.name}`,
              description: `${risk.description || risk.name} - Mitigation: ${risk.mitigation || "Monitor closely"}`,
              priority: risk.severity > 70 ? "high" : risk.severity > 40 ? "medium" : "low",
              confidence: risk.probability || 65
            });
          });
          setRisks(data.data.risks);
        }
        
        // Add opportunities as insights
        if (data.data.opportunities && data.data.opportunities.length > 0) {
          data.data.opportunities.forEach((opp: any, idx: number) => {
            generatedInsights.push({
              id: `insight_opp_${Date.now()}_${idx}`,
              type: "opportunity",
              title: `Opportunity: ${opp.name}`,
              description: `${opp.description || opp.name} - Potential: ${opp.potential || "Medium"}`,
              priority: opp.potential === "High" ? "high" : "medium",
              confidence: 75
            });
          });
        }
        
        // Add success factors
        if (data.data.successFactors && data.data.successFactors.length > 0) {
          generatedInsights.push({
            id: `insight_success_${Date.now()}`,
            type: "decision",
            title: "Key Success Factors",
            description: data.data.successFactors.join(" • "),
            priority: "high",
            confidence: 90
          });
        }
        
        setAiInsights(generatedInsights);
        
        if (data.data.options && data.data.options.length > 0) {
          setOptions(data.data.options);
        }
        
        setShowToast({ message: `${generatedInsights.length} AI insights generated! Click Save to persist.`, type: "success" });
        setHasChanges(true);
      } else {
        throw new Error(data.message || "Failed to generate insights");
      }
    } catch (error: any) {
      debugError("AI generation error:", error);
      const errorMsg = error.message || "Failed to generate AI insights";
      setShowToast({ message: errorMsg, type: "error" });
      if (onError) onError(errorMsg);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const newCommentObj = {
      id: comments.length + 1,
      author: "CEO",
      role: "Chief Executive Officer",
      text: newComment,
      vote: "pending",
      timestamp: new Date().toISOString().split('T')[0]
    };
    setComments([newCommentObj, ...comments]);
    setNewComment("");
    setShowToast({ message: "Comment added", type: "success" });
    setHasChanges(true);
  };

  const handleAddSwotItem = () => {
    if (!newSwotItem.category || !newSwotItem.value.trim()) return;
    setSwot(prev => ({
      ...prev,
      [newSwotItem.category]: [...prev[newSwotItem.category as keyof typeof swot], newSwotItem.value]
    }));
    setNewSwotItem({ category: "", value: "" });
    setShowToast({ message: "SWOT item added", type: "success" });
    setHasChanges(true);
  };

  const handleDeleteSwotItem = (category: keyof typeof swot, index: number) => {
    setSwot(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index)
    }));
    setHasChanges(true);
  };

  const handleDeleteOption = (optionId: number) => {
    setOptions(prev => prev.filter((opt: any) => opt.id !== optionId));
    if (selectedOption === optionId) {
      setSelectedOption(null);
    }
    setHasChanges(true);
  };

  const handleDeleteRisk = (riskName: string) => {
    setRisks(prev => prev.filter(r => r.name !== riskName));
    setHasChanges(true);
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400';
      default: return '';
    }
  };

  const getInsightTypeIcon = (type: string) => {
    switch (type) {
      case 'recommendation': return <Lightbulb className="w-4 h-4" />;
      case 'risk': return <AlertCircle className="w-4 h-4" />;
      case 'opportunity': return <TrendingUp className="w-4 h-4" />;
      case 'analysis': return <Brain className="w-4 h-4" />;
      default: return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const getInsightTypeColor = (type: string) => {
    switch (type) {
      case 'recommendation': return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400';
      case 'risk': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
      case 'opportunity': return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400';
      case 'analysis': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-slate-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400';
    }
  };

  const getRiskColor = (severity: number) => {
    if (severity >= 70) return 'text-red-600';
    if (severity >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusForSelect = (s: string) => {
    if (s === 'in_progress') return 'in-progress';
    return s;
  };

  if (!currentDecision) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Brain className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Executive Decision Center</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Select a decision from the list or create a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-20">
      {showToast && (
        <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          showToast.type === "success" ? "bg-green-500 text-white" : 
          showToast.type === "error" ? "bg-red-500 text-white" : "bg-blue-500 text-white"
        }`}>
          {showToast.message}
        </div>
      )}

      <div className="max-w-8xl mx-auto px-6 pt-3 pb-6 space-y-6">
        {/* Header Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 px-6 py-4 sticky top-0 z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <Input
                value={title}
                onChange={(e) => { setTitle(e.target.value); setHasChanges(true); }}
                className="text-3xl font-bold border-0 px-0 text-gray-900 dark:text-white focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder="Decision Title"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleGenerateAIInsights} disabled={isGeneratingAI} className="gap-2 bg-purple-600 hover:bg-purple-700">
                {isGeneratingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate AI Insights
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="gap-2 bg-blue-600 hover:bg-blue-700">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </Button>
            </div>
          </div>

          {hasChanges && (
            <div className="mb-4 text-right">
              <span className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded">
                You have unsaved changes
              </span>
            </div>
          )}

          {/* Decision Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="text-xs text-gray-500">Category</label>
              <Select value={category} onValueChange={(v) => { setCategory(v); setHasChanges(true); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
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
              <label className="text-xs text-gray-500">Priority</label>
              <Select value={priority} onValueChange={(v: any) => { setPriority(v); setHasChanges(true); }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Impact</label>
              <Select value={impact} onValueChange={(v: any) => { setImpact(v); setHasChanges(true); }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High Impact</SelectItem>
                  <SelectItem value="medium">Medium Impact</SelectItem>
                  <SelectItem value="low">Low Impact</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Status</label>
              <Select value={getStatusForSelect(status)} onValueChange={(v: any) => { 
                if (v === 'in-progress') setStatus('in-progress');
                else setStatus(v);
                setHasChanges(true); 
              }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="decided">Decided</SelectItem>
                  <SelectItem value="executing">Executing</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Deadline</label>
              <Input type="date" value={deadline} onChange={(e) => { setDeadline(e.target.value); setHasChanges(true); }} className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Owner</label>
              <Input value={owner} onChange={(e) => { setOwner(e.target.value); setHasChanges(true); }} placeholder="Assign owner" className="mt-1" />
            </div>
          </div>
        </div>

        {/* AI Insights Summary Section */}
        {aiInsights.length > 0 && (
          <Card className="border-2 border-purple-200 dark:border-purple-800">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
              <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <Brain className="w-5 h-5" />
                AI Executive Insights
                <Badge className="ml-2 bg-purple-100 text-purple-700">{aiInsights.length} insights</Badge>
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                AI-powered analysis to help you make better decisions. These insights are generated based on your decision context.
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-3">
                {aiInsights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      getInsightTypeColor(insight.type)
                    } border-opacity-30`}
                    onClick={() => setSelectedInsight(insight)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm`}>
                        {getInsightTypeIcon(insight.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-sm">{insight.title}</h4>
                          <div className="flex items-center gap-2">
                            <Badge className={getPriorityColor(insight.priority)}>
                              {insight.priority.toUpperCase()} priority
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {insight.confidence}% confidence
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {insight.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Thought Writing Area */}
        <Card className="border-2 border-blue-200 dark:border-blue-800">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-slate-400">
              <PenLine className="w-5 h-5" />
              Thought Writing Area
              <Badge className="ml-2 bg-blue-100 text-blue-700">AI Context</Badge>
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Write your thoughts, ideas, and analysis here. The AI will analyze this to provide better insights.
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            <Textarea
              value={thoughts}
              onChange={(e) => { setThoughts(e.target.value); setHasChanges(true); }}
              placeholder="Write your thoughts here... This area is for your personal notes, ideas, concerns, and strategic thinking. The AI will analyze this content to provide better recommendations."
              rows={8}
              className="resize-none font-mono text-sm"
            />
            <div className="flex justify-between mt-2">
              <p className="text-xs text-gray-500">
                <span className="font-medium">💡 Tip:</span> The more detail you provide, the better AI insights you'll receive.
              </p>
              <p className="text-xs text-gray-500">{thoughts.length} characters</p>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Section */}
        <Tabs defaultValue="problem" className="w-full">
          <TabsList className="flex flex-wrap gap-2 bg-transparent p-0 mb-6 border-b border-gray-200 dark:border-white/10">
            <TabsTrigger value="problem" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 px-4 py-2 rounded-lg">
              <Target className="w-4 h-4 mr-2" />
              Problem/Goal
            </TabsTrigger>
            <TabsTrigger value="swot" className="data-[state=active]:bg-cyan-100 data-[state=active]:text-cyan-700 px-4 py-2 rounded-lg">
              <PieChart className="w-4 h-4 mr-2" />
              SWOT
            </TabsTrigger>
            <TabsTrigger value="options" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700 px-4 py-2 rounded-lg">
              <GitBranch className="w-4 h-4 mr-2" />
              Options
            </TabsTrigger>
            <TabsTrigger value="risks" className="data-[state=active]:bg-red-100 data-[state=active]:text-red-700 px-4 py-2 rounded-lg">
              <Shield className="w-4 h-4 mr-2" />
              Risks
            </TabsTrigger>
            <TabsTrigger value="collaboration" className="data-[state=active]:bg-teal-100 data-[state=active]:text-teal-700 px-4 py-2 rounded-lg">
              <Users className="w-4 h-4 mr-2" />
              Team
            </TabsTrigger>
            <TabsTrigger value="timeline" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-700 px-4 py-2 rounded-lg">
              <History className="w-4 h-4 mr-2" />
              Timeline
            </TabsTrigger>
          </TabsList>

          {/* Problem/Goal Tab */}
          <TabsContent value="problem" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  Problem Definition
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">What problem exists?</label>
                  <Textarea
                    value={problemStatement}
                    onChange={(e) => { setProblemStatement(e.target.value); setHasChanges(true); }}
                    placeholder="Describe the current challenge or opportunity..."
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Desired Outcome</label>
                  <Textarea
                    value={desiredOutcome}
                    onChange={(e) => { setDesiredOutcome(e.target.value); setHasChanges(true); }}
                    placeholder="What does success look like?"
                    rows={2}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Constraints</label>
                    <Input value={constraints} onChange={(e) => { setConstraints(e.target.value); setHasChanges(true); }} placeholder="Budget, time, resources..." />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Success Metrics</label>
                    <Input value={successMetrics} onChange={(e) => { setSuccessMetrics(e.target.value); setHasChanges(true); }} placeholder="KPIs to measure success" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Budget Limit</label>
                    <Input value={budgetLimit} onChange={handleBudgetChange} placeholder="$" type="text" inputMode="numeric" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Team Size</label>
                    <Input value={teamSize} onChange={handleTeamSizeChange} placeholder="Number of people" type="text" inputMode="numeric" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SWOT Tab */}
          <TabsContent value="swot" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-cyan-600" />
                  SWOT Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="p-4 bg-green-50 dark:bg-green-500/10 rounded-lg">
                    <h4 className="font-semibold text-green-700 mb-2">Strengths</h4>
                    <ul className="space-y-1">
                      {swot.strengths.map((s, i) => (
                        <li key={i} className="text-sm flex justify-between items-center">
                          <span>✓ {s}</span>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteSwotItem("strengths", i)}><X className="w-3 h-3 text-red-500" /></Button>
                        </li>
                      ))}
                      {swot.strengths.length === 0 && <li className="text-sm text-gray-500">No strengths added</li>}
                    </ul>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-lg">
                    <h4 className="font-semibold text-red-700 mb-2">Weaknesses</h4>
                    <ul className="space-y-1">
                      {swot.weaknesses.map((w, i) => (
                        <li key={i} className="text-sm flex justify-between items-center">
                          <span>✗ {w}</span>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteSwotItem("weaknesses", i)}><X className="w-3 h-3 text-red-500" /></Button>
                        </li>
                      ))}
                      {swot.weaknesses.length === 0 && <li className="text-sm text-gray-500">No weaknesses added</li>}
                    </ul>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                    <h4 className="font-semibold text-blue-700 mb-2">Opportunities</h4>
                    <ul className="space-y-1">
                      {swot.opportunities.map((o, i) => (
                        <li key={i} className="text-sm flex justify-between items-center">
                          <span>→ {o}</span>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteSwotItem("opportunities", i)}><X className="w-3 h-3 text-red-500" /></Button>
                        </li>
                      ))}
                      {swot.opportunities.length === 0 && <li className="text-sm text-gray-500">No opportunities added</li>}
                    </ul>
                  </div>
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg">
                    <h4 className="font-semibold text-yellow-700 mb-2">Threats</h4>
                    <ul className="space-y-1">
                      {swot.threats.map((t, i) => (
                        <li key={i} className="text-sm flex justify-between items-center">
                          <span>⚠ {t}</span>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteSwotItem("threats", i)}><X className="w-3 h-3 text-red-500" /></Button>
                        </li>
                      ))}
                      {swot.threats.length === 0 && <li className="text-sm text-gray-500">No threats added</li>}
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 border rounded-lg">
                  <h4 className="font-semibold mb-3">Add SWOT Item</h4>
                  <div className="flex gap-2">
                    <Select value={newSwotItem.category} onValueChange={(v) => setNewSwotItem({ ...newSwotItem, category: v })}>
                      <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="strengths">Strength</SelectItem>
                        <SelectItem value="weaknesses">Weakness</SelectItem>
                        <SelectItem value="opportunities">Opportunity</SelectItem>
                        <SelectItem value="threats">Threat</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Enter item..." value={newSwotItem.value} onChange={(e) => setNewSwotItem({ ...newSwotItem, value: e.target.value })} className="flex-1" />
                    <Button onClick={handleAddSwotItem}>Add</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Options Tab */}
          <TabsContent value="options" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-green-600" />
                  Strategy Options Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                {options.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <GitBranch className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No options yet. Generate AI insights to get strategic options.</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3">Option</th>
                            <th className="text-left p-3">Cost</th>
                            <th className="text-left p-3">Risk</th>
                            <th className="text-left p-3">ROI</th>
                            <th className="text-left p-3">Timeline</th>
                            <th className="text-left p-3">Select</th>
                            <th className="text-left p-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {options.map((option: any) => (
                            <tr key={option.id} className={`border-b ${selectedOption === option.id ? 'bg-blue-50 dark:bg-blue-500/10' : ''}`}>
                              <td className="p-3 font-medium">{option.name}</td>
                              <td className="p-3">{option.cost}</td>
                              <td className="p-3">{option.risk}</td>
                              <td className="p-3">{option.roi}</td>
                              <td className="p-3">{option.timeline}</td>
                              <td className="p-3">
                                <Button size="sm" variant="outline" onClick={() => { setSelectedOption(option.id); setHasChanges(true); }}>
                                  {selectedOption === option.id ? "Selected" : "Select"}
                                </Button>
                              </td>
                              <td className="p-3">
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteOption(option.id)}>
                                  <X className="w-3 h-3 text-red-500" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {selectedOption && (
                      <div className="mt-4 p-3 bg-green-50 dark:bg-green-500/10 rounded-lg">
                        <p className="text-sm">✅ Selected option: {options.find((o: any) => o.id === selectedOption)?.name}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Risks Tab */}
          <TabsContent value="risks" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-600" />
                  Risk Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {risks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Shield className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No risks identified yet. Generate AI insights to get risk analysis.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {risks.map((risk: any, idx: number) => (
                      <div key={idx} className="p-4 border rounded-lg relative">
                        <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => handleDeleteRisk(risk.name)}>
                          <X className="w-3 h-3 text-red-500" />
                        </Button>
                        <div className="flex items-center justify-between mb-2 pr-8">
                          <div className="flex items-center gap-2">
                            <AlertCircle className={`w-4 h-4 ${getRiskColor(risk.severity)}`} />
                            <span className="font-medium">{risk.name}</span>
                          </div>
                          <Badge className={getRiskColor(risk.severity)}>{risk.severity}% Severity</Badge>
                        </div>
                        <Progress value={risk.severity} className="h-2 mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          <span className="font-medium">Mitigation:</span> {risk.mitigation}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Collaboration Tab */}
          <TabsContent value="collaboration" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-teal-600" />
                  Executive Team Collaboration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">Discussion</h4>
                  <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                    {comments.map((comment: any) => (
                      <div key={comment.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-medium">{comment.author}</span>
                            <span className="text-xs text-gray-500 ml-2">{comment.role}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => {
                              setComments(prev => prev.map((c: any) => c.id === comment.id ? { ...c, vote: "approve" } : c));
                              setHasChanges(true);
                            }}><ThumbsUp className="w-3 h-3" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => {
                              setComments(prev => prev.map((c: any) => c.id === comment.id ? { ...c, vote: "disapprove" } : c));
                              setHasChanges(true);
                            }}><ThumbsDown className="w-3 h-3" /></Button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{comment.text}</p>
                        <p className="text-xs text-gray-400 mt-1">{comment.timestamp}</p>
                      </div>
                    ))}
                    {comments.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No comments yet. Start the discussion!</p>}
                  </div>
                  <div className="flex gap-2">
                    <Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add your comment..." className="flex-1" />
                    <Button onClick={handleAddComment}>Post</Button>
                  </div>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                  <h4 className="font-semibold mb-2">Voting Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div><p className="text-2xl font-bold text-green-600">{comments.filter((c: any) => c.vote === "approve").length}</p><p className="text-sm text-gray-600">Approve</p></div>
                    <div><p className="text-2xl font-bold text-red-600">{comments.filter((c: any) => c.vote === "disapprove").length}</p><p className="text-sm text-gray-600">Concern</p></div>
                    <div><p className="text-2xl font-bold text-gray-600">{comments.filter((c: any) => c.vote === "pending").length}</p><p className="text-sm text-gray-600">Pending</p></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-gray-600" />
                  Decision Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {decisionHistory.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-2 h-2 mt-2 rounded-full bg-blue-500"></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{item.action}</span>
                          <span className="text-xs text-gray-500">{item.date}</span>
                        </div>
                        <p className="text-sm text-gray-600">By: {item.user}</p>
                        <p className="text-xs text-gray-400">{item.details}</p>
                      </div>
                    </div>
                  ))}
                  {decisionHistory.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No history yet. Save changes to record history.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* The Formed Decision — the recorded outcome of this workspace */}
        <Card
          id="formed-decision"
          className={
            status === 'decided' || status === 'executing'
              ? 'bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/20 dark:to-blue-950/20 border-emerald-200 dark:border-emerald-500/30'
              : 'bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20'
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              The Formed Decision
              <Badge
                className={
                  status === 'decided' || status === 'executing'
                    ? 'ml-auto bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                    : 'ml-auto bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'
                }
              >
                {status === 'decided' || status === 'executing' ? 'Decision formed' : 'Not formed yet'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === 'decided' || status === 'executing' ? (
              <>
                <div className="rounded-lg bg-white dark:bg-slate-900 p-4 border border-gray-200 dark:border-white/10">
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Decision</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{title || 'Untitled decision'}</p>
                  {description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg bg-white dark:bg-slate-900 p-3 border border-gray-200 dark:border-white/10">
                    <p className="text-xs text-gray-500 mb-1">Chosen option</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedOption
                        ? options.find((o: any) => o.id === selectedOption)?.name || `Option ${selectedOption}`
                        : 'No option selected yet'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-slate-900 p-3 border border-gray-200 dark:border-white/10">
                    <p className="text-xs text-gray-500 mb-1">Confidence & timing</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {currentDecision.aiConfidence != null ? `${currentDecision.aiConfidence}% confidence` : 'Confidence not recorded'}
                      {deadline ? ` · due ${deadline}` : ''}
                    </p>
                  </div>
                  {problemStatement && (
                    <div className="rounded-lg bg-white dark:bg-slate-900 p-3 border border-gray-200 dark:border-white/10">
                      <p className="text-xs text-gray-500 mb-1">Problem it answers</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{problemStatement}</p>
                    </div>
                  )}
                  {desiredOutcome && (
                    <div className="rounded-lg bg-white dark:bg-slate-900 p-3 border border-gray-200 dark:border-white/10">
                      <p className="text-xs text-gray-500 mb-1">Target outcome</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{desiredOutcome}</p>
                    </div>
                  )}
                  {successMetrics && (
                    <div className="rounded-lg bg-white dark:bg-slate-900 p-3 border border-gray-200 dark:border-white/10 md:col-span-2">
                      <p className="text-xs text-gray-500 mb-1">How success is measured</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{successMetrics}</p>
                    </div>
                  )}
                  {(budgetLimit || teamSize) && (
                    <div className="rounded-lg bg-white dark:bg-slate-900 p-3 border border-gray-200 dark:border-white/10 md:col-span-2 flex flex-wrap gap-6">
                      {budgetLimit && <p className="text-sm text-gray-700 dark:text-gray-300">Budget: <span className="font-semibold">{budgetLimit}</span></p>}
                      {teamSize && <p className="text-sm text-gray-700 dark:text-gray-300">Team: <span className="font-semibold">{teamSize}</span></p>}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This decision has not been finalised. Complete the problem, SWOT and options tabs, then record the outcome here.
                  Once formed, it appears here and feeds the AI analysis across the whole app.
                </p>
                <Button
                  onClick={() => { setStatus('decided'); setHasChanges(true); }}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle2 className="w-4 h-4" /> Mark as decided
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}