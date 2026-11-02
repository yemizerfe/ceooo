import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../lib/prisma.js';

// Get all focus data for dashboard
export const getFocusData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Get all focus sessions
    const sessions = await prisma.focusSession.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' }
    });

    // Get all focus tasks
    const tasks = await prisma.focusTask.findMany({
      where: { userId },
      orderBy: { order: 'asc' }
    });

    // Get upcoming focus blocks
    const blocks = await prisma.focusBlock.findMany({
      where: { 
        userId,
        scheduledTime: { gte: new Date() }
      },
      orderBy: { scheduledTime: 'asc' },
      take: 10
    });

    // Calculate stats
    const totalSessions = sessions.length;
    const totalHours = sessions.reduce((sum, s) => sum + s.duration, 0) / 60;
    const avgScore = sessions.length > 0 
      ? Math.round(sessions.reduce((sum, s) => sum + (s.score || 0), 0) / sessions.length)
      : 0;
    
    // Calculate streak
    let streak = 0;
    if (sessions.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let currentDate = new Date(today);
      for (let i = 0; i < 30; i++) {
        const hasSessionOnDate = sessions.some(s => {
          const sessionDate = new Date(s.completedAt);
          sessionDate.setHours(0, 0, 0, 0);
          return sessionDate.getTime() === currentDate.getTime();
        });
        
        if (hasSessionOnDate) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        sessions,
        tasks,
        upcomingBlocks: blocks,
        stats: {
          totalSessions,
          totalHours,
          avgScore,
          streak,
          totalTasks: tasks.length,
          completedTasks: tasks.filter(t => t.completed).length
        }
      }
    });
  } catch (error) {
    console.error('Get focus data error:', error);
    res.status(500).json({ success: false, message: 'Failed to get focus data' });
  }
};

// Create a focus session
export const createFocusSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { title, duration, notes, score } = req.body;

    const session = await prisma.focusSession.create({
      data: {
        userId,
        title: title || 'Focus Session',
        duration: duration || 90,
        completedAt: new Date(),
        notes: notes || '',
        score: score || 0
      }
    });

    res.status(201).json({
      success: true,
      data: session,
      message: 'Focus session saved successfully'
    });
  } catch (error) {
    console.error('Create focus session error:', error);
    res.status(500).json({ success: false, message: 'Failed to save focus session' });
  }
};

// Get all focus tasks
export const getFocusTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const tasks = await prisma.focusTask.findMany({
      where: { userId },
      orderBy: { order: 'asc' }
    });

    res.status(200).json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Get focus tasks error:', error);
    res.status(500).json({ success: false, message: 'Failed to get tasks' });
  }
};

// Create a focus task
export const createFocusTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { title, priority } = req.body;

    if (!title) {
      res.status(400).json({ success: false, message: 'Task title is required' });
      return;
    }

    const taskCount = await prisma.focusTask.count({ where: { userId } });

    const task = await prisma.focusTask.create({
      data: {
        userId,
        title,
        priority: priority || 'MEDIUM',
        order: taskCount,
        progress: 0,
        completed: false,
        updatedAt: new Date()
      }
    });

    res.status(201).json({
      success: true,
      data: task,
      message: 'Task created successfully'
    });
  } catch (error) {
    console.error('Create focus task error:', error);
    res.status(500).json({ success: false, message: 'Failed to create task' });
  }
};

// Update focus task
export const updateFocusTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { title, priority, progress, completed } = req.body;

    const existingTask = await prisma.focusTask.findFirst({
      where: { id, userId }
    });

    if (!existingTask) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    const updatedTask = await prisma.focusTask.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(priority !== undefined && { priority }),
        ...(progress !== undefined && { progress }),
        ...(completed !== undefined && { completed }),
        updatedAt: new Date()
      }
    });

    res.status(200).json({
      success: true,
      data: updatedTask,
      message: 'Task updated successfully'
    });
  } catch (error) {
    console.error('Update focus task error:', error);
    res.status(500).json({ success: false, message: 'Failed to update task' });
  }
};

// Delete focus task
export const deleteFocusTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const existingTask = await prisma.focusTask.findFirst({
      where: { id, userId }
    });

    if (!existingTask) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    await prisma.focusTask.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete focus task error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete task' });
  }
};

// Get focus blocks
export const getFocusBlocks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const blocks = await prisma.focusBlock.findMany({
      where: { userId },
      orderBy: { scheduledTime: 'asc' }
    });

    res.status(200).json({
      success: true,
      data: blocks
    });
  } catch (error) {
    console.error('Get focus blocks error:', error);
    res.status(500).json({ success: false, message: 'Failed to get focus blocks' });
  }
};

// Create focus block
export const createFocusBlock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { title, scheduledTime, duration } = req.body;

    if (!title || !scheduledTime) {
      res.status(400).json({ success: false, message: 'Title and scheduled time are required' });
      return;
    }

    const block = await prisma.focusBlock.create({
      data: {
        userId,
        title,
        scheduledTime: new Date(scheduledTime),
        duration: duration || 90
      }
    });

    res.status(201).json({
      success: true,
      data: block,
      message: 'Focus block created successfully'
    });
  } catch (error) {
    console.error('Create focus block error:', error);
    res.status(500).json({ success: false, message: 'Failed to create focus block' });
  }
};

// Delete focus block
export const deleteFocusBlock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const existingBlock = await prisma.focusBlock.findFirst({
      where: { id, userId }
    });

    if (!existingBlock) {
      res.status(404).json({ success: false, message: 'Focus block not found' });
      return;
    }

    await prisma.focusBlock.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Focus block deleted successfully'
    });
  } catch (error) {
    console.error('Delete focus block error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete focus block' });
  }
};