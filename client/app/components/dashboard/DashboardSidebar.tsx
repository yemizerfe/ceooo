"use client";
// components/dashboard/DashboardSidebar.tsx

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  GitBranch, 
  Calendar, 
  CheckSquare, 
  DollarSign, 
  Users, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Crown,
  Target,
  TrendingUp,
  Zap,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
  { id: 'integrations', label: 'Integrations', icon: Settings, href: '/dashboard/integrations' },
  { id: 'decisions', label: 'Decisions', icon: GitBranch, href: '/dashboard/decisions' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, href: '/dashboard/calendar' },
  { id: 'execution', label: 'Execution', icon: CheckSquare, href: '/dashboard/execution' },
  { id: 'financials', label: 'Financials', icon: DollarSign, href: '/dashboard/financials' },
  { id: 'network', label: 'Network', icon: Users, href: '/dashboard/network' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/dashboard/settings' },
];

export function DashboardSidebar({ isOpen, onToggle, mobileOpen, onMobileClose }: DashboardSidebarProps) {
  const pathname = usePathname();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end px-4 py-3">
        <Button variant="ghost" size="icon" onClick={onMobileClose} aria-label="Close menu" className="lg:hidden">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                isActive 
                  ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-slate-300" 
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
              )}
            >
              <Icon className="w-5 h-5" />
              {isOpen && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Quick Stats */}
      {isOpen && (
        <div className="p-4 border-t border-gray-200 dark:border-white/10">
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">AI Status</span>
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Active & Ready</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Analyzing 2,341 data points</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex items-stretch">
        <aside className={cn(
          "flex flex-col border-r border-gray-200 dark:border-white/10 bg-white dark:bg-[#071a2e] transition-all duration-300",
          isOpen ? "w-64" : "w-20"
        )}>
          {sidebarContent}
        </aside>

        <button
          type="button"
          onClick={onToggle}
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          className="mt-5 -ml-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-md transition-all duration-200 hover:bg-gray-50 dark:border-white/10 dark:bg-[#071a2e] dark:text-slate-300 dark:hover:bg-[#0d1f38]"
        >
          {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onMobileClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white dark:bg-[#071a2e] shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
