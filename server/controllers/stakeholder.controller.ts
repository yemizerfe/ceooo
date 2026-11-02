// server/src/controllers/stakeholder.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../lib/prisma.js';

// Get all stakeholders for the user
export const getStakeholders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { type, priority, search } = req.query;
    const where: any = { userId };
    
    if (type && type !== 'ALL') where.type = type;
    if (priority && priority !== 'ALL') where.priority = priority;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { company: { contains: search as string, mode: 'insensitive' } },
        { role: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const stakeholders = await prisma.stakeholder.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { engagementScore: 'desc' },
        { lastContactAt: 'desc' }
      ],
      include: {
        interactions: {
          orderBy: { date: 'desc' },
          take: 5
        },
        deals: true
      }
    });

    res.status(200).json({
      success: true,
      data: stakeholders
    });
  } catch (error) {
    console.error('Get stakeholders error:', error);
    res.status(500).json({ success: false, message: 'Failed to get stakeholders' });
  }
};

// Get single stakeholder by ID
export const getStakeholderById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const stakeholder = await prisma.stakeholder.findFirst({
      where: { id, userId },
      include: {
        interactions: {
          orderBy: { date: 'desc' }
        },
        deals: true
      }
    });

    if (!stakeholder) {
      res.status(404).json({ success: false, message: 'Stakeholder not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: stakeholder
    });
  } catch (error) {
    console.error('Get stakeholder error:', error);
    res.status(500).json({ success: false, message: 'Failed to get stakeholder' });
  }
};

// Create new stakeholder
export const createStakeholder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { 
      name, email, phone, company, role, website, linkedin, notes, 
      type, priority, engagementScore, nextFollowUp 
    } = req.body;

    if (!name) {
      res.status(400).json({ success: false, message: 'Name is required' });
      return;
    }

    const stakeholder = await prisma.stakeholder.create({
      data: {
        userId,
        name,
        email: email || null,
        phone: phone || null,
        company: company || null,
        role: role || null,
        type: type || 'OTHER',
        priority: priority || 'MEDIUM',
        engagementScore: engagementScore || 0,
        notes: notes || null,
        nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null
      },
      include: {
        interactions: true,
        deals: true
      }
    });

    res.status(201).json({
      success: true,
      data: stakeholder,
      message: 'Stakeholder created successfully'
    });
  } catch (error) {
    console.error('Create stakeholder error:', error);
    res.status(500).json({ success: false, message: 'Failed to create stakeholder' });
  }
};

// Update stakeholder
export const updateStakeholder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const existing = await prisma.stakeholder.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Stakeholder not found' });
      return;
    }

    const { 
      name, email, phone, company, role, website, linkedin, notes,
      type, priority, engagementScore, lastContactAt, nextFollowUp 
    } = req.body;

    const stakeholder = await prisma.stakeholder.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        email: email !== undefined ? email : undefined,
        phone: phone !== undefined ? phone : undefined,
        company: company !== undefined ? company : undefined,
        role: role !== undefined ? role : undefined,
        type: type !== undefined ? type : undefined,
        priority: priority !== undefined ? priority : undefined,
        engagementScore: engagementScore !== undefined ? engagementScore : undefined,
        notes: notes !== undefined ? notes : undefined,
        lastContactAt: lastContactAt !== undefined ? new Date(lastContactAt) : undefined,
        nextFollowUp: nextFollowUp !== undefined ? new Date(nextFollowUp) : undefined
      },
      include: {
        interactions: true,
        deals: true
      }
    });

    res.status(200).json({
      success: true,
      data: stakeholder,
      message: 'Stakeholder updated successfully'
    });
  } catch (error) {
    console.error('Update stakeholder error:', error);
    res.status(500).json({ success: false, message: 'Failed to update stakeholder' });
  }
};

// Delete stakeholder
export const deleteStakeholder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const existing = await prisma.stakeholder.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Stakeholder not found' });
      return;
    }

    // Delete all related interactions first
    await prisma.interaction.deleteMany({
      where: { stakeholderId: id }
    });

    // Delete all related deals
    await prisma.deal.deleteMany({
      where: { stakeholderId: id }
    });

    // Delete stakeholder
    await prisma.stakeholder.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Stakeholder deleted successfully'
    });
  } catch (error) {
    console.error('Delete stakeholder error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete stakeholder' });
  }
};

