import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/admin.middleware.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { Response } from 'express';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

router.use(authenticate);

// GET /api/tasks — all tasks across the user's projects with filters
router.get('/', requirePermission('projects.view'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { status, priority, projectId, overdue } = req.query;
    const where: any = { project: { userId } };
    if (status && status !== 'ALL') where.status = status;
    if (priority && priority !== 'ALL') where.priority = priority;
    if (projectId) where.projectId = projectId;
    if (overdue === 'true') {
      where.dueDate = { lt: new Date() };
      where.status = { not: 'DONE' };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: { project: { select: { id: true, name: true } } },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 500,
    });

    // Mark overdue transparently in the response.
    const now = Date.now();
    const shaped = tasks.map((t) => ({
      ...t,
      overdue: Boolean(t.dueDate && t.dueDate.getTime() < now && t.status !== 'DONE'),
    }));

    res.status(200).json({ success: true, data: shaped });
  } catch (error) {
    console.error('List tasks error:', error);
    res.status(500).json({ success: false, message: 'Failed to list tasks' });
  }
});

// PATCH /api/tasks/:id/status — quick status transition
router.patch(
  '/:id/status',
  requirePermission('projects.update'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const task = await prisma.task.findFirst({ where: { id, project: { userId } } });
      if (!task) {
        res.status(404).json({ success: false, message: 'Task not found' });
        return;
      }

      const { status } = req.body;
      if (!status) {
        res.status(400).json({ success: false, message: 'status is required' });
        return;
      }

      const updated = await prisma.task.update({
        where: { id },
        data: {
          status,
          completedAt: status === 'DONE' ? new Date() : null,
        },
      });

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      console.error('Update task status error:', error);
      res.status(500).json({ success: false, message: 'Failed to update task status' });
    }
  },
);

// DELETE /api/tasks/:id
router.delete(
  '/:id',
  requirePermission('projects.update'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const task = await prisma.task.findFirst({ where: { id, project: { userId } } });
      if (!task) {
        res.status(404).json({ success: false, message: 'Task not found' });
        return;
      }

      await prisma.task.delete({ where: { id } });
      res.status(200).json({ success: true, message: 'Task deleted' });
    } catch (error) {
      console.error('Delete task error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete task' });
    }
  },
);

export default router;
