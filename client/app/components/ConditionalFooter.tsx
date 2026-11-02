"use client";
import { usePathname } from "next/navigation";
import Footer from "./footer";

export default function ConditionalFooter() {
  const pathname = usePathname();
  const hideOn = ["/signin", "/signup", "/login"];
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  if (pathname.startsWith("/dashboard")) return null;
  if (hideOn.includes(pathname)) return null;
  return <Footer />;
}
