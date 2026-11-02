"use client";
// app/components/NotificationBell.tsx
//
// One notification bell for every shell (marketing navbar, dashboard navbar).
// It renders the same records the /dashboard/notifications page lists, so the
// icon and the page can never drift apart again.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  Bell,
  BellOff,
  Brain,
  Calendar,
  CheckCheck,
  Clock,
  DollarSign,
  GitBranch,
  Info,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";

const typeStyles: Record<string, { icon: typeof Bell; className: string }> = {
  DECISION: { icon: GitBranch, className: "text-purple-500" },
  CALENDAR: { icon: Calendar, className: "text-blue-500" },
  FINANCIAL: { icon: DollarSign, className: "text-emerald-500" },
  STAKEHOLDER: { icon: Users, className: "text-orange-500" },
  AI_INSIGHT: { icon: Brain, className: "text-indigo-500" },
  REMINDER: { icon: Clock, className: "text-amber-500" },
  SYSTEM: { icon: Info, className: "text-slate-500" },
};

function relativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationBell({ className }: { className?: string }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const pathname = usePathname();
  // Administrators are kept inside /admin, so their "view all" link must stay
  // there instead of bouncing through the executive dashboard.
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } =
    useNotificationStore();

  useEffect(() => {
    if (isAuthenticated) void fetchNotifications();
  }, [isAuthenticated, fetchNotifications]);

  const preview = notifications.slice(0, 6);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative ${className ?? ""}`}
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                void markAllAsRead();
              }}
              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          ) : (
            <span className="text-xs text-gray-400">All caught up</span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-0" />

        {preview.length ? (
          <div className="max-h-80 overflow-y-auto py-1">
            {preview.map((notification) => {
              const style = typeStyles[notification.type] ?? typeStyles.SYSTEM;
              const Icon = style.icon;
              return (
                <DropdownMenuItem
                  key={notification.id}
                  onSelect={() => {
                    if (!notification.isRead) void markAsRead(notification.id);
                  }}
                  className="flex cursor-pointer items-start gap-3 px-4 py-2.5 focus:bg-gray-50 dark:focus:bg-white/5"
                >
                  <span className="mt-0.5 rounded-lg bg-gray-100 p-1.5 dark:bg-white/10">
                    <Icon className={`h-4 w-4 ${style.className}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-gray-900 dark:text-slate-100">
                        {notification.title}
                      </span>
                      {!notification.isRead && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                      )}
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-xs text-gray-600 dark:text-slate-400">
                      {notification.message}
                    </span>
                    <span className="mt-1 block text-[11px] text-gray-400">
                      {relativeTime(notification.createdAt)}
                    </span>
                  </span>
                </DropdownMenuItem>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <BellOff className="h-6 w-6 text-gray-300" />
            <p className="text-sm text-gray-500 dark:text-slate-400">No notifications yet</p>
          </div>
        )}

        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuItem asChild>
          <Link
            href={pathname?.startsWith("/admin") ? "/admin/notifications" : "/dashboard/notifications"}
            className="w-full justify-center py-2.5 text-sm font-medium text-blue-600 dark:text-blue-400"
          >
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
