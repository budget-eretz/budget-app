# Design Document: Financial Reports System

## Overview

The Financial Reports System provides comprehensive financial analysis and reporting capabilities for treasurers to monitor income, expenses, budget execution, and housing costs. The system generates various reports with detailed breakdowns by categories, budgets, time periods, and apartment allocations.

## Architecture

The reports system follows a modular architecture with dedicated report controllers, service layers, and frontend components:

```
Frontend (React/TypeScript)
├── Reports Page (/reports)
├── Report Components (charts, tables, filters)
└── Report Services (API calls, data formatting)

Backend (Node.js/Express)
├── Report Controllers (business logic)
├── Report Services (data aggregation)
└── Database Queries (PostgreSQL)

Database
├── Existing Tables (incomes, reimbursements, funds, etc.)
├── Report Views (optimized queries)
└── Housing Allocation Tables (new)
```

## Components and Interfaces

### Backend Components

#### Report Controller (`reportController.ts`)
Enhanced controller with new report endpoints:

```typescript
// Monthly closing report
export async function getMonthlyClosingReport(req: Request, res: Response)

// Annual budget execution report  
export async function getAnnualBudgetExecutionReport(req: Request, res: Response)

// Expense execution report
export async function getExpenseExecutionReport(req: Request, res: Response)

// Income execution report
export async function getIncomeExecutionReport(req: Request, res: Response)
```

#### Report Service (`reportService.ts`)
New service layer for complex report calculations:

```typescript
class ReportService {
  // Monthly closing calculations
  async calculateMonthlyClosing(year: number, month: number, accessControl: AccessControl): Promise<MonthlyClosingData>
  
  // Annual budget execution calculations
  async calculateAnnualBudgetExecution(year: number, accessControl: AccessControl): Promise<AnnualBudgetExecutionData>
  
  // Expense execution calculations
  async calculateExpenseExecution(year: number, month?: number, accessControl: AccessControl): Promise<ExpenseExecutionData>
  
  // Income execution calculations
  async calculateIncomeExecution(year: number, month?: number, accessControl: AccessControl): Promise<IncomeExecutionData>
}
```

### Frontend Components

#### Reports Page (`Reports.tsx`)
Main reports dashboard with navigation and report selection:

```typescript
interface ReportsPageProps {}

const Reports: React.FC<ReportsPageProps> = () => {
  // Report type selection
  // Time period controls
  // Report display area
  // Export functionality
}
```

#### Report Components
Specialized components for each report type:

```typescript
// Monthly closing report
const MonthlyClosingReport: React.FC<{year: number, month: number}>

// Annual budget execution report
const AnnualBudgetExecutionReport: React.FC<{year: number}>

// Expense execution report
const ExpenseExecutionReport: React.FC<{year: number, month?: number}>

// Income execution report
const IncomeExecutionReport: React.FC<{year: number, month?: number}>
```

#### Chart Components
Reusable chart components using a charting library:

```typescript
const BarChart: React.FC<{data: ChartData, options: ChartOptions}>
const LineChart: React.FC<{data: ChartData, options: ChartOptions}>
const PieChart: React.FC<{data: ChartData, options: ChartOptions}>
const SummaryTable: React.FC<{data: TableData, columns: TableColumn[]}>
```

## Data Models

### Report Data Interfaces

```typescript
interface MonthlyClosingData {
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

interface AnnualBudgetExecutionData {
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

interface ExpenseExecutionData {
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

interface IncomeExecutionData {
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
```

### Supporting Data Models

```typescript
interface CategorySummary {
  categoryId: number;
  categoryName: string;
  categoryColor?: string;
  amount: number;
  count: number;
}

interface BudgetSummary {
  budgetId: number;
  budgetName: string;
  budgetType: 'circle' | 'group';
  groupName?: string;
  amount: number;
  count: number;
}

interface BudgetExecutionSummary {
  budgetId: number;
  budgetName: string;
  budgetType: 'circle' | 'group';
  groupName?: string;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  utilizationPercentage: number;
}

interface CategoryExecutionSummary {
  categoryId: number;
  categoryName: string;
  categoryColor?: string;
  expectedAmount: number;
  actualAmount: number;
  difference: number;
  fulfillmentPercentage: number;
}
```

## Database Schema Extensions

### Database Views for Optimized Reporting

```sql
-- Monthly income by category view
CREATE VIEW monthly_income_by_category AS
SELECT 
  EXTRACT(YEAR FROM i.income_date) as year,
  EXTRACT(MONTH FROM i.income_date) as month,
  ic.id as category_id,
  ic.name as category_name,
  ic.color as category_color,
  SUM(i.amount) as total_amount,
  COUNT(i.id) as income_count
FROM incomes i
JOIN income_category_assignments ica ON i.id = ica.income_id
JOIN income_categories ic ON ica.category_id = ic.id
GROUP BY year, month, ic.id, ic.name, ic.color;

-- Monthly expenses by budget view
CREATE VIEW monthly_expenses_by_budget AS
SELECT 
  EXTRACT(YEAR FROM expense_date) as year,
  EXTRACT(MONTH FROM expense_date) as month,
  b.id as budget_id,
  b.name as budget_name,
  CASE WHEN b.group_id IS NULL THEN 'circle' ELSE 'group' END as budget_type,
  g.name as group_name,
  SUM(amount) as total_amount,
  COUNT(*) as expense_count
FROM (
  SELECT r.expense_date, r.amount, f.budget_id
  FROM reimbursements r
  JOIN funds f ON r.fund_id = f.id
  WHERE r.status IN ('approved', 'paid')
  
  UNION ALL
  
  SELECT de.expense_date, de.amount, f.budget_id
  FROM direct_expenses de
  JOIN funds f ON de.fund_id = f.id
) expenses
JOIN budgets b ON expenses.budget_id = b.id
LEFT JOIN groups g ON b.group_id = g.id
GROUP BY year, month, b.id, b.name, budget_type, g.name;
```

