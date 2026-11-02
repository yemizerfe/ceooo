import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../lib/prisma.js';

type SearchableType =
  | 'projects'
  | 'tasks'
  | 'objectives'
  | 'kpis'
  | 'stakeholders'
  | 'notes'
  | 'decisions'
  | 'calendar';

const ALL_TYPES: SearchableType[] = [
  'projects',
  'tasks',
  'objectives',
  'kpis',
  'stakeholders',
  'notes',
  'decisions',
  'calendar',
];

const TYPE_WEIGHTS: Record<string, number> = {
  projects: 3,
  tasks: 2,
  objectives: 3,
  kpis: 2,
  stakeholders: 3,
  notes: 2,
  decisions: 3,
  calendar: 1,
};

// Every target must be a page that actually exists. The workspace uses list
// pages with in-place detail panels rather than /:id routes, so results link to
// the module and carry the record id for the page to focus.
const TYPE_URLS: Record<string, (id: string) => string> = {
  projects: (id: string) => `/dashboard/projects?project=${id}`,
  tasks: (id: string) => `/dashboard/projects?task=${id}`,
  objectives: (id: string) => `/dashboard/performance?okr=${id}`,
  kpis: (id: string) => `/dashboard/performance?kpi=${id}`,
  stakeholders: (id: string) => `/dashboard/network?stakeholder=${id}`,
  notes: (id: string) => `/dashboard/notes?note=${id}`,
  decisions: (id: string) => `/dashboard/decisions?decision=${id}`,
  calendar: (id: string) => `/dashboard/calendar?event=${id}`,
};

function snippet(text: string | null | undefined, query: string): string {
  if (!text) return '';
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, 120);
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + query.length + 80);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

function score(haystack: string, query: string): number {
  const lower = haystack.toLowerCase();
  const q = query.toLowerCase();
  let s = 0;
  if (lower.startsWith(q)) s += 5;
  if (lower.includes(q)) s += 3;
  // per-word partial matches
  for (const word of q.split(/\s+/).filter(Boolean)) {
    if (lower.includes(word)) s += 1;
  }
  return s;
}

/**
 * GET /api/search?q=...&types=projects,notes&page=1&limit=20
 * Permission-scoped, user-owned records only. No cross-user leakage.
 */
export const globalSearch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const q = String(req.query.q || '').trim();
    if (!q) {
      res.status(400).json({ success: false, message: 'Search query (q) is required' });
      return;
    }

    const requested = String(req.query.types || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const types = (requested.length ? requested : ALL_TYPES).filter((t): t is SearchableType =>
      ALL_TYPES.includes(t as SearchableType),
    );

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));

    const contains = { contains: q, mode: 'insensitive' as const };
    const results: {
      type: SearchableType;
      id: string;
      title: string;
      snippet: string;
      url: string;
      score: number;
    }[] = [];

    await Promise.all(
      types.map(async (type) => {
        switch (type) {
          case 'projects': {
            const rows = await prisma.project.findMany({
              where: {
                userId,
                OR: [{ name: contains }, { description: contains }],
              },
              take: 25,
            });
            rows.forEach((r) =>
              results.push({
                type,
                id: r.id,
                title: r.name,
                snippet: snippet(r.description, q),
                url: TYPE_URLS[type](r.id),
                score: score(r.name, q) * TYPE_WEIGHTS[type],
              }),
            );
            break;
          }
          case 'tasks': {
            const rows = await prisma.task.findMany({
              where: {
                project: { userId },
                OR: [{ title: contains }, { description: contains }],
              },
              take: 25,
            });
            rows.forEach((r) =>
              results.push({
                type,
                id: r.id,
                title: r.title,
                snippet: snippet(r.description, q),
                url: TYPE_URLS[type](r.id),
                score: score(r.title, q) * TYPE_WEIGHTS[type],
              }),
            );
            break;
          }
          case 'objectives': {
            const rows = await prisma.oKR.findMany({
              where: { userId, OR: [{ objective: contains }, { quarter: contains }] },
              take: 25,
            });
            rows.forEach((r) =>
              results.push({
                type,
                id: r.id,
                title: r.objective,
                snippet: `${r.quarter} ${r.year}`,
                url: TYPE_URLS[type](r.id),
                score: score(r.objective, q) * TYPE_WEIGHTS[type],
              }),
            );
            break;
          }
          case 'kpis': {
            const rows = await prisma.kPI.findMany({
              where: {
                userId,
                OR: [{ name: contains }, { description: contains }, { category: contains }],
              },
              take: 25,
            });
            rows.forEach((r) =>
              results.push({
                type,
                id: r.id,
                title: r.name,
                snippet: snippet(r.description, q),
                url: TYPE_URLS[type](r.id),
                score: score(r.name, q) * TYPE_WEIGHTS[type],
              }),
            );
            break;
          }
          case 'stakeholders': {
            const rows = await prisma.stakeholder.findMany({
              where: {
                userId,
                OR: [
                  { name: contains },
                  { email: contains },
                  { company: contains },
                  { notes: contains },
                ],
              },
              take: 25,
            });
            rows.forEach((r) =>
              results.push({
                type,
                id: r.id,
                title: r.name,
                snippet: snippet(r.company || r.notes, q),
                url: TYPE_URLS[type](r.id),
                score: score(r.name, q) * TYPE_WEIGHTS[type],
              }),
            );
            break;
          }
          case 'notes': {
            const rows = await prisma.note.findMany({
              where: {
                userId,
                OR: [{ title: contains }, { content: contains }],
              },
              take: 25,
            });
            rows.forEach((r) =>
              results.push({
                type,
                id: r.id,
                title: r.title,
                snippet: snippet(r.content, q),
                url: TYPE_URLS[type](r.id),
                score: score(r.title, q) * TYPE_WEIGHTS[type],
              }),
            );
            break;
          }
          case 'decisions': {
            const rows = await prisma.decision.findMany({
              where: {
                userId,
                OR: [{ title: contains }, { description: contains }],
              },
              take: 25,
            });
            rows.forEach((r) =>
              results.push({
                type,
                id: r.id,
                title: r.title,
                snippet: snippet(r.description, q),
                url: TYPE_URLS[type](r.id),
                score: score(r.title, q) * TYPE_WEIGHTS[type],
              }),
            );
            break;
          }
          case 'calendar': {
            const rows = await prisma.calendarEvent.findMany({
              where: {
                userId,
                OR: [{ title: contains }, { description: contains }, { location: contains }],
              },
              take: 25,
            });
            rows.forEach((r) =>
              results.push({
                type,
                id: r.id,
                title: r.title,
                snippet: snippet(r.description, q),
                url: TYPE_URLS[type](r.id),
                score: score(r.title, q) * TYPE_WEIGHTS[type],
              }),
            );
            break;
          }
        }
      }),
    );

    results.sort((a, b) => b.score - a.score);
    const total = results.length;
    const start = (page - 1) * limit;
    const paged = results.slice(start, start + limit);

    res.status(200).json({
      success: true,
      data: paged,
      meta: { query: q, total, page, limit, types },
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
};
