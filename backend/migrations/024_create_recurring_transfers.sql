-- Create recurring_transfers table for regular monthly transfers to members
CREATE TABLE recurring_transfers (
    id SERIAL PRIMARY KEY,
    recipient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fund_id INTEGER NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    frequency VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly', 'quarterly', 'annual')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_recurring_transfers_recipient ON recurring_transfers(recipient_user_id);
CREATE INDEX idx_recurring_transfers_fund ON recurring_transfers(fund_id);
CREATE INDEX idx_recurring_transfers_status ON recurring_transfers(status);

-- Add comment
COMMENT ON TABLE recurring_transfers IS 'Regular recurring transfers to members (e.g., health insurance, phone bills)';