## API Endpoints

### Report Endpoints

```typescript
// Monthly closing report
GET /api/reports/monthly-closing/:year/:month
// Query params: budgetType (circle|group|all)

// Annual budget execution report
GET /api/reports/annual-budget-execution/:year
// Query params: budgetType (circle|group|all)

// Expense execution report
GET /api/reports/expense-execution/:year
GET /api/reports/expense-execution/:year/:month
// Query params: budgetType (circle|group|all), budgetId

// Income execution report
GET /api/reports/income-execution/:year
GET /api/reports/income-execution/:year/:month
// Query params: budgetType (circle|group|all), categoryId

// Export endpoints
GET /api/reports/export/monthly-closing/:year/:month
GET /api/reports/export/annual-budget-execution/:year
GET /api/reports/export/expense-execution/:year/:month?
GET /api/reports/export/income-execution/:year/:month?
```

## Access Control

### Role-Based Report Access

```typescript
interface ReportAccessControl {
  isCircleTreasurer: boolean;
  isGroupTreasurer: boolean;
  groupIds: number[];
}

class ReportAccessService {
  // Filter data based on user permissions
  filterReportData(data: any, accessControl: ReportAccessControl): any
  
  // Check if user can access specific budget data
  canAccessBudget(budgetId: number, accessControl: ReportAccessControl): boolean
}
```

### Access Rules

1. **Circle Treasurer**: Full access to all reports and data
2. **Group Treasurer**: Access limited to their group's budgets and related data
3. **Export Functionality**: Treasurer-only access

## Error Handling

### Report Generation Error Handling

```typescript
class ReportError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ReportError';
  }
}

// Error types
const REPORT_ERRORS = {
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  ACCESS_DENIED: 'ACCESS_DENIED',
  CALCULATION_ERROR: 'CALCULATION_ERROR',
  EXPORT_FAILED: 'EXPORT_FAILED'
};
```

### Frontend Error Handling

```typescript
interface ReportErrorState {
  hasError: boolean;
  errorMessage: string;
  errorCode?: string;
  canRetry: boolean;
}

const ReportErrorBoundary: React.FC<{children: React.ReactNode}>
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Report Data Grouping and Calculation Accuracy
*For any* report generation request with valid time period and data, the system should correctly group data by the specified dimensions (categories, budgets, apartments) and calculate accurate totals that equal the sum of individual items.
**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

### Property 2: Monthly to Annual Aggregation Consistency
*For any* annual report, the yearly totals should equal the sum of all monthly amounts for the same data type (income, expenses, balance) across all months in the year.
**Validates: Requirements 2.1, 2.2, 2.4, 3.3, 4.3**

### Property 3: Balance Calculation Accuracy
*For any* time period (monthly or annual), the calculated balance should equal total income minus total expenses for that period.
**Validates: Requirements 2.3**

### Property 4: Report Data Completeness
*For any* report generation, the system should include all relevant data sources (approved reimbursements, direct expenses, actual income) in the calculations without omitting any qualifying records.
**Validates: Requirements 3.5, 4.5, 8.2**

### Property 5: Access Control Enforcement
*For any* report request, the system should filter and display only data that the requesting user has permission to access based on their role (circle treasurer sees all data, group treasurer sees only their group's data).
**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

### Property 6: Time Period Selection and Navigation
*For any* report type, the system should provide appropriate time period selectors and maintain time period selections when navigating between compatible report types.
**Validates: Requirements 6.2, 6.5**

### Property 7: Export Data Integrity
*For any* report export operation, the exported data should exactly match the data displayed in the corresponding report view.
**Validates: Requirements 6.3**

### Property 8: Data Integration Consistency
*For any* report generation, the data used should be consistent with and match the source data from existing income, expense, budget, and fund tracking systems.
**Validates: Requirements 7.1, 7.3, 7.4, 7.5**

### Property 10: Report Filtering and Grouping
*For any* report with filtering or grouping options (by budget, category), the filtered results should contain only records matching the filter criteria and be properly grouped according to the selected grouping dimension.
**Validates: Requirements 2.5, 3.4, 4.4**

## Testing Strategy

### Unit Tests
- Report calculation functions with specific examples
- Data aggregation logic for edge cases
- Access control validation for different user roles
- Housing allocation calculations with boundary values
- Export functionality with sample data

### Property-Based Tests
Each correctness property will be implemented as a property-based test:

**Property 1 Test**: Generate random income and expense data with categories/budgets, create reports, verify grouping and totals
**Property 2 Test**: Generate random monthly data across a year, verify annual totals equal monthly sums
**Property 3 Test**: Generate random income and expense data, verify balance calculations
**Property 4 Test**: Generate comprehensive data across all sources, verify all qualifying records are included
**Property 5 Test**: Generate data across different access levels, verify proper filtering by user role
**Property 6 Test**: Test time period selection across different report types, verify state maintenance
**Property 7 Test**: Generate reports and exports, verify data consistency between views and exports
**Property 8 Test**: Compare report data with source system data, verify consistency
**Property 10 Test**: Generate data with various attributes, test filtering and grouping accuracy

### Integration Tests
- End-to-end report generation workflows
- Database view performance with large datasets
- API endpoint responses with various parameters
- Frontend report rendering with real data
- Export file generation and download functionality