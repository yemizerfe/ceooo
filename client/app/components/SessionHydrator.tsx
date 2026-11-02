"use client";
// app/components/SessionHydrator.tsx
//
// Refreshes the signed-in user from the API once per page load. The persisted
// Zustand slice can be stale (avatar uploaded on another device, an access role
// changed by an administrator, a profile edited in another tab), which used to
// leave the navbar showing initials until the profile page happened to load.
// Rendering the fresh record here keeps every avatar, name and admin gate in
// sync across the marketing shell, dashboard and admin panel.

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { isPlatformAdmin } from "@/lib/authRouting";
import type { User } from "@/types/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";

export default function SessionHydrator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    let cancelled = false;

    const refresh = async () => {
      try {
        const response = await fetch(`${API_URL}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          // The session was revoked or expired: drop it instead of showing a
          // signed-in shell backed by a dead token.
          localStorage.removeItem("token");
          localStorage.removeItem("auth-storage");
          useAuthStore.getState().setUser(null);
          return;
        }
        if (!response.ok) return;

        const body = await response.json();
        const fresh = body?.data?.user as User | undefined;
        if (!fresh || cancelled) return;

        setUser({
          ...fresh,
          role: fresh.role || "",
          isAdmin: isPlatformAdmin(fresh),
          aiUsageCount: fresh.aiUsageCount ?? 0,
          subscriptionPlan: fresh.subscriptionPlan ?? "free",
          isVerified: Boolean(fresh.isVerified),
          hasCompletedOnboarding: Boolean(fresh.hasCompletedOnboarding),
        });
      } catch {
        // Offline or API unavailable: keep the persisted snapshot.
      }
    };

    void refresh();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, setUser]);

  return null;
}
