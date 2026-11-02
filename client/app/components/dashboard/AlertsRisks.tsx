"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, Users, Clock, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNotificationStore } from "@/store/notificationStore";

export function AlertsRisks() {
  const { notifications, fetchNotifications, isLoading } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const highPriority = notifications
    .filter((n) => n.priority === "HIGH" && !n.isRead)
    .slice(0, 3);

  const criticalCount = notifications.filter((n) => n.priority === "HIGH" && !n.isRead).length;

  const getIcon = (type: string) => {
    switch (type) {
      case "FINANCIAL": return <TrendingUp className="w-4 h-4 text-red-500" />;
      case "CALENDAR": return <Clock className="w-4 h-4 text-yellow-500" />;
      case "STAKEHOLDER": return <Users className="w-4 h-4 text-red-500" />;
      default: return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          Alerts & Risks
        </CardTitle>
        <Badge variant="outline" className="text-red-600 border-red-200">
          {criticalCount} critical
        </Badge>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : highPriority.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No critical alerts right now</p>
        ) : (
          <div className="space-y-3">
            {highPriority.map((alert, idx) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-3 rounded-lg border-l-4 border-red-500 bg-red-50 dark:bg-red-500/10"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getIcon(alert.type)}
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{alert.title}</span>
                  </div>
                  <Badge variant="destructive" className="text-xs">high</Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-6">{alert.message}</p>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
