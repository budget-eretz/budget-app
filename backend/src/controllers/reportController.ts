import { Request, Response } from 'express';
import pool from '../config/database';
import { ReportService } from '../services/reportService';
import { DataValidationError, VALIDATION_ERRORS } from '../services/reportValidationService';
import ExcelJS from 'exceljs';

export async function getDashboard(req: Request, res: Response) {
  try {
    const user = req.user!;

    const dashboard: any = {
      user: {
        id: user.userId,
        email: user.email,
        isCircleTreasurer: user.isCircleTreasurer,
        isGroupTreasurer: user.isGroupTreasurer,
        groupIds: user.groupIds || []
      }
    };

    // Get budgets overview
    let budgetQuery = '';
    const budgetParams: any[] = [];

    if (user.isCircleTreasurer) {
      budgetQuery = `
        SELECT b.id, b.name, b.total_amount, b.group_id,
               (SELECT COALESCE(SUM(amount), 0) FROM incomes WHERE budget_id = b.id) as total_income,
               (SELECT COALESCE(SUM(allocated_amount), 0) FROM funds WHERE budget_id = b.id) as allocated_to_funds
        FROM budgets b
        ORDER BY b.created_at DESC
      `;
    } else if (user.groupIds && user.groupIds.length > 0) {
      budgetQuery = `
        SELECT b.id, b.name, b.total_amount, b.group_id,
               (SELECT COALESCE(SUM(amount), 0) FROM incomes WHERE budget_id = b.id) as total_income,
               (SELECT COALESCE(SUM(allocated_amount), 0) FROM funds WHERE budget_id = b.id) as allocated_to_funds
        FROM budgets b
        WHERE b.group_id = ANY($1) OR b.group_id IS NULL
        ORDER BY b.created_at DESC
      `;
      budgetParams.push(user.groupIds);
    }

    const budgets = await pool.query(budgetQuery, budgetParams);
    dashboard.budgets = budgets.rows;

    // Get funds with spending info
    let fundsQuery = `
      SELECT f.*,
             (SELECT COALESCE(SUM(amount), 0) FROM reimbursements
              WHERE fund_id = f.id AND status IN ('pending', 'under_review', 'approved', 'paid')) as spent_amount,
             (SELECT COALESCE(SUM(amount), 0) FROM planned_expenses
              WHERE fund_id = f.id AND status = 'planned') as planned_amount
      FROM funds f
    `;

    if (!user.isCircleTreasurer && user.groupIds && user.groupIds.length > 0) {
      fundsQuery += `
        JOIN budgets b ON f.budget_id = b.id
        WHERE b.group_id = ANY($1) OR b.group_id IS NULL
      `;
    }

    const funds = await pool.query(
      fundsQuery + ' ORDER BY f.created_at DESC',
      !user.isCircleTreasurer && user.groupIds && user.groupIds.length > 0 ? [user.groupIds] : []
    );

    dashboard.funds = funds.rows.map(fund => ({
      ...fund,
      available_amount: fund.allocated_amount - fund.spent_amount - fund.planned_amount
    }));

    // Get pending reimbursements (for treasurers)
    if (user.isCircleTreasurer || user.isGroupTreasurer) {
      let pendingQuery = `
        SELECT r.*, f.name as fund_name, u.full_name as user_name, b.group_id
        FROM reimbursements r
        JOIN funds f ON r.fund_id = f.id
        JOIN budgets b ON f.budget_id = b.id
        JOIN users u ON r.user_id = u.id
        WHERE r.status = 'pending'
      `;
      const pendingParams: any[] = [];

      // Filter by access control
      if (user.isCircleTreasurer && !user.isGroupTreasurer) {
        // Circle treasurer: only see circle-level budgets
        pendingQuery += ' AND b.group_id IS NULL';
      } else if (!user.isCircleTreasurer && user.isGroupTreasurer) {
        if (user.groupIds && user.groupIds.length > 0) {
          // Group treasurer: only see reimbursements from their assigned groups
          pendingQuery += ' AND b.group_id = ANY($1)';
          pendingParams.push(user.groupIds);
        } else {
          // Group treasurer without assigned groups shouldn't see any pending items
          pendingQuery += ' AND 1=0';
        }
      }

      pendingQuery += ` ORDER BY r.created_at ASC`;

      const pending = await pool.query(pendingQuery, pendingParams);
      dashboard.pendingReimbursements = pending.rows;
    }

    // Get user's reimbursements
    const userReimbursements = await pool.query(
      `SELECT r.*, f.name as fund_name
       FROM reimbursements r
       JOIN funds f ON r.fund_id = f.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [user.userId]
    );

    dashboard.myReimbursements = userReimbursements.rows;

    // Get user's planned expenses
    const userPlanned = await pool.query(
      `SELECT pe.*, f.name as fund_name
       FROM planned_expenses pe
       JOIN funds f ON pe.fund_id = f.id
       WHERE pe.user_id = $1 AND pe.status = 'planned'
       ORDER BY pe.planned_date ASC`,
      [user.userId]
    );

    dashboard.myPlannedExpenses = userPlanned.rows;

    res.json(dashboard);
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
}

export async function getPaymentsList(req: Request, res: Response) {
  try {
    const user = req.user!;

    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      return res.status(403).json({ error: 'Treasurer access required' });
    }

    const result = await pool.query(
      `SELECT r.*, f.name as fund_name, f.budget_id,
              u.full_name as user_name, u.email, u.phone
       FROM reimbursements r
       JOIN funds f ON r.fund_id = f.id
       JOIN users u ON r.user_id = u.id
       WHERE r.status = 'approved'
       ORDER BY r.reviewed_at ASC`,
      []
    );

    const totalAmount = result.rows.reduce((sum, r) => sum + parseFloat(r.amount), 0);

    res.json({
      reimbursements: result.rows,
      totalAmount,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get payments list error:', error);
    res.status(500).json({ error: 'Failed to get payments list' });
  }
}

export async function getBudgetReport(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const budget = await pool.query(
      `SELECT b.*, g.name as group_name,
              (SELECT COALESCE(SUM(amount), 0) FROM incomes WHERE budget_id = b.id) as total_income
       FROM budgets b
       LEFT JOIN groups g ON b.group_id = g.id
       WHERE b.id = $1`,
      [id]
    );

    if (budget.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    const funds = await pool.query(
      `SELECT f.*,
              (SELECT COALESCE(SUM(amount), 0) FROM reimbursements
               WHERE fund_id = f.id AND status IN ('pending', 'under_review', 'approved', 'paid')) as spent_amount,
              (SELECT COALESCE(SUM(amount), 0) FROM planned_expenses
               WHERE fund_id = f.id AND status = 'planned') as planned_amount
       FROM funds f
       WHERE f.budget_id = $1`,
      [id]
    );

    const transfers = await pool.query(
      `SELECT bt.*,
              from_b.name as from_budget_name,
              to_b.name as to_budget_name,
              u.full_name as transferred_by_name
       FROM budget_transfers bt
       JOIN budgets from_b ON bt.from_budget_id = from_b.id
       JOIN budgets to_b ON bt.to_budget_id = to_b.id
       JOIN users u ON bt.transferred_by = u.id
       WHERE bt.from_budget_id = $1 OR bt.to_budget_id = $1
       ORDER BY bt.created_at DESC`,
      [id]
    );

    const totalAllocated = funds.rows.reduce((sum, f) => sum + parseFloat(f.allocated_amount), 0);
    const totalSpent = funds.rows.reduce((sum, f) => sum + parseFloat(f.spent_amount), 0);
    const totalPlanned = funds.rows.reduce((sum, f) => sum + parseFloat(f.planned_amount), 0);

    res.json({
      budget: budget.rows[0],
      funds: funds.rows.map(fund => ({
        ...fund,
        available_amount: fund.allocated_amount - fund.spent_amount - fund.planned_amount
      })),
      transfers: transfers.rows,
      summary: {
        totalAllocated,
        totalSpent,
        totalPlanned,
        totalAvailable: budget.rows[0].total_amount + budget.rows[0].total_income - totalAllocated
      }
    });
  } catch (error) {
    console.error('Get budget report error:', error);
    res.status(500).json({ error: 'Failed to get budget report' });
  }
}

// Monthly closing report endpoint
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 7.3, 7.4, 7.5
export async function getMonthlyClosingReport(req: Request, res: Response) {
  try {
    const { year, month } = req.params;
    const user = req.user!;

    // Validate parameters
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: 'Invalid year or month parameter' });
    }

    const reportService = new ReportService();
    
    // Create access control from user
    const accessControl = await reportService.createAccessControl({
      id: user.userId,
      is_circle_treasurer: user.isCircleTreasurer,
      is_group_treasurer: user.isGroupTreasurer
    });

    // Calculate monthly closing data with validation
    const reportData = await reportService.calculateMonthlyClosingWithValidation(yearNum, monthNum, accessControl);

    res.json(reportData);
  } catch (error) {
    console.error('Get monthly closing report error:', error);
    
    if (error instanceof DataValidationError) {
      return res.status(error.statusCode).json({ 
        error: error.message,
        code: error.code,
        details: error.details
      });
    }
    
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to generate monthly closing report' });
  }
}

// Annual budget execution report endpoint
// Requirements: 2.1, 2.2, 2.3, 2.4, 7.1, 7.3, 7.4, 7.5
export async function getAnnualBudgetExecutionReport(req: Request, res: Response) {
  try {
    const { year } = req.params;
    const user = req.user!;

    // Validate parameters
    const yearNum = parseInt(year);
    
    if (isNaN(yearNum)) {
      return res.status(400).json({ error: 'Invalid year parameter' });
    }

    const reportService = new ReportService();
    
    // Create access control from user
    const accessControl = await reportService.createAccessControl({
      id: user.userId,
      is_circle_treasurer: user.isCircleTreasurer,
      is_group_treasurer: user.isGroupTreasurer
    });

    // Calculate annual budget execution data with validation
    const reportData = await reportService.calculateAnnualBudgetExecutionWithValidation(yearNum, accessControl);

    res.json(reportData);
  } catch (error) {
    console.error('Get annual budget execution report error:', error);
    
    if (error instanceof DataValidationError) {
      return res.status(error.statusCode).json({ 
        error: error.message,
        code: error.code,
        details: error.details
      });
    }
    
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to generate annual budget execution report' });
  }
}

// Expense execution report endpoint
// Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.3, 7.4, 7.5
export async function getExpenseExecutionReport(req: Request, res: Response) {
  try {
    const { year, month } = req.params;
    const user = req.user!;

    // Validate parameters
    const yearNum = parseInt(year);
    const monthNum = month ? parseInt(month) : undefined;
    
    if (isNaN(yearNum) || (month && (isNaN(monthNum!) || monthNum! < 1 || monthNum! > 12))) {
      return res.status(400).json({ error: 'Invalid year or month parameter' });
    }

    const reportService = new ReportService();
    
    // Create access control from user
    const accessControl = await reportService.createAccessControl({
      id: user.userId,
      is_circle_treasurer: user.isCircleTreasurer,
      is_group_treasurer: user.isGroupTreasurer
    });

    // Calculate expense execution data with validation
    const reportData = await reportService.calculateExpenseExecutionWithValidation(yearNum, monthNum, accessControl);

    res.json(reportData);
  } catch (error) {
    console.error('Get expense execution report error:', error);
    
    if (error instanceof DataValidationError) {
      return res.status(error.statusCode).json({ 
        error: error.message,
        code: error.code,
        details: error.details
      });
    }
    
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to generate expense execution report' });
  }
}

// Income execution report endpoint
// Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.1, 7.3, 7.4, 7.5
export async function getIncomeExecutionReport(req: Request, res: Response) {
  try {
    const { year, month } = req.params;
    const user = req.user!;

    // Validate parameters
    const yearNum = parseInt(year);
    const monthNum = month ? parseInt(month) : undefined;
    
    if (isNaN(yearNum) || (month && (isNaN(monthNum!) || monthNum! < 1 || monthNum! > 12))) {
      return res.status(400).json({ error: 'Invalid year or month parameter' });
    }

    const reportService = new ReportService();
    
    // Create access control from user
    const accessControl = await reportService.createAccessControl({
      id: user.userId,
      is_circle_treasurer: user.isCircleTreasurer,
      is_group_treasurer: user.isGroupTreasurer
    });

    // Calculate income execution data with validation
    const reportData = await reportService.calculateIncomeExecutionWithValidation(yearNum, monthNum, accessControl);

    res.json(reportData);
  } catch (error) {
    console.error('Get income execution report error:', error);
    
    if (error instanceof DataValidationError) {
      return res.status(error.statusCode).json({ 
        error: error.message,
        code: error.code,
        details: error.details
      });
    }
    
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to generate income execution report' });
  }
}

// Export monthly closing report as CSV
// Requirements: 6.3
export async function exportMonthlyClosingReport(req: Request, res: Response) {
  try {
    const { year, month } = req.params;
    const user = req.user!;

    // Validate parameters
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: 'Invalid year or month parameter' });
    }

    const reportService = new ReportService();
    
    // Create access control from user
    const accessControl = await reportService.createAccessControl({
      id: user.userId,
      is_circle_treasurer: user.isCircleTreasurer,
      is_group_treasurer: user.isGroupTreasurer
    });

    // Calculate monthly closing data
    const reportData = await reportService.calculateMonthlyClosing(yearNum, monthNum, accessControl);

    // Format data for CSV export
    const csvData = formatMonthlyClosingForExport(reportData);

    // Set CSV headers
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="monthly-closing-${year}-${month.toString().padStart(2, '0')}.csv"`);
    
    // Add BOM for Hebrew support in Excel
    res.write('\uFEFF');
    res.write(csvData);
    res.end();
  } catch (error) {
    console.error('Export monthly closing report error:', error);
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to export monthly closing report' });
  }
}

