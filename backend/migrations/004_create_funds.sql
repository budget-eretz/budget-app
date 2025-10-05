-- Create funds table
CREATE TABLE funds (
  id SERIAL PRIMARY KEY,
  budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  allocated_amount DECIMAL(12,2) NOT NULL CHECK (allocated_amount >= 0),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_funds_budget_id ON funds(budget_id);
CREATE INDEX idx_funds_name ON funds(name);
