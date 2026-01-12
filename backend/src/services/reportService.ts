import pool from '../config/database';
import { 
  ReportValidationService, 
  DataValidationError, 
  VALIDATION_ERRORS,
  ValidationResult 
} from './reportValidationService';

// Report data interfaces
export interface MonthlyClosingData {
  year: number;
  month: number;
  income: {
    byCategory: CategorySummary[];
    total: number;
  };
  expenses: {
    byBudget: BudgetSummary[];
    total: number;
  };
  balance: number;
}

export interface AnnualBudgetExecutionData {
  year: number;
  monthlyIncome: MonthlyIncomeSummary[];
  monthlyExpenses: MonthlyExpenseSummary[];
  monthlyBalance: MonthlyBalanceSummary[];
  yearlyTotals: {
    income: number;
    expenses: number;
    balance: number;
  };
}

export interface ExpenseExecutionData {
  year: number;
  month?: number;
  monthlyExecution: {
    [month: number]: BudgetExecutionSummary[];
  };
  monthlyTotals: {
    [month: number]: number;
  };
  annualTotals: {
    byBudget: BudgetExecutionSummary[];
    total: number;
  };
}

export interface IncomeExecutionData {
  year: number;
  month?: number;
  monthlyExecution: {
    [month: number]: CategoryExecutionSummary[];
  };
  monthlyTotals: {
    [month: number]: number;
  };
  annualTotals: {
    byCategory: CategoryExecutionSummary[];
    total: number;
  };
}

// Supporting data models
export interface CategorySummary {
  categoryId: number;
  categoryName: string;
  categoryColor?: string;
  amount: number;
  count: number;
}

export interface BudgetSummary {
  budgetId: number;
  budgetName: string;
  budgetType: 'circle' | 'group';
  groupName?: string;
  amount: number;
  count: number;
}

export interface FundSummary {
  fundId: number;
  fundName: string;
  amount: number;
  count: number;
  allocatedAmount?: number;
  spentAmount?: number;
  remainingAmount?: number;
  utilizationPercentage?: number;
}

export interface BudgetExecutionSummary {
  budgetId: number;
  budgetName: string;
  budgetType: 'circle' | 'group';
  groupName?: string;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  utilizationPercentage: number;
}

export interface CategoryExecutionSummary {
  categoryId: number;
  categoryName: string;
  categoryColor?: string;
  expectedAmount: number;
  actualAmount: number;
  difference: number;
  fulfillmentPercentage: number;
}

export interface MonthlyIncomeSummary {
  month: number;
  amount: number;
  count: number;
}

export interface MonthlyExpenseSummary {
  month: number;
  amount: number;
  count: number;
}

export interface MonthlyBalanceSummary {
  month: number;
  income: number;
  expenses: number;
  balance: number;
}

// Access control interface
export interface AccessControl {
  isCircleTreasurer: boolean;
  isGroupTreasurer: boolean;
  groupIds: number[];
}

// User interface for access control creation
export interface User {
  id: number;
  is_circle_treasurer: boolean;
  is_group_treasurer: boolean;
}

export class ReportService {
  private validationService: ReportValidationService;

