-- Create planned_expenses table
CREATE TABLE planned_expenses (
  id SERIAL PRIMARY KEY,
  fund_id INTEGER REFERENCES funds(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  description TEXT NOT NULL,
  planned_date DATE,
  status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'executed', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_planned_expenses_fund_id ON planned_expenses(fund_id);
CREATE INDEX idx_planned_expenses_user_id ON planned_expenses(user_id);
CREATE INDEX idx_planned_expenses_status ON planned_expenses(status);
CREATE INDEX idx_planned_expenses_planned_date ON planned_expenses(planned_date);
