// server/src/services/financialIntegration.service.ts
import { prisma } from '../lib/prisma.js';

// Interface for external data sources
interface ExternalDataSource {
  type: 'QUICKBOOKS' | 'STRIPE' | 'CUSTOM_API' | 'CSV_IMPORT';
  apiKey?: string;
  baseUrl?: string;
  syncFrequency: 'HOURLY' | 'DAILY' | 'WEEKLY';
  lastSync?: Date;
}

interface Transaction {
  date: Date;
  description: string;
  category: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  reference?: string;
  metadata?: any;
}

export class FinancialIntegrationService {
  private static instance: FinancialIntegrationService;
  
  static getInstance() {
    if (!FinancialIntegrationService.instance) {
      FinancialIntegrationService.instance = new FinancialIntegrationService();
    }
    return FinancialIntegrationService.instance;
  }

  // Simulate fetching from QuickBooks API
  async fetchFromQuickBooks(apiKey: string, companyId: string): Promise<Transaction[]> {
    // In production, replace with actual QuickBooks API call
    // Example: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/account
    try {
      // const response = await fetch(`https://quickbooks.api.intuit.com/v3/company/${companyId}/reports`, {
      //   headers: { 'Authorization': `Bearer ${apiKey}` }
      // });
      // const data = await response.json();
      
      // Mock data for demonstration
      console.log(`Fetching from QuickBooks for company: ${companyId}`);
      
      return [
        {
          date: new Date(),
          description: "Product Sales - Q4",
          category: "Revenue",
          amount: 250000,
          type: "INCOME",
          reference: "QB_INV_001"
        },
        {
          date: new Date(),
          description: "Payroll Processing",
          category: "Payroll",
          amount: 85000,
          type: "EXPENSE",
          reference: "QB_PAY_001"
        },
        {
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          description: "Office Rent",
          category: "Rent",
          amount: 15000,
          type: "EXPENSE",
          reference: "QB_RENT_001"
        }
      ];
    } catch (error) {
      console.error("QuickBooks fetch error:", error);
      return [];
    }
  }

  // Simulate fetching from Stripe API
  async fetchFromStripe(apiKey: string): Promise<Transaction[]> {
    try {
      // const stripe = require('stripe')(apiKey);
      // const charges = await stripe.charges.list({ limit: 100 });
      
      // Mock data
      return [
        {
          date: new Date(),
          description: "Subscription Revenue",
          category: "Subscriptions",
          amount: 45000,
          type: "INCOME",
          reference: "STR_CH_001"
        },
        {
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          description: "One-time Purchase",
          category: "Product Sales",
          amount: 12500,
          type: "INCOME",
          reference: "STR_CH_002"
        }
      ];
    } catch (error) {
      console.error("Stripe fetch error:", error);
      return [];
    }
  }

  // Fetch from custom ERP API
  async fetchFromCustomERP(apiKey: string, baseUrl: string): Promise<Transaction[]> {
    try {
      // const response = await fetch(`${baseUrl}/api/financial/transactions`, {
      //   headers: { 'Authorization': `Bearer ${apiKey}` }
      // });
      // const data = await response.json();
      
      // Mock data
      return [
        {
          date: new Date(),
          description: "Raw Materials Purchase",
          category: "Inventory",
          amount: 32000,
          type: "EXPENSE",
          reference: "ERP_PO_001"
        },
        {
          date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          description: "Client Payment Received",
          category: "Client Revenue",
          amount: 180000,
          type: "INCOME",
          reference: "ERP_INV_001"
        }
      ];
    } catch (error) {
      console.error("ERP fetch error:", error);
      return [];
    }
  }

  // Process CSV/Excel upload
  async processUploadedFile(fileContent: string, fileType: 'CSV' | 'EXCEL'): Promise<Transaction[]> {
    // Parse CSV or Excel file
    // This is a simplified version - in production, use libraries like 'csv-parser' or 'xlsx'
    const lines = fileContent.split('\n');
    const transactions: Transaction[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(',');
      if (columns.length >= 4) {
        transactions.push({
          date: new Date(columns[0]),
          description: columns[1],
          category: columns[2],
          amount: parseFloat(columns[3]),
          type: parseFloat(columns[3]) > 0 ? 'INCOME' : 'EXPENSE'
        });
      }
    }
    
    return transactions;
  }

