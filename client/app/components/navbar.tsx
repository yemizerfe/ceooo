"use client";
import React, { useCallback, useEffect, useState, useRef } from "react";
import gsap from "gsap";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";
import { isPlatformAdmin } from "@/lib/authRouting";
import {
  ArrowRight,
  ChevronDown,
  GitBranch,
  CheckCircle,
  BookOpen,
  FileText,
  Users,
  Lightbulb,
  DollarSign,
  HelpCircle,
  NotebookPen,
  BarChart2,
  CalendarDays,
  LayoutDashboard,
  Settings,
  UserCircle,
  LogOut,
  Search,
  Menu,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSearchHotkey } from "@/hooks/useSearchHotkey";
import { ThemeToggle } from "./ThemeToggle";
import NotificationBell from "./NotificationBell";
import { searchSite } from "@/lib/siteSearch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type menuItem =
  | {
      icon?: React.ComponentType<{ className?: string }>;
      label: string;
      href: string;
      description: string;
      external?: boolean;
      badge?: string;
      vibrant?: "highlight";
    }
  | { separator: true };

function MobileMenuLink({
  item,
  onNavigate,
}: {
  item: menuItem;
  onNavigate: () => void;
}) {
  if ("separator" in item) {
    return <div className="my-1.5 h-px bg-gray-100 dark:bg-white/5" />;
  }

  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className="flex items-center justify-between gap-3 rounded-xl px-1 py-2.5 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-white/5"
    >
      <span className="flex items-center gap-2.5">
        {Icon ? <Icon className="h-4 w-4 text-gray-400 dark:text-slate-500" /> : null}
        {item.label}
      </span>
      {item.badge ? (
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

export default function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { fetchNotifications } = useNotificationStore();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated, fetchNotifications]);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  }, []);

  // The button advertises "⌘K", so the shortcut must open the palette.
  useSearchHotkey({
    isOpen: searchOpen,
    open: () => setSearchOpen(true),
    close: closeSearch,
  });
  const menuItemsRef = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const closeTimeoutRef = useRef<number | null>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    // Visitors without a session still get results: the public pages index.
    if (!isAuthenticated) {
      setSearchResults(searchSite(query));
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

  const clearMenuCloseTimeout = () => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const openMenu = (key: string) => {
    clearMenuCloseTimeout();
    setMenuOpen(key);
  };

  const scheduleMenuClose = (key: string) => {
    clearMenuCloseTimeout();
    closeTimeoutRef.current = window.setTimeout(() => {
      setMenuOpen((current) => (current === key ? null : current));
    }, 140);
  };

  useEffect(() => {
    gsap.fromTo(
      ".nav-container",
      {
        opacity: 0,
        y: -50,
        backdropFilter: "blur(0px)",
      },
      {
        opacity: 1,
        y: 0,
        backdropFilter: "blur(20px)",
        duration: 0.8,
        ease: "power3.out",
      },
    );
    
    // Animate logo with micro-interaction
    gsap.fromTo(
      ".nav-logo",
      {
        scale: 0.8,
        rotate: -10,
        opacity: 0,
      },
      {
        scale: 1,
        rotate: 0,
        opacity: 1,
        duration: 0.8,
        delay: 0.2,
        ease: "elastic.out(1, 0.6)",
      },
    );
    
    // Stagger menu items
    gsap.fromTo(
      ".nav-menu-item",
      {
        opacity: 0,
        y: -20,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        delay: 0.3,
        ease: "power2.out",
      },
    );
    
    // Animate CTA buttons
    gsap.fromTo(
      ".nav-cta",
      {
        opacity: 0,
        scale: 0.9,
      },
      {
        opacity: 1,
        scale: 1,
        duration: 0.6,
        delay: 0.5,
        ease: "back.out(1.4)",
      },
    );
  }, []);

  const fetauresItems: menuItem[] = [
    {
      icon: GitBranch,
      label: "Decision Making",
      href: "/features/decision-making",
      description: "Make informed decisions with our AI-powered decision-making tools.",
    },
    {
      icon: Users,
      label: "Connecting with stakeholders",
      href: "/features/stackholderconnection",
      description: "Connect and collaborate with your stakeholders seamlessly.",
    },
    {
      icon: CheckCircle,
      label: "Project Management",
      href: "/features/projectmanagemnet",
      description: "Manage your projects efficiently with our intuitive project management tools.",
      badge: "New",
    },
    {
      icon: Lightbulb,
      label: "AI-Powered Insights",
      href: "/features/ai-insights",
      description: "Get actionable insights powered by artificial intelligence.",
    },
    {
      icon: DollarSign,
      label: "Track financial issues",
      href: "/features/financial-tracking",
      description: "Track and manage financial issues effectively.",
    },
    { separator: true },
    {
      icon: NotebookPen,
      label: "Manual & AI Notes Board",
      href: "/features/notes-board",
      description: "Capture notes manually or let AI summarize and organize them for you.",
      badge: "New",
    },
    {
      icon: BarChart2,
      label: "Track Company Performance",
      href: "/features/company-performance",
      description: "Monitor KPIs and company performance in real time.",
    },
    {
      icon: CalendarDays,
      label: "Calendar & Time Management",
      href: "/features/time-calendar",
      description: "Manage your schedule and time with smart calendar tools.",
    },
  ];

  const resourcesItems: menuItem[] = [
    {
      icon: BookOpen,
      label: "Documentation",
      href: "/documentation",
      description: "Comprehensive guides and API references.",
    },
    {
      icon: FileText,
      label: "Templates",
      href: "/templates",
      description: "Easy your job with our best templates.",
    },
    {
      separator: true,
    },
    {
      icon: HelpCircle,
      label: "FAQ",
      href: "/FAQ",
      description: "Ask anything.",
    },
    {
      icon: Settings,
      label: "Integrations",
      href: "/dashboard/integrations",
      description: "Connect your favorite tools and services.",
      badge: "New",
    },
  ];

  const menu = [
    {
      key: "Features",
      label: "Features",
      items: fetauresItems,
    },
    {
      key: "resources",
      label: "Resources",
      items: resourcesItems,
    },
  ];

  return (
    <nav className="nav-container sticky top-0 z-50 bg-white/80 dark:bg-[#071a2e]/95 backdrop-blur-2xl border-b border-gray-200/50 dark:border-white/10 shadow-lg shadow-gray-900/5 dark:shadow-blue-900/20 py-2 mx-auto overflow-visible transition-all duration-500 hover:shadow-xl hover:shadow-gray-900/10">
      <div className="relative flex items-center px-4 sm:px-6 lg:px-10 h-16">
        <div className="flex items-center gap-4">
          <Link href="/">
            <div className="nav-logo flex items-center gap-3 group cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-300"></div>
                <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-xl group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:scale-105 group-hover:rotate-3">
                  <svg className="w-7 h-7 text-white transform group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2 3h10v1H7v-1z"/>
                  </svg>
                </div>
              </div>
              <span className="text-gray-900 dark:text-slate-200 font-bold text-xl hidden sm:inline tracking-tight group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:bg-clip-text transition-all duration-300">CEOOO</span>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100/80 text-gray-600 hover:bg-gray-200 dark:bg-[#0d1f38]/80 dark:text-slate-300 dark:hover:bg-[#122b46] border border-gray-200/70 dark:border-white/10"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm font-medium">Quick search</span>
            <span className="hidden lg:inline text-[10px] font-semibold px-1.5 py-0.5 rounded border border-gray-300 dark:border-white/10 bg-white/70 dark:bg-[#071a2e]/80">⌘K</span>
          </button>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center gap-1">
          {menu.map((item) => (
            <div
              key={item.key}
              className="nav-menu-item relative"
              onMouseEnter={() => openMenu(item.key)}
              onMouseLeave={() => scheduleMenuClose(item.key)}
            >
              <button
                type="button"
                aria-expanded={menuOpen === item.key}
                className="flex items-center text-base gap-1.5 px-5 py-2.5 rounded-2xl text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gradient-to-br hover:from-gray-50 hover:to-blue-50/50 dark:hover:from-slate-800 dark:hover:to-slate-700 transition-all duration-300 cursor-pointer font-semibold tracking-tight relative group overflow-hidden"
              >
                <span className="relative z-10">{item.label}</span>
                <ChevronDown
                  className={`w-4 h-4 transition-all duration-500 text-gray-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-300 relative z-10 ${menuOpen === item.key ? "rotate-180 text-blue-600 dark:text-slate-400" : ""}`}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
              <div
                ref={(el) => { menuItemsRef.current[item.key] = el; }}
                onMouseEnter={() => openMenu(item.key)}
                onMouseLeave={() => scheduleMenuClose(item.key)}
                className="absolute top-full mt-3 shadow-2xl bg-white/95 dark:bg-gradient-to-b dark:from-[#0d1f38] dark:to-[#122b46] backdrop-blur-2xl rounded-3xl border border-gray-200/60 dark:border-white/10 w-[680px] py-6 z-50 transition-all duration-500 overflow-hidden"
                style={{
                  opacity: menuOpen === item.key ? 1 : 0,
                  transform: menuOpen === item.key ? "translateX(-50%) translateY(0px) scale(1)" : "translateX(-50%) translateY(-10px) scale(0.98)",
                  pointerEvents: menuOpen === item.key ? "auto" : "none",
                  left: "50%",
                  position: "absolute",
                }}
              >
                {/* Gradient overlay effect */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                
                <div className="grid grid-cols-3 gap-2 px-2">
                  {item.items.map((subItem, index) =>
                    "separator" in subItem ? (
                      <div key={index} className="col-span-3">
                        <hr className="my-4 mx-6 border-t border-gray-200/60 dark:border-white/10" />
                      </div>
                    ) : (
                      <Link
                        key={index}
                        href={subItem.href || '#'}
                        onClick={() => setMenuOpen(null)}
                        className="flex items-start gap-3 px-4 py-4 rounded-2xl hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50/50 dark:hover:from-slate-700 dark:hover:to-blue-900/20 transition-all duration-300 group/item mx-2 relative overflow-hidden"
                      >
                        {/* Hover shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-blue-400/10 to-transparent -translate-x-full group-hover/item:translate-x-full transition-transform duration-700"></div>
                        
                        {subItem.icon && (
                          <div className="relative z-10 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-500/20 dark:to-indigo-500/20 flex items-center justify-center group-hover/item:from-blue-200 group-hover/item:to-indigo-200 dark:group-hover/item:from-blue-500/30 dark:group-hover/item:to-indigo-500/30 transition-all duration-300 group-hover/item:scale-110 group-hover/item:rotate-3 shrink-0 shadow-sm">
                            <subItem.icon className="w-5 h-5 text-blue-600 dark:text-slate-400 group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-300 transition-colors duration-300" />
                          </div>
                        )}
                        <div className="flex flex-col relative z-10">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-gray-900 dark:text-white tracking-tight group-hover/item:text-blue-600 dark:group-hover/item:text-blue-300 transition-colors duration-300">{subItem.label}</span>
                            {subItem.badge && (
                              <span className="text-xs bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-2.5 py-1 rounded-full font-semibold shadow-lg shadow-blue-500/30 animate-pulse">{subItem.badge}</span>
                            )}
                          </div>
                          {subItem.description && <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed group-hover/item:text-gray-700 dark:group-hover/item:text-blue-50 transition-colors duration-300">{subItem.description}</p>}
                        </div>
                      </Link>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
          <Link href="/pricing" className="nav-menu-item font-semibold text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white text-base px-5 py-2.5 rounded-2xl hover:bg-gradient-to-br hover:from-gray-50 hover:to-blue-50/50 dark:hover:from-slate-800 dark:hover:to-slate-700 transition-all duration-300 tracking-tight relative group overflow-hidden">
            <span className="relative z-10">Pricing</span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </Link>
        </div>

        <div className="ml-auto hidden lg:flex items-center gap-4">
          {isAuthenticated && user ? (
            <>
              {/* Dashboard Link */}
              <Link href="/dashboard" className="nav-cta text-base font-semibold text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white border-2 border-gray-200 dark:border-white/10 rounded-2xl hover:bg-gray-50 dark:hover:bg-[#0d1f38]/60 hover:border-gray-300 dark:hover:border-blue-600/50 transition-all duration-300 px-6 py-2.5 tracking-tight relative group overflow-hidden">
                <span className="relative z-10 flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-gray-500/0 via-gray-500/5 to-gray-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>

              {/* Notifications - shared with the dashboard shell and the page */}
              <NotificationBell className="nav-cta" />

              {/* User Profile Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 focus:outline-none nav-cta">
                    <Avatar className="w-9 h-9 border-2 border-gray-200 dark:border-white/10">
                      {/* Only mount the image when there is a real src, otherwise the
                          initials fallback never appears in the circle. */}
                      {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} /> : null}
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm">
                        {user?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-semibold">{user?.name}</span>
                      <span className="text-xs text-gray-500 dark:text-slate-400 font-normal">{user?.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/profile" className="flex items-center gap-2 cursor-pointer">
                      <UserCircle className="w-4 h-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings" className="flex items-center gap-2 cursor-pointer">
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()} className="text-red-600 cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/signin" className="nav-cta text-base font-semibold text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white border-2 border-gray-200 dark:border-white/10 rounded-2xl hover:bg-gray-50 dark:hover:bg-[#0d1f38]/60 hover:border-gray-300 dark:hover:border-blue-600/50 transition-all duration-300 px-6 py-2.5 tracking-tight relative group overflow-hidden">
                <span className="relative z-10">Sign In</span>
                <div className="absolute inset-0 bg-gradient-to-r from-gray-500/0 via-gray-500/5 to-gray-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
              <Link href="/signup" className="nav-cta relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl blur-lg opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
                <div className="relative inline-flex items-center justify-center px-8 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold shadow-xl shadow-blue-500/30 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-blue-500/40 group-hover:scale-105 text-base tracking-tight overflow-hidden">
                  <span className="relative z-10">Get Started</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </div>
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>

        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-gray-200/70 bg-white/95 px-4 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#071a2e]/95 lg:hidden"
        >
          <div className="flex flex-col gap-4">
            {menu.map((group) => (
              <div key={group.key} className="border-b border-gray-100 pb-3 last:border-0 dark:border-white/5">
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  {group.label}
                </p>
                <div className="flex flex-col">
                  {group.items.map((item, index) => (
                    <MobileMenuLink
                      key={"separator" in item ? `${group.key}-separator-${index}` : item.href}
                      item={item}
                      onNavigate={() => setMobileMenuOpen(false)}
                    />
                  ))}
                </div>
              </div>
            ))}

            <Link
              href="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-1 py-2.5 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-white/5"
            >
              Pricing
            </Link>

            <div className="mt-3 flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-xl border border-gray-200 px-4 py-3 text-center text-base font-semibold text-gray-700 dark:border-white/10 dark:text-slate-200"
                  >
                    Dashboard
                  </Link>
                  {isPlatformAdmin(user) ? (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-xl border border-gray-200 px-4 py-3 text-center text-base font-semibold text-gray-700 dark:border-white/10 dark:text-slate-200"
                    >
                      Admin
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="rounded-xl px-4 py-3 text-center text-base font-semibold text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/signin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-xl border-2 border-gray-200 px-4 py-3 text-center text-base font-semibold text-gray-700 dark:border-white/10 dark:text-slate-200"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-4 py-3 text-center text-base font-bold text-white"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
                  if (e.key === "Enter" && isAuthenticated && searchQuery.trim()) {
                    router.push(`/dashboard/search?q=${encodeURIComponent(searchQuery.trim())}`);
                    setSearchOpen(false);
                  }
                }}
                placeholder="Search CEOOO — features, pricing, docs, decisions…"
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
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Popular searches</p>
                  <div className="space-y-2">
                    {[
                      "Decision Making",
                      "AI Insights",
                      "Financial Tracking",
                      "Dashboard",
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
                {isAuthenticated ? (
                  <Link
                    href={`/dashboard/search?q=${encodeURIComponent(searchQuery.trim())}`}
                    onClick={() => { setSearchOpen(false); setSearchQuery(""); setSearchResults([]); }}
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                  >
                    View all workspace results
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <Link
                    href="/signin"
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                  >
                    Sign in to search your workspace data
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
