"use client";
import { debugError } from "@/lib/logger";
// client/app/auth/callback/page.tsx

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getAuthenticatedHomePath, isPlatformAdmin } from "@/lib/authRouting";
import { Loader2 } from "lucide-react";
import type { User } from "@/types/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const exchangeStarted = useRef(false);

  useEffect(() => {
    if (exchangeStarted.current) return;
    exchangeStarted.current = true;

    const requestedReturnTo = searchParams.get("returnTo");
    // Only same-site paths are followed, so a crafted link cannot bounce the
    // freshly authenticated session to an external origin.
    const returnTo =
      requestedReturnTo &&
      requestedReturnTo.startsWith("/") &&
      !requestedReturnTo.startsWith("//")
        ? requestedReturnTo
        : null;

    void (async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/oauth/exchange`, {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        const result = await response.json() as {
          data?: { token?: string; user?: User };
          message?: string;
        };
        if (!response.ok || !result.data?.token || !result.data.user) {
          throw new Error(result.message || "Invalid OAuth callback");
        }

        const { token, user } = result.data;
        localStorage.setItem("token", token);
        setUser(user);

        if (returnTo) {
          router.replace(returnTo);
        } else if (isPlatformAdmin(user)) {
          router.replace(getAuthenticatedHomePath(user));
        } else if (!user.hasCompletedOnboarding) {
          router.push("/dashboard?new=true");
        } else {
          router.push("/dashboard");
        }
      } catch (err) {
        debugError("OAuth callback exchange failed", err);
        setError("Failed to complete sign in. Please try again.");
        setTimeout(() => router.push("/signin"), 3000);
      }
    })();
  }, [searchParams, router, setUser]);

  if (error) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50/20 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-3xl">✕</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Failed</h2>
          <p className="text-gray-600">{error}</p>
          <p className="text-sm text-gray-500 mt-2">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50/20 dark:bg-slate-900">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Completing sign in...</h2>
        <p className="text-gray-500 mt-2">Please wait while we redirect you.</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-20 flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50/20 dark:bg-slate-900">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}