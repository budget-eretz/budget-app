-- Migration: Add budget_type column to budgets table
-- Purpose: Support "treasurers budget" - special budget accessible only to circle treasurers

-- Create budget_type enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'budget_type_enum'
  ) THEN
    CREATE TYPE budget_type_enum AS ENUM ('general', 'treasurers');
  END IF;
END $$;

-- Add budget_type column with default 'general' for backward compatibility
ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS budget_type budget_type_enum NOT NULL DEFAULT 'general';

-- Add indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_budgets_budget_type ON budgets(budget_type);
CREATE INDEX IF NOT EXISTS idx_budgets_treasurers ON budgets(budget_type, group_id)
  WHERE budget_type = 'treasurers' AND group_id IS NULL;

-- Add constraint: treasurers budgets must be circle-level (group_id IS NULL)
ALTER TABLE budgets
ADD CONSTRAINT check_treasurers_budget_circle_level
CHECK (
  budget_type != 'treasurers' OR (budget_type = 'treasurers' AND group_id IS NULL)
);

-- Add comment for documentation
COMMENT ON COLUMN budgets.budget_type IS
  'Type of budget: general (regular budgets) or treasurers (special budget for circle treasurers only)';
