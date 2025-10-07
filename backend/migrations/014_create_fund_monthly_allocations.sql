-- Create fund_monthly_allocations table
CREATE TABLE fund_monthly_allocations (
  id SERIAL PRIMARY KEY,
  fund_id INTEGER REFERENCES funds(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  allocated_amount DECIMAL(12,2) NOT NULL CHECK (allocated_amount >= 0),
  allocation_type VARCHAR(20) NOT NULL CHECK (allocation_type IN ('fixed', 'variable')),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(fund_id, year, month)
);

-- Create indexes for performance optimization
CREATE INDEX idx_fund_monthly_allocations_fund_id ON fund_monthly_allocations(fund_id);
CREATE INDEX idx_fund_monthly_allocations_year_month ON fund_monthly_allocations(year, month);

-- Add comment to table
COMMENT ON TABLE fund_monthly_allocations IS 'Stores monthly allocation amounts for funds, supporting both fixed and variable allocation strategies';