  constructor() {
    this.validationService = new ReportValidationService();
  }
  /**
   * Create AccessControl object from user data
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  async createAccessControl(user: User): Promise<AccessControl> {
    const groupIds: number[] = [];
    
    if (user.is_circle_treasurer) {
      // Circle treasurers have access to all groups
      const result = await pool.query('SELECT id FROM groups ORDER BY id');
      groupIds.push(...result.rows.map(row => row.id));
    } else if (user.is_group_treasurer) {
      // Group treasurers have access to their assigned groups
      const result = await pool.query(
        'SELECT group_id FROM user_groups WHERE user_id = $1',
        [user.id]
      );
      groupIds.push(...result.rows.map(row => row.group_id));
    }

    return {
      isCircleTreasurer: user.is_circle_treasurer,
      isGroupTreasurer: user.is_group_treasurer,
      groupIds
    };
  }
  /**
   * Filter report data based on user permissions
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  async filterReportData(data: any, accessControl: AccessControl): Promise<any> {
    // Circle treasurers have full access to all data
    if (accessControl.isCircleTreasurer) {
      return data;
    }

    // Group treasurers see only their group's data and circle-level data
    if (accessControl.isGroupTreasurer && accessControl.groupIds.length > 0) {
      // Filter based on budget type and group membership
      if (Array.isArray(data)) {
        const filteredData = [];
        for (const item of data) {
          // Allow circle-level budgets (group_id is null)
          if (item.budgetType === 'circle' || !item.groupName) {
            filteredData.push(item);
            continue;
          }
          // Allow group budgets that the user has access to
          if (item.budgetType === 'group' && item.budgetId) {
            const hasAccess = await this.canAccessBudget(item.budgetId, accessControl);
            if (hasAccess) {
              filteredData.push(item);
            }
          }
        }
        return filteredData;
      }
    }

    // Default: return empty data for users without appropriate permissions
    return Array.isArray(data) ? [] : null;
  }

  /**
   * Check if user can access specific budget data
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  async canAccessBudget(budgetId: number, accessControl: AccessControl): Promise<boolean> {
    // Circle treasurers can access all budgets
    if (accessControl.isCircleTreasurer) {
      return true;
    }

    // Group treasurers can access their group budgets and circle budgets
    if (accessControl.isGroupTreasurer && accessControl.groupIds.length > 0) {
      const budgetQuery = `
        SELECT group_id FROM budgets WHERE id = $1
      `;
      const result = await pool.query(budgetQuery, [budgetId]);
      
      if (result.rows.length === 0) {
        return false;
      }

      const budget = result.rows[0];
      
      // Allow access to circle budgets (group_id is null)
      if (budget.group_id === null) {
        return true;
      }

      // Allow access to group budgets the user belongs to
      return accessControl.groupIds.includes(budget.group_id);
    }

    // Default: no access
    return false;
  }

  /**
   * Apply access control filtering to budget-related queries
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  getBudgetAccessFilter(accessControl: AccessControl): { whereClause: string; params: any[] } {
    if (accessControl.isCircleTreasurer) {
      // Circle treasurers see all budgets
      return { whereClause: '', params: [] };
    }

    if (accessControl.isGroupTreasurer && accessControl.groupIds.length > 0) {
      // Group treasurers see their group budgets and circle budgets
      // For views, we need to check budget_type and group_name
      return {
        whereClause: ' AND (budget_type = \'circle\' OR budget_id IN (SELECT id FROM budgets WHERE group_id = ANY($PARAM)))',
        params: [accessControl.groupIds]
      };
    }

    // Default: no access
    return { whereClause: ' AND 1=0', params: [] };
  }

  /**
   * Apply access control filtering to income-related queries
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  getIncomeAccessFilter(accessControl: AccessControl): { whereClause: string; params: any[] } {
    if (accessControl.isCircleTreasurer) {
      // Circle treasurers see all income
      return { whereClause: '', params: [] };
    }

    if (accessControl.isGroupTreasurer && accessControl.groupIds.length > 0) {
      // Group treasurers see income from their groups and circle-level income
      // Since all income goes to the "הכנסות" budget which is circle-level,
      // group treasurers should see all income but this may change in the future
      return { whereClause: '', params: [] };
    }

    // Default: no access
    return { whereClause: ' AND 1=0', params: [] };
  }

  /**
   * Validate user access to report data
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  validateReportAccess(accessControl: AccessControl): boolean {
    // Only treasurers can access reports
    return accessControl.isCircleTreasurer || accessControl.isGroupTreasurer;
  }

  /**
   * Validate user access to specific budget data in reports
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  async validateBudgetReportAccess(budgetId: number, accessControl: AccessControl): Promise<boolean> {
    if (!this.validateReportAccess(accessControl)) {
      return false;
    }
    
    return await this.canAccessBudget(budgetId, accessControl);
  }

  /**
   * Validate user access to specific income category data in reports
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  async validateCategoryReportAccess(categoryId: number, accessControl: AccessControl): Promise<boolean> {
    if (!this.validateReportAccess(accessControl)) {
      return false;
    }
    
    const accessibleCategoryIds = await this.getAccessibleCategoryIds(accessControl);
    return accessibleCategoryIds.includes(categoryId);
  }

  /**
   * Get accessible budget IDs for the user
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  async getAccessibleBudgetIds(accessControl: AccessControl): Promise<number[]> {
    if (accessControl.isCircleTreasurer) {
      // Circle treasurers can access all budgets
      const result = await pool.query('SELECT id FROM budgets ORDER BY id');
      return result.rows.map(row => row.id);
    }

    if (accessControl.isGroupTreasurer && accessControl.groupIds.length > 0) {
      // Group treasurers can access their group budgets and circle budgets
      const result = await pool.query(
        'SELECT id FROM budgets WHERE group_id IS NULL OR group_id = ANY($1) ORDER BY id',
        [accessControl.groupIds]
      );
      return result.rows.map(row => row.id);
    }

    // Default: no access
    return [];
  }

  /**
   * Get accessible income category IDs for the user
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  async getAccessibleCategoryIds(accessControl: AccessControl): Promise<number[]> {
    if (accessControl.isCircleTreasurer) {
      // Circle treasurers can access all categories
      const result = await pool.query('SELECT id FROM income_categories ORDER BY id');
      return result.rows.map(row => row.id);
    }

    if (accessControl.isGroupTreasurer && accessControl.groupIds.length > 0) {
      // Group treasurers can access all categories since all income goes to circle-level budget
      // This may change in the future if income becomes group-specific
      const result = await pool.query('SELECT id FROM income_categories ORDER BY id');
      return result.rows.map(row => row.id);
    }

    // Default: no access
    return [];
  }

  /**
   * Calculate monthly closing report data
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
   */
  async calculateMonthlyClosing(
    year: number,
    month: number,
    accessControl: AccessControl
  ): Promise<MonthlyClosingData> {
    // Validate access
    if (!this.validateReportAccess(accessControl)) {
      throw new Error('Access denied: Treasurer role required');
    }

    // Get income by category for the month
    let incomeQuery = `
      SELECT category_id, category_name, category_color, total_amount, income_count
      FROM monthly_income_by_category
      WHERE year = $1 AND month = $2
    `;
    let incomeParams = [year, month];

    // Apply access control for income
    const incomeFilter = this.getIncomeAccessFilter(accessControl);
    if (incomeFilter.whereClause) {
      incomeQuery += incomeFilter.whereClause.replace('$PARAM', `$${incomeParams.length + 1}`);
      incomeParams = incomeParams.concat(incomeFilter.params);
    }

    incomeQuery += ` ORDER BY category_name`;

    const incomeResult = await pool.query(incomeQuery, incomeParams);

    const incomeByCategory: CategorySummary[] = incomeResult.rows.map(row => ({
      categoryId: row.category_id,
      categoryName: row.category_name,
      categoryColor: row.category_color,
      amount: parseFloat(row.total_amount),
      count: parseInt(row.income_count)
    }));

    const totalIncome = incomeByCategory.reduce((sum, cat) => sum + cat.amount, 0);

    // Get expenses by budget for the month
    let expenseQuery = `
      SELECT budget_id, budget_name, budget_type, group_name, total_amount, expense_count
      FROM monthly_expenses_by_budget
      WHERE year = $1 AND month = $2
    `;
    let expenseParams = [year, month];

    // Apply access control for expenses
    const budgetFilter = this.getBudgetAccessFilter(accessControl);
    if (budgetFilter.whereClause) {
      expenseQuery += budgetFilter.whereClause.replace('$PARAM', `$${expenseParams.length + 1}`).replace('b.', '');
      expenseParams = expenseParams.concat(budgetFilter.params);
    }

    expenseQuery += ` ORDER BY budget_name`;

    const expenseResult = await pool.query(expenseQuery, expenseParams);

    const expensesByBudget: BudgetSummary[] = expenseResult.rows.map(row => ({
      budgetId: row.budget_id,
      budgetName: row.budget_name,
      budgetType: row.budget_type,
      groupName: row.group_name,
      amount: parseFloat(row.total_amount),
      count: parseInt(row.expense_count)
    }));

    const totalExpenses = expensesByBudget.reduce((sum, budget) => sum + budget.amount, 0);

    return {
      year,
      month,
      income: {
        byCategory: incomeByCategory,
        total: totalIncome
      },
      expenses: {
        byBudget: expensesByBudget,
        total: totalExpenses
      },
      balance: totalIncome - totalExpenses
    };
  }

