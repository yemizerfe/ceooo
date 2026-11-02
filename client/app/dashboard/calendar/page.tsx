"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Users,
  Video,
  Sparkles,
  Brain,
  Trash2,
  Loader2,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Briefcase,
  Target,
  BarChart3,
  TrendingUp,
  Clock,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

import { Progress } from "@/components/ui/progress";

import {
  useCalendarStore,
  CalendarEvent,
} from "@/store/calendarStore";
import { ExternalRecordsPanel } from "@/components/integrations/ExternalRecordsPanel";
import { useIntegrationOverviewStore } from "@/store/integrationOverviewStore";

export default function CalendarPage() {
  const {
    events,
    fetchEvents,
    createEvent,
    deleteEvent,
    updateEvent,
    isLoading,
  } = useCalendarStore();

  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [showDialog, setShowDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const [form, setForm] = useState({
    title: "",
    startTime: "",
    endTime: "",
    type: "MEETING" as any,
    priority: "MEDIUM" as any,
    status: "SCHEDULED" as any,
    location: "",
    meetingLink: "",
    tags: "",
    notes: "",
    description: "",
    attendees: "",
  });

  const { overview, fetchOverview } = useIntegrationOverviewStore();

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  // Google Calendar (and other synced calendars) are merged into the same
  // grid so the week view reflects every meeting, not just in-app events.
  const externalEvents = useMemo<CalendarEvent[]>(() => {
    return (overview?.events || []).map((event) => ({
      id: event.id,
      title: event.title,
      description: `Synced from ${event.source}`,
      type: "MEETING",
      startTime: event.startTime,
      endTime: event.endTime,
      allDay: event.allDay,
      location: event.location || "",
      meetingLink: event.meetingLink || event.url || "",
      attendees: [],
      status: "SCHEDULED",
      priority: "MEDIUM",
      recurring: "NONE",
      tags: [],
      notes: "",
      createdAt: event.startTime,
      updatedAt: event.startTime,
      source: event.source,
    })) as unknown as CalendarEvent[];
  }, [overview?.events]);

  const allEvents = useMemo(() => [...events, ...externalEvents], [events, externalEvents]);

  // Get week dates
  const getWeekDates = (currentDate: Date) => {
    const week = [];
    const startOfWeek = new Date(currentDate);
    const day = currentDate.getDay();
    const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      week.push(date);
    }
    return week;
  };

  // Get month dates
  const getMonthDates = (currentDate: Date) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    const startDayOfWeek = firstDay.getDay();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push(date);
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push(date);
    }
    
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push(date);
    }
    
    return days;
  };

  const weekDates = useMemo(() => getWeekDates(date), [date]);
  const monthDates = useMemo(() => getMonthDates(date), [date]);

  // Get events for a specific date
  const getEventsForDate = (targetDate: Date) => {
    return allEvents.filter((event) => {
      const eventDate = new Date(event.startTime);
      return eventDate.toDateString() === targetDate.toDateString();
    });
  };

  // Get events for a specific hour on a specific date
  const getEventsForHour = (targetDate: Date, hour: number) => {
    return allEvents.filter((event) => {
      const eventDate = new Date(event.startTime);
      return eventDate.toDateString() === targetDate.toDateString() && 
             eventDate.getHours() === hour;
    });
  };

  const todayEvents = useMemo(() => {
    return getEventsForDate(date);
  }, [allEvents, date]);

  // Comprehensive efficiency metrics
  const efficiencyMetrics = useMemo(() => {
    const weekDates = getWeekDates(date);
    let totalMeetingHours = 0;
    let totalFocusHours = 0;
    let totalEventHours = 0;
    let totalEvents = 0;
    let highPriorityEvents = 0;
    let completedEvents = 0;
    let cancelledEvents = 0;
    let meetingsPerDay = 0;
    let averageMeetingLength = 0;
    let focusVsMeetingRatio = 0;
    
    // Calculate daily metrics for better accuracy
    const dailyMetrics = weekDates.map(day => {
      const dayEvents = getEventsForDate(day);
      let dayMeetingHours = 0;
      let dayFocusHours = 0;
      let dayEventCount = 0;
      
      dayEvents.forEach(event => {
        const start = new Date(event.startTime).getTime();
        const end = new Date(event.endTime).getTime();
        const hours = (end - start) / (1000 * 60 * 60);
        
        totalEventHours += hours;
        dayEventCount++;
        
        if (event.type === "FOCUS_BLOCK") {
          totalFocusHours += hours;
          dayFocusHours += hours;
        } else if (event.type === "MEETING" || event.type === "BOARD_MEETING" || event.type === "CALL") {
          totalMeetingHours += hours;
          dayMeetingHours += hours;
        }
        
        if (event.priority === "HIGH" || event.priority === "CRITICAL") {
          highPriorityEvents++;
        }
        
        if (event.status === "COMPLETED") {
          completedEvents++;
        } else if (event.status === "CANCELLED") {
          cancelledEvents++;
        }
        
        totalEvents++;
      });
      
      return { dayMeetingHours, dayFocusHours, dayEventCount };
    });
    
    // Calculate averages
    meetingsPerDay = totalMeetingHours / 7;
    averageMeetingLength = totalEvents > 0 ? totalEventHours / totalEvents : 0;
    focusVsMeetingRatio = totalMeetingHours > 0 ? (totalFocusHours / totalMeetingHours) * 100 : 0;
    
    // Calculate schedule health score (0-100)
    let healthScore = 100;
    
    // Meeting load penalty (ideal: 15-25 hours per week)
    if (totalMeetingHours > 30) {
      healthScore -= Math.min(40, (totalMeetingHours - 30) * 4);
    } else if (totalMeetingHours > 25) {
      healthScore -= 10;
    } else if (totalMeetingHours < 10) {
      healthScore -= 20; // Too few meetings (underutilized)
    }
    
    // Focus time bonus/penalty (ideal: 10-20 hours per week)
    if (totalFocusHours < 5) {
      healthScore -= 20;
    } else if (totalFocusHours < 10) {
      healthScore -= 10;
    } else if (totalFocusHours > 25) {
      healthScore -= 10;
    } else {
      healthScore += 5;
    }
    
    // Focus vs meeting ratio (ideal: 40-60%)
    if (focusVsMeetingRatio < 20) {
      healthScore -= 15;
    } else if (focusVsMeetingRatio < 30) {
      healthScore -= 5;
    } else if (focusVsMeetingRatio > 80) {
      healthScore -= 10;
    } else if (focusVsMeetingRatio >= 40 && focusVsMeetingRatio <= 60) {
      healthScore += 5;
    }
    
    // Priority balance (too many high priority events = burnout risk)
    const highPriorityRatio = totalEvents > 0 ? (highPriorityEvents / totalEvents) * 100 : 0;
    if (highPriorityRatio > 50) {
      healthScore -= 15;
    } else if (highPriorityRatio > 30) {
      healthScore -= 5;
    }
    
    // Completion rate
    const completionRate = totalEvents > 0 ? (completedEvents / totalEvents) * 100 : 0;
    if (completionRate > 80) {
      healthScore += 10;
    } else if (completionRate < 50) {
      healthScore -= 10;
    }
    
    // Cancellation rate
    const cancellationRate = totalEvents > 0 ? (cancelledEvents / totalEvents) * 100 : 0;
    if (cancellationRate > 20) {
      healthScore -= 15;
    } else if (cancellationRate > 10) {
      healthScore -= 5;
    }
    
    // Meeting distribution (check if meetings are spread evenly or clumped)
    const daysWithMeetings = dailyMetrics.filter(d => d.dayMeetingHours > 0).length;
    if (daysWithMeetings > 0 && totalMeetingHours > 0) {
      const averageMeetingsPerDay = totalMeetingHours / daysWithMeetings;
      if (averageMeetingsPerDay > 6) {
        healthScore -= 10; // Too many meetings on some days
      }
    }
    
    // Ensure score stays within 0-100 range
    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));
    
    // Generate insights based on metrics
    let insights = [];
    if (totalMeetingHours > 30) {
      insights.push("⚠️ High meeting load - consider reducing meeting time");
    } else if (totalMeetingHours < 10) {
      insights.push("📈 Low collaboration time - consider scheduling more team syncs");
    }
    
    if (totalFocusHours < 5) {
      insights.push("🧠 Low focus time - protect your deep work hours");
    }
    
    if (focusVsMeetingRatio < 30) {
      insights.push("⚖️ Poor meeting/focus balance - block more focus time");
    }
    
    if (highPriorityRatio > 40) {
      insights.push("🎯 Too many high-priority tasks - delegate or reschedule");
    }
    
    if (cancellationRate > 15) {
      insights.push("📅 High cancellation rate - review scheduling process");
    }
    
    if (completionRate > 80) {
      insights.push("✅ Excellent completion rate - great productivity!");
    }
    
    if (healthScore >= 80 && insights.length === 0) {
      insights.push("🌟 Optimal schedule efficiency - keep it up!");
    }
    
    return {
      healthScore,
      totalMeetingHours,
      totalFocusHours,
      totalEvents,
      highPriorityEvents,
      completedEvents,
      cancelledEvents,
      meetingsPerDay: meetingsPerDay.toFixed(1),
      averageMeetingLength: averageMeetingLength.toFixed(1),
      focusVsMeetingRatio: focusVsMeetingRatio.toFixed(0),
      completionRate: completionRate.toFixed(0),
      cancellationRate: cancellationRate.toFixed(0),
      insights
    };
  }, [allEvents, date]);

  const focusBlocks = allEvents.filter((e) => e.type === "FOCUS_BLOCK").length;
  const highPriorityEventsCount = allEvents.filter((e: any) => e.priority === "HIGH" || e.priority === "CRITICAL").length;
  const followUpsNeeded = allEvents.filter((e: any) => e.status !== "COMPLETED" && new Date(e.startTime) < new Date()).length;

  const getEventColor = (type: string) => {
    switch (type) {
      case "MEETING":
        return "border-l-blue-500 bg-blue-50 dark:bg-blue-500/10";
      case "FOCUS_BLOCK":
        return "border-l-green-500 bg-green-50 dark:bg-green-500/10";
      case "CALL":
        return "border-l-purple-500 bg-purple-50 dark:bg-purple-500/10";
      case "DEADLINE":
        return "border-l-red-500 bg-red-50 dark:bg-red-500/10";
      case "BOARD_MEETING":
        return "border-l-orange-500 bg-orange-50 dark:bg-orange-500/10";
      case "STRATEGY_SESSION":
        return "border-l-indigo-500 bg-indigo-50 dark:bg-indigo-500/10";
      default:
        return "border-l-gray-500 bg-gray-50 dark:bg-gray-500/10";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400";
      case "HIGH":
        return "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400";
      default:
        return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-slate-300";
      case "CANCELLED":
        return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400";
      case "RESCHEDULED":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400";
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getHealthBarColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const handleCreate = async () => {
    if (!form.title || !form.startTime || !form.endTime) return;

    await createEvent({
      ...form,
      attendees: form.attendees ? form.attendees.split(",").map((a) => a.trim()) : [],
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : [],
    });

    setShowDialog(false);
    setForm({
      title: "",
      startTime: "",
      endTime: "",
      type: "MEETING",
      priority: "MEDIUM",
      status: "SCHEDULED",
      location: "",
      meetingLink: "",
      tags: "",
      notes: "",
      description: "",
      attendees: "",
    });
  };

  const currentMonth = date.toLocaleString("default", { month: "long", year: "numeric" });
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Day View
  const renderDayView = () => (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {todayEvents.length === 0 ? (
          <div className="text-center py-16">
            <CalendarDays className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No events scheduled for {date.toDateString()}</p>
            <Button onClick={() => setShowDialog(true)} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </div>
        ) : (
          hours.map((hour) => {
            const hourEvents = getEventsForDate(date).filter(
              (e) => new Date(e.startTime).getHours() === hour
            );
            
            if (hourEvents.length === 0) return null;
            
            return (
              <div key={hour} className="flex border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5">
                <div className="w-20 p-3 text-right text-sm text-gray-500 flex-shrink-0 border-r border-gray-100 dark:border-white/5">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                <div className="flex-1 p-2 min-h-[80px]">
                  {hourEvents.map((event: any) => (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={`p-3 rounded-xl cursor-pointer border-l-4 mb-2 hover:shadow-md transition-all ${getEventColor(event.type)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{event.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge className={getPriorityColor(event.priority || "MEDIUM")}>
                              {event.priority || "MEDIUM"}
                            </Badge>
                            <Badge className={getStatusColor(event.status || "SCHEDULED")}>
                              {event.status || "SCHEDULED"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400">
                          {event.attendees?.length > 0 && <Users className="w-4 h-4" />}
                          {event.meetingLink && <Video className="w-4 h-4" />}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        {new Date(event.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                        {new Date(event.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // Week View
  const renderWeekView = () => (
    <div className="overflow-x-auto">
      <div className="min-w-[1000px]">
        <div className="grid grid-cols-8 border-b border-gray-200 dark:border-white/10">
          <div className="p-3 text-sm font-medium text-gray-500">Time</div>
          {weekDates.map((day, idx) => (
            <div key={idx} className="p-3 text-sm font-medium text-center">
              <div>{day.toLocaleDateString("default", { weekday: "short" })}</div>
              <div className="text-lg font-semibold">{day.getDate()}</div>
            </div>
          ))}
        </div>
        
        {hours.map((hour) => {
          const hasEvents = weekDates.some(day => getEventsForHour(day, hour).length > 0);
          if (!hasEvents) return null;
          
          return (
            <div key={hour} className="grid grid-cols-8 border-b border-gray-100 dark:border-white/5">
              <div className="p-3 text-sm text-gray-500 border-r border-gray-100 dark:border-white/5">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {weekDates.map((day, idx) => {
                const hourEvents = getEventsForHour(day, hour);
                return (
                  <div key={idx} className="p-2 min-h-[80px] border-l border-gray-100 dark:border-white/5">
                    {hourEvents.map((event: any) => (
                      <div
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={`p-2 rounded-lg cursor-pointer border-l-4 mb-1 text-xs hover:shadow-md transition-all ${getEventColor(event.type)}`}
                      >
                        <p className="font-semibold truncate">{event.title}</p>
                        <p className="text-gray-500 text-xs">
                          {new Date(event.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Month View
  const renderMonthView = () => (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-white/10">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="p-3 text-sm font-medium text-center">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7">
          {monthDates.map((day, idx) => {
            const dayEvents = getEventsForDate(day);
            const isCurrentMonth = day.getMonth() === date.getMonth();
            const isToday = day.toDateString() === new Date().toDateString();
            
            return (
              <div
                key={idx}
                onClick={() => {
                  setDate(day);
                  setView("day");
                }}
                className={`min-h-[100px] p-2 border-b border-r border-gray-100 dark:border-white/5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                  !isCurrentMonth ? "bg-gray-50 dark:bg-white/5" : ""
                } ${isToday ? "bg-blue-50 dark:bg-blue-500/10" : ""}`}
              >
                <div className={`text-sm font-medium mb-2 ${isToday ? "text-blue-600 dark:text-slate-300" : ""}`}>
                  {day.getDate()}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                      }}
                      className={`text-xs p-1 rounded truncate cursor-pointer ${getEventColor(event.type)}`}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 pl-1">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Time & Calendar
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Executive scheduling & AI-powered time management
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <Brain className="w-4 h-4" />
              AI Optimizer
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4" />
              New Event
            </Button>
          </div>
        </div>

        <ExternalRecordsPanel
          domain="events"
          description="Meetings read from your connected Google Calendar, alongside your in-app schedule."
        />

        {/* EFFICIENCY METRICS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          {/* Schedule Health Score */}
          <Card className="lg:col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold">Schedule Health Score</h3>
                </div>
                <span className={`text-3xl font-bold ${getHealthColor(efficiencyMetrics.healthScore)}`}>
                  {efficiencyMetrics.healthScore}%
                </span>
              </div>
              <Progress 
                value={efficiencyMetrics.healthScore} 
                className={`h-3 ${getHealthBarColor(efficiencyMetrics.healthScore)}`} 
              />
              <div className="mt-4 space-y-2">
                {efficiencyMetrics.insights.slice(0, 3).map((insight, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="text-gray-600 dark:text-gray-400">{insight}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-purple-500" />
                <h3 className="font-semibold">Time Distribution</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Meetings</span>
                    <span className="font-medium">{efficiencyMetrics.totalMeetingHours.toFixed(1)} hrs</span>
                  </div>
                  <Progress value={(efficiencyMetrics.totalMeetingHours / 50) * 100} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Focus Blocks</span>
                    <span className="font-medium">{efficiencyMetrics.totalFocusHours.toFixed(1)} hrs</span>
                  </div>
                  <Progress value={(efficiencyMetrics.totalFocusHours / 30) * 100} className="h-2" />
                </div>
                <div className="pt-2 border-t border-gray-100 dark:border-white/10">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Focus/Meeting Ratio</span>
                    <span className="font-medium">{efficiencyMetrics.focusVsMeetingRatio}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Success Metrics */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <h3 className="font-semibold">Performance</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Completion Rate</span>
                  <span className="font-medium text-green-600">{efficiencyMetrics.completionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cancellation Rate</span>
                  <span className="font-medium text-red-600">{efficiencyMetrics.cancellationRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Avg Meeting Length</span>
                  <span className="font-medium">{efficiencyMetrics.averageMeetingLength} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Meetings/Day</span>
                  <span className="font-medium">{efficiencyMetrics.meetingsPerDay} hrs</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* QUICK STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <CalendarDays className="w-5 h-5 text-blue-500" />
                <div className="text-right">
                  <p className="text-2xl font-bold">{todayEvents.length}</p>
                  <p className="text-xs text-gray-500">Today's Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Target className="w-5 h-5 text-green-500" />
                <div className="text-right">
                  <p className="text-2xl font-bold">{focusBlocks}</p>
                  <p className="text-xs text-gray-500">Focus Blocks</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <div className="text-right">
                  <p className="text-2xl font-bold">{highPriorityEventsCount}</p>
                  <p className="text-xs text-gray-500">High Priority</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Bell className="w-5 h-5 text-purple-500" />
                <div className="text-right">
                  <p className="text-2xl font-bold">{followUpsNeeded}</p>
                  <p className="text-xs text-gray-500">Follow-Ups</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* SIDEBAR */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardContent className="p-4">
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  className="rounded-md"
                />
              </CardContent>
            </Card>

            {/* Detailed Efficiency Breakdown */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4 text-purple-500" />
                  <h3 className="font-semibold">AI Insights</h3>
                </div>
                <div className="space-y-3">
                  {efficiencyMetrics.insights.map((insight, idx) => (
                    <div key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                      {insight}
                    </div>
                  ))}
                  {efficiencyMetrics.insights.length === 0 && (
                    <div className="text-sm text-gray-500 text-center py-4">
                      No insights available. Add more events to get AI recommendations.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* UPCOMING */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Upcoming Important</h3>
                <div className="space-y-3">
                  {allEvents
                    .filter((e: any) => e.priority === "HIGH" || e.priority === "CRITICAL")
                    .slice(0, 4)
                    .map((event) => (
                      <div
                        key={event.id}
                        className="p-2 rounded-lg bg-gray-50 dark:bg-white/5 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10"
                        onClick={() => setSelectedEvent(event)}
                      >
                        <p className="text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-gray-500">{new Date(event.startTime).toLocaleDateString()}</p>
                      </div>
                    ))}
                  {allEvents.filter((e: any) => e.priority === "HIGH" || e.priority === "CRITICAL").length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No high priority events</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* MAIN CALENDAR VIEW */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
              {/* TOPBAR */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const newDate = new Date(date);
                      if (view === "day") newDate.setDate(date.getDate() - 1);
                      else if (view === "week") newDate.setDate(date.getDate() - 7);
                      else newDate.setMonth(date.getMonth() - 1);
                      setDate(newDate);
                    }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const newDate = new Date(date);
                      if (view === "day") newDate.setDate(date.getDate() + 1);
                      else if (view === "week") newDate.setDate(date.getDate() + 7);
                      else newDate.setMonth(date.getMonth() + 1);
                      setDate(newDate);
                    }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" onClick={() => setDate(new Date())} className="ml-2">
                    Today
                  </Button>
                  <span className="text-lg font-semibold ml-2">{currentMonth}</span>
                </div>
                <Tabs value={view} onValueChange={(v) => setView(v as any)}>
                  <TabsList>
                    <TabsTrigger value="day">Day</TabsTrigger>
                    <TabsTrigger value="week">Week</TabsTrigger>
                    <TabsTrigger value="month">Month</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* VIEW RENDERER */}
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  {view === "day" && renderDayView()}
                  {view === "week" && renderWeekView()}
                  {view === "month" && renderMonthView()}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CREATE DIALOG */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Executive Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Board Meeting"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time *</Label>
                <Input
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              </div>
              <div>
                <Label>End Time *</Label>
                <Input
                  type="datetime-local"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEETING">Meeting</SelectItem>
                    <SelectItem value="BOARD_MEETING">Board Meeting</SelectItem>
                    <SelectItem value="CALL">Call</SelectItem>
                    <SelectItem value="STRATEGY_SESSION">Strategy Session</SelectItem>
                    <SelectItem value="FOCUS_BLOCK">Focus Block</SelectItem>
                    <SelectItem value="DEADLINE">Deadline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Conference Room"
                />
              </div>
            </div>
            <div>
              <Label>Meeting Link</Label>
              <Input
                value={form.meetingLink}
                onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
                placeholder="https://meet.google.com/..."
              />
            </div>
            <div>
              <Label>Attendees (comma-separated)</Label>
              <Input
                value={form.attendees}
                onChange={(e) => setForm({ ...form, attendees: e.target.value })}
                placeholder="ceo@company.com, cto@company.com"
              />
            </div>
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="important, strategy"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Event description..."
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Private notes..."
              />
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleCreate}>
              Create Event
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* EVENT DETAILS DIALOG */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedEvent.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge>{selectedEvent.type?.replace("_", " ")}</Badge>
                  <Badge className={getPriorityColor((selectedEvent as any).priority || "MEDIUM")}>
                    {(selectedEvent as any).priority || "MEDIUM"}
                  </Badge>
                  <Badge className={getStatusColor((selectedEvent as any).status || "SCHEDULED")}>
                    {(selectedEvent as any).status || "SCHEDULED"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                    <div className="text-gray-500 mb-1">Start</div>
                    <div className="font-medium">{new Date(selectedEvent.startTime).toLocaleString()}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                    <div className="text-gray-500 mb-1">End</div>
                    <div className="font-medium">{new Date(selectedEvent.endTime).toLocaleString()}</div>
                  </div>
                </div>
                {selectedEvent.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="w-4 h-4 text-gray-500" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}
                {selectedEvent.meetingLink && (
                  <Button variant="outline" className="w-full gap-2" onClick={() => window.open(selectedEvent.meetingLink)}>
                    <Video className="w-4 h-4" />
                    Join Meeting
                  </Button>
                )}
                {selectedEvent.description && (
                  <div>
                    <p className="font-medium mb-1">Description</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{selectedEvent.description}</p>
                  </div>
                )}
                {(selectedEvent as any).attendees?.length > 0 && (
                  <div>
                    <p className="font-medium mb-2">Attendees</p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedEvent as any).attendees.map((attendee: string, idx: number) => (
                        <Badge key={idx} variant="outline">
                          {attendee}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      updateEvent(selectedEvent.id, { status: "COMPLETED" });
                      setSelectedEvent(null);
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Mark Complete
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      deleteEvent(selectedEvent.id);
                      setSelectedEvent(null);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}