-- Create fund_allocation_history table to track changes to monthly allocations
CREATE TABLE fund_allocation_history (
  id SERIAL PRIMARY KEY,
  fund_id INTEGER REFERENCES funds(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  allocated_amount DECIMAL(12,2) NOT NULL CHECK (allocated_amount >= 0),
  allocation_type VARCHAR(20) NOT NULL CHECK (allocation_type IN ('fixed', 'variable')),
  changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP DEFAULT NOW(),
  change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('created', 'updated', 'deleted'))
);

-- Create indexes for efficient querying
CREATE INDEX idx_fund_allocation_history_fund_id ON fund_allocation_history(fund_id);
CREATE INDEX idx_fund_allocation_history_year_month ON fund_allocation_history(year, month);
CREATE INDEX idx_fund_allocation_history_changed_at ON fund_allocation_history(changed_at);
