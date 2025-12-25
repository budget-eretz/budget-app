# Financial Reporting Database Views

This document describes the optimized database views and indexes created for the financial reporting system.

## Created Views

### 1. monthly_income_by_category
Aggregates income data by year, month, and category for monthly reporting.

**Columns:**
- `year` - Year of income
- `month` - Month of income (1-12)
- `category_id` - Income category ID
- `category_name` - Income category name
- `category_color` - Category color (hex code)
- `total_amount` - Total income amount for the period
- `income_count` - Number of income entries

**Usage:** Monthly closing reports, income execution reports

### 2. monthly_expenses_by_budget
Aggregates expense data (reimbursements + direct expenses) by year, month, and budget.

**Columns:**
- `year` - Year of expense
- `month` - Month of expense (1-12)
- `budget_id` - Budget ID
- `budget_name` - Budget name
- `budget_type` - 'circle' or 'group'
- `group_name` - Group name (null for circle budgets)
- `total_amount` - Total expense amount for the period
- `expense_count` - Number of expense entries

**Usage:** Monthly closing reports, expense execution reports

### 3. annual_income_by_category
Aggregates income data by year and category for annual reporting.

**Columns:**
- `year` - Year of income
- `category_id` - Income category ID
- `category_name` - Income category name
- `category_color` - Category color (hex code)
- `total_amount` - Total income amount for the year
- `income_count` - Number of income entries

**Usage:** Annual budget execution reports, income execution reports

### 4. annual_expenses_by_budget
Aggregates expense data by year and budget for annual reporting.

**Columns:**
- `year` - Year of expense
- `budget_id` - Budget ID
- `budget_name` - Budget name
- `budget_type` - 'circle' or 'group'
- `group_name` - Group name (null for circle budgets)
- `total_amount` - Total expense amount for the year
- `expense_count` - Number of expense entries

**Usage:** Annual budget execution reports, expense execution reports

### 5. fund_expense_summary
Provides detailed expense breakdown by fund for budget execution analysis.

**Columns:**
- `fund_id` - Fund ID
- `fund_name` - Fund name
- `allocated_amount` - Fund allocated amount
- `budget_id` - Budget ID
- `budget_name` - Budget name
- `budget_type` - 'circle' or 'group'
- `group_name` - Group name (null for circle budgets)
- `year` - Year of expense
- `month` - Month of expense (1-12)
- `spent_amount` - Total spent amount for the period
- `expense_count` - Number of expense entries
- `remaining_amount` - Remaining budget (allocated - spent)
- `utilization_percentage` - Budget utilization percentage

**Usage:** Budget execution analysis, fund performance tracking

## Performance Indexes

The following indexes were created to optimize reporting query performance:

### Date-based Indexes
- `idx_incomes_year_month` - Optimizes income queries by year/month
- `idx_reimbursements_year_month` - Optimizes reimbursement queries by year/month
- `idx_direct_expenses_year_month` - Optimizes direct expense queries by year/month

### Composite Indexes
- `idx_reimbursements_status_fund_date` - Optimizes queries filtering by status, fund, and date
- `idx_direct_expenses_fund_date` - Optimizes direct expense queries by fund and date
- `idx_incomes_budget_date` - Optimizes income queries by budget and date

### Relationship Indexes
- `idx_funds_budget_allocated` - Optimizes fund queries with budget relationships
- `idx_budgets_group_type` - Optimizes budget queries by group and type
- `idx_income_category_assignments_with_date` - Optimizes category assignment queries

## Data Sources

The views aggregate data from the following tables:
- `incomes` - Actual income entries
- `income_categories` - Income category definitions
- `income_category_assignments` - Income-to-category relationships
- `reimbursements` - Member reimbursement requests (approved/paid only)
- `direct_expenses` - Direct expenses from funds
- `funds` - Fund definitions and allocations
- `budgets` - Budget definitions
- `groups` - Group definitions

## Verification

A verification script is available to test all views and indexes:

```bash
# Run verification script
npx tsx src/db/verify-reporting-views.ts

# Or via Docker
docker-compose exec backend npx tsx src/db/verify-reporting-views.ts
```

The script verifies:
- All expected views exist
- Views have correct column structure
- Performance indexes are created
- Sample queries return data

## Migration

The views and indexes are created by migration `026_create_reporting_views.sql`.

To apply the migration:
```bash
npm run migrate
# Or via Docker
docker-compose exec backend npm run migrate
```

## Performance Considerations

- Views are not materialized - they compute results on each query
- Indexes significantly improve query performance for date-based filtering
- For very large datasets, consider materializing views or using scheduled refresh
- Query performance can be monitored using `EXPLAIN ANALYZE`

## Access Control

Views respect the same access control as underlying tables:
- Circle treasurers see all data
- Group treasurers see only their group's data
- Access control filtering should be applied at the application layer when querying views