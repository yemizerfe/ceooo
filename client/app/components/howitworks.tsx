"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { Handshake, Brain, Zap, Shield, Clock, TrendingUp, CheckCircle2, Sparkles, ArrowRight, Crown } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    number: "01", icon: Handshake, title: "Connect & Onboard",
    description: "Securely link your calendars, communication channels, and business goals. Our AI maps your workflow preferences and leadership style in minutes — zero manual setup.",
    features: ["2-min onboarding", "Military-grade encryption", "Multi-platform sync"],
    gradient: "from-blue-500/20 to-cyan-500/20", iconColor: "text-blue-400", bgHover: "hover:border-blue-500/50"
  },
  {
    number: "02", icon: Brain, title: "AI Insight & Automation",
    description: "Real-time data synthesis, smart scheduling, and priority triage. Get instant executive summaries, meeting prep, and delegated task orchestration.",
    features: ["Predictive analytics", "Smart prioritization", "Natural language understanding"],
    gradient: "from-indigo-500/20 to-purple-500/20", iconColor: "text-indigo-400", bgHover: "hover:border-indigo-500/50"
  },
  {
    number: "03", icon: Zap, title: "Execute & Scale",
    description: "Review AI-generated recommendations, approve actions with one click, and scale your leadership bandwidth. Weekly performance reports help refine strategic focus.",
    features: ["ROI dashboard", "24/7 executive support", "Team collaboration tools"],
    gradient: "from-purple-500/20 to-pink-500/20", iconColor: "text-purple-400", bgHover: "hover:border-purple-500/50"
  },
];

const metrics = [
  { value: "87%", label: "Time saved on admin tasks", icon: Clock, trend: "+12%" },
  { value: "3.2x", label: "Faster decision-making", icon: TrendingUp, trend: "+45%" },
  { value: "99.9%", label: "Uptime reliability", icon: Shield, trend: "Guaranteed" },
];

export default function HowItWorks() {
  const { isAuthenticated } = useAuthStore();
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const stepsContainerRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.fromTo(headerRef.current, { opacity: 0, y: 50 }, {
      opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
      scrollTrigger: { trigger: headerRef.current, start: "top 85%", toggleActions: "play none none reverse" },
    });

    const stepCards = stepsContainerRef.current?.querySelectorAll(".step-card");
    if (stepCards) {
      gsap.set(stepCards, { opacity: 0, y: 60, scale: 0.95 });
      gsap.to(stepCards, {
        opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.2, ease: "back.out(0.5)",
        scrollTrigger: { trigger: stepsContainerRef.current, start: "top 80%", toggleActions: "play none none reverse" },
      });
    }

    const metricItems = metricsRef.current?.querySelectorAll(".metric-item");
    if (metricItems) {
      gsap.set(metricItems, { opacity: 0, y: 30, scale: 0.9 });
      gsap.to(metricItems, {
        opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.15, ease: "power2.out",
        scrollTrigger: { trigger: metricsRef.current, start: "top 85%", toggleActions: "play none none reverse" },
      });
    }

    gsap.fromTo(ctaRef.current, { opacity: 0, y: 40 }, {
      opacity: 1, y: 0, duration: 0.8, delay: 0.3, ease: "power3.out",
      scrollTrigger: { trigger: ctaRef.current, start: "top 90%", toggleActions: "play none none reverse" },
    });

    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, []);

  return (
    <section ref={sectionRef} className="relative bg-gradient-to-b from-[#1a3a5c] via-[#1e4068] to-[#1a3a5c] py-24 px-6">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <div ref={headerRef} className="text-center mb-16">
          <div className="mb-6 inline-flex items-center px-4 py-2 text-sm font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
            <Sparkles className="w-3.5 h-3.5 mr-2" />
            Seamless AI Assistance
          </div>
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-white via-blue-200 to-indigo-300 bg-clip-text text-transparent">
              How CEOOO works
            </span>
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            From strategic insights to daily operations — three intelligent steps that redefine executive productivity.
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mx-auto mt-8" />
        </div>

        <div ref={stepsContainerRef} className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-20">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className={`step-card group relative overflow-hidden bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl p-6 transition-all duration-500 hover:scale-105 hover:shadow-2xl ${step.bgHover}`}>
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${step.gradient}`} />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-all duration-300 ${step.iconColor}`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="text-5xl font-bold text-white/10 group-hover:text-white/20 transition-colors">{step.number}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-gray-300 text-base leading-relaxed mb-4">{step.description}</p>
                  <div className="space-y-2 pt-4 border-t border-white/10">
                    {step.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-sm text-gray-300">
                        <CheckCircle2 className={`w-4 h-4 ${step.iconColor} flex-shrink-0`} />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div ref={metricsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {metrics.map((metric) => {
            const MetricIcon = metric.icon;
            return (
              <div key={metric.label} className="metric-item group text-center p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 mb-4 group-hover:scale-110 transition-transform">
                  <MetricIcon className="w-7 h-7 text-blue-400" />
                </div>
                <div className="metric-value text-4xl font-bold text-white mb-2">{metric.value}</div>
                <div className="text-gray-300 text-sm mb-2">{metric.label}</div>
                <div className="text-xs text-green-400 font-medium">{metric.trend} improvement</div>
              </div>
            );
          })}
        </div>

        <div ref={ctaRef} className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border border-blue-500/30 p-8 md:p-12 text-center">
          <Crown className="w-12 h-12 text-blue-400 mx-auto mb-4 animate-pulse" />
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">Trusted by 400+ C-level executives</h3>
          <p className="text-gray-300 mb-6 max-w-lg mx-auto">From startup founders to Fortune 500 leaders — experience the future of executive assistance.</p>
          {isAuthenticated ? (
            <Link href="/dashboard" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 hover:scale-105">
              Go to dashboard
              <ArrowRight className="w-5 h-5" />
            </Link>
          ) : (
            <Link href="/signup" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 hover:scale-105">
              Start your free trial
              <ArrowRight className="w-5 h-5" />
            </Link>
          )}
          <p className="text-xs text-gray-400 mt-4">No credit card required · 14-day trial</p>
        </div>
      </div>
    </section>
  );
}
