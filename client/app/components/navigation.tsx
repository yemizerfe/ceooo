"use client";
// components/navigation.tsx (create if you don't have one)

import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";

export function Navigation() {
  const { isAuthenticated, user, logout } = useAuthStore();

  return (
    <nav className="bg-white/5 border-b border-white/10 sticky top-0 z-50 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Crown className="w-6 h-6 text-blue-400" />
              <span className="text-white font-bold text-xl">CEOOO</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link href="/pricing">
              <Button
                variant="ghost"
                className="text-gray-300 hover:text-white"
              >
                Pricing
              </Button>
            </Link>

            {isAuthenticated ? (
              <>
                <Link href="/dashboard">
                  <Button
                    variant="ghost"
                    className="text-gray-300 hover:text-white"
                  >
                    Dashboard
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={logout}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    className="text-gray-300 hover:text-white"
                  >
                    Login
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Sign Up
                  </Button>
                </Link>
                <Link href="/features/decision-making">
                  <Button variant="ghost">Decision AI</Button>
                </Link>
                <Link href="/features/stakeholder-connection">
                  <Button variant="ghost">Stakeholders</Button>
                </Link>
                <Link href="/features/project-management">
                  <Button variant="ghost">Projects</Button>
                </Link>
                <Link href="/features/ai-insights">
                  <Button variant="ghost">Insights</Button>
                </Link>
                <Link href="/features/financial-tracking">
                  <Button variant="ghost">Financial</Button>
                </Link>
                <Link href="/features/notes-board">
                  <Button variant="ghost">Notes</Button>
                </Link>
                <Link href="/features/company-performance">
                  <Button variant="ghost">Performance</Button>
                </Link>
                <Link href="/features/time-calendar">
                  <Button variant="ghost">Calendar</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