  /**
   * Get fund-level expense details for a specific budget and month
   * Used for collapsible budget rows in monthly closing report
   */
  async getBudgetFundDetails(
    budgetId: number,
    year: number,
    month: number,
    accessControl: AccessControl
  ): Promise<FundSummary[]> {
    // Validate access
    if (!this.validateReportAccess(accessControl)) {
      throw new Error('Access denied: Treasurer role required');
    }

    // Get fund-level expense details for the budget
    let fundQuery = `
      SELECT 
        f.id as fund_id,
        f.name as fund_name,
        f.allocated_amount,
        COALESCE(SUM(expenses.amount), 0) as spent_amount,
        COUNT(CASE WHEN expenses.amount IS NOT NULL THEN 1 END) as expense_count,
        f.allocated_amount - COALESCE(SUM(expenses.amount), 0) as remaining_amount,
        CASE 
          WHEN f.allocated_amount > 0 THEN 
            ROUND((COALESCE(SUM(expenses.amount), 0) / f.allocated_amount * 100), 2)
          ELSE 0 
        END as utilization_percentage
      FROM funds f
      LEFT JOIN (
        -- Approved and paid reimbursements
        SELECT r.fund_id, r.amount
        FROM reimbursements r
        WHERE r.status IN ('approved', 'paid')
          AND EXTRACT(YEAR FROM r.expense_date) = $1
          AND EXTRACT(MONTH FROM r.expense_date) = $2
        
        UNION ALL
        
        -- Direct expenses
        SELECT de.fund_id, de.amount
        FROM direct_expenses de
        WHERE EXTRACT(YEAR FROM de.expense_date) = $1
          AND EXTRACT(MONTH FROM de.expense_date) = $2
      ) expenses ON f.id = expenses.fund_id
      WHERE f.budget_id = $3
    `;

    const fundParams = [year, month, budgetId];

    // Apply budget access control
    const budgetFilter = this.getBudgetAccessFilter(accessControl);
    if (budgetFilter.whereClause) {
      // Add budget access control by joining with budgets table
      fundQuery = `
        SELECT 
          f.id as fund_id,
          f.name as fund_name,
          f.allocated_amount,
          COALESCE(SUM(expenses.amount), 0) as spent_amount,
          COUNT(CASE WHEN expenses.amount IS NOT NULL THEN 1 END) as expense_count,
          f.allocated_amount - COALESCE(SUM(expenses.amount), 0) as remaining_amount,
          CASE 
            WHEN f.allocated_amount > 0 THEN 
              ROUND((COALESCE(SUM(expenses.amount), 0) / f.allocated_amount * 100), 2)
            ELSE 0 
          END as utilization_percentage
        FROM funds f
        JOIN budgets b ON f.budget_id = b.id
        LEFT JOIN (
          -- Approved and paid reimbursements
          SELECT r.fund_id, r.amount
          FROM reimbursements r
          WHERE r.status IN ('approved', 'paid')
            AND EXTRACT(YEAR FROM r.expense_date) = $1
            AND EXTRACT(MONTH FROM r.expense_date) = $2
          
          UNION ALL
          
          -- Direct expenses
          SELECT de.fund_id, de.amount
          FROM direct_expenses de
          WHERE EXTRACT(YEAR FROM de.expense_date) = $1
            AND EXTRACT(MONTH FROM de.expense_date) = $2
        ) expenses ON f.id = expenses.fund_id
        WHERE f.budget_id = $3
      `;
      
      // Add access control filter
      const accessFilter = budgetFilter.whereClause.replace('$PARAM', `${fundParams.length + 1}`);
      fundQuery += ` AND ${accessFilter.replace('b.', 'b.')}`;
      fundParams.push(...budgetFilter.params);
    }

    fundQuery += `
      GROUP BY f.id, f.name, f.allocated_amount
      ORDER BY f.name
    `;

    const fundResult = await pool.query(fundQuery, fundParams);

    return fundResult.rows.map(row => ({
      fundId: row.fund_id,
      fundName: row.fund_name,
      amount: parseFloat(row.spent_amount) || 0,
      count: parseInt(row.expense_count) || 0,
      allocatedAmount: parseFloat(row.allocated_amount) || 0,
      spentAmount: parseFloat(row.spent_amount) || 0,
      remainingAmount: parseFloat(row.remaining_amount) || 0,
      utilizationPercentage: parseFloat(row.utilization_percentage) || 0
    }));
  }

