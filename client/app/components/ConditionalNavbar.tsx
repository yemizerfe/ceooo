"use client";
import { usePathname } from "next/navigation";
import Navbar from "./navbar";
import  {DashboardNavbar}  from "../dashboard/DashboardNavbar";

export default function ConditionalNavbar() {
  const pathname = usePathname();
  const hideOn = ["/signin", "/signup", "/login"];
  const dashboardPaths = pathname.startsWith("/dashboard");

  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  if (hideOn.includes(pathname)) return null;
  if (dashboardPaths) return <DashboardNavbar />;

  return <Navbar />;
}
