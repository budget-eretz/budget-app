-- Create group_bank_transfers table for tracking bank transfers to groups
CREATE TABLE group_bank_transfers (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    description TEXT,
    budget_id INTEGER REFERENCES budgets(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executed')),
    created_by INTEGER NOT NULL REFERENCES users(id),
    executed_at TIMESTAMP,
    executed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_group_bank_transfers_group ON group_bank_transfers(group_id);
CREATE INDEX idx_group_bank_transfers_status ON group_bank_transfers(status);
CREATE INDEX idx_group_bank_transfers_created_by ON group_bank_transfers(created_by);
CREATE INDEX idx_group_bank_transfers_created_at ON group_bank_transfers(created_at);

COMMENT ON TABLE group_bank_transfers IS 'Tracks actual bank transfers from circle account to group accounts';