  /**
   * Calculate annual budget execution report data
   * Requirements: 2.1, 2.2, 2.3, 2.4
   */
  async calculateAnnualBudgetExecution(
    year: number,
    accessControl: AccessControl
  ): Promise<AnnualBudgetExecutionData> {
    // Validate access
    if (!this.validateReportAccess(accessControl)) {
      throw new Error('Access denied: Treasurer role required');
    }

    // Get monthly income summary
    let monthlyIncomeQuery = `
      SELECT month, SUM(total_amount) as amount, SUM(income_count) as count
      FROM monthly_income_by_category
      WHERE year = $1
    `;
    let incomeParams = [year];

    // Apply access control for income
    const incomeFilter = this.getIncomeAccessFilter(accessControl);
    if (incomeFilter.whereClause) {
      monthlyIncomeQuery += incomeFilter.whereClause.replace('$PARAM', `$${incomeParams.length + 1}`);
      incomeParams = incomeParams.concat(incomeFilter.params);
    }

    monthlyIncomeQuery += ` GROUP BY month ORDER BY month`;

    const monthlyIncomeResult = await pool.query(monthlyIncomeQuery, incomeParams);

    const monthlyIncome: MonthlyIncomeSummary[] = monthlyIncomeResult.rows.map(row => ({
      month: parseInt(row.month),
      amount: parseFloat(row.amount),
      count: parseInt(row.count)
    }));

    // Get monthly expense summary
    let monthlyExpenseQuery = `
      SELECT month, SUM(total_amount) as amount, SUM(expense_count) as count
      FROM monthly_expenses_by_budget
      WHERE year = $1
    `;
    let expenseParams = [year];

    // Apply access control for expenses
    const budgetFilter = this.getBudgetAccessFilter(accessControl);
    if (budgetFilter.whereClause) {
      monthlyExpenseQuery += budgetFilter.whereClause.replace('$PARAM', `$${expenseParams.length + 1}`).replace('b.', '');
      expenseParams = expenseParams.concat(budgetFilter.params);
    }

    monthlyExpenseQuery += ` GROUP BY month ORDER BY month`;

    const monthlyExpenseResult = await pool.query(monthlyExpenseQuery, expenseParams);

    const monthlyExpenses: MonthlyExpenseSummary[] = monthlyExpenseResult.rows.map(row => ({
      month: parseInt(row.month),
      amount: parseFloat(row.amount),
      count: parseInt(row.count)
    }));

    // Calculate monthly balance
    const monthlyBalance: MonthlyBalanceSummary[] = [];
    for (let month = 1; month <= 12; month++) {
      const incomeData = monthlyIncome.find(i => i.month === month);
      const expenseData = monthlyExpenses.find(e => e.month === month);
      
      const income = incomeData ? incomeData.amount : 0;
      const expenses = expenseData ? expenseData.amount : 0;

      monthlyBalance.push({
        month,
        income,
        expenses,
        balance: income - expenses
      });
    }

    // Calculate yearly totals
    const yearlyIncome = monthlyIncome.reduce((sum, m) => sum + m.amount, 0);
    const yearlyExpenses = monthlyExpenses.reduce((sum, m) => sum + m.amount, 0);

    return {
      year,
      monthlyIncome,
      monthlyExpenses,
      monthlyBalance,
      yearlyTotals: {
        income: yearlyIncome,
        expenses: yearlyExpenses,
        balance: yearlyIncome - yearlyExpenses
      }
    };
  }

