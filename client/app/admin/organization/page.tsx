"use client";
// app/admin/organization/page.tsx
//
// The organizations directory lives at /admin/organizations. This route is kept
// as a stable alias (sidebar links and bookmarks) and forwards to it.

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminOrganizationAliasPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/organizations");
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm text-gray-500 dark:text-slate-400">
        Opening organizations…
      </p>
    </div>
  );
}
