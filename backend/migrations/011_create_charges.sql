-- Create charges table for tracking debts owed by users to the circle/group
CREATE TABLE charges (
  id SERIAL PRIMARY KEY,
  fund_id INTEGER REFERENCES funds(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  charge_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'settled', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for efficient queries
CREATE INDEX idx_charges_fund_id ON charges(fund_id);
CREATE INDEX idx_charges_user_id ON charges(user_id);
CREATE INDEX idx_charges_status ON charges(status);

-- Index for active charges (most commonly queried)
CREATE INDEX idx_charges_active ON charges(status, created_at) WHERE status = 'active';
