import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../lib/prisma.js';

/**
 * OKR progress = average of (current / target) * 100 across key results.
 * Division by zero is guarded (target <= 0 contributes 0).
 */
function keyResultProgress(kr: { current: number; target: number }): number {
  if (!kr.target || kr.target <= 0) return 0;
  return Math.min(100, (kr.current / kr.target) * 100);
}

function okrProgress(keyResults: { current: number; target: number }[]): number {
  if (!keyResults.length) return 0;
  const total = keyResults.reduce((sum, kr) => sum + keyResultProgress(kr), 0);
  return Math.round((total / keyResults.length) * 10) / 10;
}

/**
 * Status heuristic:
 *  - COMPLETED  : every KR at/above target
 *  - OFF_TRACK   : less than 40% progress
 *  - AT_RISK     : less than 70% progress
 *  - ON_TRACK    : otherwise
 */
function okrStatus(progress: number, keyResults: { current: number; target: number }[]): string {
  if (keyResults.length > 0 && keyResults.every((kr) => kr.target > 0 && kr.current >= kr.target)) {
    return 'COMPLETED';
  }
  if (progress < 40) return 'OFF_TRACK';
  if (progress < 70) return 'AT_RISK';
  return 'ON_TRACK';
}

function shapeOKR(okr: any) {
  const progress = okrProgress(okr.keyResults || []);
  return {
    ...okr,
    progress,
    status: okrStatus(progress, okr.keyResults || []),
  };
}

// GET /api/performance/okrs
export const listOKRs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const okrs = await prisma.oKR.findMany({
      where: { userId },
      include: { keyResults: true },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, data: okrs.map(shapeOKR) });
  } catch (error) {
    console.error('List OKRs error:', error);
    res.status(500).json({ success: false, message: 'Failed to list objectives' });
  }
};

// GET /api/performance/okrs/:id
export const getOKR = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const okr = await prisma.oKR.findFirst({
      where: { id, userId },
      include: { keyResults: true },
    });
    if (!okr) {
      res.status(404).json({ success: false, message: 'Objective not found' });
      return;
    }

    res.status(200).json({ success: true, data: shapeOKR(okr) });
  } catch (error) {
    console.error('Get OKR error:', error);
    res.status(500).json({ success: false, message: 'Failed to get objective' });
  }
};

// POST /api/performance/okrs
export const createOKR = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { objective, description, owner, quarter, year, keyResults } = req.body;
    if (!objective || !quarter || !year) {
      res.status(400).json({ success: false, message: 'objective, quarter and year are required' });
      return;
    }

    const okr = await prisma.oKR.create({
      data: {
        userId,
        objective,
        description: description ? String(description) : null,
        owner: owner ? String(owner) : null,
        quarter: String(quarter),
        year: Number(year),
        keyResults: {
          create: Array.isArray(keyResults)
            ? keyResults.map((kr: any) => ({
                title: kr.title,
                target: Number(kr.target) || 0,
                current: Number(kr.current) || 0,
                unit: kr.unit || '',
              }))
            : [],
        },
      },
      include: { keyResults: true },
    });

    res.status(201).json({ success: true, data: shapeOKR(okr), message: 'Objective created' });
  } catch (error) {
    console.error('Create OKR error:', error);
    res.status(500).json({ success: false, message: 'Failed to create objective' });
  }
};

// PUT /api/performance/okrs/:id
export const updateOKR = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const existing = await prisma.oKR.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Objective not found' });
      return;
    }

    const { objective, description, owner, quarter, year } = req.body;
    const okr = await prisma.oKR.update({
      where: { id },
      data: {
        ...(objective !== undefined && { objective }),
        ...(description !== undefined && { description: description ? String(description) : null }),
        ...(owner !== undefined && { owner: owner ? String(owner) : null }),
        ...(quarter !== undefined && { quarter: String(quarter) }),
        ...(year !== undefined && { year: Number(year) }),
      },
      include: { keyResults: true },
    });

    res.status(200).json({ success: true, data: shapeOKR(okr), message: 'Objective updated' });
  } catch (error) {
    console.error('Update OKR error:', error);
    res.status(500).json({ success: false, message: 'Failed to update objective' });
  }
};

// DELETE /api/performance/okrs/:id
export const deleteOKR = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const existing = await prisma.oKR.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Objective not found' });
      return;
    }

    await prisma.oKR.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Objective deleted' });
  } catch (error) {
    console.error('Delete OKR error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete objective' });
  }
};

// POST /api/performance/okrs/:id/key-results
export const createKeyResult = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const existing = await prisma.oKR.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Objective not found' });
      return;
    }

    const { title, target, current, unit } = req.body;
    if (!title || target === undefined) {
      res.status(400).json({ success: false, message: 'title and target are required' });
      return;
    }

    const kr = await prisma.keyResult.create({
      data: {
        okrId: id,
        title,
        target: Number(target) || 0,
        current: Number(current) || 0,
        unit: unit || '',
      },
    });

    res.status(201).json({ success: true, data: kr, message: 'Key result created' });
  } catch (error) {
    console.error('Create key result error:', error);
    res.status(500).json({ success: false, message: 'Failed to create key result' });
  }
};

// PUT /api/performance/key-results/:krId
export const updateKeyResult = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { krId } = req.params;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const kr = await prisma.keyResult.findFirst({
      where: { id: krId, okr: { userId } },
    });
    if (!kr) {
      res.status(404).json({ success: false, message: 'Key result not found' });
      return;
    }

    const { title, target, current, unit } = req.body;
    const updated = await prisma.keyResult.update({
      where: { id: krId },
      data: {
        ...(title !== undefined && { title }),
        ...(target !== undefined && { target: Number(target) }),
        ...(current !== undefined && { current: Number(current) }),
        ...(unit !== undefined && { unit }),
      },
    });

    res.status(200).json({ success: true, data: updated, message: 'Key result updated' });
  } catch (error) {
    console.error('Update key result error:', error);
    res.status(500).json({ success: false, message: 'Failed to update key result' });
  }
};

// PATCH /api/performance/key-results/:krId/increment
export const incrementKeyResult = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { krId } = req.params;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const kr = await prisma.keyResult.findFirst({
      where: { id: krId, okr: { userId } },
    });
    if (!kr) {
      res.status(404).json({ success: false, message: 'Key result not found' });
      return;
    }

    const amount = Number(req.body?.amount ?? 1) || 0;
    const next = Math.max(0, kr.current + amount);
    const updated = await prisma.keyResult.update({
      where: { id: krId },
      data: { current: Math.min(next, kr.target > 0 ? kr.target : next) },
    });

    res.status(200).json({ success: true, data: updated, message: 'Key result incremented' });
  } catch (error) {
    console.error('Increment key result error:', error);
    res.status(500).json({ success: false, message: 'Failed to increment key result' });
  }
};

// DELETE /api/performance/key-results/:krId
export const deleteKeyResult = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { krId } = req.params;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const kr = await prisma.keyResult.findFirst({
      where: { id: krId, okr: { userId } },
    });
    if (!kr) {
      res.status(404).json({ success: false, message: 'Key result not found' });
      return;
    }

    await prisma.keyResult.delete({ where: { id: krId } });
    res.status(200).json({ success: true, message: 'Key result deleted' });
  } catch (error) {
    console.error('Delete key result error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete key result' });
  }
};