// Export annual budget execution report as CSV
// Requirements: 6.3
export async function exportAnnualBudgetExecutionReport(req: Request, res: Response) {
  try {
    const { year } = req.params;
    const user = req.user!;

    // Validate parameters
    const yearNum = parseInt(year);
    
    if (isNaN(yearNum)) {
      return res.status(400).json({ error: 'Invalid year parameter' });
    }

    const reportService = new ReportService();
    
    // Create access control from user
    const accessControl = await reportService.createAccessControl({
      id: user.userId,
      is_circle_treasurer: user.isCircleTreasurer,
      is_group_treasurer: user.isGroupTreasurer
    });

    // Calculate annual budget execution data
    const reportData = await reportService.calculateAnnualBudgetExecution(yearNum, accessControl);

    // Format data for CSV export
    const csvData = formatAnnualBudgetExecutionForExport(reportData);

    // Set CSV headers
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="annual-budget-execution-${year}.csv"`);
    
    // Add BOM for Hebrew support in Excel
    res.write('\uFEFF');
    res.write(csvData);
    res.end();
  } catch (error) {
    console.error('Export annual budget execution report error:', error);
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to export annual budget execution report' });
  }
}

// Export expense execution report as CSV
// Requirements: 6.3
export async function exportExpenseExecutionReport(req: Request, res: Response) {
  try {
    const { year, month } = req.params;
    const user = req.user!;

    // Validate parameters
    const yearNum = parseInt(year);
    const monthNum = month ? parseInt(month) : undefined;
    
    if (isNaN(yearNum) || (month && (isNaN(monthNum!) || monthNum! < 1 || monthNum! > 12))) {
      return res.status(400).json({ error: 'Invalid year or month parameter' });
    }

    const reportService = new ReportService();
    
    // Create access control from user
    const accessControl = await reportService.createAccessControl({
      id: user.userId,
      is_circle_treasurer: user.isCircleTreasurer,
      is_group_treasurer: user.isGroupTreasurer
    });

    // Calculate expense execution data
    const reportData = await reportService.calculateExpenseExecution(yearNum, monthNum, accessControl);

    // Format data for CSV export
    const csvData = formatExpenseExecutionForExport(reportData);

    // Set CSV headers
    const filename = month 
      ? `expense-execution-${year}-${month.toString().padStart(2, '0')}.csv`
      : `expense-execution-${year}.csv`;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Add BOM for Hebrew support in Excel
    res.write('\uFEFF');
    res.write(csvData);
    res.end();
  } catch (error) {
    console.error('Export expense execution report error:', error);
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to export expense execution report' });
  }
}

// Export income execution report as CSV
// Requirements: 6.3
export async function exportIncomeExecutionReport(req: Request, res: Response) {
  try {
    const { year, month } = req.params;
    const user = req.user!;

    // Validate parameters
    const yearNum = parseInt(year);
    const monthNum = month ? parseInt(month) : undefined;
    
    if (isNaN(yearNum) || (month && (isNaN(monthNum!) || monthNum! < 1 || monthNum! > 12))) {
      return res.status(400).json({ error: 'Invalid year or month parameter' });
    }

    const reportService = new ReportService();
    
    // Create access control from user
    const accessControl = await reportService.createAccessControl({
      id: user.userId,
      is_circle_treasurer: user.isCircleTreasurer,
      is_group_treasurer: user.isGroupTreasurer
    });

    // Calculate income execution data
    const reportData = await reportService.calculateIncomeExecution(yearNum, monthNum, accessControl);

    // Format data for CSV export
    const csvData = formatIncomeExecutionForExport(reportData);

    // Set CSV headers
    const filename = month 
      ? `income-execution-${year}-${month.toString().padStart(2, '0')}.csv`
      : `income-execution-${year}.csv`;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Add BOM for Hebrew support in Excel
    res.write('\uFEFF');
    res.write(csvData);
    res.end();
  } catch (error) {
    console.error('Export income execution report error:', error);
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to export income execution report' });
  }
}

// Helper functions for CSV formatting
// Requirements: 6.3

function formatMonthlyClosingForExport(data: any): string {
  const lines: string[] = [];
  
  // Header
  lines.push('Monthly Closing Report');
  lines.push(`Year: ${data.year}, Month: ${data.month}`);
  lines.push('');
  
  // Income section
  lines.push('INCOME BY CATEGORY');
  lines.push('Category,Amount,Count');
  data.income.byCategory.forEach((cat: any) => {
    lines.push(`"${cat.categoryName}",${cat.amount},${cat.count}`);
  });
  lines.push(`Total Income,${data.income.total},`);
  lines.push('');
  
  // Expenses section
  lines.push('EXPENSES BY BUDGET');
  lines.push('Budget,Type,Group,Amount,Count');
  data.expenses.byBudget.forEach((budget: any) => {
    lines.push(`"${budget.budgetName}","${budget.budgetType}","${budget.groupName || ''}",${budget.amount},${budget.count}`);
  });
  lines.push(`Total Expenses,,,${data.expenses.total},`);
  lines.push('');
  
  // Summary
  lines.push('SUMMARY');
  lines.push(`Total Income,${data.income.total}`);
  lines.push(`Total Expenses,${data.expenses.total}`);
  lines.push(`Balance,${data.balance}`);
  
  return lines.join('\n');
}

function formatAnnualBudgetExecutionForExport(data: any): string {
  const lines: string[] = [];
  
  // Header
  lines.push('Annual Budget Execution Report');
  lines.push(`Year: ${data.year}`);
  lines.push('');
  
  // Monthly income
  lines.push('MONTHLY INCOME');
  lines.push('Month,Amount,Count');
  data.monthlyIncome.forEach((income: any) => {
    lines.push(`${income.month},${income.amount},${income.count}`);
  });
  lines.push('');
  
  // Monthly expenses
  lines.push('MONTHLY EXPENSES');
  lines.push('Month,Amount,Count');
  data.monthlyExpenses.forEach((expense: any) => {
    lines.push(`${expense.month},${expense.amount},${expense.count}`);
  });
  lines.push('');
  
  // Monthly balance
  lines.push('MONTHLY BALANCE');
  lines.push('Month,Income,Expenses,Balance');
  data.monthlyBalance.forEach((balance: any) => {
    lines.push(`${balance.month},${balance.income},${balance.expenses},${balance.balance}`);
  });
  lines.push('');
  
  // Yearly totals
  lines.push('YEARLY TOTALS');
  lines.push(`Total Income,${data.yearlyTotals.income}`);
  lines.push(`Total Expenses,${data.yearlyTotals.expenses}`);
  lines.push(`Total Balance,${data.yearlyTotals.balance}`);
  
  return lines.join('\n');
}

function formatExpenseExecutionForExport(data: any): string {
  const lines: string[] = [];
  
  // Header
  lines.push('Expense Execution Report');
  lines.push(`Year: ${data.year}${data.month ? `, Month: ${data.month}` : ''}`);
  lines.push('');
  
  // Monthly execution (if available)
  if (Object.keys(data.monthlyExecution).length > 0) {
    lines.push('MONTHLY EXECUTION');
    lines.push('Month,Budget,Type,Group,Allocated,Spent,Remaining,Utilization %');
    
    Object.entries(data.monthlyExecution).forEach(([month, budgets]: [string, any]) => {
      budgets.forEach((budget: any) => {
        lines.push(`${month},"${budget.budgetName}","${budget.budgetType}","${budget.groupName || ''}",${budget.allocatedAmount},${budget.spentAmount},${budget.remainingAmount},${budget.utilizationPercentage.toFixed(2)}`);
      });
    });
    lines.push('');
  }
  
  // Annual totals
  lines.push('ANNUAL TOTALS');
  lines.push('Budget,Type,Group,Allocated,Spent,Remaining,Utilization %');
  data.annualTotals.byBudget.forEach((budget: any) => {
    lines.push(`"${budget.budgetName}","${budget.budgetType}","${budget.groupName || ''}",${budget.allocatedAmount},${budget.spentAmount},${budget.remainingAmount},${budget.utilizationPercentage.toFixed(2)}`);
  });
  lines.push(`Total,,,${data.annualTotals.byBudget.reduce((sum: number, b: any) => sum + b.allocatedAmount, 0)},${data.annualTotals.total},${data.annualTotals.byBudget.reduce((sum: number, b: any) => sum + b.remainingAmount, 0)},`);
  
  return lines.join('\n');
}

function formatIncomeExecutionForExport(data: any): string {
  const lines: string[] = [];
  
  // Header
  lines.push('Income Execution Report');
  lines.push(`Year: ${data.year}${data.month ? `, Month: ${data.month}` : ''}`);
  lines.push('');
  
  // Monthly execution (if available)
  if (Object.keys(data.monthlyExecution).length > 0) {
    lines.push('MONTHLY EXECUTION');
    lines.push('Month,Category,Expected,Actual,Difference,Fulfillment %');
    
    Object.entries(data.monthlyExecution).forEach(([month, categories]: [string, any]) => {
      categories.forEach((category: any) => {
        lines.push(`${month},"${category.categoryName}",${category.expectedAmount},${category.actualAmount},${category.difference},${category.fulfillmentPercentage.toFixed(2)}`);
      });
    });
    lines.push('');
  }
  
  // Annual totals
  lines.push('ANNUAL TOTALS');
  lines.push('Category,Expected,Actual,Difference,Fulfillment %');
  data.annualTotals.byCategory.forEach((category: any) => {
    lines.push(`"${category.categoryName}",${category.expectedAmount},${category.actualAmount},${category.difference},${category.fulfillmentPercentage.toFixed(2)}`);
  });
  lines.push(`Total,${data.annualTotals.byCategory.reduce((sum: number, c: any) => sum + c.expectedAmount, 0)},${data.annualTotals.total},${data.annualTotals.byCategory.reduce((sum: number, c: any) => sum + c.difference, 0)},`);
  
  return lines.join('\n');
}

// Multi-report validation endpoint
// Requirements: 7.3, 7.4, 7.5
export async function validateReportsConsistency(req: Request, res: Response) {
  try {
    const { reports } = req.body;
    const user = req.user!;

    if (!Array.isArray(reports) || reports.length === 0) {
      return res.status(400).json({ error: 'Reports array is required' });
    }

    const reportService = new ReportService();
    
    // Create access control from user
    const accessControl = await reportService.createAccessControl({
      id: user.userId,
      is_circle_treasurer: user.isCircleTreasurer,
      is_group_treasurer: user.isGroupTreasurer
    });

    // Validate access
    if (!reportService.validateReportAccess(accessControl)) {
      return res.status(403).json({ error: 'Access denied: Treasurer role required' });
    }

    // Validate consistency across multiple reports
    const validation = await reportService.validateMultipleReports(reports);

    res.json({
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings,
      summary: {
        totalReports: reports.length,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length
      }
    });
  } catch (error) {
    console.error('Validate reports consistency error:', error);
    
    if (error instanceof DataValidationError) {
      return res.status(error.statusCode).json({ 
        error: error.message,
        code: error.code,
        details: error.details
      });
    }
    
    res.status(500).json({ error: 'Failed to validate reports consistency' });
  }
}

// Data source validation endpoint
// Requirements: 7.1
export async function validateDataSources(req: Request, res: Response) {
  try {
    const { year, month } = req.params;
    const user = req.user!;

    // Validate parameters
    const yearNum = parseInt(year);
    const monthNum = month ? parseInt(month) : undefined;
    
    if (isNaN(yearNum) || (month && (isNaN(monthNum!) || monthNum! < 1 || monthNum! > 12))) {
      return res.status(400).json({ error: 'Invalid year or month parameter' });
    }

    const reportService = new ReportService();
    
    // Create access control from user
    const accessControl = await reportService.createAccessControl({
      id: user.userId,
      is_circle_treasurer: user.isCircleTreasurer,
      is_group_treasurer: user.isGroupTreasurer
    });

    // Validate access
    if (!reportService.validateReportAccess(accessControl)) {
      return res.status(403).json({ error: 'Access denied: Treasurer role required' });
    }

    // Validate source data availability
    const validationService = reportService.getValidationService();
    const validation = await validationService.validateSourceDataAvailability(yearNum, monthNum);

    res.json({
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings,
      period: monthNum ? `${yearNum}-${monthNum}` : `${yearNum}`,
      summary: {
        hasData: validation.isValid || validation.warnings.length === 0,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length
      }
    });
  } catch (error) {
    console.error('Validate data sources error:', error);
    
    if (error instanceof DataValidationError) {
      return res.status(error.statusCode).json({ 
        error: error.message,
        code: error.code,
        details: error.details
      });
    }
    
    res.status(500).json({ error: 'Failed to validate data sources' });
  }
}

// Get fund details for a budget in monthly closing report
// Used for collapsible budget rows
export async function getBudgetFundDetails(req: Request, res: Response) {
  try {
    const { budgetId, year, month } = req.params;
    const user = req.user!;

    // Validate parameters
    const budgetIdNum = parseInt(budgetId);
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    if (isNaN(budgetIdNum) || isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: 'Invalid budget ID, year, or month parameter' });
    }

    const reportService = new ReportService();
    
    // Create access control from user
    const accessControl = await reportService.createAccessControl({
      id: user.userId,
      is_circle_treasurer: user.isCircleTreasurer,
      is_group_treasurer: user.isGroupTreasurer
    });

    // Get fund details for the budget
    const fundDetails = await reportService.getBudgetFundDetails(budgetIdNum, yearNum, monthNum, accessControl);

    res.json({ funds: fundDetails });
  } catch (error) {
    console.error('Get budget fund details error:', error);
    
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to get budget fund details' });
  }
}

// Get income details for a category in reports
// Used for collapsible category rows
export async function getCategoryIncomeDetails(req: Request, res: Response) {
  try {
    const { categoryId, year, month } = req.params;
    const user = req.user!;

    // Validate parameters
    const categoryIdNum = parseInt(categoryId);
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    if (isNaN(categoryIdNum) || isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: 'Invalid category ID, year, or month parameter' });
    }

    const reportService = new ReportService();
    
    // Create access control from user
    const accessControl = await reportService.createAccessControl({
      id: user.userId,
      is_circle_treasurer: user.isCircleTreasurer,
      is_group_treasurer: user.isGroupTreasurer
    });

    // Get income details for the category
    const incomeDetails = await reportService.getCategoryIncomeDetails(categoryIdNum, yearNum, monthNum, accessControl);

    res.json({ incomes: incomeDetails });
  } catch (error) {
    console.error('Get category income details error:', error);

    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to get category income details' });
  }
}

// Detailed Annual Execution Report
export async function getDetailedAnnualExecutionReport(req: Request, res: Response) {
  try {
    const { year } = req.params;
    const user = req.user!;

    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return res.status(400).json({ error: 'Invalid year parameter' });
    }

    const reportService = new ReportService();

    // Create access control from user
    const accessControl = await reportService.createAccessControl({
      id: user.userId,
      is_circle_treasurer: user.isCircleTreasurer,
      is_group_treasurer: user.isGroupTreasurer
    });

    const reportData = await reportService.calculateDetailedAnnualExecution(
      yearNum,
      accessControl
    );

    res.json(reportData);
  } catch (error) {
    console.error('Get detailed annual execution report error:', error);

    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to generate detailed annual execution report' });
  }
}

// Export Detailed Annual Execution Report to CSV
export async function exportDetailedAnnualExecutionReport(req: Request, res: Response) {
  try {
    const { year } = req.params;
    const user = req.user!;

    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return res.status(400).json({ error: 'Invalid year parameter' });
    }

    const reportService = new ReportService();

    // Create access control from user
    const accessControl = await reportService.createAccessControl({
      id: user.userId,
      is_circle_treasurer: user.isCircleTreasurer,
      is_group_treasurer: user.isGroupTreasurer
    });

    const reportData = await reportService.calculateDetailedAnnualExecution(
      yearNum,
      accessControl
    );

    // Format for CSV
    const csvData = formatDetailedAnnualExecutionForExport(reportData);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="detailed-annual-execution-${year}.csv"`);
    res.write('\uFEFF'); // BOM for Hebrew support
    res.write(csvData);
    res.end();
  } catch (error) {
    console.error('Export detailed annual execution report error:', error);

    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to export report' });
  }
}

