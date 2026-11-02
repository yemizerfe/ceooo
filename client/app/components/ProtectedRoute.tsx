"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { isAdminPath, isPlatformAdmin } from "@/lib/authRouting";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  // Platform administrators hold administration permissions only, so the
  // executive workspace answers every request with 403. Send them to the admin
  // panel instead of rendering a page full of failed requests.
  const adminMustLeaveDashboard = useMemo(
    () => Boolean(user) && isPlatformAdmin(user) && !isAdminPath(pathname),
    [user, pathname]
  );

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (!token && !isAuthenticated) {
      router.replace("/signin");
      return;
    }

    if (adminMustLeaveDashboard) {
      router.replace("/admin");
      return;
    }

    setIsChecking(false);
  }, [isAuthenticated, adminMustLeaveDashboard, router]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div data-dashboard-page="true" className="min-h-screen bg-white dark:bg-[#071a2e]">
      {children}
    </div>
  );
}
