import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../lib/prisma.js';

// Get all team members
export const getTeamMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { department, status, role } = req.query;
    const where: any = { userId };
    
    if (department && department !== 'ALL') where.department = department;
    if (status) where.status = status;
    if (role) where.role = role;

    const teamMembers = await prisma.teamMember.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // Format members to include metadata fields
    const formattedMembers = teamMembers.map(member => ({
      id: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      department: member.department,
      location: member.location,
      status: member.status,
      priority: member.priority,
      performanceScore: member.performanceScore,
      workloadScore: member.workloadScore,
      engagementScore: member.engagementScore,
      burnoutRisk: member.burnoutRisk,
      activeTasks: member.activeTasks,
      meetingsThisWeek: member.meetingsThisWeek,
      completedTasks: member.completedTasks,
      pendingTasks: member.pendingTasks,
      skills: member.skills || [],
      projects: member.projects || [],
      notes: member.notes || null,
      managerName: member.managerName || null,
      joinedAt: member.joinedAt,
      lastActiveAt: member.lastActiveAt,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt
    }));

    res.status(200).json({
      success: true,
      data: formattedMembers
    });
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({ success: false, message: 'Failed to get team members' });
  }
};

// Get single team member
export const getTeamMemberById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const teamMember = await prisma.teamMember.findFirst({
      where: { id, userId }
    });

    if (!teamMember) {
      res.status(404).json({ success: false, message: 'Team member not found' });
      return;
    }

    const formattedMember = {
      id: teamMember.id,
      name: teamMember.name,
      email: teamMember.email,
      phone: teamMember.phone,
      role: teamMember.role,
      department: teamMember.department,
      location: teamMember.location,
      status: teamMember.status,
      priority: teamMember.priority,
      performanceScore: teamMember.performanceScore,
      workloadScore: teamMember.workloadScore,
      engagementScore: teamMember.engagementScore,
      burnoutRisk: teamMember.burnoutRisk,
      activeTasks: teamMember.activeTasks,
      meetingsThisWeek: teamMember.meetingsThisWeek,
      completedTasks: teamMember.completedTasks,
      pendingTasks: teamMember.pendingTasks,
      skills: teamMember.skills || [],
      projects: teamMember.projects || [],
      notes: teamMember.notes || null,
      managerName: teamMember.managerName || null,
      joinedAt: teamMember.joinedAt,
      lastActiveAt: teamMember.lastActiveAt,
      createdAt: teamMember.createdAt,
      updatedAt: teamMember.updatedAt
    };

    res.status(200).json({
      success: true,
      data: formattedMember
    });
  } catch (error) {
    console.error('Get team member error:', error);
    res.status(500).json({ success: false, message: 'Failed to get team member' });
  }
};

// Create team member
export const createTeamMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { 
      name, email, phone, role, department, location, 
      employmentType, status, priority, performanceScore, 
      workloadScore, engagementScore, burnoutRisk, activeTasks,
      meetingsThisWeek, completedTasks, pendingTasks, skills, 
      projects, notes, managerName, joinedAt, lastActiveAt
    } = req.body;

    if (!name) {
      res.status(400).json({ success: false, message: 'Name is required' });
      return;
    }

    const teamMember = await prisma.teamMember.create({
      data: {
        userId,
        name,
        email: email || null,
        phone: phone || null,
        role: role || null,
        department: department || null,
        location: location || null,
        employmentType: employmentType || 'FULL_TIME',
        status: status || 'ACTIVE',
        priority: priority || 'MEDIUM',
        performanceScore: performanceScore || 0,
        workloadScore: workloadScore || 0,
        engagementScore: engagementScore || 0,
        burnoutRisk: burnoutRisk || 0,
        activeTasks: activeTasks || 0,
        meetingsThisWeek: meetingsThisWeek || 0,
        completedTasks: completedTasks || 0,
        pendingTasks: pendingTasks || 0,
        skills: skills || [],
        projects: projects || [],
        notes: notes || null,
        managerName: managerName || null,
        joinedAt: joinedAt ? new Date(joinedAt) : new Date(),
        lastActiveAt: lastActiveAt ? new Date(lastActiveAt) : new Date()
      }
    });

    const formattedMember = {
      id: teamMember.id,
      name: teamMember.name,
      email: teamMember.email,
      phone: teamMember.phone,
      role: teamMember.role,
      department: teamMember.department,
      location: teamMember.location,
      status: teamMember.status,
      priority: teamMember.priority,
      performanceScore: teamMember.performanceScore,
      workloadScore: teamMember.workloadScore,
      engagementScore: teamMember.engagementScore,
      burnoutRisk: burnoutRisk || 0,
      activeTasks: activeTasks || 0,
      meetingsThisWeek: meetingsThisWeek || 0,
      completedTasks: completedTasks || 0,
      pendingTasks: pendingTasks || 0,
      skills: skills || [],
      projects: projects || [],
      notes: notes || null,
      managerName: managerName || null,
      joinedAt: joinedAt || teamMember.createdAt,
      lastActiveAt: lastActiveAt || teamMember.createdAt,
      createdAt: teamMember.createdAt,
      updatedAt: teamMember.updatedAt
    };

    res.status(201).json({
      success: true,
      data: formattedMember,
      message: 'Team member created successfully'
    });
  } catch (error) {
    console.error('Create team member error:', error);
    res.status(500).json({ success: false, message: 'Failed to create team member' });
  }
};

