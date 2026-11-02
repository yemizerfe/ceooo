// lib/siteSearch.ts
//
// The marketing navbar is shown to visitors without a session, so it cannot use
// the authenticated /api/search workspace index. This small local index still
// lets them find public pages instead of being told to sign in.

export interface SiteResult {
  type: "page";
  id: string;
  title: string;
  snippet: string;
  url: string;
  score: number;
}

interface SitePage {
  title: string;
  url: string;
  description: string;
  keywords?: string;
}

export const SITE_PAGES: SitePage[] = [
  { title: "AI Insights", url: "/features/ai-insights", description: "AI analysis of decisions, projects and financials.", keywords: "ai insight analytics forecast" },
  { title: "Decision Making", url: "/features/decision-making", description: "Track decisions, options, context and outcomes.", keywords: "decision choices tradeoffs" },
  { title: "Project Management", url: "/features/projectmanagemnet", description: "Plan projects, milestones and tasks in one place.", keywords: "project task milestone kanban" },
  { title: "Financial Tracking", url: "/features/financial-tracking", description: "Revenue, costs, budgets and cash-flow visibility.", keywords: "finance money budget cashflow revenue" },
  { title: "Company Performance", url: "/features/company-performance", description: "KPIs, OKRs and executive scorecards.", keywords: "kpi okr performance metrics" },
  { title: "Notes Board", url: "/features/notes-board", description: "Capture meeting notes and turn them into actions.", keywords: "notes meeting memo" },
  { title: "Stakeholder Connection", url: "/features/stackholderconnection", description: "Keep investors, partners and stakeholders aligned.", keywords: "stakeholder investor contact network" },
  { title: "Time & Calendar", url: "/features/time-calendar", description: "Executive calendar, focus blocks and scheduling.", keywords: "calendar time schedule focus" },
  { title: "Pricing", url: "/pricing", description: "Plans, seats and enterprise options.", keywords: "pricing plan cost price billing" },
  { title: "Documentation", url: "/documentation", description: "Setup guides and product documentation.", keywords: "docs guide help setup how" },
  { title: "Templates", url: "/templates", description: "Decision, project and OKR templates.", keywords: "template example framework" },
  { title: "FAQ", url: "/FAQ", description: "Answers to common questions about CEOOO.", keywords: "faq question answer help" },
  { title: "Request a Demo", url: "/request-demo", description: "See CEOOO with your own company context.", keywords: "demo trial walkthrough" },
  { title: "Schedule a Call", url: "/support/schedule-call", description: "Book a call with the team.", keywords: "call meeting book schedule" },
  { title: "Email Support", url: "/support/email", description: "Open a support ticket.", keywords: "support ticket email help" },
  { title: "Live Chat", url: "/support/live-chat", description: "Chat with the CEOOO assistant or a human.", keywords: "chat support ai live" },
  { title: "Contact Sales", url: "/contact-sales", description: "Talk to sales about your team.", keywords: "sales contact enterprise" },
  { title: "Downloads", url: "/resource/downloads", description: "Desktop apps and resources.", keywords: "download app resource" },
];

export function searchSite(query: string, limit = 8): SiteResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/\s+/).filter(Boolean);

  return SITE_PAGES.map((page) => {
    const haystack = `${page.title} ${page.description} ${page.keywords ?? ""}`.toLowerCase();
    let score = 0;
    if (page.title.toLowerCase() === q) score += 8;
    if (page.title.toLowerCase().startsWith(q)) score += 5;
    if (page.title.toLowerCase().includes(q)) score += 4;
    if (haystack.includes(q)) score += 2;
    for (const word of words) {
      if (haystack.includes(word)) score += 1;
    }
    return {
      type: "page" as const,
      id: page.url,
      title: page.title,
      snippet: page.description,
      url: page.url,
      score,
    };
  })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