// Helper function to format detailed annual execution report for CSV export
function formatDetailedAnnualExecutionForExport(data: any): string {
  const lines: string[] = [];
  const MONTHS_HE = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                     'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  // Section 1: Income Table
  lines.push('דוח ביצוע שנתי מפורט');
  lines.push(`שנה: ${data.year}`);
  lines.push('');
  lines.push('הכנסות לפי קטגוריה');

  const incomeHeader = ['קטגוריה', ...MONTHS_HE, 'סה"כ שנתי', 'כמה חסר', 'צפי שנתי'].join(',');
  lines.push(incomeHeader);

  data.incomeExecution.byCategory.forEach((cat: any) => {
    const row = [
      `"${cat.categoryName}"`,
      ...cat.monthlyActual.map((a: number) => a.toFixed(2)),
      cat.annualActual.toFixed(2),
      cat.missingAmount.toFixed(2),
      cat.annualExpected.toFixed(2)
    ].join(',');
    lines.push(row);
  });

  // Total row
  const totalRow = [
    'סה"כ',
    ...data.incomeExecution.totals.monthly.map((m: number) => m.toFixed(2)),
    data.incomeExecution.totals.annual.toFixed(2),
    '', ''
  ].join(',');
  lines.push(totalRow);
  lines.push('');
  lines.push('================================================================================');
  lines.push('');

  // Section 2: Expenses/Budget Table
  lines.push('הוצאות לפי תקציבים וסעיפים');
  const expenseHeader = ['תקציב', 'סעיף', ...MONTHS_HE, 'סה"כ שנתי', 'כמה נשאר', 'הקצאה שנתית'].join(',');
  lines.push(expenseHeader);

  data.expenseExecution.byBudget.forEach((budget: any) => {
    budget.funds.forEach((fund: any, index: number) => {
      const row = [
        index === 0 ? `"${budget.budgetName}"` : '',
        `"${fund.fundName}"`,
        ...fund.monthlySpent.map((s: number) => s.toFixed(2)),
        fund.annualSpent.toFixed(2),
        fund.remainingAmount.toFixed(2),
        fund.allocatedAmount.toFixed(2)
      ].join(',');
      lines.push(row);
    });
  });

  // Total row
  const expenseTotalRow = [
    'סה"כ', '',
    ...data.expenseExecution.totals.monthly.map((m: number) => m.toFixed(2)),
    data.expenseExecution.totals.annual.toFixed(2),
    '', ''
  ].join(',');
  lines.push(expenseTotalRow);
  lines.push('');
  lines.push('================================================================================');
  lines.push('');

  // Section 3: Monthly Balance
  lines.push('יתרה חודשית (הכנסות - הוצאות)');
  const balanceRow = [
    '',
    ...data.monthlyBalance.map((b: number) => b.toFixed(2))
  ].join(',');
  lines.push(balanceRow);

  return lines.join('\n');
}

