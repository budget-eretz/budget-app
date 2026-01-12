import { Request, Response } from 'express';
import pool from '../config/database';
import { ReportService } from '../services/reportService';
import { DataValidationError, VALIDATION_ERRORS } from '../services/reportValidationService';

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