  /**
   * Calculate expense execution report data
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
   */
  async calculateExpenseExecution(
    year: number,
    month: number | undefined,
    accessControl: AccessControl
  ): Promise<ExpenseExecutionData> {
    // Validate access
    if (!this.validateReportAccess(accessControl)) {
      throw new Error('Access denied: Treasurer role required');
    }

    const monthlyExecution: { [month: number]: BudgetExecutionSummary[] } = {};
    const monthlyTotals: { [month: number]: number } = {};

    // If specific month requested, get data for that month only
    const monthsToProcess = month ? [month] : Array.from({ length: 12 }, (_, i) => i + 1);

    for (const currentMonth of monthsToProcess) {
      // Get budget execution data for the month
      let executionQuery = `
        SELECT 
          fes.budget_id,
          fes.budget_name,
          fes.budget_type,
          fes.group_name,
          COALESCE(SUM(fes.allocated_amount), 0) as allocated_amount,
          COALESCE(SUM(fes.spent_amount), 0) as spent_amount,
          COUNT(CASE WHEN fes.spent_amount > 0 THEN 1 END) as expense_count
        FROM fund_expense_summary fes
        WHERE fes.year = $1 AND fes.month = $2
      `;
      let executionParams = [year, currentMonth];

      // Apply access control
      const budgetFilter = this.getBudgetAccessFilter(accessControl);
      if (budgetFilter.whereClause) {
        executionQuery += budgetFilter.whereClause.replace('$PARAM', `$${executionParams.length + 1}`).replace('b.', 'fes.');
        executionParams = executionParams.concat(budgetFilter.params);
      }

      executionQuery += ` GROUP BY fes.budget_id, fes.budget_name, fes.budget_type, fes.group_name
                         ORDER BY fes.budget_name`;

      const executionResult = await pool.query(executionQuery, executionParams);

      const budgetExecution: BudgetExecutionSummary[] = executionResult.rows.map(row => {
        const allocated = parseFloat(row.allocated_amount);
        const spent = parseFloat(row.spent_amount);
        const remaining = allocated - spent;
        const utilization = allocated > 0 ? (spent / allocated) * 100 : 0;

        return {
          budgetId: row.budget_id,
          budgetName: row.budget_name,
          budgetType: row.budget_type,
          groupName: row.group_name,
          allocatedAmount: allocated,
          spentAmount: spent,
          remainingAmount: remaining,
          utilizationPercentage: utilization
        };
      });

      monthlyExecution[currentMonth] = budgetExecution;
      monthlyTotals[currentMonth] = budgetExecution.reduce((sum, b) => sum + b.spentAmount, 0);
    }

    // Calculate annual totals by budget
    let annualQuery = `
      SELECT 
        budget_id,
        budget_name,
        budget_type,
        group_name,
        SUM(total_amount) as spent_amount,
        SUM(expense_count) as expense_count
      FROM annual_expenses_by_budget
      WHERE year = $1
    `;
    let annualParams = [year];

    // Apply access control
    const budgetFilter = this.getBudgetAccessFilter(accessControl);
    if (budgetFilter.whereClause) {
      annualQuery += budgetFilter.whereClause.replace('$PARAM', `$${annualParams.length + 1}`).replace('b.', '');
      annualParams = annualParams.concat(budgetFilter.params);
    }

    annualQuery += ` GROUP BY budget_id, budget_name, budget_type, group_name
                    ORDER BY budget_name`;

    const annualResult = await pool.query(annualQuery, annualParams);

    // Get budget allocations for utilization calculation
    const accessibleBudgetIds = await this.getAccessibleBudgetIds(accessControl);
    
    let allocationQuery = `
      SELECT b.id, b.name, b.total_amount, 
             CASE WHEN b.group_id IS NULL THEN 'circle' ELSE 'group' END as budget_type,
             g.name as group_name
      FROM budgets b
      LEFT JOIN groups g ON b.group_id = g.id
      WHERE b.id = ANY($1)
    `;

    const allocationResult = await pool.query(allocationQuery, [accessibleBudgetIds]);
    const budgetAllocations = new Map(
      allocationResult.rows.map(row => [row.id, parseFloat(row.total_amount)])
    );

    const annualTotalsByBudget: BudgetExecutionSummary[] = annualResult.rows.map(row => {
      const allocated = budgetAllocations.get(row.budget_id) || 0;
      const spent = parseFloat(row.spent_amount);
      const remaining = allocated - spent;
      const utilization = allocated > 0 ? (spent / allocated) * 100 : 0;

      return {
        budgetId: row.budget_id,
        budgetName: row.budget_name,
        budgetType: row.budget_type,
        groupName: row.group_name,
        allocatedAmount: allocated,
        spentAmount: spent,
        remainingAmount: remaining,
        utilizationPercentage: utilization
      };
    });

    const annualTotal = annualTotalsByBudget.reduce((sum, b) => sum + b.spentAmount, 0);

    return {
      year,
      month,
      monthlyExecution,
      monthlyTotals,
      annualTotals: {
        byBudget: annualTotalsByBudget,
        total: annualTotal
      }
    };
  }

