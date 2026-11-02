"use client";
// components/admin/AdminSidebar.tsx

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Settings,
  UserRound,
  LogOut,
  Menu,
  ShieldCheck,
  Plug,
  Bell,
  Activity,
  KeyRound,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";

function CeoooBrand({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-3">
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl blur-lg opacity-40" />
      <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2 3h10v1H7v-1z" /></svg>
      </div>
    </div>
    {!compact && <div><span className="block text-xl font-bold tracking-tight text-gray-900 dark:text-slate-200">CEOOO</span><span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Admin Control</span></div>}
  </div>;
}

const adminNavGroups = [
  {
    label: '',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' }],
  },
  {
    label: 'User management',
    items: [
      { id: 'users', label: 'Users', icon: Users, href: '/admin/users' },
      { id: 'roles', label: 'Roles', icon: ShieldCheck, href: '/admin/roles' },
      { id: 'permissions', label: 'Permissions', icon: KeyRound, href: '/admin/permissions' },
    ],
  },
  {
    label: 'Organization',
    items: [{ id: 'organization', label: 'Organizations', icon: Building2, href: '/admin/organizations' }],
  },
  {
    label: 'System',
    items: [
      { id: 'integrations', label: 'Integrations', icon: Plug, href: '/admin/integrations' },
      { id: 'support', label: 'Support Inbox', icon: Inbox, href: '/admin/support' },
      { id: 'notifications', label: 'Notifications', icon: Bell, href: '/admin/notifications' },
      { id: 'audit-logs', label: 'Audit Logs', icon: FileText, href: '/admin/audit-logs' },
      { id: 'system-health', label: 'System Health', icon: Activity, href: '/admin/system-health' },
    ],
  },
  {
    label: 'Settings',
    items: [{ id: 'settings', label: 'Settings', icon: Settings, href: '/admin/settings' }],
  },
];

interface AdminSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AdminSidebar({ mobileOpen, onMobileClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-4 py-4 border-b border-gray-200/70 dark:border-white/10">
        <CeoooBrand />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-5 overflow-y-auto" aria-label="Admin navigation">
        {adminNavGroups.map((group) => (
          <div key={group.label || 'main'}>
            {group.label && (
              <p className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={onMobileClose}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-slate-300"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
                    )}
                  >
                    <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-slate-400")} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200/70 dark:border-white/10">
        <Link href="/admin/profile" onClick={onMobileClose} className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-white/5">
          <UserRound className="h-4 w-4" /> Admin Profile
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
          onClick={() => {
            // Shared sign-in page for every role: clear the session and let the
            // store send the user to the same login the dashboard uses.
            useAuthStore.getState().logout();
            router.push("/signin");
          }}
        >
          <LogOut className="w-4 h-4 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:border-gray-200/70 dark:border-white/10 lg:bg-white dark:lg:bg-[#071a2e]">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onMobileClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-gradient-to-b dark:from-[#071a2e] dark:to-[#0d1f38] shadow-2xl overflow-y-auto border-r border-gray-200 dark:border-white/10">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

export function AdminMobileHeader({ onMobileOpen }: { onMobileOpen: () => void }) {
  return (
    <header className="lg:hidden flex items-center justify-between h-16 px-4 border-b border-gray-200/70 dark:border-white/10 bg-white/95 dark:bg-[#071a2e]/95 backdrop-blur-sm">
      <CeoooBrand />
      <Button variant="ghost" size="icon" onClick={onMobileOpen} aria-label="Open admin menu" className="text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/5">
        <Menu className="w-5 h-5" />
      </Button>
    </header>
  );
}
