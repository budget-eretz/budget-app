-- Create expected_incomes table
CREATE TABLE expected_incomes (
  id SERIAL PRIMARY KEY,
  budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  source_name VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('one-time', 'monthly', 'quarterly', 'annual')),
  parent_annual_id INTEGER REFERENCES expected_incomes(id) ON DELETE CASCADE,
  is_manual BOOLEAN DEFAULT false,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for faster lookups
CREATE INDEX idx_expected_incomes_budget ON expected_incomes(budget_id);
CREATE INDEX idx_expected_incomes_user ON expected_incomes(user_id);
CREATE INDEX idx_expected_incomes_year_month ON expected_incomes(year, month);
CREATE INDEX idx_expected_incomes_parent ON expected_incomes(parent_annual_id);
