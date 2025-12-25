-- Create optimized database views for financial reporting
-- Migration: 026_create_reporting_views.sql

-- Monthly income by category view
-- Aggregates income data by year, month, and category for reporting
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
-- Aggregates expense data (reimbursements + direct expenses) by year, month, and budget
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
  -- Approved and paid reimbursements
  SELECT r.expense_date, r.amount, f.budget_id
  FROM reimbursements r
  JOIN funds f ON r.fund_id = f.id
  WHERE r.status IN ('approved', 'paid')
  
  UNION ALL
  
  -- Direct expenses
  SELECT de.expense_date, de.amount, f.budget_id
  FROM direct_expenses de
  JOIN funds f ON de.fund_id = f.id
) expenses
JOIN budgets b ON expenses.budget_id = b.id
LEFT JOIN groups g ON b.group_id = g.id
GROUP BY year, month, b.id, b.name, budget_type, g.name;

-- Annual income by category view
-- Aggregates income data by year and category for annual reporting
CREATE VIEW annual_income_by_category AS
SELECT 
  EXTRACT(YEAR FROM i.income_date) as year,
  ic.id as category_id,
  ic.name as category_name,
  ic.color as category_color,
  SUM(i.amount) as total_amount,
  COUNT(i.id) as income_count
FROM incomes i
JOIN income_category_assignments ica ON i.id = ica.income_id
JOIN income_categories ic ON ica.category_id = ic.id
GROUP BY year, ic.id, ic.name, ic.color;

-- Annual expenses by budget view
-- Aggregates expense data by year and budget for annual reporting
CREATE VIEW annual_expenses_by_budget AS
SELECT 
  EXTRACT(YEAR FROM expense_date) as year,
  b.id as budget_id,
  b.name as budget_name,
  CASE WHEN b.group_id IS NULL THEN 'circle' ELSE 'group' END as budget_type,
  g.name as group_name,
  SUM(amount) as total_amount,
  COUNT(*) as expense_count
FROM (
  -- Approved and paid reimbursements
  SELECT r.expense_date, r.amount, f.budget_id
  FROM reimbursements r
  JOIN funds f ON r.fund_id = f.id
  WHERE r.status IN ('approved', 'paid')
  
  UNION ALL
  
  -- Direct expenses
  SELECT de.expense_date, de.amount, f.budget_id
  FROM direct_expenses de
  JOIN funds f ON de.fund_id = f.id
) expenses
JOIN budgets b ON expenses.budget_id = b.id
LEFT JOIN groups g ON b.group_id = g.id
GROUP BY year, b.id, b.name, budget_type, g.name;

-- Fund expense summary view
-- Provides detailed expense breakdown by fund for budget execution analysis
CREATE VIEW fund_expense_summary AS
SELECT 
  f.id as fund_id,
  f.name as fund_name,
  f.allocated_amount,
  b.id as budget_id,
  b.name as budget_name,
  CASE WHEN b.group_id IS NULL THEN 'circle' ELSE 'group' END as budget_type,
  g.name as group_name,
  EXTRACT(YEAR FROM expense_date) as year,
  EXTRACT(MONTH FROM expense_date) as month,
  SUM(amount) as spent_amount,
  COUNT(*) as expense_count,
  f.allocated_amount - COALESCE(SUM(amount), 0) as remaining_amount,
  CASE 
    WHEN f.allocated_amount > 0 THEN 
      ROUND((COALESCE(SUM(amount), 0) / f.allocated_amount * 100), 2)
    ELSE 0 
  END as utilization_percentage
FROM funds f
JOIN budgets b ON f.budget_id = b.id
LEFT JOIN groups g ON b.group_id = g.id
LEFT JOIN (
  -- Approved and paid reimbursements
  SELECT r.expense_date, r.amount, r.fund_id
  FROM reimbursements r
  WHERE r.status IN ('approved', 'paid')
  
  UNION ALL
  
  -- Direct expenses
  SELECT de.expense_date, de.amount, de.fund_id
  FROM direct_expenses de
) expenses ON f.id = expenses.fund_id
GROUP BY f.id, f.name, f.allocated_amount, b.id, b.name, budget_type, g.name, year, month;

-- Performance optimization indexes for existing tables
-- These indexes will improve query performance for reporting operations

-- Indexes for better date-based filtering and grouping
CREATE INDEX IF NOT EXISTS idx_incomes_year_month ON incomes(EXTRACT(YEAR FROM income_date), EXTRACT(MONTH FROM income_date));
CREATE INDEX IF NOT EXISTS idx_reimbursements_year_month ON reimbursements(EXTRACT(YEAR FROM expense_date), EXTRACT(MONTH FROM expense_date));
CREATE INDEX IF NOT EXISTS idx_direct_expenses_year_month ON direct_expenses(EXTRACT(YEAR FROM expense_date), EXTRACT(MONTH FROM expense_date));

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_reimbursements_status_fund_date ON reimbursements(status, fund_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_direct_expenses_fund_date ON direct_expenses(fund_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_incomes_budget_date ON incomes(budget_id, income_date);

-- Indexes for budget and fund relationships
CREATE INDEX IF NOT EXISTS idx_funds_budget_allocated ON funds(budget_id, allocated_amount);
CREATE INDEX IF NOT EXISTS idx_budgets_group_type ON budgets(group_id, total_amount);

-- Index for income category assignments with date filtering
CREATE INDEX IF NOT EXISTS idx_income_category_assignments_with_date ON income_category_assignments(category_id, income_id);

-- Comments for documentation
COMMENT ON VIEW monthly_income_by_category IS 'Aggregated monthly income data by category for reporting';
COMMENT ON VIEW monthly_expenses_by_budget IS 'Aggregated monthly expense data by budget for reporting';
COMMENT ON VIEW annual_income_by_category IS 'Aggregated annual income data by category for reporting';
COMMENT ON VIEW annual_expenses_by_budget IS 'Aggregated annual expense data by budget for reporting';
COMMENT ON VIEW fund_expense_summary IS 'Detailed fund expense summary with utilization metrics for budget execution analysis';