"use client";
// components/dashboard/DashboardNavbar.tsx

import React, { useCallback, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { 
  Crown, 
  LayoutDashboard, 
  Brain, 
  GitBranch, 
  Calendar, 
  CheckSquare, 
  DollarSign, 
  Users, 
  FileText, 
  BarChart3, 
  Clock,
  Settings,
  LogOut,
  Search,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  Target,
  TrendingUp,
  Shield,
  MessageCircle,
  FolderKanban,
  Activity,
  CreditCard,
  UserCircle,
  HelpCircle,
  LifeBuoy,
  Award,
  Home,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchHotkey } from "@/hooks/useSearchHotkey";
import NotificationBell from "@/app/components/NotificationBell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Navigation structure based on app features
const navItems: {
  category: string;
  items: {
    name: string;
    href: string;
    icon: React.ComponentType<any>;
    description: string;
    badge?: string;
  }[];
}[] = [
  {
    category: "Core",
    items: [
      { 
        name: "Dashboard", 
        href: "/dashboard", 
        icon: LayoutDashboard,
        description: "Executive overview & insights"
      },
      {
        name: "Integrations",
        href: "/dashboard/integrations",
        icon: Settings,
        description: "Connect business systems"
      }
    ]
  },
  {
    category: "Intelligence",
    items: [
      { 
        name: "AI Decision Making", 
        href: "/dashboard/decisions", 
        icon: Brain,
        description: "AI-powered business decisions",
        badge: "AI"
      },
      { 
        name: "AI Insights", 
        href: "/dashboard/ai-insights", 
        icon: Sparkles,
        description: "Predictive analytics & trends",
        badge: "New"
      }
    ]
  },
  {
    category: "Operations",
    items: [
      { 
        name: "Project Management", 
        href: "/dashboard/projects", 
        icon: FolderKanban,
        description: "Track initiatives & tasks"
      },
      { 
        name: "Execution Tracker", 
        href: "/dashboard/execution", 
        icon: CheckSquare,
        description: "Monitor progress & OKRs"
      }
    ]
  },
  {
    category: "Financial",
    items: [
      { 
        name: "Financial Tracking", 
        href: "/dashboard/financials", 
        icon: DollarSign,
        description: "Revenue, burn, & forecasts"
      },
      { 
        name: "Budget & Costs", 
        href: "/dashboard/budget", 
        icon: CreditCard,
        description: "Expense management"
      }
    ]
  },
  {
    category: "Collaboration",
    items: [
      { 
        name: "Stakeholders", 
        href: "/dashboard/network", 
        icon: Users,
        description: "Investor & partner relations"
      },
      { 
        name: "Notes Board", 
        href: "/dashboard/notes", 
        icon: FileText,
        description: "AI-powered documentation"
      },
      { 
        name: "Team", 
        href: "/dashboard/team", 
        icon: MessageCircle,
        description: "Internal communication"
      }
    ]
  },
  {
    category: "Productivity",
    items: [
      { 
        name: "Time & Calendar", 
        href: "/dashboard/calendar", 
        icon: Calendar,
        description: "Smart scheduling"
      },
      { 
        name: "Company Performance", 
        href: "/dashboard/performance", 
        icon: BarChart3,
        description: "KPI & OKR tracking"
      },
    
    ]
  }
];

const quickActions = [
  { name: "New Decision", icon: GitBranch, href: "/dashboard/decisions" },
  { name: "Schedule Meeting", icon: Calendar, href: "/dashboard/calendar" },
  { name: "Take Note", icon: FileText, href: "/dashboard/notes" },
  { name: "Run Analysis", icon: Brain, href: "/dashboard/ai-insights" },
];

export function DashboardNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data || []);
      } else {
        setSearchResults([]);
      }
    } catch (e) {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  }, []);

  // Makes the "⌘K" hint on the search button real, and Escape close the palette.
  useSearchHotkey({
    isOpen: searchOpen,
    open: () => setSearchOpen(true),
    close: closeSearch,
  });

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const NavLinks = () => (
    <>
      {navItems.map((category) => (
        <div key={category.category} className="mb-4">
          <div className="px-3 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {category.category}
          </div>
          {category.items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group",
                  isActive 
                    ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-slate-300" 
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-blue-500" : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300")} />
                <span className="flex-1">{item.name}</span>
                {item.badge && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );

  return (
    <>
      {/* Top Navbar */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled 
          ? "bg-white/95 dark:bg-[#071a2e]/95 backdrop-blur-sm shadow-sm dark:shadow-blue-900/20" 
          : "bg-white dark:bg-[#071a2e] border-b border-gray-200 dark:border-white/10"
      )}>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button aria-label="icon"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-[#122b46]/60 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>

              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Crown className="w-4 h-4 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white hidden sm:inline">
                  CEOOO
                </span>
              </Link>

              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="hidden md:flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-200 dark:border-white/10 dark:bg-[#0d1f38] dark:text-slate-300 dark:hover:bg-[#122b46]"
              >
                <Search className="w-4 h-4" />
                <span>Quick search</span>
                <kbd className="hidden lg:inline-block rounded border border-gray-300 bg-white px-1 text-[10px] dark:border-white/10 dark:bg-[#071a2e]">⌘K</kbd>
              </button>
            </div>

            {/* Desktop Navigation - hover based */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((category) => (
                <div
                  key={category.category}
                  className="relative"
                  onMouseEnter={() => setActiveCategory(category.category)}
                  onMouseLeave={() => setTimeout(() => setActiveCategory(null), 200)}
                >
                  <button
                    className={cn(
                      "flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      activeCategory === category.category
                        ? "text-blue-600 dark:text-slate-400 bg-gray-100 dark:bg-[#0d1f38]/60"
                        : "text-gray-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-gray-100 dark:hover:bg-[#122b46]/40"
                    )}
                  >
                    {category.category}
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${activeCategory === category.category ? "rotate-180" : ""}`} />
                  </button>

                  {activeCategory === category.category && (
                    <div className="absolute top-full left-0 mt-0 bg-white dark:bg-gradient-to-b dark:from-[#0d1f38] dark:to-[#122b46] border border-gray-100 dark:border-white/10 rounded-xl shadow-xl z-50 w-64 py-2">
                      {category.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setActiveCategory(null)}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#122b46]/60 transition-colors"
                          >
                            <Icon className="w-4 h-4 mt-0.5 text-blue-600 dark:text-slate-400 shrink-0" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</span>
                                {item.badge && <span className="text-xs bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-slate-400 px-1.5 py-0.5 rounded-full border dark:border-white/10">{item.badge}</span>}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{item.description}</p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2">
              {/* Home Link */}
              <Link href="/">
                <Button variant="ghost" size="icon" className="relative" title="Go to Home">
                  <Home className="w-5 h-5" />
                </Button>
              </Link>

              {/* Quick Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Sparkles className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <DropdownMenuItem key={action.name} asChild>
                        <Link href={action.href} className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span>{action.name}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Notifications - shared with the marketing shell and the page */}
              <NotificationBell />

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 ml-2 focus:outline-none">
                    <Avatar className="w-8 h-8">
                      {/* An empty src never settles as "error", which leaves the circle blank instead of
                          showing the initials fallback until the profile page loads a real avatar. */}
                      {user?.avatarUrl ? (
                        <AvatarImage src={user.avatarUrl} alt={user?.name ? `${user.name}'s avatar` : "Profile picture"} />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                        {user?.name?.charAt(0) || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user?.role}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                      <Link href="/dashboard/profile" className="flex items-center gap-2">
                      <UserCircle className="w-4 h-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings" className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/help" className="flex items-center gap-2">
                      <LifeBuoy className="w-4 h-4" />
                      <span>Help & Support</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {searchOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center pt-20" onClick={() => { setSearchOpen(false); setSearchQuery(""); setSearchResults([]); }}>
          <div className="w-full max-w-2xl mx-4 rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0d1f38]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-gray-200 p-4 dark:border-white/10">
              <Search className="w-5 h-5 text-gray-400 dark:text-slate-400" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); handleSearch(e.target.value); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    router.push(`/dashboard/search?q=${encodeURIComponent(searchQuery.trim())}`);
                    setSearchOpen(false);
                  }
                }}
                placeholder="Search decisions, notes, projects, people…"
                className="w-full border-0 bg-transparent text-base text-gray-800 placeholder:text-gray-400 focus:outline-none dark:text-white dark:placeholder:text-slate-400"
              />
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {searchLoading ? (
                <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">Searching...</p>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((result: any) => (
                    <Link
                      key={`${result.type}-${result.id}`}
                      href={result.url}
                      onClick={() => { setSearchOpen(false); setSearchQuery(""); setSearchResults([]); }}
                      className="flex flex-col gap-1 rounded-xl px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-[#122b46]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{result.title}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase">{result.type}</span>
                      </div>
                      {result.snippet && <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{result.snippet}</p>}
                    </Link>
                  ))}
                </div>
              ) : searchQuery.trim() ? (
                <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">No results found</p>
              ) : (
                <>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Recent searches</p>
                  <div className="space-y-2">
                    {[
                      "Market expansion strategy",
                      "Q4 financial review",
                      "Hiring plan",
                    ].map((term) => (
                      <button
                        key={term}
                        type="button"
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-[#122b46]"
                        onClick={() => { setSearchQuery(term); handleSearch(term); }}
                      >
                        <Search className="w-4 h-4 text-gray-400 dark:text-slate-400" />
                        {term}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {searchQuery.trim() && (
              <div className="border-t border-gray-200 p-3 dark:border-white/10">
                <Link
                  href={`/dashboard/search?q=${encodeURIComponent(searchQuery.trim())}`}
                  onClick={() => { setSearchOpen(false); setSearchQuery(""); setSearchResults([]); }}
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                >
                  View all results
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Sidebar Menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-80 p-0 bg-white dark:bg-gradient-to-b dark:from-[#071a2e] dark:to-[#0d1f38] overflow-y-auto border-gray-200 dark:border-white/10">
          <SheetHeader className="p-4 border-b border-gray-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                <Crown className="w-4 h-4 text-white" />
              </div>
              <SheetTitle className="text-gray-900 dark:text-white">CEOOO</SheetTitle>
            </div>
          </SheetHeader>
          
          <div className="p-4">
            {/* Navigation Links */}
            <div className="space-y-6">
              {navItems.map((category) => (
                <div key={category.category}>
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-3">
                    {category.category}
                  </div>
                  {category.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 mb-1",
                          isActive 
                            ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-slate-300" 
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="flex-1">{item.name}</span>
                        {item.badge && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Quick Actions in Mobile */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
              <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3 px-3">
                Quick Actions
              </div>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.name}
                      href={action.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-[#0d1f38]/60 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-[#122b46] transition-colors"
                    >
                      <Icon className="w-4 h-4" />
                      <span>{action.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* User Info in Mobile */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-3 px-3 py-2">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                    {user?.name?.charAt(0) || 'C'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                </div>
              </div>
              <div className="mt-2 space-y-1">
                <Link href="/dashboard/profile" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-[#122b46]/60 rounded-lg">
                  <UserCircle className="w-4 h-4" />
                  Profile
                </Link>
                <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-[#122b46]/60 rounded-lg">
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

    </>
  );
}

