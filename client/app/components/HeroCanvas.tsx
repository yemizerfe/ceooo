"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { FcGoogle } from "react-icons/fc";
import { useAuthStore } from "@/store/authStore";

export default function HeroCanvas() {
  const { isAuthenticated } = useAuthStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isDark = document.documentElement.classList.contains("dark");
    const gridColor = isDark ? "rgba(147, 197, 253, 0.14)" : "rgba(10, 35, 66, 0.06)";
    const particleColor = isDark ? "rgba(191, 219, 254, 1)" : "rgba(10, 35, 66, 1)";
    const lineColor = isDark ? "rgba(96, 165, 250, 1)" : "rgba(10, 35, 66, 1)";

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const PARTICLE_COUNT = 60;
    const CONNECTION_DISTANCE = 140;
    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      opacity: number;
    }[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        opacity: 0,
      });
    }

    particles.forEach((p, i) => {
      gsap.to(p, {
        opacity: 1,
        duration: 0.6,
        delay: i * 0.02,
        ease: "power2.out",
      });
    });

    gsap.fromTo(
      canvas,
      { opacity: 0 },
      { opacity: 1, duration: 1.2, ease: "power2.out" },
    );

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.fromTo(
      headingRef.current,
      { opacity: 0, y: 60, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 1.2, delay: 0.4, ease: "power4.out" },
    )
      .fromTo(
        subRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.9 },
        "-=0.8",
      )
      .fromTo(
        ctaRef.current,
        { opacity: 0, y: 30, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "back.out(1.3)" },
        "-=0.6",
      );
    
    // Add floating animation to CTA buttons
    gsap.to(".primary-cta", {
      y: -6,
      duration: 2.5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      delay: 1.5,
    });
    
    gsap.to(".secondary-cta", {
      y: -6,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      delay: 1.7,
    });

    let animId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = gridColor;
      const spacing = 30;
      for (let x = 0; x < canvas.width; x += spacing) {
        for (let y = 0; y < canvas.height; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = isDark
          ? `rgba(191, 219, 254, ${Math.min(1, p.opacity)})`
          : `rgba(10, 35, 66, ${Math.min(1, p.opacity)})`;
        ctx.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DISTANCE) {
            const alpha =
              Math.min(particles[i].opacity, particles[j].opacity) *
              (1 - dist / CONNECTION_DISTANCE);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = isDark
              ? `rgba(96, 165, 250, ${Math.max(0.08, alpha)})`
              : `rgba(10, 35, 66, ${Math.max(0.08, alpha)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

return (
    <div className="relative w-full min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:bg-[radial-gradient(circle_at_top,_#0c1f39_0%,_#071a2e_48%,_#051522_100%)] dark:text-slate-100 flex items-center justify-center pt-0 ceo-grid-fade overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-400/10 dark:bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }}></div>
      
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />
      <div className="relative z-10 text-center px-6 max-w-6xl mx-auto">
        <h1
          ref={headingRef}
          className="text-6xl md:text-7xl lg:text-8xl font-bold text-gray-900 dark:text-white mb-8 opacity-0 tracking-tight leading-[1.1]"
        >
          Run Your Business{" "}
          <span className="relative inline-block">
            <span className="ceo-text-gradient relative z-10">Smarter</span>
            <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" preserveAspectRatio="none">
              <path d="M0,7 Q50,0 100,7 T200,7" fill="none" stroke="url(#gradient)" strokeWidth="3" opacity="0.6"/>
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3B82F6"/>
                  <stop offset="50%" stopColor="#6366F1"/>
                  <stop offset="100%" stopColor="#8B5CF6"/>
                </linearGradient>
              </defs>
            </svg>
          </span>
        </h1>
        <p
          ref={subRef}
          className="text-xl md:text-2xl text-gray-600 dark:text-slate-300 max-w-3xl mx-auto mb-12 opacity-0 leading-relaxed font-medium"
        >
          The all-in-one platform built for CEOs to make confident decisions, 
          manage high-performing teams, and accelerate sustainable growth.
        </p>
        <div
          ref={ctaRef}
          className="flex items-center justify-center gap-6 opacity-0 flex-wrap"
        >
          {isAuthenticated ? (
            <a
              href="/dashboard"
              className="primary-cta relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
              <div className="relative inline-flex items-center justify-center px-10 py-5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold shadow-2xl shadow-blue-500/40 transition-all duration-300 group-hover:shadow-3xl group-hover:shadow-blue-500/50 group-hover:scale-105 text-lg tracking-tight overflow-hidden">
                <span className="relative z-10 flex items-center gap-2">
                  Go to Dashboard
                </span>
              </div>
            </a>
          ) : (
            <>
              <a
                href="/signup"
                className="primary-cta relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
                <div className="relative inline-flex items-center justify-center px-10 py-5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold shadow-2xl shadow-blue-500/40 transition-all duration-300 group-hover:shadow-3xl group-hover:shadow-blue-500/50 group-hover:scale-105 text-lg tracking-tight overflow-hidden">
                  <span className="relative z-10 flex items-center gap-2">
                    Get Started Free
                    <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </div>
              </a>
              
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010"}/api/auth/google`}
                className="secondary-cta relative group"
              >
                <div className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-white dark:bg-[#0d1f38] border-2 border-gray-200 dark:border-white/10 text-gray-700 dark:text-slate-100 font-bold shadow-xl shadow-gray-900/10 dark:shadow-blue-950/30 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-gray-900/15 dark:group-hover:shadow-blue-900/40 group-hover:scale-105 group-hover:border-gray-300 dark:group-hover:border-white/20 text-lg tracking-tight overflow-hidden relative">
                  <FcGoogle className="w-6 h-6 relative z-10" />
                  <span className="relative z-10">Continue with Google</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-100/50 dark:via-[#122b46]/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </div>
              </a>
            </>
          )}
        </div>
        
        <div className="mt-20 opacity-90">
          <p className="text-sm text-gray-500 dark:text-blue-200 mb-6 font-semibold tracking-wide uppercase animate-pulse">
            Trusted by forward-thinking executives
          </p>
          <div className="flex items-center justify-center gap-10 flex-wrap">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i}
                className="w-28 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl opacity-60 hover:opacity-80 transition-opacity duration-300 animate-pulse shadow-sm"
                style={{ animationDelay: `${i * 0.2}s` }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
