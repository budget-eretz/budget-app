-- Add is_active column to budgets table
ALTER TABLE budgets 
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Add index for active budgets
CREATE INDEX idx_budgets_is_active ON budgets(is_active);

-- Add comment
COMMENT ON COLUMN budgets.is_active IS 'Indicates whether the budget is active. Inactive budgets cannot receive new reimbursements and are hidden from reimbursement forms.';
