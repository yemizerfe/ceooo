import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../lib/prisma.js';

// GET /api/kpis
export const listKPIs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const kpis = await prisma.kPI.findMany({
      where: { userId },
      include: { values: { orderBy: { recordedAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: kpis.map((kpi) => shapeKPI(kpi)),
    });
  } catch (error) {
    console.error('List KPIs error:', error);
    res.status(500).json({ success: false, message: 'Failed to list KPIs' });
  }
};

function shapeKPI(kpi: any) {
  const values = kpi.values || [];
  const latest = values.length ? values[values.length - 1].value : kpi.currentValue;
  const previous = values.length > 1 ? values[values.length - 2].value : null;
  const growth =
    previous !== null && previous !== 0
      ? Math.round(((latest - previous) / Math.abs(previous)) * 1000) / 10
      : null;
  const vsTarget =
    kpi.targetValue > 0 ? Math.round((latest / kpi.targetValue) * 1000) / 10 : null;
  return { ...kpi, growth, vsTarget, onTarget: vsTarget !== null ? vsTarget >= 100 : null };
}

// GET /api/kpis/:id
export const getKPI = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const kpi = await prisma.kPI.findFirst({
      where: { id, userId },
      include: { values: { orderBy: { recordedAt: 'asc' } } },
    });
    if (!kpi) {
      res.status(404).json({ success: false, message: 'KPI not found' });
      return;
    }

    res.status(200).json({ success: true, data: shapeKPI(kpi) });
  } catch (error) {
    console.error('Get KPI error:', error);
    res.status(500).json({ success: false, message: 'Failed to get KPI' });
  }
};

// POST /api/kpis
export const createKPI = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { name, description, category, frequency, unit, currentValue, targetValue, dataSource } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: 'name is required' });
      return;
    }

    const kpi = await prisma.kPI.create({
      data: {
        userId,
        name,
        description: description || null,
        category: category || null,
        frequency: frequency || 'MONTHLY',
        unit: unit || '',
        currentValue: Number(currentValue) || 0,
        targetValue: Number(targetValue) || 0,
        dataSource: dataSource || null,
      },
      include: { values: true },
    });

    // Seed the first history point so trends work immediately.
    if (kpi.currentValue !== 0) {
      await prisma.kPIValue.create({
        data: { kpiId: kpi.id, value: kpi.currentValue, note: 'Initial value' },
      });
    }

    const withValues = await prisma.kPI.findUnique({
      where: { id: kpi.id },
      include: { values: { orderBy: { recordedAt: 'asc' } } },
    });

    res.status(201).json({ success: true, data: shapeKPI(withValues), message: 'KPI created' });
  } catch (error) {
    console.error('Create KPI error:', error);
    res.status(500).json({ success: false, message: 'Failed to create KPI' });
  }
};

// PUT /api/kpis/:id
export const updateKPI = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const existing = await prisma.kPI.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'KPI not found' });
      return;
    }

    const { name, description, category, frequency, unit, currentValue, targetValue, dataSource } = req.body;
    const kpi = await prisma.kPI.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(frequency !== undefined && { frequency }),
        ...(unit !== undefined && { unit }),
        ...(currentValue !== undefined && { currentValue: Number(currentValue) }),
        ...(targetValue !== undefined && { targetValue: Number(targetValue) }),
        ...(dataSource !== undefined && { dataSource }),
      },
      include: { values: { orderBy: { recordedAt: 'asc' } } },
    });

    res.status(200).json({ success: true, data: shapeKPI(kpi), message: 'KPI updated' });
  } catch (error) {
    console.error('Update KPI error:', error);
    res.status(500).json({ success: false, message: 'Failed to update KPI' });
  }
};

// DELETE /api/kpis/:id
export const deleteKPI = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const existing = await prisma.kPI.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'KPI not found' });
      return;
    }

    await prisma.kPI.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'KPI deleted' });
  } catch (error) {
    console.error('Delete KPI error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete KPI' });
  }
};

// POST /api/kpis/:id/values — record a new data point
export const addKPIValue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const existing = await prisma.kPI.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'KPI not found' });
      return;
    }

    const { value, recordedAt, note } = req.body;
    if (value === undefined || isNaN(Number(value))) {
      res.status(400).json({ success: false, message: 'value must be a number' });
      return;
    }

    const row = await prisma.kPIValue.create({
      data: {
        kpiId: id,
        value: Number(value),
        recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
        note: note || null,
      },
    });

    // Keep the KPI's current value in sync with the latest reading.
    await prisma.kPI.update({ where: { id }, data: { currentValue: Number(value) } });

    res.status(201).json({ success: true, data: row, message: 'KPI value recorded' });
  } catch (error) {
    console.error('Add KPI value error:', error);
    res.status(500).json({ success: false, message: 'Failed to record KPI value' });
  }
};

// GET /api/kpis/:id/values — trend history
export const getKPIValues = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const existing = await prisma.kPI.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'KPI not found' });
      return;
    }

    const values = await prisma.kPIValue.findMany({
      where: { kpiId: id },
      orderBy: { recordedAt: 'asc' },
    });

    res.status(200).json({ success: true, data: values });
  } catch (error) {
    console.error('Get KPI values error:', error);
    res.status(500).json({ success: false, message: 'Failed to get KPI values' });
  }
};
