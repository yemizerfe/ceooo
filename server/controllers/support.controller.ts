// server/controllers/support.controller.ts
//
// Public support surfaces: request a demo, schedule a call, email support, and
// the live-chat assistant. Everything the browser can reach here is
// unauthenticated, so the payload is validated and capped hard. Requests are
// persisted as SupportRequest rows; the support inbox is notified on a
// best-effort basis and a failure to send mail never loses the request.
import type { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import nodemailer from 'nodemailer';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

const REQUEST_TYPES = ['DEMO', 'CALL', 'EMAIL', 'CHAT'] as const;
type RequestType = (typeof REQUEST_TYPES)[number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const REFERENCE_PREFIX: Record<RequestType, string> = {
  DEMO: 'DEMO',
  CALL: 'CALL',
  EMAIL: 'SUP',
  CHAT: 'CHAT',
};

function text(value: unknown, max = 500): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function newReference(type: RequestType): string {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${REFERENCE_PREFIX[type]}-${random}`;
}

function parseDate(value: unknown): Date | null {
  const raw = text(value, 40);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function notifySupportInbox(subject: string, lines: string[]): Promise<void> {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM, SUPPORT_EMAIL } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) return;

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transporter.sendMail({
      from: SMTP_FROM,
      to: SUPPORT_EMAIL || SMTP_USER,
      replyTo: lines.find((line) => line.startsWith('Email: '))?.slice(7),
      subject,
      text: lines.join('\n'),
    });
  } catch (error) {
    // The request is already stored - a mail outage must not fail the form.
    logger.warn('Support inbox notification failed', {
      error: error instanceof Error ? error.message : 'unknown error',
    });
  }
}

/**
 * POST /api/support/requests
 * Body: { type, name, email, company?, phone?, jobTitle?, companySize?,
 *         subject?, category?, priority?, message?, meetingType?, timezone?,
 *         preferredDate?, preferredTime?, source?, metadata? }
 */
export const createSupportRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const rawType = String(body.type ?? 'EMAIL').toUpperCase();
    const type = (REQUEST_TYPES as readonly string[]).includes(rawType)
      ? (rawType as RequestType)
      : null;

    if (!type) {
      res.status(400).json({ success: false, message: 'Unsupported request type' });
      return;
    }

    const name = text(body.name, 160);
    const email = text(body.email, 254);

    if (!name) {
      res.status(400).json({ success: false, message: 'Your name is required' });
      return;
    }
    if (!email || !EMAIL_RE.test(email)) {
      res.status(400).json({ success: false, message: 'A valid email address is required' });
      return;
    }

    const message = text(body.message, 8000);
    if ((type === 'EMAIL' || type === 'CHAT') && !message) {
      res.status(400).json({ success: false, message: 'A message is required' });
      return;
    }

    const request = await prisma.supportRequest.create({
      data: {
        reference: newReference(type),
        type,
        status: 'OPEN',
        name,
        email: email.toLowerCase(),
        company: text(body.company, 200),
        phone: text(body.phone, 40),
        jobTitle: text(body.jobTitle, 160),
        companySize: text(body.companySize, 40),
        subject: text(body.subject, 200),
        category: text(body.category, 60),
        priority: text(body.priority, 20)?.toUpperCase() ?? null,
        message,
        meetingType: text(body.meetingType, 60),
        timezone: text(body.timezone, 80),
        preferredDate: parseDate(body.preferredDate),
        preferredTime: text(body.preferredTime, 40),
        source: text(body.source, 120),
        metadata:
          body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
            ? (body.metadata as object)
            : {},
      },
    });

    const label = { DEMO: 'Demo request', CALL: 'Call request', EMAIL: 'Support ticket', CHAT: 'Chat transcript' }[type];
    void notifySupportInbox(`${label} ${request.reference}`, [
      `Reference: ${request.reference}`,
      `Type: ${type}`,
      `Name: ${request.name}`,
      `Email: ${request.email}`,
      request.company ? `Company: ${request.company}` : '',
      request.phone ? `Phone: ${request.phone}` : '',
      request.preferredDate ? `Preferred date: ${request.preferredDate.toISOString()}` : '',
      request.preferredTime ? `Preferred time: ${request.preferredTime}` : '',
      request.message ? `\n${request.message}` : '',
    ].filter(Boolean));

    res.status(201).json({
      success: true,
      message: 'Request received',
      data: {
        id: request.id,
        reference: request.reference,
        type: request.type,
        status: request.status,
        createdAt: request.createdAt,
      },
    });
  } catch (error) {
    logger.error('Create support request failed', {
      error: error instanceof Error ? error.message : 'unknown error',
    });
    res.status(500).json({ success: false, message: 'Could not submit your request. Please try again.' });
  }
};

const SUPPORT_SYSTEM_PROMPT = `You are the CEOOO support assistant. CEOOO is an executive
decision-making and business intelligence platform. Answer questions about getting
started, decisions, projects, financials, AI insights, integrations, pricing, team
management, and security. Keep answers under 120 words, be concrete, and point to
the in-app page or the documentation when useful. If the visitor needs billing help,
a human agent, or their account looked at, tell them to use "Talk to a human" or the
email support form. Never invent features, prices, or promises.`;

// Short, honest fallback used when no Gemini key is configured or the call fails.
function fallbackAnswer(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('getting started') || lower.includes('start') || lower.includes('begin')) {
    return 'Create an account, finish the short onboarding, then connect a tool from Dashboard → Integrations. Your dashboard fills in with decisions, projects and financials as you add them.';
  }
  if (lower.includes('pricing') || lower.includes('cost') || lower.includes('plan') || lower.includes('price')) {
    return 'Plans and current pricing are on the Pricing page. Every plan includes decision tracking, projects and AI insights; enterprise adds SSO, audit logs and priority support.';
  }
  if (lower.includes('integrat') || lower.includes('slack') || lower.includes('jira') || lower.includes('tool')) {
    return 'Open Dashboard → Integrations to connect tools such as Slack, Jira, Google Workspace, HubSpot, Stripe and QuickBooks. Connected data flows into search, insights and reports.';
  }
  if (lower.includes('team') || lower.includes('invite') || lower.includes('member')) {
    return 'Invite people from Dashboard → Team. Each member gets an access role, and permissions are enforced on every API call, not just in the UI.';
  }
  if (lower.includes('security') || lower.includes('data') || lower.includes('privacy')) {
    return 'CEOOO uses encrypted transport, hashed passwords, role-based permissions, audit logging, and per-user data scoping. Administrators never see password hashes or provider credentials.';
  }
  if (lower.includes('decision')) {
    return 'Decisions live in Dashboard → Decisions. Capture the context and options, run the AI analysis, then record the outcome so later insights can compare what you expected with what happened.';
  }
  if (lower.includes('ai') || lower.includes('insight')) {
    return 'AI insights read the data already in your workspace — decisions, projects, financials, notes — and surface risks, opportunities and recommended next steps. More data means sharper analysis.';
  }
  if (lower.includes('human') || lower.includes('agent') || lower.includes('person')) {
    return 'I can hand you to the team: use "Talk to a human" in this chat, the email support form, or book a call. Tickets are answered in the order received.';
  }
  return 'I can help with CEOOO setup, decisions, projects, financials, integrations, AI insights, team access and pricing. Ask a specific question, or use "Talk to a human" to reach the support team.';
}

/**
 * POST /api/support/chat
 * Body: { message, history?: Array<{ role: 'user' | 'assistant', content: string }> }
 * Uses Gemini when GOOGLE_API_KEY is configured, otherwise a grounded fallback.
 */
export const supportChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const message = text(body.message, 2000);
    if (!message) {
      res.status(400).json({ success: false, message: 'Message is required' });
      return;
    }

    const history = Array.isArray(body.history)
      ? body.history
          .slice(-10)
          .map((item) => {
            const entry = (item ?? {}) as Record<string, unknown>;
            const content = text(entry.content, 2000);
            if (!content) return null;
            return `${entry.role === 'assistant' ? 'Assistant' : 'Visitor'}: ${content}`;
          })
          .filter((line): line is string => Boolean(line))
      : [];

    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 20000 } });
        // Mirrors services/ai/call-gemini.service.ts: the SDK's content shape
        // carries the system prompt as the first turn.
        const contents: any[] = [
          { role: 'system', parts: [{ text: SUPPORT_SYSTEM_PROMPT }] },
          { role: 'user', parts: [{ text: [...history, `Visitor: ${message}`].join('\n') }] },
        ];
        const response = await (ai as any).models.generateContent({
          model: process.env.SUPPORT_CHAT_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
          contents,
        });
        const answer: string | undefined = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (answer?.trim()) {
          res.status(200).json({ success: true, data: { message: answer.trim(), type: 'ai', model: 'gemini' } });
          return;
        }
      } catch (error) {
        logger.warn('Support chat Gemini call failed; using fallback', {
          error: error instanceof Error ? error.message : 'unknown error',
        });
      }
    }

    res.status(200).json({
      success: true,
      data: { message: fallbackAnswer(message), type: 'ai', model: 'fallback' },
    });
  } catch (error) {
    logger.error('Support chat failed', {
      error: error instanceof Error ? error.message : 'unknown error',
    });
    res.status(500).json({ success: false, message: 'Failed to process message' });
  }
};

const STATUSES = ['OPEN', 'CONTACTED', 'CLOSED'] as const;

/**
 * GET /api/admin/support-requests?status=&type=&page=&limit=
 * Admin support inbox: newest first, metadata only.
 */
export const listSupportRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query as Record<string, string>;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const where: Record<string, unknown> = {};
    if (query.status && (STATUSES as readonly string[]).includes(query.status.toUpperCase())) {
      where.status = query.status.toUpperCase();
    }
    if (query.type && (REQUEST_TYPES as readonly string[]).includes(query.type.toUpperCase())) {
      where.type = query.type.toUpperCase();
    }

    const [items, total] = await Promise.all([
      prisma.supportRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.supportRequest.count({ where }),
    ]);

    res.status(200).json({ success: true, data: { items, total, page, limit } });
  } catch (error) {
    logger.error('List support requests failed', {
      error: error instanceof Error ? error.message : 'unknown error',
    });
    res.status(500).json({ success: false, message: 'Could not load support requests' });
  }
};

/** PATCH /api/admin/support-requests/:id { status } */
export const updateSupportRequestStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id || '');
    const status = String((req.body ?? {}).status || '').toUpperCase();
    if (!(STATUSES as readonly string[]).includes(status)) {
      res.status(400).json({ success: false, message: 'Status must be OPEN, CONTACTED or CLOSED' });
      return;
    }

    const existing = await prisma.supportRequest.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Support request not found' });
      return;
    }

    const updated = await prisma.supportRequest.update({ where: { id }, data: { status } });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    logger.error('Update support request failed', {
      error: error instanceof Error ? error.message : 'unknown error',
    });
    res.status(500).json({ success: false, message: 'Could not update the support request' });
  }
};

/**
 * POST /api/support/handoff
 * Stores a live-chat transcript when the visitor asks for a human. Accepts the
 * same contact fields as a ticket plus the transcript in `message`.
 */
export const requestHumanHandoff = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = text(body.name, 160) || 'Live chat visitor';
    const email = text(body.email, 254);

    if (!email || !EMAIL_RE.test(email)) {
      res.status(400).json({ success: false, message: 'A valid email address is required so we can reply' });
      return;
    }

    const request = await prisma.supportRequest.create({
      data: {
        reference: newReference('CHAT'),
        type: 'CHAT',
        status: 'OPEN',
        name,
        email: email.toLowerCase(),
        subject: 'Live chat handoff',
        priority: 'HIGH',
        message: text(body.message, 12000) || null,
        source: 'live-chat',
        metadata: { requestedHuman: true },
      },
    });

    void notifySupportInbox(`Live chat handoff ${request.reference}`, [
      `Reference: ${request.reference}`,
      `Name: ${request.name}`,
      `Email: ${request.email}`,
      '',
      request.message || '',
    ]);

    res.status(201).json({
      success: true,
      data: { id: request.id, reference: request.reference, type: request.type, status: request.status },
    });
  } catch (error) {
    logger.error('Support handoff failed', {
      error: error instanceof Error ? error.message : 'unknown error',
    });
    res.status(500).json({ success: false, message: 'Could not start the handoff. Please try again.' });
  }
};
