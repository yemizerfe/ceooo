// server/src/controllers/project.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

export const getProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { 
      res.status(401).json({ success: false, message: 'Unauthorized' }); 
      return; 
    }

    const { status, priority } = req.query;
    const where: any = { userId };
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const projects = await prisma.project.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { 
        milestones: true, 
        tasks: {
          orderBy: { createdAt: 'desc' }
        } 
      },
    });

    res.status(200).json({ success: true, data: projects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ success: false, message: 'Failed to get projects' });
  }
};

export const getProjectById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) { 
      res.status(401).json({ success: false, message: 'Unauthorized' }); 
      return; 
    }

    const project = await prisma.project.findFirst({
      where: { id, userId },
      include: { 
        milestones: true, 
        tasks: {
          orderBy: { createdAt: 'desc' }
        } 
      },
    });

    if (!project) { 
      res.status(404).json({ success: false, message: 'Project not found' }); 
      return; 
    }
    res.status(200).json({ success: true, data: project });
  } catch (error) {
    console.error('Get project by ID error:', error);
    res.status(500).json({ success: false, message: 'Failed to get project' });
  }
};

export const createProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { 
      res.status(401).json({ success: false, message: 'Unauthorized' }); 
      return; 
    }

    const { name, description, priority, startDate, endDate, deadline, budget, teamSize, progress, status } = req.body;
    
    if (!name) { 
      res.status(400).json({ success: false, message: 'Project name is required' }); 
      return; 
    }

    const project = await prisma.project.create({
      data: {
        userId, 
        name, 
        description: description || null,
        priority: priority || 'MEDIUM',
        status: status || 'ACTIVE',
        progress: progress || 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        deadline: deadline ? new Date(deadline) : null,
        budget: budget ? parseFloat(budget) : null,
        teamSize: teamSize ? parseInt(teamSize) : null,
      },
      include: { 
        milestones: true, 
        tasks: true 
      },
    });

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ success: false, message: 'Failed to create project' });
  }
};

export const updateProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) { 
      res.status(401).json({ success: false, message: 'Unauthorized' }); 
      return; 
    }

    const existing = await prisma.project.findFirst({ 
      where: { id, userId } 
    });
    
    if (!existing) { 
      res.status(404).json({ success: false, message: 'Project not found' }); 
      return; 
    }

    const { 
      name, description, status, priority, progress, 
      startDate, endDate, deadline, budget, teamSize, tasks 
    } = req.body;

    // Update project basic info
    const project = await prisma.project.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        status: status !== undefined ? status : undefined,
        priority: priority !== undefined ? priority : undefined,
        progress: progress !== undefined ? progress : undefined,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
        deadline: deadline !== undefined ? (deadline ? new Date(deadline) : null) : undefined,
        budget: budget !== undefined ? (budget ? parseFloat(budget) : null) : undefined,
        teamSize: teamSize !== undefined ? (teamSize ? parseInt(teamSize) : null) : undefined,
      },
    });

    // Handle tasks if provided
    if (tasks !== undefined && Array.isArray(tasks)) {
      // Get existing tasks
      const existingTasks = await prisma.task.findMany({
        where: { projectId: id }
      });

      const existingTaskIds = existingTasks.map(t => t.id);
      const taskIdsToKeep = tasks.map((t: any) => t.id).filter((id: string) => id);
      
      // Create new tasks (those without id)
      const newTasks = tasks.filter((t: any) => !t.id);
      for (const task of newTasks) {
        await prisma.task.create({
          data: {
            projectId: id,
            title: task.title,
            description: task.description || null,
            status: task.status || 'TODO',
            priority: task.priority || 'MEDIUM',
            assignedTo: task.assignedTo || null,
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
          }
        });
      }

      // Update existing tasks
      const tasksToUpdate = tasks.filter((t: any) => t.id && existingTaskIds.includes(t.id));
      for (const task of tasksToUpdate) {
        await prisma.task.update({
          where: { id: task.id },
          data: {
            title: task.title,
            description: task.description || null,
            status: task.status,
            priority: task.priority || 'MEDIUM',
            assignedTo: task.assignedTo || null,
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            completedAt: task.status === 'DONE' ? new Date() : null,
          }
        });
      }

      // Delete tasks that are no longer in the list
      const tasksToDelete = existingTasks.filter(t => !taskIdsToKeep.includes(t.id));
      for (const task of tasksToDelete) {
        await prisma.task.delete({ where: { id: task.id } });
      }
    }

    // Fetch the updated project with all tasks
    const updatedProject = await prisma.project.findUnique({
      where: { id },
      include: { 
        milestones: true, 
        tasks: {
          orderBy: { createdAt: 'desc' }
        } 
      },
    });

    res.status(200).json({ success: true, data: updatedProject });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ success: false, message: 'Failed to update project' });
  }
};

