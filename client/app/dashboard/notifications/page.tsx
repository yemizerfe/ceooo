"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Info, Calendar, Users, DollarSign, Brain, GitBranch, Clock, CheckCheck, Trash2, Search, Settings, Sparkles, Eye, ChevronDown, Star, StarOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useNotificationStore } from "@/store/notificationStore";

const notificationIcons: Record<string, any> = {
  DECISION: { icon: GitBranch, color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-500/20" },
  CALENDAR: { icon: Calendar, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-500/20" },
  FINANCIAL: { icon: DollarSign, color: "text-green-500", bg: "bg-green-100 dark:bg-green-500/20" },
  STAKEHOLDER: { icon: Users, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-500/20" },
  SYSTEM: { icon: Info, color: "text-gray-500", bg: "bg-gray-100 dark:bg-gray-500/20" },
  AI_INSIGHT: { icon: Brain, color: "text-indigo-500", bg: "bg-indigo-100 dark:bg-indigo-500/20" },
  REMINDER: { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-100 dark:bg-yellow-500/20" },
};

const priorityColors: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  MEDIUM: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
  LOW: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
};

export default function NotificationsPage() {
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, deleteNotification, isLoading } = useNotificationStore();
  const [selectedTab, setSelectedTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const filtered = notifications.filter((n) => {
    if (selectedTab === "unread") return !n.isRead;
    if (selectedTab !== "all") return n.type === selectedTab;
    if (searchQuery) return n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.message.toLowerCase().includes(searchQuery.toLowerCase());
    return true;
  }).filter((n) => !searchQuery || n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.message.toLowerCase().includes(searchQuery.toLowerCase()));

  const deleteSelected = () => {
    selectedIds.forEach((id) => deleteNotification(id));
    setSelectedIds([]);
    setSelectMode(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#071a2e]">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Stay updated on decisions, meetings, and AI insights</p>
          </div>
          <div className="flex gap-3">
            {unreadCount > 0 && (
              <Button variant="outline" onClick={markAllAsRead} className="gap-2">
                <CheckCheck className="w-4 h-4" />
                Mark all as read
              </Button>
            )}
          </div>
        </div>

        <Card className="mb-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-blue-500" />
              <p className="text-sm">
                You have <strong>{unreadCount}</strong> unread notification{unreadCount !== 1 ? "s" : ""}.
                {unreadCount > 0 && " High priority items require your attention."}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
              <Card>
                <CardContent className="p-4 space-y-1">
                  {[
                    { id: "all", label: "All", count: notifications.length },
                    { id: "unread", label: "Unread", count: unreadCount },
                  ].map((f) => (
                    <button key={f.id} onClick={() => setSelectedTab(f.id)}
                      className={cn("w-full flex items-center justify-between p-2 rounded-lg text-sm", selectedTab === f.id ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600" : "hover:bg-gray-100 dark:hover:bg-white/5")}>
                      <span>{f.label}</span>
                      <Badge variant="secondary">{f.count}</Badge>
                    </button>
                  ))}
                  <div className="pt-2 border-t">
                    {["DECISION", "CALENDAR", "FINANCIAL", "STAKEHOLDER", "AI_INSIGHT", "SYSTEM"].map((type) => (
                      <button key={type} onClick={() => setSelectedTab(type)}
                        className={cn("w-full flex items-center justify-between p-2 rounded-lg text-sm", selectedTab === type ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600" : "hover:bg-gray-100 dark:hover:bg-white/5")}>
                        <span>{type.replace("_", " ")}</span>
                        <span className="text-xs text-gray-500">{notifications.filter((n) => n.type === type).length}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {selectMode ? (
                  <>
                    <Button variant="outline" size="sm" onClick={deleteSelected} className="text-red-600 gap-1">
                      <Trash2 className="w-4 h-4" />Delete ({selectedIds.length})
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectMode(false); setSelectedIds([]); }}>Cancel</Button>
                  </>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setSelectMode(true)}>Select</Button>
                )}
              </div>
              <span className="text-sm text-gray-500">{filtered.length} notification{filtered.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((n, idx) => {
                  const iconData = notificationIcons[n.type] || notificationIcons.SYSTEM;
                  const Icon = iconData.icon;
                  return (
                    <motion.div key={n.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }} transition={{ delay: idx * 0.03 }}>
                      <Card className={cn("transition-all hover:shadow-md", !n.isRead && "border-l-4 border-l-blue-500", selectedIds.includes(n.id) && "ring-2 ring-blue-500")}>
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {selectMode && (
                              <Checkbox checked={selectedIds.includes(n.id)} onCheckedChange={(c) =>
                                setSelectedIds((prev) => c ? [...prev, n.id] : prev.filter((id) => id !== n.id))
                              } />
                            )}
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", iconData.bg)}>
                              <Icon className={cn("w-5 h-5", iconData.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">{n.title}</h3>
                                    <Badge className={priorityColors[n.priority]}>{n.priority.toLowerCase()}</Badge>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{n.message}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => deleteNotification(n.id)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded">
                                    <Trash2 className="w-4 h-4 text-gray-400" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Clock className="w-3 h-3" />
                                  <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                                </div>
                                {!n.isRead && (
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => markAsRead(n.id)}>
                                    <Eye className="w-3 h-3" />Mark read
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {filtered.length === 0 && (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No notifications</h3>
                  <p className="text-gray-500">{searchQuery ? "Try a different search term" : "You're all caught up!"}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
