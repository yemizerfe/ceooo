import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.ts';
import { prisma } from '../lib/prisma.ts';

// --------- Helpers (runtime narrowing to keep Prisma inputs type-safe) ---------
const asStringOrNull = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const asStringOrUndefined = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const asStringArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);

const parseJsonFromNotes = (notes: string | null | undefined): any => {
  if (!notes || typeof notes !== 'string') return {};
  try {
    return JSON.parse(notes) ?? {};
  } catch {
    return {};
  }
};

// Get all decisions for the user
export const getDecisions = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const decisions = await prisma.decision.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, data: decisions });
  } catch (error) {
    console.error('Get decisions error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get single decision by ID
export const getDecisionById = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    const { id } = authReq.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const decision = await prisma.decision.findFirst({ where: { id, userId } });
    if (!decision) {
      res.status(404).json({ success: false, message: 'Decision not found' });
      return;
    }

    res.status(200).json({ success: true, data: decision });
  } catch (error) {
    console.error('Get decision error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Create new decision
export const createDecision = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    const body = req.body as Record<string, unknown>;

    const title = asStringOrNull(body.title)?.trim();
    const description = asStringOrNull(body.description);

    const priorityRaw = asStringOrUndefined(body.priority);
    const impactRaw = asStringOrUndefined(body.impact);
    const statusRaw = asStringOrUndefined(body.status);

    // IMPORTANT: extended metadata (category/owner/thoughts/...) is stored in notes JSON string
    const notes = typeof body.notes === 'string' ? body.notes : null;


    const options = Array.isArray(body.options) ? body.options : [];

    const selectedOption = typeof body.selectedOption === 'string' ? body.selectedOption : null;
    const deadline = body.deadline ? new Date(String(body.deadline)) : null;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!title) {
      res.status(400).json({ success: false, message: 'Decision title is required' });
      return;
    }

    const decision = await prisma.decision.create({
      data: {
        userId,
        title,
        description,
        status: statusRaw ? (statusRaw.toUpperCase() as any) : 'PENDING',
        priority: priorityRaw ? (priorityRaw.toUpperCase() as any) : 'MEDIUM',
        impact: impactRaw ? (impactRaw.toUpperCase() as any) : 'MEDIUM',
        notes,
        options: options as any,
        selectedOption,
        deadline: deadline && !isNaN(deadline.getTime()) ? deadline : null,
      },
    });

    // ensure notes are persisted exactly as provided from frontend
    if (typeof notes === 'string' && notes.trim().length > 0) {
      await prisma.decision.update({ where: { id: decision.id }, data: { notes } });
    }

    const updatedDecision = await prisma.decision.findUnique({ where: { id: decision.id } });
    res.status(201).json({ success: true, data: updatedDecision, message: 'Decision created successfully' });
  } catch (error) {
    console.error('Create decision error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Update decision
export const updateDecision = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    const { id } = authReq.params;
    const body = req.body as Record<string, unknown>;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const existingDecision = await prisma.decision.findFirst({ where: { id, userId } });
    if (!existingDecision) {
      res.status(404).json({ success: false, message: 'Decision not found' });
      return;
    }

    const title = asStringOrUndefined(body.title);
    const description = asStringOrUndefined(body.description);
    const status = asStringOrUndefined(body.status);
    const priority = asStringOrUndefined(body.priority);
    const impact = asStringOrUndefined(body.impact);

    const notes = typeof body.notes === 'string' ? body.notes : null;

    const options = Array.isArray(body.options) ? body.options : undefined;

    const selectedOption = typeof body.selectedOption === 'string' ? body.selectedOption : null;

    const deadlineRaw = body.deadline;
    const deadline = deadlineRaw ? new Date(String(deadlineRaw)) : undefined;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status.toUpperCase() as any;
    if (priority !== undefined) updateData.priority = priority.toUpperCase() as any;
    if (impact !== undefined) updateData.impact = impact.toUpperCase() as any;
    if (notes !== null) updateData.notes = notes;
    if (options !== undefined) updateData.options = options;
    if (selectedOption !== undefined) updateData.selectedOption = selectedOption;
    if (deadline !== undefined) updateData.deadline = deadline && !isNaN(deadline.getTime()) ? deadline : null;

    if (status === 'decided' && existingDecision.status !== 'DECIDED') {
      updateData.decidedAt = new Date();
    }

    await prisma.decision.update({ where: { id }, data: updateData });

    // Persist extended metadata inside `notes` reliably.
    // Source-of-truth: frontend `notes` JSON string.
    // If notes is missing, keep existing extended metadata.
    const existingExtended = parseJsonFromNotes(existingDecision.notes);
    const incomingExtended = notes ? parseJsonFromNotes(notes) : {};
    const mergedExtended = { ...existingExtended, ...incomingExtended };

    await prisma.decision.update({
      where: { id },
      data: {
        notes: JSON.stringify(mergedExtended),
      },
    });

    const updatedDecision = await prisma.decision.findUnique({ where: { id } });
    res.status(200).json({ success: true, data: updatedDecision, message: 'Decision updated successfully' });
  } catch (error) {
    console.error('Update decision error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteDecision = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    const { id } = authReq.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const existingDecision = await prisma.decision.findFirst({ where: { id, userId } });
    if (!existingDecision) {
      res.status(404).json({ success: false, message: 'Decision not found' });
      return;
    }

    await prisma.decision.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Decision deleted successfully' });
  } catch (error) {
    console.error('Delete decision error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get decision insights
export const getDecisionInsights = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    const { id } = authReq.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const decision = await prisma.decision.findFirst({ where: { id, userId } });
    if (!decision) {
      res.status(404).json({ success: false, message: 'Decision not found' });
      return;
    }

    const insights = await prisma.aIInsight.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.status(200).json({ success: true, data: insights });
  } catch (error) {
    console.error('Get decision insights error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const addDecisionInsight = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    const { id } = authReq.params;
    const body = req.body as Record<string, unknown>;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const decision = await prisma.decision.findFirst({ where: { id, userId } });
    if (!decision) {
      res.status(404).json({ success: false, message: 'Decision not found' });
      return;
    }

    const title = asStringOrNull(body.title) ?? 'AI Insight';
    const description = asStringOrNull(body.description) ?? '';
    const type = asStringOrNull(body.type) ?? 'RECOMMENDATION';
    const impact = asStringOrNull(body.impact) ?? 'MEDIUM';
    const confidenceRaw = typeof body.confidence === 'number' ? body.confidence : Number(body.confidence);
    const confidence = Number.isFinite(confidenceRaw) ? confidenceRaw : 70;
    const metadata = (typeof body.metadata === 'object' && body.metadata !== null ? body.metadata : {}) as any;

    const insight = await prisma.aIInsight.create({
      data: {
        userId,
        title,
        description,
        type: type as any,
        impact: impact as any,
        confidence,
        metadata,
      },
    });

    res.status(201).json({ success: true, data: insight, message: 'Insight added successfully' });
  } catch (error) {
    console.error('Add insight error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getDecisionStats = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const stats = {
      total: await prisma.decision.count({ where: { userId } }),
      pending: await prisma.decision.count({ where: { userId, status: 'PENDING' } }),
      inProgress: await prisma.decision.count({ where: { userId, status: 'IN_PROGRESS' } }),
      decided: await prisma.decision.count({ where: { userId, status: 'DECIDED' } }),
      executing: await prisma.decision.count({ where: { userId, status: 'EXECUTING' } }),
      cancelled: await prisma.decision.count({ where: { userId, status: 'CANCELLED' } }),
      byPriority: {
        high: await prisma.decision.count({ where: { userId, priority: 'HIGH' } }),
        medium: await prisma.decision.count({ where: { userId, priority: 'MEDIUM' } }),
        low: await prisma.decision.count({ where: { userId, priority: 'LOW' } }),
      },
    };

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error('Get decision stats error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