export const deleteProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) { 
      res.status(401).json({ success: false, message: 'Unauthorized' }); 
      return; 
    }

    const existing = await prisma.project.findFirst({ 
      where: { id, userId } 
    });
    
    if (!existing) { 
      res.status(404).json({ success: false, message: 'Project not found' }); 
      return; 
    }

    // Delete all tasks first
    await prisma.task.deleteMany({ where: { projectId: id } });
    
    // Delete milestones
    await prisma.milestone.deleteMany({ where: { projectId: id } });
    
    // Delete project
    await prisma.project.delete({ where: { id } });
    
    res.status(200).json({ success: true, message: 'Project deleted' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete project' });
  }
};

// Task CRUD operations
export const addTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) { 
      res.status(401).json({ success: false, message: 'Unauthorized' }); 
      return; 
    }

    const existing = await prisma.project.findFirst({ 
      where: { id, userId } 
    });
    
    if (!existing) { 
      res.status(404).json({ success: false, message: 'Project not found' }); 
      return; 
    }

    const { title, description, priority, assignedTo, dueDate } = req.body;
    
    if (!title) { 
      res.status(400).json({ success: false, message: 'Task title is required' }); 
      return; 
    }

    const task = await prisma.task.create({
      data: {
        projectId: id, 
        title, 
        description: description || null,
        priority: priority || 'MEDIUM', 
        status: 'TODO',
        assignedTo: assignedTo || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    console.error('Add task error:', error);
    res.status(500).json({ success: false, message: 'Failed to add task' });
  }
};

export const updateTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { taskId } = req.params;
    
    if (!userId) { 
      res.status(401).json({ success: false, message: 'Unauthorized' }); 
      return; 
    }

    // Verify task belongs to user's project
    const task = await prisma.task.findFirst({
      where: { 
        id: taskId,
        project: { userId }
      }
    });
    
    if (!task) { 
      res.status(404).json({ success: false, message: 'Task not found' }); 
      return; 
    }

    const { title, description, status, priority, assignedTo, dueDate } = req.body;

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        status: status !== undefined ? status : undefined,
        priority: priority !== undefined ? priority : undefined,
        assignedTo: assignedTo !== undefined ? assignedTo : undefined,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
        completedAt: status === 'DONE' ? new Date() : undefined,
      },
    });

    res.status(200).json({ success: true, data: updatedTask });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ success: false, message: 'Failed to update task' });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { taskId } = req.params;
    
    if (!userId) { 
      res.status(401).json({ success: false, message: 'Unauthorized' }); 
      return; 
    }

    // Verify task belongs to user's project
    const task = await prisma.task.findFirst({
      where: { 
        id: taskId,
        project: { userId }
      }
    });
    
    if (!task) { 
      res.status(404).json({ success: false, message: 'Task not found' }); 
      return; 
    }

    await prisma.task.delete({ where: { id: taskId } });

    res.status(200).json({ success: true, message: 'Task deleted' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete task' });
  }
};

export const getTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) { 
      res.status(401).json({ success: false, message: 'Unauthorized' }); 
      return; 
    }

    const project = await prisma.project.findFirst({
      where: { id, userId }
    });
    
    if (!project) { 
      res.status(404).json({ success: false, message: 'Project not found' }); 
      return; 
    }

    const tasks = await prisma.task.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ success: false, message: 'Failed to get tasks' });
  }
};