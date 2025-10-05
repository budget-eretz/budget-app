-- Create budgets table
CREATE TABLE budgets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  fiscal_year INTEGER,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_budgets_group_id ON budgets(group_id);
CREATE INDEX idx_budgets_fiscal_year ON budgets(fiscal_year);
CREATE INDEX idx_budgets_created_by ON budgets(created_by);

-- Index for circle budgets (where group_id is NULL)
CREATE INDEX idx_budgets_circle ON budgets(id) WHERE group_id IS NULL;
