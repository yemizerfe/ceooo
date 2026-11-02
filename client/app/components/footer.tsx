"use client";
import Link from "next/link";
import {
  FaFacebook,
  FaInstagram,
  FaYoutube,
  FaLinkedin,
} from "react-icons/fa";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const sections = [
    {
      label: "Company",
      links: [
        {
          label: "About Us",
          href: "/about",
        },
        { label: "Contact Sales", href: "/contact-sales" },
        { label: "Pricing", href: "/pricing" },
      ],
    },
    {
      label: "Resources",
      links: [
        {
          label: "Documentation",
          href: "/documentation",
        },
        { label: "Templates", href: "/templates" },
        { label: "FAQ", href: "/FAQ" },
        { label: "Downloads", href: "/resource/downloads" },
      ],
    },
    {
      label: "Features",
      links: [
        { label: "Decision Making", href: "/features/decision-making" },
        { label: "AI Insights", href: "/features/ai-insights" },
        { label: "Project Management", href: "/features/projectmanagemnet" },
        { label: "Financial Tracking", href: "/features/financial-tracking" },
      ],
    },
    {
      label: "Support",
      links: [
        {
          label: "Request Demo",
          href: "/request-demo",
        },
        {
          label: "Schedule Call",
          href: "/support/schedule-call",
        },
        { label: "Email Support", href: "/support/email" },
        { label: "Live Chat", href: "/support/live-chat" },
      ],
    },
  ];

  const socilaLinks = [
    {
      icon: XIcon,
      href: "https://x.com/CEOOO",
      label: "X",
      color: "hover:text-slate-900 dark:hover:text-white",
    },
    {
      icon: FaFacebook,
      href: "https://facebook.com/CEOOO",
      label: "Facebook",
      color: "hover:text-[#1877F2]",
    },
    {
      icon: FaInstagram,
      href: "https://instagram.com/CEOOO",
      label: "Instagram",
      color: "hover:text-[#E1306C]",
    },
    {
      icon: FaYoutube,
      href: "https://youtube.com/CEOOO",
      label: "YouTube",
      color: "hover:text-[#FF0000]",
    },
    {
      icon: FaLinkedin,
      href: "https://linkedin.com/company/CEOOO",
      label: "LinkedIn",
      color: "hover:text-slate-900",
    },
  ];

  return (
    <footer className="w-full bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:bg-[radial-gradient(circle_at_top,_#0c1f39_0%,_#071a2e_48%,_#051522_100%)] border-t border-gray-200/60 dark:border-white/10 relative overflow-hidden text-slate-900 dark:text-slate-100">
      {/* Animated gradient orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
      
      <div className="relative z-10 container mx-auto px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <Link className="inline-block group mb-6" href="/">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-300"></div>
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-xl group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:scale-105 group-hover:rotate-3">
                  <svg className="w-11 h-11 text-white transform group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2 3h10v1H7v-1z"/>
                  </svg>
                </div>
              </div>
            </Link>
            <p className="text-sm text-blue-600 dark:text-blue-300 mb-6 tracking-wide uppercase font-bold">
              A CEO&apos;s #1 Choice.
            </p>
            <p className="text-gray-600 dark:text-slate-300 mb-6 text-sm leading-relaxed font-medium">
              Empowering CEOs worldwide to make smarter decisions, build stronger teams, and drive sustainable growth.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              {socilaLinks.map((links, idx) => (
                <Link 
                  key={links.label} 
                  href={links.href}
                  className="group/social relative"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl blur-md opacity-0 group-hover/social:opacity-40 transition-opacity duration-300"></div>
                  <div className="relative w-12 h-12 rounded-xl bg-white dark:bg-[#0d1f38] border-2 border-gray-200 dark:border-white/10 flex items-center justify-center group-hover/social:border-blue-300 dark:group-hover/social:border-blue-400 group-hover/social:bg-gradient-to-br group-hover/social:from-blue-50 group-hover/social:to-indigo-50 transition-all duration-300 shadow-sm group-hover/social:shadow-lg group-hover/social:scale-110">
                    <links.icon
                      className={`h-5 w-5 text-gray-600 dark:text-slate-200 transition-all duration-300 ${links.color}`}
                      aria-label={links.label}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>
          
          {sections.map((section, idx) => (
            <div key={section.label} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${idx * 0.1}s`, animationDuration: "0.6s", animationFillMode: "both" }}>
              <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-6 tracking-tight">
                {section.label}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-300 transition-all duration-200 font-medium text-sm inline-flex items-center group"
                    >
                      <span className="group-hover:translate-x-1 transition-transform duration-200">{link.label}</span>
                      <svg className="w-0 group-hover:w-4 h-4 ml-0 group-hover:ml-1 opacity-0 group-hover:opacity-100 transition-all duration-200" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="border-t border-gray-200/60 pt-8">
          <div className="flex items-center justify-center md:justify-between gap-6">
            <p className="text-sm text-gray-600 dark:text-slate-300 font-semibold tracking-tight text-center md:text-left">
              © {currentYear} <span className="text-blue-600 dark:text-blue-300">CEOOO</span>. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
