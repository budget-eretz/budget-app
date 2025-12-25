import pool from '../config/database';

// Data validation error types
export class DataValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'DataValidationError';
  }
}

// Validation error codes
export const VALIDATION_ERRORS = {
  SOURCE_DATA_MISMATCH: 'SOURCE_DATA_MISMATCH',
  REPORT_CONSISTENCY_ERROR: 'REPORT_CONSISTENCY_ERROR',
  CALCULATION_DISCREPANCY: 'CALCULATION_DISCREPANCY',
  MISSING_SOURCE_DATA: 'MISSING_SOURCE_DATA',
  INVALID_DATA_RANGE: 'INVALID_DATA_RANGE',
  CROSS_REPORT_INCONSISTENCY: 'CROSS_REPORT_INCONSISTENCY'
};

// Validation result interfaces
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  details?: any;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  code: string;
  message: string;
  details?: any;
}

// Source data validation interfaces
export interface SourceDataSummary {
  totalAmount: number;
  recordCount: number;
  dateRange: {
    earliest: Date | null;
    latest: Date | null;
  };
}

export interface ReportDataSummary {
  totalAmount: number;
  recordCount: number;
  categoryCount?: number;
  budgetCount?: number;
}

export class ReportValidationService {
  private readonly TOLERANCE_PERCENTAGE = 0.01; // 1% tolerance for floating point calculations
  private readonly MAX_DATE_VARIANCE_DAYS = 1; // Allow 1 day variance for date-based calculations