  /**
   * Calculate income execution report data
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
   */
  async calculateIncomeExecution(
    year: number,
    month: number | undefined,
    accessControl: AccessControl
  ): Promise<IncomeExecutionData> {
    // Validate access
    if (!this.validateReportAccess(accessControl)) {
      throw new Error('Access denied: Treasurer role required');
    }

    const monthlyExecution: { [month: number]: CategoryExecutionSummary[] } = {};
    const monthlyTotals: { [month: number]: number } = {};

    // If specific month requested, get data for that month only
    const monthsToProcess = month ? [month] : Array.from({ length: 12 }, (_, i) => i + 1);

    // Get accessible category IDs for access control
    const accessibleCategoryIds = await this.getAccessibleCategoryIds(accessControl);

    for (const currentMonth of monthsToProcess) {
      // Get actual income by category for the month
      let actualQuery = `
        SELECT category_id, category_name, category_color, total_amount
        FROM monthly_income_by_category
        WHERE year = $1 AND month = $2
      `;
      let actualParams = [year, currentMonth];

      // Apply access control
      if (accessibleCategoryIds.length > 0) {
        actualQuery += ` AND category_id = ANY($${actualParams.length + 1})`;
        actualParams.push(accessibleCategoryIds as any);
      } else {
        // No accessible categories - return empty results
        actualQuery += ` AND 1=0`;
      }

      actualQuery += ` ORDER BY category_name`;

      const actualResult = await pool.query(actualQuery, actualParams);

      // Get expected income by category for the month
      let expectedQuery = `
        SELECT 
          ic.id as category_id,
          ic.name as category_name,
          ic.color as category_color,
          COALESCE(SUM(ei.amount), 0) as expected_amount
        FROM income_categories ic
        LEFT JOIN expected_income_category_assignments eica ON ic.id = eica.category_id
        LEFT JOIN expected_incomes ei ON eica.expected_income_id = ei.id 
          AND ei.year = $1 AND ei.month = $2
        WHERE 1=1
      `;
      let expectedParams = [year, currentMonth];

      // Apply access control
      if (accessibleCategoryIds.length > 0) {
        expectedQuery += ` AND ic.id = ANY($${expectedParams.length + 1})`;
        expectedParams.push(accessibleCategoryIds as any);
      } else {
        // No accessible categories - return empty results
        expectedQuery += ` AND 1=0`;
      }

      // Apply budget access control for expected income
      // For now, group treasurers can see all income since it goes to circle-level budget
      // This can be refined later if income becomes group-specific

      expectedQuery += ` GROUP BY ic.id, ic.name, ic.color ORDER BY ic.name`;

      const expectedResult = await pool.query(expectedQuery, expectedParams);

      // Combine actual and expected data
      const actualMap = new Map(
        actualResult.rows.map(row => [
          row.category_id,
          {
            name: row.category_name,
            color: row.category_color,
            amount: parseFloat(row.total_amount)
          }
        ])
      );

      const categoryExecution: CategoryExecutionSummary[] = expectedResult.rows.map(row => {
        const expected = parseFloat(row.expected_amount);
        const actual = actualMap.get(row.category_id)?.amount || 0;
        const difference = actual - expected;
        const fulfillment = expected > 0 ? (actual / expected) * 100 : (actual > 0 ? 100 : 0);

        return {
          categoryId: row.category_id,
          categoryName: row.category_name,
          categoryColor: row.category_color,
          expectedAmount: expected,
          actualAmount: actual,
          difference,
          fulfillmentPercentage: fulfillment
        };
      });

      // Add categories that have actual income but no expected income
      for (const [categoryId, data] of Array.from(actualMap.entries())) {
        if (!categoryExecution.find(ce => ce.categoryId === categoryId)) {
          categoryExecution.push({
            categoryId,
            categoryName: data.name,
            categoryColor: data.color,
            expectedAmount: 0,
            actualAmount: data.amount,
            difference: data.amount,
            fulfillmentPercentage: 100
          });
        }
      }

      monthlyExecution[currentMonth] = categoryExecution;
      monthlyTotals[currentMonth] = categoryExecution.reduce((sum, c) => sum + c.actualAmount, 0);
    }

    // Calculate annual totals by category
    let annualActualQuery = `
      SELECT category_id, category_name, category_color, total_amount
      FROM annual_income_by_category
      WHERE year = $1
    `;
    let annualActualParams = [year];

    // Apply access control
    if (accessibleCategoryIds.length > 0) {
      annualActualQuery += ` AND category_id = ANY($${annualActualParams.length + 1})`;
      annualActualParams.push(accessibleCategoryIds as any);
    } else {
      // No accessible categories - return empty results
      annualActualQuery += ` AND 1=0`;
    }

    const annualActualResult = await pool.query(annualActualQuery, annualActualParams);

    // Get annual expected income by category
    let annualExpectedQuery = `
      SELECT 
        ic.id as category_id,
        ic.name as category_name,
        ic.color as category_color,
        COALESCE(SUM(ei.amount), 0) as expected_amount
      FROM income_categories ic
      LEFT JOIN expected_income_category_assignments eica ON ic.id = eica.category_id
      LEFT JOIN expected_incomes ei ON eica.expected_income_id = ei.id 
        AND ei.year = $1
      WHERE 1=1
    `;
    let annualExpectedParams = [year];

    // Apply access control
    if (accessibleCategoryIds.length > 0) {
      annualExpectedQuery += ` AND ic.id = ANY($${annualExpectedParams.length + 1})`;
      annualExpectedParams.push(accessibleCategoryIds as any);
    } else {
      // No accessible categories - return empty results
      annualExpectedQuery += ` AND 1=0`;
    }

    // Apply budget access control for expected income
    // Apply budget access control for expected income
    // For now, group treasurers can see all income since it goes to circle-level budget
    // This can be refined later if income becomes group-specific

    annualExpectedQuery += ` GROUP BY ic.id, ic.name, ic.color ORDER BY ic.name`;

    const annualExpectedResult = await pool.query(annualExpectedQuery, annualExpectedParams);

    // Combine annual actual and expected data
    const annualActualMap = new Map(
      annualActualResult.rows.map(row => [
        row.category_id,
        {
          name: row.category_name,
          color: row.category_color,
          amount: parseFloat(row.total_amount)
        }
      ])
    );

    const annualTotalsByCategory: CategoryExecutionSummary[] = annualExpectedResult.rows.map(row => {
      const expected = parseFloat(row.expected_amount);
      const actual = annualActualMap.get(row.category_id)?.amount || 0;
      const difference = actual - expected;
      const fulfillment = expected > 0 ? (actual / expected) * 100 : (actual > 0 ? 100 : 0);

      return {
        categoryId: row.category_id,
        categoryName: row.category_name,
        categoryColor: row.category_color,
        expectedAmount: expected,
        actualAmount: actual,
        difference,
        fulfillmentPercentage: fulfillment
      };
    });

    // Add categories that have actual income but no expected income
    for (const [categoryId, data] of Array.from(annualActualMap.entries())) {
      if (!annualTotalsByCategory.find(ce => ce.categoryId === categoryId)) {
        annualTotalsByCategory.push({
          categoryId,
          categoryName: data.name,
          categoryColor: data.color,
          expectedAmount: 0,
          actualAmount: data.amount,
          difference: data.amount,
          fulfillmentPercentage: 100
        });
      }
    }

    const annualTotal = annualTotalsByCategory.reduce((sum, c) => sum + c.actualAmount, 0);

    return {
      year,
      month,
      monthlyExecution,
      monthlyTotals,
      annualTotals: {
        byCategory: annualTotalsByCategory,
        total: annualTotal
      }
    };
  }

