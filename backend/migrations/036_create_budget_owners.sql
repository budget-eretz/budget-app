-- Migration: Create budget_owners table for personal budgets
-- Purpose: Assign a circle-level budget to specific members. Only those members
--          (and circle treasurers) can see the budget, its funds and its expenses.

CREATE TABLE IF NOT EXISTS budget_owners (
  budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (budget_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_budget_owners_user_id ON budget_owners(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_owners_budget_id ON budget_owners(budget_id);

-- Personal budgets must be circle-level (no group), same rule as treasurers budgets
ALTER TABLE budgets
DROP CONSTRAINT IF EXISTS check_personal_budget_circle_level;

ALTER TABLE budgets
ADD CONSTRAINT check_personal_budget_circle_level
CHECK (budget_type <> 'personal' OR group_id IS NULL);

COMMENT ON TABLE budget_owners IS
  'Members a personal budget is assigned to. Only these members and circle treasurers can access the budget.';
