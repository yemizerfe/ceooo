"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { FolderKanban, BarChart, User, CheckCircle, DollarSign } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const features = [
  { icon: CheckCircle, label: "AI Decision Making", description: "Make smarter decisions with your AI-powered partner by your side.", color: "bg-blue-50 text-blue-700" },
  { icon: FolderKanban, label: "Project Management", description: "Effortlessly manage your projects, tasks and deadlines.", color: "bg-purple-50 text-purple-700" },
  { icon: User, label: "Team Collaboration", description: "Work seamlessly with your team members in real time.", color: "bg-green-50 text-green-700" },
  { icon: BarChart, label: "Analytics & Insights", description: "Gain valuable insights from your business data.", color: "bg-orange-50 text-orange-700" },
  { icon: DollarSign, label: "Financial Tracking", description: "Track and manage financial issues with ease.", color: "bg-red-50 text-red-700" },
];

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const ceoooRef = useRef<HTMLSpanElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // heading animation on scroll
    gsap.fromTo(
      headingRef.current,
      { opacity: 0, y: 40 },
      {
        opacity: 1, y: 0, duration: 0.8, ease: "power3.out",
        scrollTrigger: { trigger: headingRef.current, start: "top 80%" },
      }
    );

    // CEOOO letters stagger on scroll
    const letters = ceoooRef.current?.querySelectorAll("span");
    if (letters) {
      gsap.fromTo(
        letters,
        { opacity: 0, y: -40, rotation: -15, scale: 0.3 },
        {
          opacity: 1, y: 0, rotation: 0, scale: 1, duration: 0.6, stagger: 0.12, ease: "back.out(2)",
          scrollTrigger: { trigger: ceoooRef.current, start: "top 85%" },
        }
      );
      gsap.to(letters, {
        y: -6, duration: 1.5, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.15, delay: 1,
      });
    }

    // cards stagger in on scroll
    const cards = cardsRef.current?.querySelectorAll(".feature-card");
    if (cards) {
      gsap.set(cards, { opacity: 0, y: 60, scale: 0.95 });
      gsap.to(
        cards,
        {
          opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.15, ease: "power3.out",
          scrollTrigger: { trigger: cardsRef.current, start: "top 80%" },
        }
      );
    }

    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, []);

  return (
    <section ref={sectionRef} className="bg-slate-900 py-24 px-6">
      <div ref={headingRef} className="text-center mb-4 opacity-0">
        <p className="text-sm text-gray-400 uppercase tracking-widest mb-3">Why CEOs choose us</p>
        <h2 className="text-4xl font-bold text-white mb-4">Everything you need to lead</h2>
        <p className="text-gray-400 max-w-xl mx-auto">One platform built for executives to make decisions, manage teams, and drive growth.</p>
      </div>

      <div className="flex justify-center mb-12">
        <span ref={ceoooRef} className="flex text-4xl font-bold cursor-pointer">
          {"CEOOO".split("").map((letter, i) => (
            <span key={i} className="text-transparent bg-clip-text bg-gradient-to-r from-gray-300 via-red-400 to-yellow-400">
              {letter}
            </span>
          ))}
        </span>
      </div>

      <div ref={cardsRef} className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none", paddingLeft: "max(24px, calc((100vw - 340px) / 2))", paddingRight: "max(24px, calc((100vw - 340px) / 2))" }}>
        {features.map((feature) => (
          <div
            key={feature.label}
            className="feature-card min-w-[340px] bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col gap-4 flex-shrink-0 snap-center hover:bg-white/10 transition-all duration-300"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${feature.color}`}>
              <feature.icon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white">{feature.label}</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
            <Link href="/features" className="text-sm text-blue-400 font-medium hover:text-blue-300 transition-colors mt-auto">
              Learn more →
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

