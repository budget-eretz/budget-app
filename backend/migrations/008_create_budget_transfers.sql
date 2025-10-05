-- Create budget_transfers table
CREATE TABLE budget_transfers (
  id SERIAL PRIMARY KEY,
  from_budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE NOT NULL,
  to_budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  transferred_by INTEGER REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT different_budgets CHECK (from_budget_id != to_budget_id)
);

-- Add indexes
CREATE INDEX idx_budget_transfers_from_budget ON budget_transfers(from_budget_id);
CREATE INDEX idx_budget_transfers_to_budget ON budget_transfers(to_budget_id);
CREATE INDEX idx_budget_transfers_transferred_by ON budget_transfers(transferred_by);
CREATE INDEX idx_budget_transfers_created_at ON budget_transfers(created_at);
