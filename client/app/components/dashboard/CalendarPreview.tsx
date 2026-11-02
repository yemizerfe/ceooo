"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Video, Users, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useCalendarStore } from "@/store/calendarStore";

export function CalendarPreview() {
  const { events, fetchUpcoming, isLoading } = useCalendarStore();

  useEffect(() => {
    fetchUpcoming();
  }, [fetchUpcoming]);

  const today = events
    .filter((e) => {
      const eventDate = new Date(e.startTime);
      const now = new Date();
      return eventDate.toDateString() === now.toDateString();
    })
    .slice(0, 4);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "FOCUS_BLOCK": return "bg-green-500";
      case "CALL": return "bg-purple-500";
      case "DEADLINE": return "bg-red-500";
      default: return "bg-blue-500";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "FOCUS_BLOCK": return <Clock className="w-3 h-3" />;
      case "CALL": return <Video className="w-3 h-3" />;
      default: return <Users className="w-3 h-3" />;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <Calendar className="w-5 h-5 text-blue-500" />
          Today's Schedule
        </CardTitle>
        <Link href="/dashboard/calendar">
          <Button variant="ghost" size="sm" className="text-blue-600">View Full Calendar</Button>
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : today.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No events scheduled for today</p>
        ) : (
          <div className="space-y-3">
            {today.map((event, idx) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <div className="text-center min-w-[60px]">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {new Date(event.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div className={`w-1 h-10 rounded-full ${getTypeColor(event.type)}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{event.title}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    {getTypeIcon(event.type)}
                    <span>{event.location || event.type.replace("_", " ")}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
