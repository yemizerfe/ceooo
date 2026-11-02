"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const stats = [
  {
    number: "400+",
    label: "C-Level Executives",
    description: "Top-tier leaders across industries trust CEOOO to run their daily operations and strategic decisions.",
  },
  {
    number: "87%",
    label: "Time Saved",
    description: "CEOs report saving nearly 90% of time previously spent on administrative and repetitive tasks.",
  },
  {
    number: "3.2x",
    label: "Faster Decisions",
    description: "AI-powered insights help executives make informed decisions 3x faster than traditional methods.",
  },
  {
    number: "99.9%",
    label: "Uptime Reliability",
    description: "Enterprise-grade infrastructure ensures your operations never stop, day or night.",
  },
];

export default function Testimonials() {
  const [active, setActive] = useState(0);
  const headingRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const moveIndicator = (index: number) => {
    const item = itemRefs.current[index];
    const line = lineRef.current;
    if (!item || !line) return;
    gsap.to(line, {
      left: item.offsetLeft,
      width: item.offsetWidth,
      duration: 0.45,
      ease: "power3.inOut",
    });
  };

  const handleHover = (index: number) => {
    if (index === active) return;

    // fade out current description
    gsap.to(descRef.current, {
      opacity: 0,
      y: 8,
      duration: 0.2,
      ease: "power2.in",
      onComplete: () => {
        setActive(index);
        moveIndicator(index);
        // fade in new description
        gsap.fromTo(
          descRef.current,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }
        );
      },
    });
  };

  useEffect(() => {
    // initial line position
    const firstItem = itemRefs.current[0];
    const line = lineRef.current;
    if (firstItem && line) {
      gsap.set(line, { left: firstItem.offsetLeft, width: firstItem.offsetWidth });
    }

    // heading entrance
    gsap.fromTo(
      headingRef.current,
      { opacity: 0, y: 40 },
      {
        opacity: 1, y: 0, duration: 0.8, ease: "power3.out",
        scrollTrigger: { trigger: headingRef.current, start: "top 80%" },
      }
    );

    // stagger stat numbers in
    gsap.fromTo(
      itemRefs.current,
      { opacity: 0, y: 30 },
      {
        opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: "power3.out",
        scrollTrigger: { trigger: headingRef.current, start: "top 75%" },
      }
    );

    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, []);

  return (
    <section className="bg-white py-24 px-6 dark:bg-[#071a2e]">
      <div className="max-w-5xl mx-auto">
        <div ref={headingRef} className="text-center mb-16 opacity-0">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-3 dark:text-slate-400">By the numbers</p>
          <h2 className="text-4xl font-bold text-slate-900 mb-4 dark:text-white">Trusted by the world’s best leaders</h2>
          <p className="text-gray-500 max-w-lg mx-auto dark:text-slate-300">Real results from real executives who use CEOOO every day.</p>
        </div>

        <div className=" mb-10">
          <div className="flex border-b border-gray-100 relative dark:border-white/10">
            {stats.map((stat, i) => (
              <button
                key={stat.label}
                ref={(el) => { itemRefs.current[i] = el; }}
                onMouseEnter={() => handleHover(i)}
                onClick={() => handleHover(i)}
                className="flex-1 pb-6 text-center cursor-pointer group"
              >
                <div className={`text-3xl md:text-4xl font-bold mb-1 transition-colors duration-300 ${active === i ? "text-slate-900 dark:text-white" : "text-gray-300 group-hover:text-gray-400 dark:text-slate-500 dark:group-hover:text-slate-300"}`}>
                  {stat.number}
                </div>
                <div className={`text-sm font-medium transition-colors duration-300 ${active === i ? "text-slate-900 dark:text-white" : "text-gray-400 group-hover:text-gray-500 dark:text-slate-400 dark:group-hover:text-slate-300"}`}>
                  {stat.label}
                </div>
              </button>
            ))}

            {/* sliding indicator */}
            <div
              ref={lineRef}
              className="absolute bottom-0 h-[2px] rounded-full"
              style={{
                background: "linear-gradient(to right, #9ca3af, #0A2342)",
                left: 0,
                width: 0,
              }}
            />
          </div>
        </div>

        {/* description */}
        <div className="text-center h-16 flex items-center justify-center">
          <p ref={descRef} className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed dark:text-slate-300">
            {stats[active].description}
          </p>
        </div>
      </div>
    </section>
  );
}
