-- Create reimbursements table
CREATE TABLE reimbursements (
  id SERIAL PRIMARY KEY,
  fund_id INTEGER REFERENCES funds(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  description TEXT NOT NULL,
  expense_date DATE NOT NULL,
  receipt_url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_reimbursements_fund_id ON reimbursements(fund_id);
CREATE INDEX idx_reimbursements_user_id ON reimbursements(user_id);
CREATE INDEX idx_reimbursements_status ON reimbursements(status);
CREATE INDEX idx_reimbursements_reviewed_by ON reimbursements(reviewed_by);
CREATE INDEX idx_reimbursements_expense_date ON reimbursements(expense_date);

-- Index for pending reimbursements (most commonly queried)
CREATE INDEX idx_reimbursements_pending ON reimbursements(status, created_at) WHERE status = 'pending';
