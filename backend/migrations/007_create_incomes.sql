-- Create incomes table
CREATE TABLE incomes (
  id SERIAL PRIMARY KEY,
  budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  source VARCHAR(255) NOT NULL,
  description TEXT,
  income_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_incomes_budget_id ON incomes(budget_id);
CREATE INDEX idx_incomes_user_id ON incomes(user_id);
CREATE INDEX idx_incomes_income_date ON incomes(income_date);
CREATE INDEX idx_incomes_source ON incomes(source);
