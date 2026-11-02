"use client";
// components/admin/AdminRoute.tsx

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getAdminToken, adminRequest, AdminError } from "@/lib/adminApi";
import type { AdminUser } from "@/types/admin";
import { ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminAuthContextValue {
  admin: AdminUser | null;
  loading: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextValue>({
  admin: null,
  loading: true,
});

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    const verify = async () => {
      const token = getAdminToken();
      if (!token) {
        setLoading(false);
        router.push("/signin");
        return;
      }
      try {
        const data = await adminRequest<AdminUser>("/me");
        setAdmin(data);
      } catch (e) {
        const err = e as AdminError;
        if (err.status === 403) {
          setForbidden(true);
        } else if (err.status === 401) {
          router.push("/signin");
          return;
        } else {
          // Unexpected error — treat as forbidden to be safe (fail-closed).
          setForbidden(true);
        }
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#071a2e] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto" />
          <p className="text-gray-600 dark:text-slate-300 font-medium">Verifying admin access…</p>
        </div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#071a2e] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6">
            <ShieldQuestion className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">403 Forbidden</h1>
          <p className="text-gray-600 dark:text-slate-300 mb-6">
            You don&apos;t have permission to access the admin panel. This area is
            restricted to users with the ADMIN role.
          </p>
          <Button
            onClick={() => router.push("/dashboard")}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!admin) return null;

  return (
    <AdminAuthContext.Provider value={{ admin, loading: false }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