  // Sync external data to database
  async syncExternalData(userId: string, source: ExternalDataSource): Promise<{ imported: number; errors: string[] }> {
    let transactions: Transaction[] = [];
    const errors: string[] = [];
    
    try {
      switch (source.type) {
        case 'QUICKBOOKS':
          if (source.apiKey) {
            transactions = await this.fetchFromQuickBooks(source.apiKey, userId);
          }
          break;
        case 'STRIPE':
          if (source.apiKey) {
            transactions = await this.fetchFromStripe(source.apiKey);
          }
          break;
        case 'CUSTOM_API':
          if (source.apiKey && source.baseUrl) {
            transactions = await this.fetchFromCustomERP(source.apiKey, source.baseUrl);
          }
          break;
      }
      
      // Save transactions to database
      for (const transaction of transactions) {
        await prisma.financialRecord.create({
          data: {
            userId,
            type: transaction.type,
            amount: Math.abs(transaction.amount),
            category: transaction.category,
            description: transaction.description,
            date: transaction.date,
            metadata: {
              source: source.type,
              reference: transaction.reference,
              syncedAt: new Date().toISOString()
            }
          }
        });
      }
      
      // Update last sync time
      await prisma.user.update({
        where: { id: userId },
        data: {
          integrations: {
            ...((await this.getUserIntegrations(userId)) as Record<string, any>),
            [source.type.toLowerCase()]: {
              ...source,
              lastSync: new Date()
            }
          }
        }
      });
      
      return { imported: transactions.length, errors };
    } catch (error) {
      errors.push(error.message);
      return { imported: 0, errors };
    }
  }

  private async getUserIntegrations(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { integrations: true }
    });
    return user?.integrations || {};
  }

  // Calculate financial metrics from real data
  async calculateMetrics(userId: string) {
    const records = await prisma.financialRecord.findMany({
      where: { userId },
      orderBy: { date: 'desc' }
    });
    
    const totalIncome = records
      .filter(r => r.type === 'INCOME')
      .reduce((sum, r) => sum + r.amount, 0);
      
    const totalExpenses = records
      .filter(r => r.type === 'EXPENSE')
      .reduce((sum, r) => sum + r.amount, 0);
      
    const netProfit = totalIncome - totalExpenses;
    
    // Calculate monthly trends
    const monthlyData = this.calculateMonthlyTrends(records);
    
    // Calculate expense breakdown
    const expenseBreakdown = this.calculateExpenseBreakdown(records);
    
    // Calculate burn rate (average monthly expenses over last 3 months)
    const last3MonthsExpenses = records
      .filter(r => r.type === 'EXPENSE' && r.date >= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
      .reduce((sum, r) => sum + r.amount, 0);
    const burnRate = Math.round(last3MonthsExpenses / 3);
    
    // Calculate runway (cash / burn rate)
    const cashBalance = records
      .filter(r => r.type === 'INCOME' && r.category === 'Cash Balance')
      .reduce((sum, r) => sum + r.amount, 0) || totalIncome * 0.3;
    const runwayMonths = burnRate > 0 ? Math.round(cashBalance / burnRate) : 0;
    
    // Calculate budget utilization (if budget data exists)
    const budget = await prisma.budget.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    const budgetUtilization = budget ? Math.round((totalExpenses / budget.allocated) * 100) : 0;
    
    // Calculate financial health score
    let healthScore = 70;
    if (netProfit > 0) healthScore += 10;
    if (budgetUtilization < 80) healthScore += 10;
    if (runwayMonths > 12) healthScore += 10;
    healthScore = Math.min(healthScore, 100);
    
    return {
      summary: {
        totalIncome,
        totalExpenses,
        netProfit,
        budgetUtilization,
        totalRecords: records.length
      },
      monthlyData,
      expenseBreakdown,
      burnRate,
      runwayMonths,
      healthScore,
      aiInsight: this.generateAIInsight(netProfit, budgetUtilization, runwayMonths)
    };
  }
  
  private calculateMonthlyTrends(records: any[]) {
    const monthlyMap = new Map();
    
    records.forEach(record => {
      const month = record.date.toLocaleString('default', { month: 'short' });
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, { revenue: 0, expenses: 0 });
      }
      const data = monthlyMap.get(month);
      if (record.type === 'INCOME') {
        data.revenue += record.amount;
      } else {
        data.expenses += record.amount;
      }
    });
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map(month => ({
      month,
      revenue: monthlyMap.get(month)?.revenue || 0,
      expenses: monthlyMap.get(month)?.expenses || 0
    }));
  }
  
  private calculateExpenseBreakdown(records: any[]) {
    const categoryMap = new Map();
    const expenses = records.filter(r => r.type === 'EXPENSE');
    
    expenses.forEach(expense => {
      categoryMap.set(expense.category, (categoryMap.get(expense.category) || 0) + expense.amount);
    });
    
    const totalExpenses = Array.from(categoryMap.values()).reduce((a, b) => a + b, 0);
    
    return Array.from(categoryMap.entries()).map(([name, amount]) => ({
      name,
      value: Math.round((amount / totalExpenses) * 100)
    }));
  }
  
  private generateAIInsight(netProfit: number, budgetUtilization: number, runwayMonths: number): string {
    if (netProfit > 0 && budgetUtilization < 80) {
      return "Revenue growth remains healthy while operational spending is under control. Current financial position supports moderate expansion initiatives.";
    }
    if (budgetUtilization > 90) {
      return "Budget utilization is approaching critical levels. Consider reducing operational spending or reallocating resources.";
    }
    if (runwayMonths < 6) {
      return "Cash runway is below 6 months. Immediate attention needed on revenue generation or funding.";
    }
    return "Financial performance remains stable, but expense growth should be monitored closely over the next quarter.";
  }
}

export const financialIntegrationService = FinancialIntegrationService.getInstance();