"use client";

import { debugError } from "@/lib/logger";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Flame, Clock, Target, AlertCircle, DollarSign, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/store/authStore";
import { isPlatformAdmin } from "@/lib/authRouting";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";

export function CompanySnapshot() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isPlatformAdmin(user)) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/api/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setStats(data.data);
      } catch (e) {
        debugError("Failed to fetch snapshot:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user?.role]);

  const snapshotData = [
    {
      label: "Total Decisions",
      value: stats?.stats?.decisionsCount ?? "—",
      change: `${stats?.stats?.pendingDecisions ?? 0} pending`,
      trend: "up",
      icon: Target,
      color: "from-blue-500 to-cyan-500",
    },
    {
      label: "In Progress",
      value: stats?.stats?.inProgressDecisions ?? "—",
      change: "active",
      trend: "up",
      icon: TrendingUp,
      color: "from-green-500 to-emerald-500",
    },
    {
      label: "Completed",
      value: stats?.stats?.completedDecisions ?? "—",
      change: "decided",
      trend: "up",
      icon: AlertCircle,
      color: "from-purple-500 to-indigo-500",
    },
    {
      label: "Company",
      value: user?.companyName ? user.companyName.slice(0, 8) + (user.companyName.length > 8 ? "…" : "") : "—",
      change: user?.industry || "Not set",
      trend: "up",
      icon: Flame,
      color: "from-orange-500 to-red-500",
    },
    {
      label: "Plan",
      value: user?.subscriptionPlan ?? "free",
      change: user?.isVerified ? "verified" : "unverified",
      trend: "up",
      icon: DollarSign,
      color: "from-yellow-500 to-orange-500",
    },
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Company Snapshot</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {loading ? "Loading..." : "Updated just now"}
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {snapshotData.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div key={item.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <Card className="p-4 hover:shadow-md transition-shadow">
                {loading ? (
                  <div className="flex items-center justify-center h-16">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400 dark:text-gray-500" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center shadow-md`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-400/30">
                        {item.change}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{item.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.label}</p>
                  </>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
