// server/src/services/budgetIntegration.service.ts
import { prisma } from '../lib/prisma.js';

export interface ExternalBudgetSource {
  type: 'ERP' | 'QUICKBOOKS' | 'SAP' | 'ORACLE' | 'CUSTOM_API';
  apiKey?: string;
  baseUrl?: string;
  syncFrequency: 'HOURLY' | 'DAILY' | 'WEEKLY';
  lastSync?: Date;
}

export interface BudgetData {
  name: string;
  category: string;
  allocated: number;
  spent: number;
  period: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  startDate: Date;
  endDate: Date;
  department?: string;
  metadata?: any;
}

export class BudgetIntegrationService {
  private static instance: BudgetIntegrationService;
  
  static getInstance() {
    if (!BudgetIntegrationService.instance) {
      BudgetIntegrationService.instance = new BudgetIntegrationService();
    }
    return BudgetIntegrationService.instance;
  }

  // Fetch budgets from ERP system (SAP, Oracle, etc.)
  async fetchFromERP(apiKey: string, baseUrl: string, companyId: string): Promise<BudgetData[]> {
    try {
      // Example: SAP API call
      // const response = await fetch(`${baseUrl}/sap/opu/odata/sap/ZBUDGET_SRV/BudgetSet`, {
      //   headers: { 'Authorization': `Bearer ${apiKey}` }
      // });
      // const data = await response.json();
      
      console.log(`Fetching budgets from ERP for company: ${companyId}`);
      
      // Mock data - replace with actual API call
      return [
        {
          name: "Engineering Budget Q3",
          category: "Engineering",
          allocated: 500000,
          spent: 320000,
          period: "QUARTERLY",
          startDate: new Date(2024, 6, 1),
          endDate: new Date(2024, 8, 30),
          department: "Engineering",
          metadata: { source: "ERP", externalId: "BUD-001" }
        },
        {
          name: "Marketing Budget Q3",
          category: "Marketing",
          allocated: 300000,
          spent: 276000,
          period: "QUARTERLY",
          startDate: new Date(2024, 6, 1),
          endDate: new Date(2024, 8, 30),
          department: "Marketing",
          metadata: { source: "ERP", externalId: "BUD-002" }
        },
        {
          name: "Operations Budget Q3",
          category: "Operations",
          allocated: 400000,
          spent: 284000,
          period: "QUARTERLY",
          startDate: new Date(2024, 6, 1),
          endDate: new Date(2024, 8, 30),
          department: "Operations",
          metadata: { source: "ERP", externalId: "BUD-003" }
        }
      ];
    } catch (error) {
      console.error("ERP fetch error:", error);
      return [];
    }
  }

  // Fetch budgets from QuickBooks
  async fetchFromQuickBooks(apiKey: string, realmId: string): Promise<BudgetData[]> {
    try {
      // QuickBooks API example
      // const response = await fetch(`https://quickbooks.api.intuit.com/v3/company/${realmId}/query`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${apiKey}`,
      //     'Content-Type': 'application/text'
      //   },
      //   body: "SELECT * FROM Budget"
      // });
      
      return [
        {
          name: "Annual Operating Budget",
          category: "Operations",
          allocated: 2000000,
          spent: 890000,
          period: "ANNUAL",
          startDate: new Date(2024, 0, 1),
          endDate: new Date(2024, 11, 31),
          department: "All Departments",
          metadata: { source: "QuickBooks" }
        }
      ];
    } catch (error) {
      console.error("QuickBooks fetch error:", error);
      return [];
    }
  }

