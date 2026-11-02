import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../lib/prisma.js';

// Get dashboard stats
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        companyName: true,
        role: true,
        industry: true,
        companySize: true,
        hasCompletedOnboarding: true,
        createdAt: true,
        avatarUrl: true,
      }
    });

    // Get decision stats
    const totalDecisions = await prisma.decision.count({ where: { userId } });
    const pendingDecisions = await prisma.decision.count({ where: { userId, status: 'PENDING' } });
    const inProgressDecisions = await prisma.decision.count({ where: { userId, status: 'IN_PROGRESS' } });
    const completedDecisions = await prisma.decision.count({ where: { userId, status: 'DECIDED' } });

    // Get recent decisions
    const recentDecisions = await prisma.decision.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
      }
    });

    // Get project stats
    const totalProjects = await prisma.project.count({ where: { userId } });
    const completedProjects = await prisma.project.count({ where: { userId, status: 'COMPLETED' } });

    // Get stakeholder stats
    const totalStakeholders = await prisma.stakeholder.count({ where: { userId } });
    const activeStakeholders = await prisma.stakeholder.count({ 
      where: { 
        userId, 
        lastContactAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } 
      } 
    });

    // Get upcoming calendar events
    const upcomingEvents = await prisma.calendarEvent.count({
      where: { userId, startTime: { gte: new Date() } }
    });

    // Get financial summary
    const financials = await prisma.financialRecord.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 100
    });

    const totalRevenue = financials.filter(f => f.type === 'INCOME').reduce((s, f) => s + f.amount, 0);
    const totalExpenses = financials.filter(f => f.type === 'EXPENSE').reduce((s, f) => s + f.amount, 0);

    res.status(200).json({
      success: true,
      data: {
        user,
        stats: {
          decisionsCount: totalDecisions,
          pendingDecisions,
          inProgressDecisions,
          completedDecisions,
          completionRate: totalDecisions > 0 ? Math.round((completedDecisions / totalDecisions) * 100) : 0,
          totalProjects,
          projectCompletionRate: totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0,
          totalStakeholders,
          activeStakeholders,
          upcomingEvents,
          revenue: totalRevenue,
          expenses: totalExpenses,
          profit: totalRevenue - totalExpenses,
          profitMargin: totalRevenue > 0 ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100) : 0
        },
        recentDecisions
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get company snapshot
export const getCompanySnapshot = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        companyName: true,
        industry: true,
        companySize: true,
        role: true,
        createdAt: true,
        name: true,
        email: true,
      }
    });

    const activeDecisions = await prisma.decision.count({
      where: { userId, status: { in: ['PENDING', 'IN_PROGRESS'] } }
    });

    const activeProjects = await prisma.project.count({
      where: { userId, status: { in: ['PLANNING', 'ACTIVE'] } }
    });

    const recentActivity = await prisma.decision.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { title: true, createdAt: true }
    });

    res.status(200).json({
      success: true,
      data: {
        companyName: user?.companyName || 'Not Set',
        industry: user?.industry || 'Not Set',
        companySize: user?.companySize || 'Not Set',
        memberSince: user?.createdAt,
        activeDecisions,
        activeProjects,
        ceoName: user?.name || 'CEO',
        recentActivity: recentActivity.map(a => ({ title: a.title, date: a.createdAt }))
      }
    });

  } catch (error) {
    console.error('Company snapshot error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get AI insights for dashboard
export const getDashboardAIInsights = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Get real data for insights
    const [decisions, projects, tasks, calendarEvents, financials, stakeholders] = await Promise.all([
      prisma.decision.findMany({ where: { userId } }),
      prisma.project.findMany({ where: { userId } }),
      prisma.task.findMany({ where: { project: { userId } } }),
      prisma.calendarEvent.findMany({ where: { userId, startTime: { gte: new Date() } } }),
      prisma.financialRecord.findMany({ where: { userId }, take: 50 }),
      prisma.stakeholder.findMany({ where: { userId } })
    ]);

    const totalDecisions = decisions.length;
    const completedDecisions = decisions.filter(d => d.status === 'DECIDED').length;
    const highPriorityDecisions = decisions.filter(d => d.priority === 'HIGH').length;
    const pendingDecisions = decisions.filter(d => d.status === 'PENDING').length;
    
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'DONE').length;
    const totalRevenue = financials.filter(f => f.type === 'INCOME').reduce((s, f) => s + f.amount, 0);
    const totalExpenses = financials.filter(f => f.type === 'EXPENSE').reduce((s, f) => s + f.amount, 0);

    // Generate AI insights based on real data
    const insights = [];

    // Decision insights
    if (pendingDecisions > 5) {
      insights.push({
        type: 'warning',
        title: 'Decision Backlog',
        message: `You have ${pendingDecisions} pending decisions. Review and prioritize them to maintain momentum.`,
        action: 'Review Decisions',
        actionLink: '/decisions'
      });
    } else if (completedDecisions / totalDecisions > 0.7 && totalDecisions > 0) {
      insights.push({
        type: 'success',
        title: 'Strong Decision Velocity',
        message: `You've completed ${Math.round((completedDecisions / totalDecisions) * 100)}% of your decisions. Great progress!`,
        action: 'View Decisions',
        actionLink: '/decisions'
      });
    }

    // Financial insights
    if (totalRevenue > 0 && totalExpenses > 0) {
      const profitMargin = ((totalRevenue - totalExpenses) / totalRevenue) * 100;
      if (profitMargin < 20) {
        insights.push({
          type: 'warning',
          title: 'Profit Margin Alert',
          message: `Current profit margin is ${profitMargin.toFixed(1)}%. Consider reviewing expenses.`,
          action: 'Review Finances',
          actionLink: '/financial'
        });
      } else if (profitMargin > 30) {
        insights.push({
          type: 'success',
          title: 'Healthy Profit Margin',
          message: `Your profit margin of ${profitMargin.toFixed(1)}% is above target. Keep it up!`,
          action: 'View Financials',
          actionLink: '/financial'
        });
      }
    }

    // Task insights
    if (totalTasks > 0 && completedTasks / totalTasks < 0.3) {
      insights.push({
        type: 'info',
        title: 'Task Completion Rate',
        message: `Only ${Math.round((completedTasks / totalTasks) * 100)}% of tasks are complete. Focus on clearing high-priority items.`,
        action: 'View Tasks',
        actionLink: '/projects'
      });
    }

    // Calendar insights
    if (calendarEvents.length > 5) {
      insights.push({
        type: 'info',
        title: 'Busy Schedule',
        message: `You have ${calendarEvents.length} upcoming meetings. Protect focus time for strategic work.`,
        action: 'View Calendar',
        actionLink: '/calendar'
      });
    }

    // Stakeholder insights
    if (stakeholders.length > 0) {
      const needsContact = stakeholders.filter(s => {
        if (!s.lastContactAt) return true;
        const daysSinceContact = (Date.now() - new Date(s.lastContactAt).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceContact > 30;
      }).length;
      
      if (needsContact > 0) {
        insights.push({
          type: 'warning',
          title: 'Stakeholder Engagement',
          message: `${needsContact} stakeholders haven't been contacted in over 30 days. Schedule follow-ups.`,
          action: 'View Stakeholders',
          actionLink: '/stakeholders'
        });
      }
    }

    // If no specific insights, provide general positive insight
    if (insights.length === 0) {
      insights.push({
        type: 'success',
        title: 'All Systems Nominal',
        message: 'Your key metrics are looking good. Continue focusing on your strategic priorities.',
        action: 'View Dashboard',
        actionLink: '/dashboard'
      });
    }

    // Add AI-powered recommendation
    insights.push({
      type: 'ai',
      title: 'AI Recommendation',
      message: highPriorityDecisions > 0 
        ? `Focus on your ${highPriorityDecisions} high-priority decisions this week for maximum impact.`
        : 'Consider setting up quarterly OKRs to align team efforts with strategic goals.',
      action: 'Get AI Insights',
      actionLink: '/ai-insights'
    });

    res.status(200).json({
      success: true,
      data: insights
    });

  } catch (error) {
    console.error('AI insights error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get strategic focus data
export const getStrategicFocus = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const [decisions, projects, okrs] = await Promise.all([
      prisma.decision.findMany({
        where: { userId, priority: 'HIGH', status: { not: 'DECIDED' } },
        orderBy: { createdAt: 'desc' },
        take: 3
      }),
      prisma.project.findMany({
        where: { userId, status: 'ACTIVE' },
        orderBy: { deadline: 'asc' },
        take: 3
      }),
      prisma.oKR.findMany({
        where: { userId },
        include: { keyResults: true },
        take: 2
      })
    ]);

    const strategicPriorities = [
      ...decisions.map(d => ({
        id: d.id,
        title: d.title,
        type: 'decision',
        priority: d.priority,
        deadline: d.deadline
      })),
      ...projects.map(p => ({
        id: p.id,
        title: p.name,
        type: 'project',
        progress: p.progress,
        deadline: p.deadline
      }))
    ];

    const okrProgress = okrs.map(okr => {
      const progress = okr.keyResults.length > 0
        ? okr.keyResults.reduce((sum, kr) => sum + (kr.current / kr.target) * 100, 0) / okr.keyResults.length
        : 0;
      return {
        id: okr.id,
        objective: okr.objective,
        progress: Math.round(progress),
        quarter: okr.quarter,
        year: okr.year
      };
    });

    res.status(200).json({
      success: true,
      data: {
        strategicPriorities,
        okrProgress,
        activeInitiatives: strategicPriorities.length
      }
    });

  } catch (error) {
    console.error('Strategic focus error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get alerts and risks
export const getAlertsRisks = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const [overdueDecisions, overdueTasks, upcomingDeadlines, atRiskProjects] = await Promise.all([
      prisma.decision.findMany({
        where: { userId, deadline: { lt: new Date() }, status: { not: 'DECIDED' } }
      }),
      prisma.task.findMany({
        where: { project: { userId }, dueDate: { lt: new Date() }, status: { not: 'DONE' } }
      }),
      prisma.decision.findMany({
        where: { userId, deadline: { gte: new Date(), lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, status: { not: 'DECIDED' } }
      }),
      prisma.project.findMany({
        where: { userId, status: 'ACTIVE', progress: { lt: 30 } }
      })
    ]);

    const alerts = [];

    if (overdueDecisions.length > 0) {
      alerts.push({
        type: 'critical',
        title: 'Overdue Decisions',
        message: `${overdueDecisions.length} decision${overdueDecisions.length > 1 ? 's are' : ' is'} overdue. Take action immediately.`,
        count: overdueDecisions.length
      });
    }

    if (overdueTasks.length > 0) {
      alerts.push({
        type: 'warning',
        title: 'Delayed Tasks',
        message: `${overdueTasks.length} task${overdueTasks.length > 1 ? 's are' : ' is'} past due date. Review and reprioritize.`,
        count: overdueTasks.length
      });
    }

    if (upcomingDeadlines.length > 0) {
      alerts.push({
        type: 'info',
        title: 'Upcoming Deadlines',
        message: `${upcomingDeadlines.length} decision${upcomingDeadlines.length > 1 ? 's have' : ' has'} deadlines in the next 7 days.`,
        count: upcomingDeadlines.length
      });
    }

    if (atRiskProjects.length > 0) {
      alerts.push({
        type: 'warning',
        title: 'At-Risk Projects',
        message: `${atRiskProjects.length} project${atRiskProjects.length > 1 ? 's are' : ' is'} behind schedule with <30% progress.`,
        count: atRiskProjects.length
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        type: 'success',
        title: 'All Clear',
        message: 'No critical alerts at this time. Great job staying on track!',
        count: 0
      });
    }

    res.status(200).json({
      success: true,
      data: alerts
    });

  } catch (error) {
    console.error('Alerts risks error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get calendar preview
export const getCalendarPreview = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const events = await prisma.calendarEvent.findMany({
      where: {
        userId,
        startTime: { gte: new Date() }
      },
      orderBy: { startTime: 'asc' },
      take: 5,
      select: {
        id: true,
        title: true,
        startTime: true,
        type: true,
        location: true
      }
    });

    res.status(200).json({
      success: true,
      data: events.map(e => ({
        id: e.id,
        title: e.title,
        time: e.startTime,
        type: e.type,
        location: e.location
      }))
    });

  } catch (error) {
    console.error('Calendar preview error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get progress tracker data
export const getProgressTracker = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const [decisions, completedDecisions, tasks, completedTasks, projects, completedProjects, okrs] = await Promise.all([
      prisma.decision.count({ where: { userId } }),
      prisma.decision.count({ where: { userId, status: 'DECIDED' } }),
      prisma.task.count({ where: { project: { userId } } }),
      prisma.task.count({ where: { project: { userId }, status: 'DONE' } }),
      prisma.project.count({ where: { userId } }),
      prisma.project.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.oKR.findMany({
        where: { userId },
        include: { keyResults: true }
      })
    ]);

    const okrProgress = okrs.length > 0
      ? okrs.reduce((sum, okr) => {
          const progress = okr.keyResults.length > 0
            ? okr.keyResults.reduce((s, kr) => s + (kr.target > 0 ? (kr.current / kr.target) * 100 : 0), 0) / okr.keyResults.length
            : 0;
          return sum + progress;
        }, 0) / okrs.length
      : 0;

    const weeklyTarget = 85;
    const currentProgress = tasks > 0 ? (completedTasks / tasks) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        decisions: { total: decisions, completed: completedDecisions, rate: decisions > 0 ? Math.round((completedDecisions / decisions) * 100) : 0 },
        tasks: { total: tasks, completed: completedTasks, rate: tasks > 0 ? Math.round((completedTasks / tasks) * 100) : 0 },
        projects: { total: projects, completed: completedProjects, rate: projects > 0 ? Math.round((completedProjects / projects) * 100) : 0 },
        okrs: { total: okrs.length, progress: Math.round(okrProgress) },
        weeklyGoal: { target: weeklyTarget, current: Math.round(currentProgress) }
      }
    });

  } catch (error) {
    console.error('Progress tracker error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};