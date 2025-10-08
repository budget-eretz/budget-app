-- Create direct_expenses table
CREATE TABLE direct_expenses (
  id SERIAL PRIMARY KEY,
  fund_id INTEGER NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  expense_date DATE NOT NULL,
  payee VARCHAR(255) NOT NULL,
  receipt_url TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_direct_expenses_fund_id ON direct_expenses(fund_id);
CREATE INDEX idx_direct_expenses_expense_date ON direct_expenses(expense_date);
CREATE INDEX idx_direct_expenses_created_by ON direct_expenses(created_by);

-- Add comment
COMMENT ON TABLE direct_expenses IS 'Direct expenses from funds that are not reimbursements to members';