// Update team member
export const updateTeamMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const existing = await prisma.teamMember.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Team member not found' });
      return;
    }

    const { 
      name, email, phone, role, department, location, 
      employmentType, status, priority, performanceScore, 
      workloadScore, engagementScore, burnoutRisk, activeTasks,
      meetingsThisWeek, completedTasks, pendingTasks, skills, 
      projects, notes, managerName, lastActiveAt
    } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (department !== undefined) updateData.department = department;
    if (location !== undefined) updateData.location = location;
    if (employmentType !== undefined) updateData.employmentType = employmentType;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (performanceScore !== undefined) updateData.performanceScore = performanceScore;
    if (workloadScore !== undefined) updateData.workloadScore = workloadScore;
    if (engagementScore !== undefined) updateData.engagementScore = engagementScore;
    
    if (burnoutRisk !== undefined) updateData.burnoutRisk = burnoutRisk;
    if (activeTasks !== undefined) updateData.activeTasks = activeTasks;
    if (meetingsThisWeek !== undefined) updateData.meetingsThisWeek = meetingsThisWeek;
    if (completedTasks !== undefined) updateData.completedTasks = completedTasks;
    if (pendingTasks !== undefined) updateData.pendingTasks = pendingTasks;
    if (skills !== undefined) updateData.skills = skills;
    if (projects !== undefined) updateData.projects = projects;
    if (notes !== undefined) updateData.notes = notes;
    if (managerName !== undefined) updateData.managerName = managerName;
    updateData.lastActiveAt = lastActiveAt ? new Date(lastActiveAt) : new Date();

    const teamMember = await prisma.teamMember.update({
      where: { id },
      data: updateData
    });

    const formattedMember = {
      id: teamMember.id,
      name: teamMember.name,
      email: teamMember.email,
      phone: teamMember.phone,
      role: teamMember.role,
      department: teamMember.department,
      location: teamMember.location,
      status: teamMember.status,
      priority: teamMember.priority,
      performanceScore: teamMember.performanceScore,
      workloadScore: teamMember.workloadScore,
      engagementScore: teamMember.engagementScore,
      burnoutRisk: teamMember.burnoutRisk,
      activeTasks: teamMember.activeTasks,
      meetingsThisWeek: teamMember.meetingsThisWeek,
      completedTasks: teamMember.completedTasks,
      pendingTasks: teamMember.pendingTasks,
      skills: teamMember.skills || [],
      projects: teamMember.projects || [],
      notes: teamMember.notes || null,
      managerName: teamMember.managerName || null,
      joinedAt: teamMember.joinedAt,
      lastActiveAt: teamMember.lastActiveAt,
      createdAt: teamMember.createdAt,
      updatedAt: teamMember.updatedAt
    };

    res.status(200).json({
      success: true,
      data: formattedMember,
      message: 'Team member updated successfully'
    });
  } catch (error) {
    console.error('Update team member error:', error);
    res.status(500).json({ success: false, message: 'Failed to update team member' });
  }
};

// Delete team member
export const deleteTeamMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const existing = await prisma.teamMember.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Team member not found' });
      return;
    }

    await prisma.teamMember.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Team member deleted successfully'
    });
  } catch (error) {
    console.error('Delete team member error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete team member' });
  }
};

// Get team insights
export const getTeamInsights = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const teamMembers = await prisma.teamMember.findMany({
      where: { userId }
    });

    const total = teamMembers.length;
    const highPerformers = teamMembers.filter(m => m.performanceScore >= 80).length;
    const burnoutRisk = teamMembers.filter(m => m.burnoutRisk >= 70).length;
    const focusedMembers = teamMembers.filter(m => m.status === 'FOCUSED').length;
    
    const avgPerformance = total > 0 
      ? Math.round(teamMembers.reduce((acc, m) => acc + m.performanceScore, 0) / total)
      : 0;

    const avgWorkload = total > 0
      ? Math.round(teamMembers.reduce((acc, m) => acc + m.workloadScore, 0) / total)
      : 0;

    const avgEngagement = total > 0
      ? Math.round(teamMembers.reduce((acc, m) => acc + m.engagementScore, 0) / total)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        total,
        highPerformers,
        burnoutRisk,
        focusedMembers,
        avgPerformance,
        avgWorkload,
        avgEngagement,
        members: teamMembers
      }
    });
  } catch (error) {
    console.error('Get team insights error:', error);
    res.status(500).json({ success: false, message: 'Failed to get team insights' });
  }
};