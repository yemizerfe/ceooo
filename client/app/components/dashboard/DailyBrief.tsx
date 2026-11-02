"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Sun, AlertTriangle, Target, Zap, Sparkles, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAIInsightStore } from "@/store/aiInsightStore";
import { useAuthStore } from "@/store/authStore";

export function DailyBrief() {
  const { dailyBrief, fetchDailyBrief, isLoading } = useAIInsightStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchDailyBrief();
  }, [fetchDailyBrief]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.6, ease: "easeOut" }} 
      className="mb-8"
    >
      <Card className="relative overflow-hidden border-0 shadow-xl shadow-blue-500/20">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-white/10"></div>
        
        {/* Animated shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shine_3s_ease-in-out_infinite]"></div>
        
        <div className="relative z-10 p-8">
          <div className="flex items-start justify-between flex-wrap gap-6">
            <div className="flex items-start gap-6">
              <motion.div 
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "backOut" }}
                className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg"
              >
                <Sun className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <motion.p 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="text-sm text-white/90 mb-2 font-medium tracking-wide"
                >
                  {greeting()}, {user?.name || "CEO"}
                </motion.p>
                <motion.h2 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="text-3xl font-bold mb-4 text-white tracking-tight"
                >
                  {isLoading ? "Loading your brief..." : (dailyBrief?.summary || "Here's what matters today:")}
                </motion.h2>
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-white/70" />
                ) : dailyBrief ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="flex flex-wrap gap-4"
                  >
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 shadow-lg hover:bg-white/20 transition-all duration-300 group">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <AlertTriangle className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm text-white font-semibold">{dailyBrief.criticalRisk}</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 shadow-lg hover:bg-white/20 transition-all duration-300 group">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Target className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm text-white font-semibold">{dailyBrief.keyOpportunity}</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 shadow-lg hover:bg-white/20 transition-all duration-300 group">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm text-white font-semibold">{dailyBrief.recommendedAction}</span>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/15 backdrop-blur-md border border-white/20">
                      <Zap className="w-5 h-5 text-white" />
                      <span className="text-sm text-white font-semibold">AI brief loading...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Badge className="bg-white/20 backdrop-blur-md text-white border-white/30 px-4 py-2 text-sm shadow-lg hover:bg-white/25 transition-all duration-300">
                <Sparkles className="w-4 h-4 mr-2" />
                AI Brief
              </Badge>
            </motion.div>
          </div>
        </div>
      </Card>
      
      <style jsx>{`
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </motion.div>
  );
}