  // Fetch from custom corporate system
  async fetchFromCustomSystem(apiKey: string, baseUrl: string, endpoint: string): Promise<BudgetData[]> {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      
      if (!response.ok) throw new Error(`Custom API error: ${response.status}`);
      
      const data = await response.json();
      
      // Transform custom data to our format
      return this.transformCustomData(data);
    } catch (error) {
      console.error("Custom system fetch error:", error);
      return [];
    }
  }

  private transformCustomData(data: any): BudgetData[] {
    // Transform logic based on your custom system's data structure
    // This is an example - adjust based on actual API response
    if (Array.isArray(data)) {
      return data.map(item => ({
        name: item.budgetName || item.name,
        category: item.department || item.category,
        allocated: item.totalBudget || item.allocated,
        spent: item.currentSpend || item.spent,
        period: item.period || "MONTHLY",
        startDate: new Date(item.startDate),
        endDate: new Date(item.endDate),
        department: item.department,
        metadata: { externalId: item.id, source: "custom" }
      }));
    }
    return [];
  }

  // Process uploaded Excel/CSV file
  async processUploadedFile(fileContent: string, fileType: 'CSV' | 'EXCEL'): Promise<BudgetData[]> {
    // Parse CSV or Excel file
    const lines = fileContent.split('\n');
    const budgets: BudgetData[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(',');
      if (columns.length >= 5) {
        budgets.push({
          name: columns[0],
          category: columns[1],
          allocated: parseFloat(columns[2]),
          spent: parseFloat(columns[3]),
          period: columns[4] as any,
          startDate: new Date(columns[5]),
          endDate: new Date(columns[6]),
          department: columns[7],
          metadata: { source: 'UPLOAD' }
        });
      }
    }
    
    return budgets;
  }

  // Sync external budgets to database
  async syncExternalBudgets(userId: string, source: ExternalBudgetSource): Promise<{ imported: number; errors: string[] }> {
    let budgets: BudgetData[] = [];
    const errors: string[] = [];
    
    try {
      switch (source.type) {
        case 'ERP':
          if (source.apiKey && source.baseUrl) {
            budgets = await this.fetchFromERP(source.apiKey, source.baseUrl, userId);
          }
          break;
        case 'QUICKBOOKS':
          if (source.apiKey) {
            budgets = await this.fetchFromQuickBooks(source.apiKey, userId);
          }
          break;
        case 'CUSTOM_API':
          if (source.apiKey && source.baseUrl) {
            budgets = await this.fetchFromCustomSystem(source.apiKey, source.baseUrl, '/api/budgets');
          }
          break;
      }
      
      // Save budgets to database
      for (const budget of budgets) {
        const existing = await prisma.budget.findFirst({
          where: {
            userId,
            category: budget.category,
            period: budget.period
          }
        });
        
        if (existing) {
          await prisma.budget.update({
            where: { id: existing.id },
            data: {
              allocated: budget.allocated,
              spent: budget.spent,
              startDate: budget.startDate,
              endDate: budget.endDate,
              metadata: { ...budget.metadata, lastSynced: new Date().toISOString() }
            }
          });
        } else {
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
              metadata: budget.metadata
            }
          });
        }
      }
      
      return { imported: budgets.length, errors };
    } catch (error) {
      errors.push(error.message);
      return { imported: 0, errors };
    }
  }

  // Calculate budget metrics
  async calculateBudgetMetrics(userId: string) {
    const budgets = await prisma.budget.findMany({
      where: { userId }
    });
    
    const totalBudget = budgets.reduce((sum, b) => sum + b.allocated, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
    const remaining = totalBudget - totalSpent;
    const spendPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
    
    // Department performance
    const departmentData = await this.getDepartmentPerformance(userId);
    
    // Expense breakdown by category
    const expenseBreakdown = await this.getExpenseBreakdown(userId);
    
    // Spending trend (last 6 months)
    const spendingTrend = await this.getSpendingTrend(userId);
    
    // Budget health score
    let healthScore = 100;
    if (spendPct > 90) healthScore -= 30;
    else if (spendPct > 75) healthScore -= 15;
    if (remaining < 0) healthScore -= 25;
    healthScore = Math.max(healthScore, 0);
    
    // AI Insight
    let aiInsight = "";
    if (budgets.length === 0) {
      aiInsight = "Create budgets to begin AI-powered financial monitoring and cost optimization.";
    } else if (spendPct > 90) {
      aiInsight = "Budget utilization is critically high. Multiple departments are approaching spending limits and cost optimization is recommended immediately.";
    } else if (spendPct > 70) {
      aiInsight = "Operational spending is increasing steadily. Current burn rate remains manageable but should be monitored closely.";
    } else {
      aiInsight = "Financial allocation remains healthy with stable operational spending across departments.";
    }
    
    return {
      budgets,
      metrics: {
        totalBudget,
        totalSpent,
        remaining,
        spendPct,
        healthScore,
        aiInsight,
        budgetCount: budgets.length
      },
      departmentData,
      expenseBreakdown,
      spendingTrend
    };
  }

  private async getDepartmentPerformance(userId: string) {
    const budgets = await prisma.budget.findMany({
      where: { userId }
    });
    
    const departments = ['Engineering', 'Marketing', 'Operations', 'HR'];
    return departments.map(dept => {
      const deptBudgets = budgets.filter(b => b.category === dept);
      const allocated = deptBudgets.reduce((sum, b) => sum + b.allocated, 0);
      const spent = deptBudgets.reduce((sum, b) => sum + b.spent, 0);
      const usage = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;
      
      return {
        department: dept,
        allocated,
        spent,
        usage,
        remaining: allocated - spent
      };
    });
  }

  private async getExpenseBreakdown(userId: string) {
    const budgets = await prisma.budget.findMany({
      where: { userId }
    });
    
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
    
    const categoryMap = new Map();
    budgets.forEach(budget => {
      const current = categoryMap.get(budget.category) || 0;
      categoryMap.set(budget.category, current + budget.spent);
    });
    
    const breakdown = Array.from(categoryMap.entries()).map(([name, spent]) => ({
      name,
      value: totalSpent > 0 ? Math.round((spent / totalSpent) * 100) : 0,
      amount: spent
    }));
    
    return breakdown.sort((a, b) => b.value - a.value);
  }

  private async getSpendingTrend(userId: string) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const budgets = await prisma.budget.findMany({
      where: { userId }
    });
    
    // Simulate monthly data based on budget allocations
    // In production, you would track actual monthly expenses
    return months.map((month, index) => {
      const multiplier = 1 + (index * 0.1); // 10% growth each month
      const allocated = budgets.reduce((sum, b) => sum + b.allocated / 12, 0);
      const spent = allocated * multiplier * 0.7; // 70% utilization with growth
      
      return {
        month,
        allocated: Math.round(allocated),
        spent: Math.round(spent)
      };
    });
  }
}

export const budgetIntegrationService = BudgetIntegrationService.getInstance();