// Add interaction to stakeholder
export const addInteraction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { type, summary, notes, actionItems, outcome, date } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const stakeholder = await prisma.stakeholder.findFirst({
      where: { id, userId }
    });

    if (!stakeholder) {
      res.status(404).json({ success: false, message: 'Stakeholder not found' });
      return;
    }

    const interaction = await prisma.interaction.create({
      data: {
        stakeholderId: id,
        type: type || 'MEETING',
        summary: summary || null,
        notes: notes || null,
        actionItems: actionItems || [],
        outcome: outcome || null,
        date: date ? new Date(date) : new Date()
      }
    });

    // Update stakeholder's last contact date and engagement score
    const interactions = await prisma.interaction.findMany({
      where: { stakeholderId: id }
    });

    const interactionCount = interactions.length;
    const recentInteractions = interactions.filter(i => 
      new Date(i.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;
    
    // Calculate engagement score
    let score = Math.min(50, interactionCount * 5);
    score += Math.min(30, recentInteractions * 10);
    if (stakeholder.priority === 'HIGH') score += 20;
    else if (stakeholder.priority === 'MEDIUM') score += 10;
    
    const engagementScore = Math.min(100, score);

    await prisma.stakeholder.update({
      where: { id },
      data: {
        engagementScore,
        lastContactAt: new Date()
      }
    });

    res.status(201).json({
      success: true,
      data: interaction,
      message: 'Interaction added successfully'
    });
  } catch (error) {
    console.error('Add interaction error:', error);
    res.status(500).json({ success: false, message: 'Failed to add interaction' });
  }
};

// Get interactions for a stakeholder
export const getInteractions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const stakeholder = await prisma.stakeholder.findFirst({
      where: { id, userId }
    });

    if (!stakeholder) {
      res.status(404).json({ success: false, message: 'Stakeholder not found' });
      return;
    }

    const interactions = await prisma.interaction.findMany({
      where: { stakeholderId: id },
      orderBy: { date: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: interactions
    });
  } catch (error) {
    console.error('Get interactions error:', error);
    res.status(500).json({ success: false, message: 'Failed to get interactions' });
  }
};

// Add deal to stakeholder
export const addDeal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { name, stage, value, probability, expectedClose, notes } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!name) {
      res.status(400).json({ success: false, message: 'Deal name is required' });
      return;
    }

    const stakeholder = await prisma.stakeholder.findFirst({
      where: { id, userId }
    });

    if (!stakeholder) {
      res.status(404).json({ success: false, message: 'Stakeholder not found' });
      return;
    }

    const deal = await prisma.deal.create({
      data: {
        stakeholderId: id,
        name,
        stage: stage || 'NEGOTIATION',
        value: value ? parseFloat(value) : null,
        probability: probability ? parseInt(probability) : null,
        expectedClose: expectedClose ? new Date(expectedClose) : null,
        notes: notes || null
      }
    });

    res.status(201).json({
      success: true,
      data: deal,
      message: 'Deal added successfully'
    });
  } catch (error) {
    console.error('Add deal error:', error);
    res.status(500).json({ success: false, message: 'Failed to add deal' });
  }
};

// Update deal
export const updateDeal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { dealId } = req.params;
    
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const deal = await prisma.deal.findFirst({
      where: { 
        id: dealId,
        stakeholder: { userId }
      }
    });

    if (!deal) {
      res.status(404).json({ success: false, message: 'Deal not found' });
      return;
    }

    const { stage, value, probability, expectedClose, notes } = req.body;

    const updatedDeal = await prisma.deal.update({
      where: { id: dealId },
      data: {
        stage: stage !== undefined ? stage : undefined,
        value: value !== undefined ? parseFloat(value) : undefined,
        probability: probability !== undefined ? parseInt(probability) : undefined,
        expectedClose: expectedClose !== undefined ? new Date(expectedClose) : undefined,
        notes: notes !== undefined ? notes : undefined
      }
    });

    res.status(200).json({
      success: true,
      data: updatedDeal,
      message: 'Deal updated successfully'
    });
  } catch (error) {
    console.error('Update deal error:', error);
    res.status(500).json({ success: false, message: 'Failed to update deal' });
  }
};

