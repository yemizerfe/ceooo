import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/admin.middleware';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addTask,
  updateTask,
  deleteTask,
  getTasks,
} from '../controllers/project.controller';
import { AuthRequest } from '../middleware/auth.middleware';
import { Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.use(authenticate);
router.use(requirePermission('projects.view'));

router.get('/', getProjects);
router.post('/', requirePermission('projects.create'), createProject);
router.get('/:id', getProjectById);
router.put('/:id', requirePermission('projects.update'), updateProject);
router.delete('/:id', requirePermission('projects.delete'), deleteProject);

// Tasks
router.get('/:id/tasks', getTasks);
router.post('/:id/tasks', requirePermission('projects.update'), addTask);
router.put('/tasks/:taskId', requirePermission('projects.update'), updateTask);
router.delete('/tasks/:taskId', requirePermission('projects.update'), deleteTask);

// ==================== Milestones ====================

// POST /api/projects/:id/milestones
router.post(
  '/:id/milestones',
  requirePermission('projects.update'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const project = await prisma.project.findFirst({ where: { id, userId } });
      if (!project) {
        res.status(404).json({ success: false, message: 'Project not found' });
        return;
      }

      const { name, description, dueDate } = req.body;
      if (!name) {
        res.status(400).json({ success: false, message: 'Milestone name is required' });
        return;
      }

      const milestone = await prisma.milestone.create({
        data: {
          projectId: id,
          name,
          description: description || null,
          dueDate: dueDate ? new Date(dueDate) : null,
        },
      });

      res.status(201).json({ success: true, data: milestone });
    } catch (error) {
      console.error('Create milestone error:', error);
      res.status(500).json({ success: false, message: 'Failed to create milestone' });
    }
  },
);

// PUT /api/projects/milestones/:milestoneId
router.put(
  '/milestones/:milestoneId',
  requirePermission('projects.update'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { milestoneId } = req.params;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const milestone = await prisma.milestone.findFirst({
        where: { id: milestoneId, project: { userId } },
      });
      if (!milestone) {
        res.status(404).json({ success: false, message: 'Milestone not found' });
        return;
      }

      const { name, description, dueDate, completed } = req.body;
      const updated = await prisma.milestone.update({
        where: { id: milestoneId },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
          ...(completed !== undefined && {
            completed,
            completedAt: completed ? (milestone.completedAt ?? new Date()) : null,
          }),
        },
      });

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      console.error('Update milestone error:', error);
      res.status(500).json({ success: false, message: 'Failed to update milestone' });
    }
  },
);

// DELETE /api/projects/milestones/:milestoneId
router.delete(
  '/milestones/:milestoneId',
  requirePermission('projects.update'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { milestoneId } = req.params;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const milestone = await prisma.milestone.findFirst({
        where: { id: milestoneId, project: { userId } },
      });
      if (!milestone) {
        res.status(404).json({ success: false, message: 'Milestone not found' });
        return;
      }

      await prisma.milestone.delete({ where: { id: milestoneId } });
      res.status(200).json({ success: true, message: 'Milestone deleted' });
    } catch (error) {
      console.error('Delete milestone error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete milestone' });
    }
  },
);

export default router;
