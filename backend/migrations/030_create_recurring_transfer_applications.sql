-- Track which recurring transfers have been applied to which payment transfers
-- This prevents double-payment of recurring transfers within the same period

CREATE TABLE recurring_transfer_applications (
    id SERIAL PRIMARY KEY,
    recurring_transfer_id INTEGER NOT NULL REFERENCES recurring_transfers(id) ON DELETE CASCADE,
    payment_transfer_id INTEGER NOT NULL REFERENCES payment_transfers(id) ON DELETE CASCADE,
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL,  -- For monthly: 1-12, For quarterly: 1,4,7,10, For annual: 1
    applied_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure a recurring transfer can only be applied once per period
    UNIQUE(recurring_transfer_id, period_year, period_month)
);

-- Indexes for efficient queries
CREATE INDEX idx_rta_recurring_transfer ON recurring_transfer_applications(recurring_transfer_id);
CREATE INDEX idx_rta_payment_transfer ON recurring_transfer_applications(payment_transfer_id);
CREATE INDEX idx_rta_period ON recurring_transfer_applications(period_year, period_month);

COMMENT ON TABLE recurring_transfer_applications IS 'Tracks which recurring transfers have been included in which payment transfers to prevent duplicate payments';
COMMENT ON COLUMN recurring_transfer_applications.period_month IS 'For monthly: 1-12. For quarterly: starting month of quarter (1,4,7,10). For annual: 1';
