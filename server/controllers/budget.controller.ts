// server/src/controllers/budget.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../lib/prisma.js';
import { budgetIntegrationService } from '../services/budgetIntegration.service.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

// Get all budgets with metrics
export const getBudgets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    
    const budgetData = await budgetIntegrationService.calculateBudgetMetrics(userId);
    
    res.status(200).json({
      success: true,
      data: budgetData.budgets,
      metrics: budgetData.metrics,
      departmentPerformance: budgetData.departmentData,
      expenseBreakdown: budgetData.expenseBreakdown,
      spendingTrend: budgetData.spendingTrend
    });
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({ success: false, message: 'Failed to get budgets' });
  }
};

// Get budget metrics only
export const getBudgetMetrics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    
    const budgetData = await budgetIntegrationService.calculateBudgetMetrics(userId);
    
    res.status(200).json({
      success: true,
      data: budgetData.metrics,
      departmentPerformance: budgetData.departmentData,
      expenseBreakdown: budgetData.expenseBreakdown,
      spendingTrend: budgetData.spendingTrend
    });
  } catch (error) {
    console.error('Get budget metrics error:', error);
    res.status(500).json({ success: false, message: 'Failed to get budget metrics' });
  }
};

// Create new budget
export const createBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    
    const { name, category, allocated, period, startDate, endDate, department } = req.body;
    
    if (!name || !category || !allocated) {
      res.status(400).json({ success: false, message: 'Name, category, and allocated amount are required' });
      return;
    }
    
    const budget = await prisma.budget.create({
      data: {
        userId,
        name,
        category,
        allocated: parseFloat(allocated),
        spent: 0,
        period: period || 'MONTHLY',
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        metadata: { department }
      }
    });
    
    res.status(201).json({
      success: true,
      data: budget,
      message: 'Budget created successfully'
    });
  } catch (error) {
    console.error('Create budget error:', error);
    res.status(500).json({ success: false, message: 'Failed to create budget' });
  }
};

// Update budget
export const updateBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    
    const existing = await prisma.budget.findFirst({
      where: { id, userId }
    });
    
    if (!existing) {
      res.status(404).json({ success: false, message: 'Budget not found' });
      return;
    }
    
    const { name, category, allocated, spent, period, startDate, endDate } = req.body;
    
    const budget = await prisma.budget.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        category: category !== undefined ? category : undefined,
        allocated: allocated !== undefined ? parseFloat(allocated) : undefined,
        spent: spent !== undefined ? parseFloat(spent) : undefined,
        period: period !== undefined ? period : undefined,
        startDate: startDate !== undefined ? new Date(startDate) : undefined,
        endDate: endDate !== undefined ? new Date(endDate) : undefined
      }
    });
    
    res.status(200).json({
      success: true,
      data: budget,
      message: 'Budget updated successfully'
    });
  } catch (error) {
    console.error('Update budget error:', error);
    res.status(500).json({ success: false, message: 'Failed to update budget' });
  }
};

// Delete budget
export const deleteBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    
    const existing = await prisma.budget.findFirst({
      where: { id, userId }
    });
    
    if (!existing) {
      res.status(404).json({ success: false, message: 'Budget not found' });
      return;
    }
    
    await prisma.budget.delete({ where: { id } });
    
    res.status(200).json({
      success: true,
      message: 'Budget deleted successfully'
    });
  } catch (error) {
    console.error('Delete budget error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete budget' });
  }
};

// Import from external system
export const importFromExternal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    
    const { sourceType, apiKey, baseUrl } = req.body;
    
    if (!sourceType) {
      res.status(400).json({ success: false, message: 'Source type is required' });
      return;
    }
    
    const result = await budgetIntegrationService.syncExternalBudgets(userId, {
      type: sourceType,
      apiKey,
      baseUrl,
      syncFrequency: 'DAILY'
    });
    
    res.status(200).json({
      success: true,
      data: result,
      message: `Imported ${result.imported} budgets`
    });
  } catch (error) {
    console.error('Import budgets error:', error);
    res.status(500).json({ success: false, message: 'Failed to import budgets' });
  }
};

// Upload budget CSV/Excel
export const uploadBudgetFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }
    
    const fileContent = req.file.buffer.toString('utf-8');
    const budgets = await budgetIntegrationService.processUploadedFile(fileContent, 'CSV');
    
    let imported = 0;
    for (const budget of budgets) {
      await prisma.budget.create({
        data: {
          userId,
          name: budget.name,
          category: budget.category,
          allocated: budget.allocated,
          spent: budget.spent,
          period: budget.period,
          startDate: budget.startDate,
          endDate: budget.endDate,
          metadata: { source: 'UPLOAD', importedAt: new Date().toISOString() }
        }
      });
      imported++;
    }
    
    res.status(200).json({
      success: true,
      data: { imported },
      message: `Successfully imported ${imported} budgets`
    });
  } catch (error) {
    console.error('Budget upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to process budget file' });
  }
};

// Update spent amount (track actual spending)
export const updateSpent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { amount } = req.body;
    
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    
    const budget = await prisma.budget.findFirst({
      where: { id, userId }
    });
    
    if (!budget) {
      res.status(404).json({ success: false, message: 'Budget not found' });
      return;
    }
    
    const updated = await prisma.budget.update({
      where: { id },
      data: { spent: budget.spent + amount }
    });
    
    res.status(200).json({
      success: true,
      data: updated,
      message: 'Spending updated successfully'
    });
  } catch (error) {
    console.error('Update spent error:', error);
    res.status(500).json({ success: false, message: 'Failed to update spending' });
  }
};

// Generate budget forecast
export const generateForecast = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    
    const budgets = await prisma.budget.findMany({
      where: { userId }
    });
    
    const totalBudget = budgets.reduce((sum, b) => sum + b.allocated, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
    const spendPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    
    // Simple forecast based on current spending rate
    const projectedUtilization = Math.min(100, Math.round(spendPct * 1.2));
    const costGrowthRisk = spendPct > 80 ? 'High' : spendPct > 60 ? 'Moderate' : 'Low';
    const expansionReadiness = spendPct < 70 && totalBudget - totalSpent > 100000 ? 'Ready' : 'Monitor';
    
    res.status(200).json({
      success: true,
      data: {
        projectedBudgetUtilization: projectedUtilization,
        costGrowthRisk,
        expansionReadiness,
        recommendations: [
          "Consider reducing low-performing marketing campaigns",
          "Reallocate resources toward engineering growth initiatives",
          "Monitor cloud infrastructure spending closely"
        ]
      }
    });
  } catch (error) {
    console.error('Budget forecast error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate forecast' });
  }
};

// Get integration status
export const getIntegrationStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { integrations: true }
    });
    
    const userIntegrations: any = user?.integrations || {};
    const integrations = {
      erp: userIntegrations.erp || { connected: false },
      quickbooks: userIntegrations.quickbooks || { connected: false },
      customApi: userIntegrations.customApi || { connected: false }
    };
    
    res.status(200).json({
      success: true,
      data: integrations
    });
  } catch (error) {
    console.error('Get integration status error:', error);
    res.status(500).json({ success: false, message: 'Failed to get integration status' });
  }
};