// Get stakeholder insights (AI-powered)
export const getStakeholderInsights = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const stakeholders = await prisma.stakeholder.findMany({
      where: { userId },
      include: {
        interactions: {
          orderBy: { date: 'desc' },
          take: 3
        },
        deals: true
      }
    });

    const total = stakeholders.length;
    const highEngagement = stakeholders.filter(s => s.engagementScore >= 70).length;
    const mediumEngagement = stakeholders.filter(s => s.engagementScore >= 40 && s.engagementScore < 70).length;
    const lowEngagement = stakeholders.filter(s => s.engagementScore < 40).length;
    const highPriority = stakeholders.filter(s => s.priority === 'HIGH').length;
    const needFollowUp = stakeholders.filter(s => s.nextFollowUp && new Date(s.nextFollowUp) <= new Date()).length;
    
    const dealsByStage = {
      negotiation: stakeholders.flatMap(s => s.deals).filter(d => d.stage === 'NEGOTIATION').length,
      pending: stakeholders.flatMap(s => s.deals).filter(d => d.stage === 'PENDING').length,
      closedWon: stakeholders.flatMap(s => s.deals).filter(d => d.stage === 'CLOSED_WON').length,
      closedLost: stakeholders.flatMap(s => s.deals).filter(d => d.stage === 'CLOSED_LOST').length
    };

    const totalDealValue = stakeholders.flatMap(s => s.deals).reduce((sum, d) => sum + (d.value || 0), 0);
    const avgEngagementScore = total > 0 ? Math.round(stakeholders.reduce((sum, s) => sum + s.engagementScore, 0) / total) : 0;

    // Type distribution
    const typeDistribution = {
      INVESTOR: stakeholders.filter(s => s.type === 'INVESTOR').length,
      CLIENT: stakeholders.filter(s => s.type === 'CLIENT').length,
      PARTNER: stakeholders.filter(s => s.type === 'PARTNER').length,
      ADVISOR: stakeholders.filter(s => s.type === 'ADVISOR').length,
      BOARD_MEMBER: stakeholders.filter(s => s.type === 'BOARD_MEMBER').length,
      VENDOR: stakeholders.filter(s => s.type === 'VENDOR').length,
      OTHER: stakeholders.filter(s => s.type === 'OTHER').length
    };

    // AI-generated insights
    let aiInsight = "";
    const recommendations: string[] = [];

    if (total === 0) {
      aiInsight = "Add stakeholders to start tracking relationships and getting AI-powered insights.";
      recommendations.push("Add your first stakeholder to begin building your network");
    } else {
      if (lowEngagement > 0) {
        aiInsight = `${lowEngagement} stakeholder${lowEngagement > 1 ? 's have' : ' has'} low engagement. Regular follow-ups recommended.`;
        recommendations.push(`Schedule follow-ups with ${lowEngagement} low-engagement stakeholder${lowEngagement > 1 ? 's' : ''}`);
      } else {
        aiInsight = `Your stakeholder relationships are healthy with ${highEngagement} highly engaged stakeholders.`;
      }
      
      if (highPriority > 0) {
        recommendations.push(`Prioritize communication with ${highPriority} high-priority stakeholder${highPriority > 1 ? 's' : ''}`);
      }
      
      if (needFollowUp > 0) {
        recommendations.push(`${needFollowUp} stakeholder${needFollowUp > 1 ? 's are' : ' is'} overdue for follow-up`);
      }
      
      if (dealsByStage.negotiation > 0) {
        recommendations.push(`${dealsByStage.negotiation} deal${dealsByStage.negotiation > 1 ? 's are' : ' is'} in negotiation stage`);
      }
      
      if (recommendations.length === 0 && total > 0) {
        aiInsight = "All stakeholders are well-engaged. Great job maintaining relationships!";
        recommendations.push("Continue regular check-ins to maintain strong relationships");
      }
    }

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total,
          highEngagement,
          mediumEngagement,
          lowEngagement,
          highPriority,
          needFollowUp,
          avgEngagementScore
        },
        deals: {
          byStage: dealsByStage,
          totalValue: totalDealValue,
          totalDeals: stakeholders.flatMap(s => s.deals).length
        },
        typeDistribution,
        aiInsight,
        recommendations
      }
    });
  } catch (error) {
    console.error('Get stakeholder insights error:', error);
    res.status(500).json({ success: false, message: 'Failed to get insights' });
  }
};

// Get upcoming follow-ups
export const getUpcomingFollowups = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const stakeholders = await prisma.stakeholder.findMany({
      where: {
        userId,
        nextFollowUp: {
          not: null
        }
      },
      orderBy: { nextFollowUp: 'asc' },
      take: 10,
      select: {
        id: true,
        name: true,
        nextFollowUp: true,
        priority: true,
        type: true,
        engagementScore: true
      }
    });

    res.status(200).json({
      success: true,
      data: stakeholders
    });
  } catch (error) {
    console.error('Get upcoming follow-ups error:', error);
    res.status(500).json({ success: false, message: 'Failed to get follow-ups' });
  }
};

// Bulk update engagement scores
export const updateEngagementScores = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const stakeholders = await prisma.stakeholder.findMany({
      where: { userId },
      include: {
        interactions: true
      }
    });

    let updated = 0;
    for (const stakeholder of stakeholders) {
      const interactionCount = stakeholder.interactions.length;
      const recentInteractions = stakeholder.interactions.filter(i => 
        new Date(i.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length;
      
      let score = Math.min(50, interactionCount * 5);
      score += Math.min(30, recentInteractions * 10);
      if (stakeholder.priority === 'HIGH') score += 20;
      else if (stakeholder.priority === 'MEDIUM') score += 10;
      
      const newScore = Math.min(100, score);
      
      if (newScore !== stakeholder.engagementScore) {
        await prisma.stakeholder.update({
          where: { id: stakeholder.id },
          data: { engagementScore: newScore }
        });
        updated++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Updated engagement scores for ${updated} stakeholders`,
      data: { updated }
    });
  } catch (error) {
    console.error('Update engagement scores error:', error);
    res.status(500).json({ success: false, message: 'Failed to update engagement scores' });
  }
};