  /**
   * Validate report data against source systems
   * Requirements: 7.1
   */
  async validateReportDataIntegrity(
    reportType: string,
    year: number,
    month?: number,
    reportData?: any
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      switch (reportType) {
        case 'monthly-closing':
          if (month === undefined) {
            throw new Error('Month is required for monthly closing validation');
          }
          const monthlyValidation = await this.validateMonthlyClosingData(year, month, reportData);
          errors.push(...monthlyValidation.errors);
          warnings.push(...monthlyValidation.warnings);
          break;

        case 'annual-budget-execution':
          const annualValidation = await this.validateAnnualBudgetExecutionData(year, reportData);
          errors.push(...annualValidation.errors);
          warnings.push(...annualValidation.warnings);
          break;

        case 'expense-execution':
          const expenseValidation = await this.validateExpenseExecutionData(year, month, reportData);
          errors.push(...expenseValidation.errors);
          warnings.push(...expenseValidation.warnings);
          break;

        case 'income-execution':
          const incomeValidation = await this.validateIncomeExecutionData(year, month, reportData);
          errors.push(...incomeValidation.errors);
          warnings.push(...incomeValidation.warnings);
          break;

        default:
          errors.push({
            code: VALIDATION_ERRORS.INVALID_DATA_RANGE,
            message: `Unknown report type: ${reportType}`,
            severity: 'error'
          });
      }

      // Cross-report consistency validation
      if (errors.length === 0) {
        const crossValidation = await this.validateCrossReportConsistency(reportType, year, month, reportData);
        errors.push(...crossValidation.errors);
        warnings.push(...crossValidation.warnings);
      }

    } catch (error) {
      errors.push({
        code: VALIDATION_ERRORS.SOURCE_DATA_MISMATCH,
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error,
        severity: 'error'
      });
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors: errors.filter(e => e.severity === 'error'),
      warnings: warnings
    };
  }

  /**
   * Validate monthly closing report data against source systems
   * Requirements: 7.1, 7.3
   */
  private async validateMonthlyClosingData(
    year: number,
    month: number,
    reportData?: any
  ): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate income data against source
    const incomeValidation = await this.validateIncomeSourceData(year, month, reportData?.income);
    if (!incomeValidation.isValid) {
      errors.push({
        code: VALIDATION_ERRORS.SOURCE_DATA_MISMATCH,
        message: 'Income data does not match source system',
        details: incomeValidation.details,
        severity: 'error'
      });
    }

    // Validate expense data against source
    const expenseValidation = await this.validateExpenseSourceData(year, month, reportData?.expenses);
    if (!expenseValidation.isValid) {
      errors.push({
        code: VALIDATION_ERRORS.SOURCE_DATA_MISMATCH,
        message: 'Expense data does not match source system',
        details: expenseValidation.details,
        severity: 'error'
      });
    }

    // Validate balance calculation
    if (reportData) {
      const calculatedBalance = reportData.income.total - reportData.expenses.total;
      if (!this.isWithinTolerance(calculatedBalance, reportData.balance)) {
        errors.push({
          code: VALIDATION_ERRORS.CALCULATION_DISCREPANCY,
          message: 'Balance calculation does not match income minus expenses',
          details: {
            expected: calculatedBalance,
            actual: reportData.balance,
            difference: Math.abs(calculatedBalance - reportData.balance)
          },
          severity: 'error'
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate annual budget execution report data
   * Requirements: 7.1, 7.4
   */
  private async validateAnnualBudgetExecutionData(
    year: number,
    reportData?: any
  ): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!reportData) {
      return { errors, warnings };
    }

    // Validate that monthly totals sum to yearly totals
    const monthlyIncomeSum = reportData.monthlyIncome.reduce((sum: number, m: any) => sum + m.amount, 0);
    const monthlyExpenseSum = reportData.monthlyExpenses.reduce((sum: number, m: any) => sum + m.amount, 0);

    if (!this.isWithinTolerance(monthlyIncomeSum, reportData.yearlyTotals.income)) {
      errors.push({
        code: VALIDATION_ERRORS.CALCULATION_DISCREPANCY,
        message: 'Monthly income totals do not sum to yearly income total',
        details: {
          monthlySum: monthlyIncomeSum,
          yearlyTotal: reportData.yearlyTotals.income,
          difference: Math.abs(monthlyIncomeSum - reportData.yearlyTotals.income)
        },
        severity: 'error'
      });
    }

    if (!this.isWithinTolerance(monthlyExpenseSum, reportData.yearlyTotals.expenses)) {
      errors.push({
        code: VALIDATION_ERRORS.CALCULATION_DISCREPANCY,
        message: 'Monthly expense totals do not sum to yearly expense total',
        details: {
          monthlySum: monthlyExpenseSum,
          yearlyTotal: reportData.yearlyTotals.expenses,
          difference: Math.abs(monthlyExpenseSum - reportData.yearlyTotals.expenses)
        },
        severity: 'error'
      });
    }

    // Validate balance calculations for each month
    reportData.monthlyBalance.forEach((balance: any, index: number) => {
      const calculatedBalance = balance.income - balance.expenses;
      if (!this.isWithinTolerance(calculatedBalance, balance.balance)) {
        errors.push({
          code: VALIDATION_ERRORS.CALCULATION_DISCREPANCY,
          message: `Month ${balance.month} balance calculation is incorrect`,
          details: {
            month: balance.month,
            expected: calculatedBalance,
            actual: balance.balance,
            difference: Math.abs(calculatedBalance - balance.balance)
          },
          severity: 'error'
        });
      }
    });

    // Validate yearly balance calculation
    const calculatedYearlyBalance = reportData.yearlyTotals.income - reportData.yearlyTotals.expenses;
    if (!this.isWithinTolerance(calculatedYearlyBalance, reportData.yearlyTotals.balance)) {
      errors.push({
        code: VALIDATION_ERRORS.CALCULATION_DISCREPANCY,
        message: 'Yearly balance calculation is incorrect',
        details: {
          expected: calculatedYearlyBalance,
          actual: reportData.yearlyTotals.balance,
          difference: Math.abs(calculatedYearlyBalance - reportData.yearlyTotals.balance)
        },
        severity: 'error'
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate expense execution report data
   * Requirements: 7.1, 7.5
   */
  private async validateExpenseExecutionData(
    year: number,
    month: number | undefined,
    reportData?: any
  ): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!reportData) {
      return { errors, warnings };
    }

    // Validate budget execution calculations
    if (reportData.monthlyExecution) {
      Object.entries(reportData.monthlyExecution).forEach(([monthKey, budgets]: [string, any]) => {
        budgets.forEach((budget: any) => {
          // Validate remaining amount calculation
          const calculatedRemaining = budget.allocatedAmount - budget.spentAmount;
          if (!this.isWithinTolerance(calculatedRemaining, budget.remainingAmount)) {
            errors.push({
              code: VALIDATION_ERRORS.CALCULATION_DISCREPANCY,
              message: `Budget ${budget.budgetName} remaining amount calculation is incorrect for month ${monthKey}`,
              details: {
                budget: budget.budgetName,
                month: monthKey,
                expected: calculatedRemaining,
                actual: budget.remainingAmount,
                difference: Math.abs(calculatedRemaining - budget.remainingAmount)
              },
              severity: 'error'
            });
          }

          // Validate utilization percentage calculation
          const calculatedUtilization = budget.allocatedAmount > 0 
            ? (budget.spentAmount / budget.allocatedAmount) * 100 
            : 0;
          if (!this.isWithinTolerance(calculatedUtilization, budget.utilizationPercentage)) {
            errors.push({
              code: VALIDATION_ERRORS.CALCULATION_DISCREPANCY,
              message: `Budget ${budget.budgetName} utilization percentage is incorrect for month ${monthKey}`,
              details: {
                budget: budget.budgetName,
                month: monthKey,
                expected: calculatedUtilization,
                actual: budget.utilizationPercentage,
                difference: Math.abs(calculatedUtilization - budget.utilizationPercentage)
              },
              severity: 'error'
            });
          }
        });
      });
    }

    // Validate annual totals calculations
    if (reportData.annualTotals?.byBudget) {
      reportData.annualTotals.byBudget.forEach((budget: any) => {
        // Validate remaining amount calculation
        const calculatedRemaining = budget.allocatedAmount - budget.spentAmount;
        if (!this.isWithinTolerance(calculatedRemaining, budget.remainingAmount)) {
          errors.push({
            code: VALIDATION_ERRORS.CALCULATION_DISCREPANCY,
            message: `Annual budget ${budget.budgetName} remaining amount calculation is incorrect`,
            details: {
              budget: budget.budgetName,
              expected: calculatedRemaining,
              actual: budget.remainingAmount,
              difference: Math.abs(calculatedRemaining - budget.remainingAmount)
            },
            severity: 'error'
          });
        }

        // Validate utilization percentage calculation
        const calculatedUtilization = budget.allocatedAmount > 0 
          ? (budget.spentAmount / budget.allocatedAmount) * 100 
          : 0;
        if (!this.isWithinTolerance(calculatedUtilization, budget.utilizationPercentage)) {
          errors.push({
            code: VALIDATION_ERRORS.CALCULATION_DISCREPANCY,
            message: `Annual budget ${budget.budgetName} utilization percentage is incorrect`,
            details: {
              budget: budget.budgetName,
              expected: calculatedUtilization,
              actual: budget.utilizationPercentage,
              difference: Math.abs(calculatedUtilization - budget.utilizationPercentage)
            },
            severity: 'error'
          });
        }
      });

      // Validate annual total calculation
      const calculatedAnnualTotal = reportData.annualTotals.byBudget.reduce(
        (sum: number, budget: any) => sum + budget.spentAmount, 
        0
      );
      if (!this.isWithinTolerance(calculatedAnnualTotal, reportData.annualTotals.total)) {
        errors.push({
          code: VALIDATION_ERRORS.CALCULATION_DISCREPANCY,
          message: 'Annual total does not match sum of budget totals',
          details: {
            expected: calculatedAnnualTotal,
            actual: reportData.annualTotals.total,
            difference: Math.abs(calculatedAnnualTotal - reportData.annualTotals.total)
          },
          severity: 'error'
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate income execution report data
   * Requirements: 7.1, 7.5
   */
  private async validateIncomeExecutionData(
    year: number,
    month: number | undefined,
    reportData?: any
  ): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!reportData) {
      return { errors, warnings };
    }

    // Validate category execution calculations
    if (reportData.monthlyExecution) {
      Object.entries(reportData.monthlyExecution).forEach(([monthKey, categories]: [string, any]) => {
        categories.forEach((category: any) => {
          // Validate difference calculation
          const calculatedDifference = category.actualAmount - category.expectedAmount;
          if (!this.isWithinTolerance(calculatedDifference, category.difference)) {
            errors.push({
              code: VALIDATION_ERRORS.CALCULATION_DISCREPANCY,
              message: `Category ${category.categoryName} difference calculation is incorrect for month ${monthKey}`,
              details: {
                category: category.categoryName,
                month: monthKey,
                expected: calculatedDifference,
                actual: category.difference,
                difference: Math.abs(calculatedDifference - category.difference)
              },
              severity: 'error'
            });
          }

          // Validate fulfillment percentage calculation
          const calculatedFulfillment = category.expectedAmount > 0 
            ? (category.actualAmount / category.expectedAmount) * 100 
            : (category.actualAmount > 0 ? 100 : 0);
          if (!this.isWithinTolerance(calculatedFulfillment, category.fulfillmentPercentage)) {
            errors.push({
              code: VALIDATION_ERRORS.CALCULATION_DISCREPANCY,
              message: `Category ${category.categoryName} fulfillment percentage is incorrect for month ${monthKey}`,
              details: {
                category: category.categoryName,
                month: monthKey,
                expected: calculatedFulfillment,
                actual: category.fulfillmentPercentage,
                difference: Math.abs(calculatedFulfillment - category.fulfillmentPercentage)
              },
              severity: 'error'
            });
          }
        });
      });
    }

    // Validate annual totals calculations
    if (reportData.annualTotals?.byCategory) {
      reportData.annualTotals.byCategory.forEach((category: any) => {
        // Validate difference calculation
        const calculatedDifference = category.actualAmount - category.expectedAmount;
        if (!this.isWithinTolerance(calculatedDifference, category.difference)) {
          errors.push({
            code: VALIDATION_ERRORS.CALCULATION_DISCREPANCY,
            message: `Annual category ${category.categoryName} difference calculation is incorrect`,
            details: {
              category: category.categoryName,
              expected: calculatedDifference,
              actual: category.difference,
              difference: Math.abs(calculatedDifference - category.difference)
            },
            severity: 'error'
          });
        }

        // Validate fulfillment percentage calculation
        const calculatedFulfillment = category.expectedAmount > 0 
          ? (category.actualAmount / category.expectedAmount) * 100 
          : (category.actualAmount > 0 ? 100 : 0);
        if (!this.isWithinTolerance(calculatedFulfillment, category.fulfillmentPercentage)) {
          errors.push({
            code: VALIDATION_ERRORS.CALCULATION_DISCREPANCY,
            message: `Annual category ${category.categoryName} fulfillment percentage is incorrect`,
            details: {
              category: category.categoryName,
              expected: calculatedFulfillment,
              actual: category.fulfillmentPercentage,
              difference: Math.abs(calculatedFulfillment - category.fulfillmentPercentage)
            },
            severity: 'error'
          });
        }
      });

      // Validate annual total calculation
      const calculatedAnnualTotal = reportData.annualTotals.byCategory.reduce(
        (sum: number, category: any) => sum + category.actualAmount, 
        0
      );
      if (!this.isWithinTolerance(calculatedAnnualTotal, reportData.annualTotals.total)) {
        errors.push({
          code: VALIDATION_ERRORS.CALCULATION_DISCREPANCY,
          message: 'Annual total does not match sum of category totals',
          details: {
            expected: calculatedAnnualTotal,
            actual: reportData.annualTotals.total,
            difference: Math.abs(calculatedAnnualTotal - reportData.annualTotals.total)
          },
          severity: 'error'
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate cross-report consistency
   * Requirements: 7.3, 7.4, 7.5
   */
  private async validateCrossReportConsistency(
    reportType: string,
    year: number,
    month: number | undefined,
    reportData?: any
  ): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // For monthly reports, validate against annual aggregations
    if (month !== undefined && reportData) {
      try {
        // Get corresponding annual data for comparison
        const annualIncomeData = await this.getAnnualIncomeTotal(year, month);
        const annualExpenseData = await this.getAnnualExpenseTotal(year, month);

        // Validate income consistency across reports
        if (reportType === 'monthly-closing' && reportData.income?.total !== undefined) {
          if (!this.isWithinTolerance(reportData.income.total, annualIncomeData.monthlyAmount)) {
            warnings.push({
              code: VALIDATION_ERRORS.CROSS_REPORT_INCONSISTENCY,
              message: `Monthly closing income total does not match annual report data for month ${month}`,
              details: {
                monthlyClosingTotal: reportData.income.total,
                annualReportMonthlyAmount: annualIncomeData.monthlyAmount,
                difference: Math.abs(reportData.income.total - annualIncomeData.monthlyAmount)
              }
            });
          }
        }

        // Validate expense consistency across reports
        if (reportType === 'monthly-closing' && reportData.expenses?.total !== undefined) {
          if (!this.isWithinTolerance(reportData.expenses.total, annualExpenseData.monthlyAmount)) {
            warnings.push({
              code: VALIDATION_ERRORS.CROSS_REPORT_INCONSISTENCY,
              message: `Monthly closing expense total does not match annual report data for month ${month}`,
              details: {
                monthlyClosingTotal: reportData.expenses.total,
                annualReportMonthlyAmount: annualExpenseData.monthlyAmount,
                difference: Math.abs(reportData.expenses.total - annualExpenseData.monthlyAmount)
              }
            });
          }
        }
      } catch (error) {
        warnings.push({
          code: VALIDATION_ERRORS.CROSS_REPORT_INCONSISTENCY,
          message: `Could not validate cross-report consistency: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: error
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate income data against source system
   * Requirements: 7.1
   */
  private async validateIncomeSourceData(
    year: number,
    month: number,
    reportIncomeData?: any
  ): Promise<{ isValid: boolean; details?: any }> {
    try {
      // Get source data directly from income tables
      const sourceQuery = `
        SELECT 
          SUM(i.amount) as total_amount,
          COUNT(i.id) as record_count,
          COUNT(DISTINCT ic.id) as category_count
        FROM incomes i
        JOIN income_category_assignments ica ON i.id = ica.income_id
        JOIN income_categories ic ON ica.category_id = ic.id
        WHERE EXTRACT(YEAR FROM i.income_date) = $1 
          AND EXTRACT(MONTH FROM i.income_date) = $2
      `;

      const sourceResult = await pool.query(sourceQuery, [year, month]);
      const sourceData = sourceResult.rows[0];

      if (!reportIncomeData) {
        return { isValid: true }; // No report data to validate against
      }

      const sourceTotalAmount = parseFloat(sourceData.total_amount) || 0;
      const sourceRecordCount = parseInt(sourceData.record_count) || 0;

      // Validate total amount
      const amountMatches = this.isWithinTolerance(sourceTotalAmount, reportIncomeData.total);
      
      // Validate record count (sum of counts from all categories)
      const reportRecordCount = reportIncomeData.byCategory?.reduce(
        (sum: number, cat: any) => sum + (cat.count || 0), 
        0
      ) || 0;
      const countMatches = sourceRecordCount === reportRecordCount;

      return {
        isValid: amountMatches && countMatches,
        details: {
          source: {
            totalAmount: sourceTotalAmount,
            recordCount: sourceRecordCount
          },
          report: {
            totalAmount: reportIncomeData.total,
            recordCount: reportRecordCount
          },
          amountMatches,
          countMatches
        }
      };
    } catch (error) {
      return {
        isValid: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Validate expense data against source system
   * Requirements: 7.1
   */
  private async validateExpenseSourceData(
    year: number,
    month: number,
    reportExpenseData?: any
  ): Promise<{ isValid: boolean; details?: any }> {
    try {
      // Get source data directly from expense tables (reimbursements + direct expenses)
      const sourceQuery = `
        SELECT 
          SUM(amount) as total_amount,
          COUNT(*) as record_count,
          COUNT(DISTINCT budget_id) as budget_count
        FROM (
          SELECT r.amount, f.budget_id
          FROM reimbursements r
          JOIN funds f ON r.fund_id = f.id
          WHERE r.status IN ('approved', 'paid')
            AND EXTRACT(YEAR FROM r.expense_date) = $1 
            AND EXTRACT(MONTH FROM r.expense_date) = $2
          
          UNION ALL
          
          SELECT de.amount, f.budget_id
          FROM direct_expenses de
          JOIN funds f ON de.fund_id = f.id
          WHERE EXTRACT(YEAR FROM de.expense_date) = $1 
            AND EXTRACT(MONTH FROM de.expense_date) = $2
        ) expenses
      `;

      const sourceResult = await pool.query(sourceQuery, [year, month]);
      const sourceData = sourceResult.rows[0];

      if (!reportExpenseData) {
        return { isValid: true }; // No report data to validate against
      }

      const sourceTotalAmount = parseFloat(sourceData.total_amount) || 0;
      const sourceRecordCount = parseInt(sourceData.record_count) || 0;

      // Validate total amount
      const amountMatches = this.isWithinTolerance(sourceTotalAmount, reportExpenseData.total);
      
      // Validate record count (sum of counts from all budgets)
      const reportRecordCount = reportExpenseData.byBudget?.reduce(
        (sum: number, budget: any) => sum + (budget.count || 0), 
        0
      ) || 0;
      const countMatches = sourceRecordCount === reportRecordCount;

      return {
        isValid: amountMatches && countMatches,
        details: {
          source: {
            totalAmount: sourceTotalAmount,
            recordCount: sourceRecordCount
          },
          report: {
            totalAmount: reportExpenseData.total,
            recordCount: reportRecordCount
          },
          amountMatches,
          countMatches
        }
      };
    } catch (error) {
      return {
        isValid: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Get annual income total for a specific month
   * Requirements: 7.3, 7.4
   */
  private async getAnnualIncomeTotal(year: number, month: number): Promise<{ monthlyAmount: number }> {
    const query = `
      SELECT COALESCE(SUM(total_amount), 0) as monthly_amount
      FROM monthly_income_by_category
      WHERE year = $1 AND month = $2
    `;

    const result = await pool.query(query, [year, month]);
    return {
      monthlyAmount: parseFloat(result.rows[0].monthly_amount) || 0
    };
  }

  /**
   * Get annual expense total for a specific month
   * Requirements: 7.3, 7.4
   */
  private async getAnnualExpenseTotal(year: number, month: number): Promise<{ monthlyAmount: number }> {
    const query = `
      SELECT COALESCE(SUM(total_amount), 0) as monthly_amount
      FROM monthly_expenses_by_budget
      WHERE year = $1 AND month = $2
    `;

    const result = await pool.query(query, [year, month]);
    return {
      monthlyAmount: parseFloat(result.rows[0].monthly_amount) || 0
    };
  }

  /**
   * Check if two numbers are within acceptable tolerance
   */
  private isWithinTolerance(expected: number, actual: number): boolean {
    if (expected === 0 && actual === 0) {
      return true;
    }
    
    if (expected === 0) {
      return Math.abs(actual) < 0.01; // Allow small rounding errors for zero values
    }

    const percentageDifference = Math.abs((actual - expected) / expected);
    return percentageDifference <= this.TOLERANCE_PERCENTAGE;
  }

  /**
   * Validate data consistency between multiple reports
   * Requirements: 7.3, 7.4, 7.5
   */
  async validateMultiReportConsistency(
    reports: Array<{ type: string; year: number; month?: number; data: any }>
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Group reports by time period
    const reportsByPeriod = new Map<string, typeof reports>();
    
    reports.forEach(report => {
      const periodKey = report.month 
        ? `${report.year}-${report.month}` 
        : `${report.year}`;
      
      if (!reportsByPeriod.has(periodKey)) {
        reportsByPeriod.set(periodKey, []);
      }
      reportsByPeriod.get(periodKey)!.push(report);
    });

    // Validate consistency within each time period
    for (const [period, periodReports] of reportsByPeriod.entries()) {
      const monthlyClosing = periodReports.find(r => r.type === 'monthly-closing');
      const incomeExecution = periodReports.find(r => r.type === 'income-execution');
      const expenseExecution = periodReports.find(r => r.type === 'expense-execution');

      // Validate income consistency between monthly closing and income execution
      if (monthlyClosing && incomeExecution) {
        const monthlyIncomeTotal = monthlyClosing.data.income?.total || 0;
        const executionIncomeTotal = incomeExecution.data.monthlyTotals?.[monthlyClosing.month] || 
                                   incomeExecution.data.annualTotals?.total || 0;

        if (!this.isWithinTolerance(monthlyIncomeTotal, executionIncomeTotal)) {
          errors.push({
            code: VALIDATION_ERRORS.CROSS_REPORT_INCONSISTENCY,
            message: `Income totals inconsistent between monthly closing and income execution for period ${period}`,
            details: {
              period,
              monthlyClosingTotal: monthlyIncomeTotal,
              incomeExecutionTotal: executionIncomeTotal,
              difference: Math.abs(monthlyIncomeTotal - executionIncomeTotal)
            },
            severity: 'error'
          });
        }
      }

      // Validate expense consistency between monthly closing and expense execution
      if (monthlyClosing && expenseExecution) {
        const monthlyExpenseTotal = monthlyClosing.data.expenses?.total || 0;
        const executionExpenseTotal = expenseExecution.data.monthlyTotals?.[monthlyClosing.month] || 
                                    expenseExecution.data.annualTotals?.total || 0;

        if (!this.isWithinTolerance(monthlyExpenseTotal, executionExpenseTotal)) {
          errors.push({
            code: VALIDATION_ERRORS.CROSS_REPORT_INCONSISTENCY,
            message: `Expense totals inconsistent between monthly closing and expense execution for period ${period}`,
            details: {
              period,
              monthlyClosingTotal: monthlyExpenseTotal,
              expenseExecutionTotal: executionExpenseTotal,
              difference: Math.abs(monthlyExpenseTotal - executionExpenseTotal)
            },
            severity: 'error'
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate that all required source data exists for the requested time period
   * Requirements: 7.1
   */
  async validateSourceDataAvailability(
    year: number,
    month?: number
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Check if income data exists for the period
      const incomeQuery = month 
        ? `SELECT COUNT(*) as count FROM incomes WHERE EXTRACT(YEAR FROM income_date) = $1 AND EXTRACT(MONTH FROM income_date) = $2`
        : `SELECT COUNT(*) as count FROM incomes WHERE EXTRACT(YEAR FROM income_date) = $1`;
      
      const incomeParams = month ? [year, month] : [year];
      const incomeResult = await pool.query(incomeQuery, incomeParams);
      const incomeCount = parseInt(incomeResult.rows[0].count);

      // Check if expense data exists for the period
      const expenseQuery = month
        ? `SELECT COUNT(*) as count FROM (
             SELECT 1 FROM reimbursements WHERE status IN ('approved', 'paid') 
               AND EXTRACT(YEAR FROM expense_date) = $1 AND EXTRACT(MONTH FROM expense_date) = $2
             UNION ALL
             SELECT 1 FROM direct_expenses 
               WHERE EXTRACT(YEAR FROM expense_date) = $1 AND EXTRACT(MONTH FROM expense_date) = $2
           ) expenses`
        : `SELECT COUNT(*) as count FROM (
             SELECT 1 FROM reimbursements WHERE status IN ('approved', 'paid') 
               AND EXTRACT(YEAR FROM expense_date) = $1
             UNION ALL
             SELECT 1 FROM direct_expenses 
               WHERE EXTRACT(YEAR FROM expense_date) = $1
           ) expenses`;

      const expenseParams = month ? [year, month] : [year];
      const expenseResult = await pool.query(expenseQuery, expenseParams);
      const expenseCount = parseInt(expenseResult.rows[0].count);

      // Warn if no data exists for the period
      if (incomeCount === 0 && expenseCount === 0) {
        warnings.push({
          code: VALIDATION_ERRORS.MISSING_SOURCE_DATA,
          message: `No financial data found for ${month ? `${year}-${month}` : year}`,
          details: { year, month, incomeCount, expenseCount }
        });
      } else if (incomeCount === 0) {
        warnings.push({
          code: VALIDATION_ERRORS.MISSING_SOURCE_DATA,
          message: `No income data found for ${month ? `${year}-${month}` : year}`,
          details: { year, month, incomeCount }
        });
      } else if (expenseCount === 0) {
        warnings.push({
          code: VALIDATION_ERRORS.MISSING_SOURCE_DATA,
          message: `No expense data found for ${month ? `${year}-${month}` : year}`,
          details: { year, month, expenseCount }
        });
      }

    } catch (error) {
      errors.push({
        code: VALIDATION_ERRORS.SOURCE_DATA_MISMATCH,
        message: `Failed to check source data availability: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error,
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}