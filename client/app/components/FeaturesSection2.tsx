"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { FolderKanban, BarChart, User, CheckCircle, DollarSign, ChevronLeft, ChevronRight, NotebookPen, BarChart2, CalendarDays } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const features = [
  { icon: CheckCircle, label: "AI Decision Making", description: "Make smarter decisions with your AI-powered partner by your side.", image: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400&h=200&fit=crop" },
  { icon: FolderKanban, label: "Project Management", description: "Effortlessly manage your projects, tasks and deadlines.", image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=200&fit=crop" },
  { icon: User, label: "Team Collaboration", description: "Work seamlessly with your team members in real time.", image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=200&fit=crop" },
  { icon: BarChart, label: "Analytics & Insights", description: "Gain valuable insights from your business data.", image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop" },
  { icon: DollarSign, label: "Financial Tracking", description: "Track and manage financial issues with ease.", image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=200&fit=crop" },
  { icon: NotebookPen, label: "Manual & AI Notes Board", description: "Capture notes manually or let AI summarize and organize them for you.", image: "https://images.unsplash.com/photo-1517842645767-c639042777db?w=400&h=200&fit=crop" },
  { icon: BarChart2, label: "Track Company Performance", description: "Monitor KPIs and company performance in real time.", image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop" },
  { icon: CalendarDays, label: "Calendar & Time Management", description: "Manage your schedule and time with smart calendar tools.", image: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=400&h=200&fit=crop" },
];

export default function FeaturesSection2() {
  const headingRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 420;
      const newScrollLeft = scrollContainerRef.current.scrollLeft + (direction === "right" ? scrollAmount : -scrollAmount);
      gsap.to(scrollContainerRef.current, { scrollLeft: newScrollLeft, duration: 0.5, ease: "power2.out" });
    }
  };

  useEffect(() => {
    gsap.fromTo(
      headingRef.current,
      { opacity: 0, y: 60, scale: 0.95 },
      {
        opacity: 1, y: 0, scale: 1, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: headingRef.current, start: "top 80%", once: true },
      }
    );

    const cards = scrollContainerRef.current?.querySelectorAll(".feature-card");
    if (cards) {
      gsap.set(cards, { opacity: 0, y: 80, rotateY: -10 });
      cards.forEach((card, i) => {
        gsap.to(card, {
          opacity: 1, y: 0, rotateY: 0, duration: 0.8, delay: i * 0.12, ease: "power3.out",
          scrollTrigger: { trigger: card, start: "top 90%", once: true },
        });
        
        // Floating animation
        gsap.to(card, {
          y: -8,
          duration: 2.5 + (i * 0.2),
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.15 + 1,
        });
      });
    }

    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, []);

  return (
    <section ref={sectionRef} className="bg-gradient-to-br from-white via-gray-50/50 to-indigo-50/30 dark:bg-[radial-gradient(circle_at_top,_#0c1f39_0%,_#071a2e_48%,_#051522_100%)] pt-32 pb-0 mb-20 overflow-hidden relative">
      {/* Animated gradient orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }}></div>
      
      <div className="absolute inset-0 ceo-grid-fade opacity-20"></div>
      <div ref={headingRef} className="text-center mb-24 px-6 opacity-0 relative z-10">
        <div className="inline-block mb-6">
          <span className="text-sm text-blue-600 dark:text-blue-300 uppercase tracking-widest font-bold px-4 py-2 bg-blue-50 dark:bg-[#0d1f38] rounded-full shadow-sm">What we offer</span>
        </div>
        <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-slate-100 mb-6 tracking-tight">
          Built for <span className="ceo-text-gradient">modern leaders</span>
        </h2>
        <p className="text-gray-600 dark:text-slate-300 max-w-3xl mx-auto font-medium text-xl leading-relaxed">Everything a CEO needs to run a high-performing organization with confidence and precision.</p>
      </div>

      <div className="relative group flex items-end">
        <button
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          className="absolute left-8 top-1/2 -translate-y-1/2 z-10 bg-white/95 backdrop-blur-xl border-2 border-gray-200/60 rounded-2xl p-5 text-gray-700 shadow-2xl shadow-gray-900/10 transition-all duration-300 opacity-0 group-hover:opacity-100 hover:bg-white hover:scale-110 hover:border-blue-300 hover:text-blue-600 cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div
          ref={scrollContainerRef}
          className="flex gap-10 px-16 pb-6"
          style={{ overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch", alignItems: "flex-end" } as React.CSSProperties}
        >
          <style>{`div::-webkit-scrollbar { display: none; }`}</style>
          {features.map((feature, idx) => (
            <div
              key={feature.label}
              className="feature-card ceo-card flex-shrink-0 flex flex-col overflow-hidden self-end group/card relative bg-white dark:bg-[#0d1f38] border border-gray-200 dark:border-white/10 rounded-[28px] shadow-xl shadow-gray-900/5 dark:shadow-blue-950/30"
              style={{ width: "440px", height: "540px" }}
            >
              {/* Shine effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/card:translate-x-full transition-transform duration-1000 z-10 pointer-events-none"></div>
              
              <div className="w-full h-60 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent z-10"></div>
                <img 
                  src={feature.image} 
                  alt={feature.label} 
                  className="w-full h-full object-cover transition-all duration-700 group-hover/card:scale-110 group-hover/card:rotate-2" 
                />
              </div>
              <div className="p-8 flex flex-col flex-1 justify-between relative">
                <div>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 group-hover/card:from-blue-200 group-hover/card:via-indigo-200 group-hover/card:to-purple-200 transition-all duration-300 shadow-lg group-hover/card:shadow-xl group-hover/card:scale-110 group-hover/card:rotate-6">
                    <feature.icon className="w-7 h-7 text-blue-600 group-hover/card:text-indigo-600 transition-colors duration-300" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-slate-100 tracking-tight leading-tight group-hover/card:text-blue-600 dark:group-hover/card:text-blue-300 transition-colors duration-300">{feature.label}</h3>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-slate-300 font-medium group-hover/card:text-gray-700 dark:group-hover/card:text-slate-200 transition-colors duration-300">{feature.description}</p>
                </div>
                <Link 
                  href="/features" 
                  className="inline-flex items-center text-base font-bold text-blue-600 hover:text-indigo-600 transition-all duration-200 mt-6 group/link"
                >
                  <span>Learn more</span>
                  <svg className="w-5 h-5 ml-2 transition-transform group-hover/link:translate-x-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => scroll("right")}
          aria-label="Scroll right"
          className="absolute right-8 top-1/2 -translate-y-1/2 z-10 bg-white/95 backdrop-blur-xl border-2 border-gray-200/60 rounded-2xl p-5 text-gray-700 shadow-2xl shadow-gray-900/10 transition-all duration-300 opacity-0 group-hover:opacity-100 hover:bg-white hover:scale-110 hover:border-blue-300 hover:text-blue-600 cursor-pointer"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </section>
  );
}