// Export Detailed Annual Execution Report to Excel with formatting
export async function exportDetailedAnnualExecutionReportExcel(req: Request, res: Response) {
  try {
    const { year } = req.params;
    const user = req.user!;

    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return res.status(400).json({ error: 'Invalid year parameter' });
    }

    const reportService = new ReportService();

    // Create access control from user
    const accessControl = await reportService.createAccessControl({
      id: user.userId,
      is_circle_treasurer: user.isCircleTreasurer,
      is_group_treasurer: user.isGroupTreasurer
    });

    const reportData = await reportService.calculateDetailedAnnualExecution(
      yearNum,
      accessControl
    );

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('דוח ביצוע שנתי מפורט');

    const MONTHS_HE = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                       'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

    let currentRow = 1;

    // Title
    const titleRow = worksheet.getRow(currentRow);
    titleRow.getCell(1).value = `דוח ביצוע שנתי מפורט - ${yearNum}`;
    titleRow.getCell(1).font = { bold: true, size: 16 };
    titleRow.getCell(1).alignment = { horizontal: 'right' };
    currentRow += 1;

    // Date generated
    const dateRow = worksheet.getRow(currentRow);
    const now = new Date();
    const dateStr = now.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    dateRow.getCell(1).value = `תאריך יצירה: ${dateStr}`;
    dateRow.getCell(1).font = { italic: true, size: 11, color: { argb: 'FF718096' } };
    dateRow.getCell(1).alignment = { horizontal: 'right' };
    currentRow += 2;

    // Section 1: Income Table
    const incomeHeaderRow = worksheet.getRow(currentRow);
    incomeHeaderRow.getCell(1).value = 'הכנסות לפי קטגוריה';
    incomeHeaderRow.getCell(1).font = { bold: true, size: 14 };
    incomeHeaderRow.getCell(1).alignment = { horizontal: 'right' };
    currentRow += 1;

    // Income table headers
    const incomeHeaders = ['קטגוריה', ...MONTHS_HE, 'סה"כ שנתי', 'כמה חסר', 'צפי שנתי'];
    const incomeHeaderRowData = worksheet.getRow(currentRow);
    incomeHeaders.forEach((header, index) => {
      const cell = incomeHeaderRowData.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEDF2F7' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    currentRow += 1;

    // Income data rows
    reportData.incomeExecution.byCategory.forEach((cat: any) => {
      const dataRow = worksheet.getRow(currentRow);
      dataRow.getCell(1).value = cat.categoryName;
      dataRow.getCell(1).alignment = { horizontal: 'right' };
      dataRow.getCell(1).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      cat.monthlyActual.forEach((amount: number, index: number) => {
        const cell = dataRow.getCell(index + 2);
        cell.value = amount;
        cell.numFmt = '#,##0';
        cell.alignment = { horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Annual actual
      const annualCell = dataRow.getCell(14);
      annualCell.value = cat.annualActual;
      annualCell.numFmt = '#,##0';
      annualCell.font = { bold: true };
      annualCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF7FAFC' }
      };
      annualCell.alignment = { horizontal: 'center' };
      annualCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Missing amount
      const missingCell = dataRow.getCell(15);
      missingCell.value = cat.missingAmount;
      missingCell.numFmt = '#,##0';
      missingCell.font = { bold: true, color: { argb: cat.missingAmount > 0 ? 'FFD32F2F' : 'FF388E3C' } };
      missingCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF7FAFC' }
      };
      missingCell.alignment = { horizontal: 'center' };
      missingCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Annual expected
      const expectedCell = dataRow.getCell(16);
      expectedCell.value = cat.annualExpected;
      expectedCell.numFmt = '#,##0';
      expectedCell.font = { bold: true };
      expectedCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF7FAFC' }
      };
      expectedCell.alignment = { horizontal: 'center' };
      expectedCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      currentRow += 1;
    });

    // Income total row
    const incomeTotalRow = worksheet.getRow(currentRow);
    incomeTotalRow.getCell(1).value = 'סה"כ הכנסות';
    incomeTotalRow.getCell(1).font = { bold: true };
    incomeTotalRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6FFFA' }
    };
    incomeTotalRow.getCell(1).alignment = { horizontal: 'right' };
    incomeTotalRow.getCell(1).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    reportData.incomeExecution.totals.monthly.forEach((amount: number, index: number) => {
      const cell = incomeTotalRow.getCell(index + 2);
      cell.value = amount;
      cell.numFmt = '#,##0';
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6FFFA' }
      };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Total annual
    const totalAnnualCell = incomeTotalRow.getCell(14);
    totalAnnualCell.value = reportData.incomeExecution.totals.annual;
    totalAnnualCell.numFmt = '#,##0';
    totalAnnualCell.font = { bold: true };
    totalAnnualCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6FFFA' }
    };
    totalAnnualCell.alignment = { horizontal: 'center' };
    totalAnnualCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Total missing
    const totalMissing = reportData.incomeExecution.byCategory.reduce((sum: number, cat: any) => sum + cat.missingAmount, 0);
    const totalMissingCell = incomeTotalRow.getCell(15);
    totalMissingCell.value = totalMissing;
    totalMissingCell.numFmt = '#,##0';
    totalMissingCell.font = { bold: true, color: { argb: totalMissing > 0 ? 'FFD32F2F' : 'FF388E3C' } };
    totalMissingCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6FFFA' }
    };
    totalMissingCell.alignment = { horizontal: 'center' };
    totalMissingCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Total expected
    const totalExpected = reportData.incomeExecution.byCategory.reduce((sum: number, cat: any) => sum + cat.annualExpected, 0);
    const totalExpectedCell = incomeTotalRow.getCell(16);
    totalExpectedCell.value = totalExpected;
    totalExpectedCell.numFmt = '#,##0';
    totalExpectedCell.font = { bold: true };
    totalExpectedCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6FFFA' }
    };
    totalExpectedCell.alignment = { horizontal: 'center' };
    totalExpectedCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    currentRow += 3;

    // Section 2: Expense Table
    const expenseHeaderRow = worksheet.getRow(currentRow);
    expenseHeaderRow.getCell(1).value = 'הוצאות לפי תקציבים וסעיפים';
    expenseHeaderRow.getCell(1).font = { bold: true, size: 14 };
    expenseHeaderRow.getCell(1).alignment = { horizontal: 'right' };
    currentRow += 1;

    // Expense table headers
    const expenseHeaders = ['תקציב', 'סעיף', ...MONTHS_HE, 'סה"כ שנתי', 'כמה נשאר', 'הקצאה שנתית'];
    const expenseHeaderRowData = worksheet.getRow(currentRow);
    expenseHeaders.forEach((header, index) => {
      const cell = expenseHeaderRowData.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEDF2F7' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    currentRow += 1;

    // Expense data rows
    reportData.expenseExecution.byBudget.forEach((budget: any) => {
      budget.funds.forEach((fund: any, fundIndex: number) => {
        const dataRow = worksheet.getRow(currentRow);

        // Budget name (only for first fund)
        if (fundIndex === 0) {
          const budgetCell = dataRow.getCell(1);
          budgetCell.value = budget.budgetName;
          budgetCell.font = { bold: true };
          budgetCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF7FAFC' }
          };
          budgetCell.alignment = { horizontal: 'right', vertical: 'top' };
          budgetCell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        } else {
          const budgetCell = dataRow.getCell(1);
          budgetCell.value = '';
          budgetCell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        }

        // Fund name
        dataRow.getCell(2).value = fund.fundName;
        dataRow.getCell(2).alignment = { horizontal: 'right' };
        dataRow.getCell(2).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        // Monthly spent
        fund.monthlySpent.forEach((amount: number, index: number) => {
          const cell = dataRow.getCell(index + 3);
          cell.value = amount;
          cell.numFmt = '#,##0';
          cell.alignment = { horizontal: 'center' };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });

        // Annual spent
        const annualSpentCell = dataRow.getCell(15);
        annualSpentCell.value = fund.annualSpent;
        annualSpentCell.numFmt = '#,##0';
        annualSpentCell.font = { bold: true };
        annualSpentCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF7FAFC' }
        };
        annualSpentCell.alignment = { horizontal: 'center' };
        annualSpentCell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        // Remaining amount
        const remainingCell = dataRow.getCell(16);
        remainingCell.value = fund.remainingAmount;
        remainingCell.numFmt = '#,##0';
        remainingCell.font = { bold: true, color: { argb: fund.remainingAmount < 0 ? 'FFD32F2F' : 'FF388E3C' } };
        remainingCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF7FAFC' }
        };
        remainingCell.alignment = { horizontal: 'center' };
        remainingCell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        // Allocated amount
        const allocatedCell = dataRow.getCell(17);
        allocatedCell.value = fund.allocatedAmount;
        allocatedCell.numFmt = '#,##0';
        allocatedCell.font = { bold: true };
        allocatedCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF7FAFC' }
        };
        allocatedCell.alignment = { horizontal: 'center' };
        allocatedCell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        currentRow += 1;
      });
    });

    // Expense total row
    const expenseTotalRow = worksheet.getRow(currentRow);
    expenseTotalRow.getCell(1).value = 'סה"כ הוצאות';
    expenseTotalRow.getCell(1).font = { bold: true };
    expenseTotalRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6FFFA' }
    };
    expenseTotalRow.getCell(1).alignment = { horizontal: 'right' };
    expenseTotalRow.getCell(1).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    expenseTotalRow.getCell(2).value = '';
    expenseTotalRow.getCell(2).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6FFFA' }
    };
    expenseTotalRow.getCell(2).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    reportData.expenseExecution.totals.monthly.forEach((amount: number, index: number) => {
      const cell = expenseTotalRow.getCell(index + 3);
      cell.value = amount;
      cell.numFmt = '#,##0';
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6FFFA' }
      };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Total annual expenses
    const totalExpensesCell = expenseTotalRow.getCell(15);
    totalExpensesCell.value = reportData.expenseExecution.totals.annual;
    totalExpensesCell.numFmt = '#,##0';
    totalExpensesCell.font = { bold: true };
    totalExpensesCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6FFFA' }
    };
    totalExpensesCell.alignment = { horizontal: 'center' };
    totalExpensesCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Total remaining
    const totalRemaining = reportData.expenseExecution.byBudget.reduce((sum: number, budget: any) =>
      sum + budget.funds.reduce((fSum: number, fund: any) => fSum + fund.remainingAmount, 0), 0);
    const totalRemainingCell = expenseTotalRow.getCell(16);
    totalRemainingCell.value = totalRemaining;
    totalRemainingCell.numFmt = '#,##0';
    totalRemainingCell.font = { bold: true, color: { argb: totalRemaining < 0 ? 'FFD32F2F' : 'FF388E3C' } };
    totalRemainingCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6FFFA' }
    };
    totalRemainingCell.alignment = { horizontal: 'center' };
    totalRemainingCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Total allocated
    const totalAllocated = reportData.expenseExecution.byBudget.reduce((sum: number, budget: any) =>
      sum + budget.funds.reduce((fSum: number, fund: any) => fSum + fund.allocatedAmount, 0), 0);
    const totalAllocatedCell = expenseTotalRow.getCell(17);
    totalAllocatedCell.value = totalAllocated;
    totalAllocatedCell.numFmt = '#,##0';
    totalAllocatedCell.font = { bold: true };
    totalAllocatedCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6FFFA' }
    };
    totalAllocatedCell.alignment = { horizontal: 'center' };
    totalAllocatedCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    currentRow += 3;

    // Section 3: Monthly Balance
    const balanceHeaderRow = worksheet.getRow(currentRow);
    balanceHeaderRow.getCell(1).value = 'מאזן חודשי (הכנסות - הוצאות)';
    balanceHeaderRow.getCell(1).font = { bold: true, size: 14 };
    balanceHeaderRow.getCell(1).alignment = { horizontal: 'right' };
    currentRow += 1;

    // Balance table headers
    const balanceHeaderRowData = worksheet.getRow(currentRow);
    MONTHS_HE.forEach((month, index) => {
      const cell = balanceHeaderRowData.getCell(index + 1);
      cell.value = month;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEDF2F7' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    currentRow += 1;

    // Balance data
    const balanceDataRow = worksheet.getRow(currentRow);
    reportData.monthlyBalance.forEach((balance: number, index: number) => {
      const cell = balanceDataRow.getCell(index + 1);
      cell.value = balance;
      cell.numFmt = '#,##0';
      cell.font = { bold: true, color: { argb: balance >= 0 ? 'FF388E3C' : 'FFD32F2F' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: balance >= 0 ? 'FFE8F5E9' : 'FFFFEBEE' }
      };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Auto-fit columns
    worksheet.columns.forEach((column: any) => {
      let maxLength = 0;
      column.eachCell?.({ includeEmpty: true }, (cell: any) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 10 ? 10 : maxLength + 2;
    });

    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="detailed-annual-execution-${year}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    console.error('Export detailed annual execution report to Excel error:', error);

    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to export report to Excel' });
  }
}