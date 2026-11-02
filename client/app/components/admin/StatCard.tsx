"use client";
// components/admin/StatCard.tsx

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  change?: string;
  changePositive?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon,
  change,
  changePositive,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "bg-white dark:bg-[#0b1f33]/50 border-gray-200 dark:border-white/10 transition-all duration-200",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-slate-400">
          {title}
        </CardTitle>
        <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
        {change && (
          <p
            className={cn(
              "text-xs text-gray-500 dark:text-slate-400 mt-1",
              changePositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}
          >
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
