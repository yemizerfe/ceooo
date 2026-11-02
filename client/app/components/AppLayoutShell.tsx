"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function AppLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isRouteLoading, setIsPageLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsPageLoading(true);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    const timer = window.setTimeout(() => {
      setIsPageLoading(false);
      window.scrollTo({ top: 0, left: 0 });
    }, 260);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const isPageLoading = isRouteLoading && !isAdminPage;

  return (
    <main
      className={`relative flex w-full flex-col bg-white dark:bg-[#071a2e] ${pathname.startsWith("/dashboard") ? "pt-16" : "pt-0"}`}
      style={{
        opacity: isPageLoading ? 0.4 : 1,
        transform: isPageLoading ? "translateY(10px)" : "translateY(0)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
      }}
    >
      {isPageLoading && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-blue-500/0 via-blue-500/20 to-indigo-500/0 opacity-0 blur-2xl"
          style={{
            opacity: isPageLoading ? 1 : 0,
            transition: "opacity 0.35s ease",
            animation: isPageLoading ? "pulse 1.4s ease-in-out infinite" : "none",
          }}
        />
      )}
      {children}
    </main>
  );
}