  /**
   * Validate and calculate monthly closing report data with data integrity checks
   * Requirements: 7.1, 7.3, 7.4, 7.5
   */
  async calculateMonthlyClosingWithValidation(
    year: number,
    month: number,
    accessControl: AccessControl
  ): Promise<MonthlyClosingData> {
    // Validate source data availability first
    const sourceValidation = await this.validationService.validateSourceDataAvailability(year, month);
    if (!sourceValidation.isValid) {
      throw new DataValidationError(
        'Source data validation failed',
        VALIDATION_ERRORS.MISSING_SOURCE_DATA,
        sourceValidation.errors
      );
    }

    // Calculate the report data using existing method
    const reportData = await this.calculateMonthlyClosing(year, month, accessControl);

    // Validate report data integrity
    const validation = await this.validationService.validateReportDataIntegrity(
      'monthly-closing',
      year,
      month,
      reportData
    );

    if (!validation.isValid) {
      throw new DataValidationError(
        'Report data validation failed',
        VALIDATION_ERRORS.REPORT_CONSISTENCY_ERROR,
        validation.errors
      );
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn('Monthly closing report validation warnings:', validation.warnings);
    }

    return reportData;
  }

  /**
   * Validate and calculate annual budget execution report data with data integrity checks
   * Requirements: 7.1, 7.3, 7.4, 7.5
   */
  async calculateAnnualBudgetExecutionWithValidation(
    year: number,
    accessControl: AccessControl
  ): Promise<AnnualBudgetExecutionData> {
    // Validate source data availability first
    const sourceValidation = await this.validationService.validateSourceDataAvailability(year);
    if (!sourceValidation.isValid) {
      throw new DataValidationError(
        'Source data validation failed',
        VALIDATION_ERRORS.MISSING_SOURCE_DATA,
        sourceValidation.errors
      );
    }

    // Calculate the report data using existing method
    const reportData = await this.calculateAnnualBudgetExecution(year, accessControl);

    // Validate report data integrity
    const validation = await this.validationService.validateReportDataIntegrity(
      'annual-budget-execution',
      year,
      undefined,
      reportData
    );

    if (!validation.isValid) {
      throw new DataValidationError(
        'Report data validation failed',
        VALIDATION_ERRORS.REPORT_CONSISTENCY_ERROR,
        validation.errors
      );
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn('Annual budget execution report validation warnings:', validation.warnings);
    }

    return reportData;
  }

