"use client";
// app/components/ScrollToTop.tsx
//
// Every route change starts at the top of the page. Without this, Next.js keeps
// the previous scroll offset when the new page is shorter than the old one, so
// clicking a footer link could land the visitor halfway down a page.

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // The browser's own restoration fights the explicit scroll below.
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const toTop = () =>
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });

    toTop();
    // The router restores the previous offset after the route commits, which
    // lands the visitor halfway down the new page. Repeat the reset on the next
    // frame and once more after paint has settled so the new page starts at the top.
    const frame = window.requestAnimationFrame(toTop);
    const timer = window.setTimeout(toTop, 120);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [pathname]);

  return null;
}
