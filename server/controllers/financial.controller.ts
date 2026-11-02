// server/src/controllers/financial.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../lib/prisma.js';
import { financialIntegrationService } from '../services/financialIntegration.service.js';

// Get financial dashboard data
export const getFinancialDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    
    const metrics = await financialIntegrationService.calculateMetrics(userId);
    
    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Get financial dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to get financial data' });
  }
};

// Get all financial records
export const getFinancialRecords = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    
    const { category, type, startDate, endDate } = req.query;
    const where: any = { userId };
    
    if (category) where.category = category;
    if (type) where.type = type;
    if (startDate) where.date = { gte: new Date(startDate as string) };
    if (endDate) where.date = { ...where.date, lte: new Date(endDate as string) };
    
    const records = await prisma.financialRecord.findMany({
      where,
      orderBy: { date: 'desc' }
    });
    
    res.status(200).json({
      success: true,
      data: records
    });
  } catch (error) {
    console.error('Get financial records error:', error);
    res.status(500).json({ success: false, message: 'Failed to get financial records' });
  }
};

// Add financial record manually
export const addFinancialRecord = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    
    const { type, amount, category, description, date } = req.body;
    
    if (!type || !amount || !category) {
      res.status(400).json({ success: false, message: 'Type, amount, and category are required' });
      return;
    }
    
    const record = await prisma.financialRecord.create({
      data: {
        userId,
        type,
        amount: Math.abs(amount),
        category,
        description: description || null,
        date: date ? new Date(date) : new Date()
      }
    });
    
    res.status(201).json({
      success: true,
      data: record,
      message: 'Financial record added successfully'
    });
  } catch (error) {
    console.error('Add financial record error:', error);
    res.status(500).json({ success: false, message: 'Failed to add financial record' });
  }
};

// Update a financial record
export const updateFinancialRecord = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { recordId } = req.params;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const existing = await prisma.financialRecord.findFirst({ where: { id: recordId, userId } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Financial record not found' });
      return;
    }

    const { type, amount, category, description, date } = req.body;
    const record = await prisma.financialRecord.update({
      where: { id: recordId },
      data: {
        ...(type !== undefined && { type }),
        ...(amount !== undefined && { amount: Math.abs(Number(amount)) }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description: description || null }),
        ...(date !== undefined && { date: date ? new Date(date) : new Date() }),
      },
    });

    res.status(200).json({
      success: true,
      data: record,
      message: 'Financial record updated successfully'
    });
  } catch (error) {
    console.error('Update financial record error:', error);
    res.status(500).json({ success: false, message: 'Failed to update financial record' });
  }
};

// Delete a financial record
export const deleteFinancialRecord = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { recordId } = req.params;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const existing = await prisma.financialRecord.findFirst({ where: { id: recordId, userId } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Financial record not found' });
      return;
    }

    await prisma.financialRecord.delete({ where: { id: recordId } });
    res.status(200).json({ success: true, message: 'Financial record deleted successfully' });
  } catch (error) {
    console.error('Delete financial record error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete financial record' });
  }
};

// Import from external source
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
    
    const result = await financialIntegrationService.syncExternalData(userId, {
      type: sourceType,
      apiKey,
      baseUrl,
      syncFrequency: 'DAILY'
    });
    
    res.status(200).json({
      success: true,
      data: result,
      message: `Imported ${result.imported} transactions`
    });
  } catch (error) {
    console.error('Import from external error:', error);
    res.status(500).json({ success: false, message: 'Failed to import data' });
  }
};

// Upload CSV file
export const uploadCSV = async (req: AuthRequest, res: Response): Promise<void> => {
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
    const transactions = await financialIntegrationService.processUploadedFile(fileContent, 'CSV');
    
    let imported = 0;
    for (const transaction of transactions) {
      await prisma.financialRecord.create({
        data: {
          userId,
          type: transaction.type,
          amount: Math.abs(transaction.amount),
          category: transaction.category,
          description: transaction.description,
          date: transaction.date,
          metadata: { source: 'CSV_IMPORT', importedAt: new Date().toISOString() }
        }
      });
      imported++;
    }
    
    res.status(200).json({
      success: true,
      data: { imported },
      message: `Successfully imported ${imported} transactions`
    });
  } catch (error) {
    console.error('CSV upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to process CSV file' });
  }
};

// Get budget
export const getBudgets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    
    const budgets = await prisma.budget.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    
    res.status(200).json({
      success: true,
      data: budgets
    });
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({ success: false, message: 'Failed to get budgets' });
  }
};

// Create budget
export const createBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    
    const { name, category, allocated, period, startDate, endDate } = req.body;
    
    if (!name || !category || !allocated) {
      res.status(400).json({ success: false, message: 'Name, category, and allocated amount are required' });
      return;
    }
    
    const budget = await prisma.budget.create({
      data: {
        userId,
        name,
        category,
        allocated,
        spent: 0,
        period: period || 'MONTHLY',
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
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
        allocated: allocated !== undefined ? allocated : undefined,
        spent: spent !== undefined ? spent : undefined,
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

// Generate forecast
export const generateForecast = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    
    const records = await prisma.financialRecord.findMany({
      where: { userId },
      orderBy: { date: 'asc' }
    });
    
    // Simple forecasting based on last 3 months trend
    const last3Months = records.filter(r => r.date >= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
    const monthlyRevenue = last3Months.filter(r => r.type === 'INCOME').reduce((sum, r) => sum + r.amount, 0) / 3;
    const monthlyExpenses = last3Months.filter(r => r.type === 'EXPENSE').reduce((sum, r) => sum + r.amount, 0) / 3;
    const projectedGrowth = 0.22; // 22% growth assumption
    
    const forecast = {
      projectedRevenueGrowth: 22,
      expenseGrowthRisk: 58,
      expansionReadiness: monthlyRevenue > monthlyExpenses * 1.2 ? 'Ready' : 'Monitor',
      nextMonthForecast: {
        revenue: Math.round(monthlyRevenue * (1 + projectedGrowth)),
        expenses: Math.round(monthlyExpenses * 1.05)
      },
      quarterlyForecast: {
        revenue: Math.round(monthlyRevenue * 3 * (1 + projectedGrowth)),
        expenses: Math.round(monthlyExpenses * 3 * 1.05)
      }
    };
    
    res.status(200).json({
      success: true,
      data: forecast
    });
  } catch (error) {
    console.error('Generate forecast error:', error);
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
      quickbooks: userIntegrations.quickbooks || { connected: false },
      stripe: userIntegrations.stripe || { connected: false },
      customERP: userIntegrations.customERP || { connected: false }
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