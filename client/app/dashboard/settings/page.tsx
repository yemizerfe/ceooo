"use client";
import { debugError } from "@/lib/logger";
// app/dashboard/settings/page.tsx

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import {
  Palette,
  Moon,
  Sun,
  Save,
  CheckCircle2,
  Loader2,
  Bell,
  Type,
  Layout,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const router = useRouter();
  const { user, updateUser, isAuthenticated } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    pushNotifications: true,
    meetingReminders: true,
    aiInsights: true,
    weeklyDigest: true,
    decisionUpdates: true,
  });

  const [appearance, setAppearance] = useState({
    theme: typeof window !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light",
    fontSize: "medium",
    compactView: false,
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/signin");
    } else {
      fetchPreferences();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const getToken = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/signin");
      return null;
    }
    return token;
  };

  const fetchPreferences = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/user/preferences`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch preferences");

      const data = await response.json();
      if (data.success && data.data.preferences) {
        const prefs = data.data.preferences;
        
        if (prefs.notifications) setNotifications(prefs.notifications);
        if (prefs.appearance) {
          // Reflect the currently applied theme instead of a stale/"system" value
          const currentIsDark = document.documentElement.classList.contains("dark");
          setAppearance((prev) => ({
            ...prev,
            ...prefs.appearance,
            theme: prefs.appearance.theme === "light" || prefs.appearance.theme === "dark"
              ? prefs.appearance.theme
              : currentIsDark ? "dark" : "light",
          }));
        }
      }
    } catch (e) {
      debugError("Failed to fetch preferences:", e);
    }
  };

  const handleSaveNotifications = async () => {
    const token = getToken();
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/user/preferences`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notifications }),
      });

      if (!response.ok) throw new Error("Failed to update notifications");

      const data = await response.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      debugError("Failed to save notifications:", e);
      setError("Failed to save notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAppearance = async () => {
    const token = getToken();
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/user/preferences`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ appearance }),
      });

      if (!response.ok) throw new Error("Failed to update appearance");

      const data = await response.json();
      if (data.success) {
        // Apply theme changes immediately
        if (appearance.theme === "dark") {
          document.documentElement.classList.add("dark");
        } else if (appearance.theme === "light") {
          document.documentElement.classList.remove("dark");
        } else {
          // System theme
          const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          if (isDark) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        }

        // Apply font size
        document.documentElement.style.fontSize = 
          appearance.fontSize === "small" ? "14px" :
          appearance.fontSize === "large" ? "18px" : "16px";

        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      debugError("Failed to save appearance:", e);
      setError("Failed to save appearance");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/20 dark:bg-[radial-gradient(circle_at_top,_#0c1f39_0%,_#071a2e_48%,_#051522_100%)]">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Settings</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2 text-base">Customize your experience</p>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30 font-medium">
            {error}
          </div>
        )}

        {saved && (
          <div className="mb-4 p-4 rounded-xl bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-500/30 flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5" />
            Changes saved successfully!
          </div>
        )}

        <Tabs defaultValue="notifications" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-100 dark:bg-[#0d1f38] p-1.5 rounded-2xl border border-gray-200 dark:border-white/10">
            <TabsTrigger 
              value="notifications"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#122b46] data-[state=active]:text-gray-900 dark:data-[state=active]:text-white data-[state=active]:shadow-lg dark:data-[state=active]:shadow-black/20 text-gray-600 dark:text-slate-400 rounded-xl transition-all duration-200 font-semibold"
            >
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger 
              value="appearance"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#122b46] data-[state=active]:text-gray-900 dark:data-[state=active]:text-white data-[state=active]:shadow-lg dark:data-[state=active]:shadow-gray-900/20 text-gray-600 dark:text-slate-400 rounded-xl transition-all duration-200 font-semibold"
            >
              <Palette className="w-4 h-4 mr-2" />
              Appearance
            </TabsTrigger>
          </TabsList>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card className="border-0 shadow-lg dark:shadow-2xl bg-white dark:bg-[#0d1f38] dark:border dark:border-white/10">
              <CardHeader className="border-b border-gray-100 dark:border-white/10 pb-6">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10">
                    <Bell className="w-5 h-5 text-blue-600 dark:text-slate-300" />
                  </div>
                  <span className="text-gray-900 dark:text-white">Notification Preferences</span>
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 ml-14">
                  Choose how you want to be notified
                </p>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-[#122b46]/60 border border-gray-100 dark:border-white/10 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all duration-200">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Email Alerts</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Receive important updates via email</p>
                    </div>
                    <Switch
                      checked={notifications.emailAlerts}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, emailAlerts: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-[#122b46]/60 border border-gray-100 dark:border-white/10 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all duration-200">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Push Notifications</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Get real-time desktop notifications</p>
                    </div>
                    <Switch
                      checked={notifications.pushNotifications}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, pushNotifications: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-[#122b46]/60 border border-gray-100 dark:border-white/10 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all duration-200">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Meeting Reminders</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Get reminders 15 minutes before meetings</p>
                    </div>
                    <Switch
                      checked={notifications.meetingReminders}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, meetingReminders: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-[#122b46]/60 border border-gray-100 dark:border-white/10 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all duration-200">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">AI Insights</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Weekly AI-generated business insights</p>
                    </div>
                    <Switch
                      checked={notifications.aiInsights}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, aiInsights: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-[#122b46]/60 border border-gray-100 dark:border-white/10 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all duration-200">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Weekly Digest</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Summary of your week every Monday</p>
                    </div>
                    <Switch
                      checked={notifications.weeklyDigest}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, weeklyDigest: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-[#122b46]/60 border border-gray-100 dark:border-white/10 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all duration-200">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Decision Updates</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Notifications when decisions are updated</p>
                    </div>
                    <Switch
                      checked={notifications.decisionUpdates}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, decisionUpdates: checked })}
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleSaveNotifications} 
                  className="w-full gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200" 
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save Notification Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance">
            <Card className="border-0 shadow-lg dark:shadow-2xl bg-white dark:bg-[#0d1f38] dark:border dark:border-white/10">
              <CardHeader className="border-b border-gray-100 dark:border-white/10 pb-6">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-500/10">
                    <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-gray-900 dark:text-white">Appearance Settings</span>
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 ml-14">
                  Customize how CEOOO looks
                </p>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-4">
                  <div className="p-5 rounded-xl bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700/50 dark:to-blue-900/20 border border-gray-100 dark:border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {appearance.theme === "dark" ? (
                          <div className="p-2 rounded-lg bg-blue-500/10">
                            <Moon className="w-5 h-5 text-blue-600 dark:text-slate-300" />
                          </div>
                        ) : (
                          <div className="p-2 rounded-lg bg-amber-500/10">
                            <Sun className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">Theme</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Choose your preferred color scheme</p>
                        </div>
                      </div>
                      <Select value={appearance.theme} onValueChange={(v) => setAppearance({ ...appearance, theme: v })}>
                        <SelectTrigger className="w-36 bg-white dark:bg-[#0d1f38] border-gray-200 dark:border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#0d1f38] border-gray-200 dark:border-white/10">
                          <SelectItem value="light" className="dark:text-gray-200">Light</SelectItem>
                          <SelectItem value="dark" className="dark:text-gray-200">Dark</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="p-5 rounded-xl bg-gray-50 dark:bg-[#122b46]/60 border border-gray-100 dark:border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-500/10">
                          <Type className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">Font Size</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Adjust text size for readability</p>
                        </div>
                      </div>
                      <Select value={appearance.fontSize} onValueChange={(v) => setAppearance({ ...appearance, fontSize: v })}>
                        <SelectTrigger className="w-36 bg-white dark:bg-[#0d1f38] border-gray-200 dark:border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#0d1f38] border-gray-200 dark:border-white/10">
                          <SelectItem value="small" className="dark:text-gray-200">Small</SelectItem>
                          <SelectItem value="medium" className="dark:text-gray-200">Medium</SelectItem>
                          <SelectItem value="large" className="dark:text-gray-200">Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="p-5 rounded-xl bg-gray-50 dark:bg-[#122b46]/60 border border-gray-100 dark:border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-teal-500/10">
                          <Layout className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">Compact View</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Reduce spacing to show more content</p>
                        </div>
                      </div>
                      <Switch
                        checked={appearance.compactView}
                        onCheckedChange={(checked) => setAppearance({ ...appearance, compactView: checked })}
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleSaveAppearance} 
                  className="w-full gap-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white font-semibold py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200" 
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Apply Appearance Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