  /**
   * Validate and calculate expense execution report data with data integrity checks
   * Requirements: 7.1, 7.3, 7.4, 7.5
   */
  async calculateExpenseExecutionWithValidation(
    year: number,
    month: number | undefined,
    accessControl: AccessControl
  ): Promise<ExpenseExecutionData> {
    // Validate source data availability first
    const sourceValidation = await this.validationService.validateSourceDataAvailability(year, month);
    if (!sourceValidation.isValid) {
      throw new DataValidationError(
        'Source data validation failed',
        VALIDATION_ERRORS.MISSING_SOURCE_DATA,
        sourceValidation.errors
      );
    }

    // Calculate the report data using existing method
    const reportData = await this.calculateExpenseExecution(year, month, accessControl);

    // Validate report data integrity
    const validation = await this.validationService.validateReportDataIntegrity(
      'expense-execution',
      year,
      month,
      reportData
    );

    if (!validation.isValid) {
      throw new DataValidationError(
        'Report data validation failed',
        VALIDATION_ERRORS.REPORT_CONSISTENCY_ERROR,
        validation.errors
      );
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn('Expense execution report validation warnings:', validation.warnings);
    }

    return reportData;
  }

  /**
   * Validate and calculate income execution report data with data integrity checks
   * Requirements: 7.1, 7.3, 7.4, 7.5
   */
  async calculateIncomeExecutionWithValidation(
    year: number,
    month: number | undefined,
    accessControl: AccessControl
  ): Promise<IncomeExecutionData> {
    // Validate source data availability first
    const sourceValidation = await this.validationService.validateSourceDataAvailability(year, month);
    if (!sourceValidation.isValid) {
      throw new DataValidationError(
        'Source data validation failed',
        VALIDATION_ERRORS.MISSING_SOURCE_DATA,
        sourceValidation.errors
      );
    }

    // Calculate the report data using existing method
    const reportData = await this.calculateIncomeExecution(year, month, accessControl);

    // Validate report data integrity
    const validation = await this.validationService.validateReportDataIntegrity(
      'income-execution',
      year,
      month,
      reportData
    );

    if (!validation.isValid) {
      throw new DataValidationError(
        'Report data validation failed',
        VALIDATION_ERRORS.REPORT_CONSISTENCY_ERROR,
        validation.errors
      );
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn('Income execution report validation warnings:', validation.warnings);
    }

    return reportData;
  }

  /**
   * Validate consistency across multiple reports
   * Requirements: 7.3, 7.4, 7.5
   */
  async validateMultipleReports(
    reports: Array<{ type: string; year: number; month?: number; data: any }>
  ): Promise<ValidationResult> {
    return await this.validationService.validateMultiReportConsistency(reports);
  }

  /**
   * Get validation service for external use
   * Requirements: 7.1, 7.3, 7.4, 7.5
   */
  getValidationService(): ReportValidationService {
    return this.validationService;
  }
}