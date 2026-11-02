"use client";

import { debugError } from "@/lib/logger";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { OnboardingOverlay } from "@/app/components/onboarding/OnboardingOverlay";
import { DashboardSidebar } from "@/app/components/dashboard/DashboardSidebar";
import { CompanySnapshot } from "@/app/components/dashboard/CompanySnapshot";
import { StrategicFocus } from "@/app/components/dashboard/StrategicFocus";
import { AlertsRisks } from "@/app/components/dashboard/AlertsRisks";
import { CalendarPreview } from "@/app/components/dashboard/CalendarPreview";
import { ProgressTracker } from "@/app/components/dashboard/ProgressTracker";
import { DecisionQueue } from "@/app/components/dashboard/DecisionQueue";
import { AIInsightsPanel } from "@/app/components/dashboard/AIInsightsPanel";
import { DailyBrief } from "@/app/components/dashboard/DailyBrief";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { getAuthenticatedHomePath, isAdminPath, isPlatformAdmin } from "@/lib/authRouting";

export default function DashboardPage() {
  const router = useRouter();
  const { user, updateUser, checkOnboardingStatus, setOnboardingCompleted } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";

  useEffect(() => {
    if (isAdminPath()) return;

    if (!user) {
      if (!localStorage.getItem("token")) router.replace("/signin");
      return;
    }

    if (isPlatformAdmin(user)) {
      router.replace(getAuthenticatedHomePath(user));
      return;
    }

    const checkStatus = async () => {
      if (user) {
        // Check if this is a new signup from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const isNewUser = urlParams.get('new') === 'true';
        
        // Check onboarding status
        const needsOnboarding = await checkOnboardingStatus();
        
        // Only show onboarding if user actually needs it
        setShowOnboarding(needsOnboarding);
        
        // Clean up URL parameter
        if (isNewUser) {
          window.history.replaceState({}, '', '/dashboard');
        }
      }
      setOnboardingLoading(false);
    };
    checkStatus();
  }, [user, checkOnboardingStatus, router]);

  const handleOnboardingComplete = async () => {
    setOnboardingCompleted();
    setShowOnboarding(false);

    // Refresh user profile after onboarding
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) updateUser(data.data.user);
    } catch (e) {
      debugError("Failed to refresh profile after onboarding:", e);
    }
  };

  if (isAdminPath() || isPlatformAdmin(user) || onboardingLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#071a2e] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#071a2e] relative">
      {showOnboarding && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />}

      <div className={showOnboarding ? "blur-sm pointer-events-none" : ""}>
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="bg-white/95 backdrop-blur-sm dark:bg-[#0d1f38] border-gray-200/60 dark:border-white/10 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Menu className="w-5 h-5 text-gray-700 dark:text-slate-300" />
          </Button>
        </div>

        <div className="flex min-h-screen">
          <DashboardSidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            mobileOpen={mobileMenuOpen}
            onMobileClose={() => setMobileMenuOpen(false)}
          />

          <div className="flex-1 min-w-0">
            <header className="relative z-10 border-b border-gray-200/60 dark:border-white/10">
              <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-300/90">Leadership view</p>
                      <h1 className="mt-1 text-4xl font-black tracking-[-0.04em] text-gray-900 dark:text-white">
                        Executive Summary
                      </h1>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 mb-16 space-y-8">
              <DailyBrief />
              <CompanySnapshot />
              <div className="grid lg:grid-cols-2 gap-8 mb-8">
                <StrategicFocus />
                <AlertsRisks />
              </div>
              <div className="grid lg:grid-cols-2 gap-8 mb-8">
                <CalendarPreview />
                <ProgressTracker />
              </div>
              <DecisionQueue />
            </main>
          </div>

          <AIInsightsPanel />
        </div>
      </div>

      {showOnboarding && <OnboardingOverlay onComplete={handleOnboardingComplete} />}
    </div>
  );
}
