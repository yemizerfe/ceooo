"use client";

// app/admin/layout.tsx
import { useState } from "react";
import { AdminRoute, useAdminAuth } from "@/app/components/admin/AdminRoute";
import { AdminSidebar, AdminMobileHeader } from "@/app/components/admin/AdminSidebar";
import NotificationBell from "@/app/components/NotificationBell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { admin } = useAdminAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div data-dashboard-page="true" className="flex min-h-screen bg-white dark:bg-[#071a2e]">
      <AdminSidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden">
          <AdminMobileHeader onMobileOpen={() => setMobileOpen(true)} />
        </div>

        {/* Desktop header */}
        <header className="hidden lg:block border-b border-gray-200/70 dark:border-white/10 bg-white/95 dark:bg-[#071a2e]/95 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Platform Administration
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm text-gray-600 dark:border-white/10 dark:bg-[#0d1f38] dark:text-slate-300">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>{admin?.roleLabel || "Administrator"}</span>
              </div>
              {/* Same store and same records as the marketing and dashboard bells. */}
              <NotificationBell />
              <Avatar className="h-9 w-9 ring-2 ring-blue-500/20">
                {admin?.avatarUrl ? (
                  <AvatarImage
                    src={admin.avatarUrl}
                    alt={admin?.name ? `${admin.name}'s avatar` : "Administrator avatar"}
                  />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white">
                  {admin?.name?.charAt(0) || admin?.email?.charAt(0) || "A"}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminRoute>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminRoute>
  );
}
