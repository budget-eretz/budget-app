-- Migration: Create payment_transfers table and associate with reimbursements
-- This migration creates the payment transfer system that groups approved reimbursements
-- by recipient and budget type for efficient payment execution

-- Create payment_transfers table
CREATE TABLE payment_transfers (
  id SERIAL PRIMARY KEY,
  recipient_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  budget_type VARCHAR(20) NOT NULL CHECK (budget_type IN ('circle', 'group')),
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'executed')),
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  reimbursement_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  executed_at TIMESTAMP,
  executed_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Add indexes for performance
CREATE INDEX idx_payment_transfers_recipient ON payment_transfers(recipient_user_id);
CREATE INDEX idx_payment_transfers_status ON payment_transfers(status);
CREATE INDEX idx_payment_transfers_budget_type ON payment_transfers(budget_type);
CREATE INDEX idx_payment_transfers_group_id ON payment_transfers(group_id);
CREATE INDEX idx_payment_transfers_pending ON payment_transfers(status, created_at) WHERE status = 'pending';

-- Add payment_transfer_id column to reimbursements table
ALTER TABLE reimbursements 
ADD COLUMN payment_transfer_id INTEGER REFERENCES payment_transfers(id) ON DELETE SET NULL;

-- Add index on payment_transfer_id in reimbursements table
CREATE INDEX idx_reimbursements_payment_transfer_id ON reimbursements(payment_transfer_id);

-- Migrate existing approved reimbursements to payment transfers
-- Group by recipient and budget type, create transfers, and associate reimbursements
DO $$
DECLARE
  rec RECORD;
  transfer_id INTEGER;
  v_budget_type VARCHAR(20);
  v_group_id INTEGER;
BEGIN
  -- For each unique combination of recipient and budget type with approved reimbursements
  FOR rec IN 
    SELECT 
      r.recipient_user_id,
      CASE WHEN b.group_id IS NULL THEN 'circle' ELSE 'group' END as budget_type,
      b.group_id,
      SUM(r.amount) as total_amount,
      COUNT(*) as reimbursement_count
    FROM reimbursements r
    JOIN funds f ON r.fund_id = f.id
    JOIN budgets b ON f.budget_id = b.id
    WHERE r.status = 'approved'
    GROUP BY r.recipient_user_id, CASE WHEN b.group_id IS NULL THEN 'circle' ELSE 'group' END, b.group_id
  LOOP
    -- Store values in variables for clarity
    v_budget_type := rec.budget_type;
    v_group_id := rec.group_id;
    
    -- Create payment transfer
    INSERT INTO payment_transfers (
      recipient_user_id, 
      budget_type, 
      group_id, 
      status, 
      total_amount, 
      reimbursement_count
    )
    VALUES (
      rec.recipient_user_id,
      v_budget_type,
      v_group_id,
      'pending',
      rec.total_amount,
      rec.reimbursement_count
    )
    RETURNING id INTO transfer_id;
    
    -- Associate reimbursements with this transfer
    UPDATE reimbursements
    SET payment_transfer_id = transfer_id
    WHERE recipient_user_id = rec.recipient_user_id
      AND status = 'approved'
      AND fund_id IN (
        SELECT f.id 
        FROM funds f
        JOIN budgets b ON f.budget_id = b.id
        WHERE (v_budget_type = 'circle' AND b.group_id IS NULL)
           OR (v_budget_type = 'group' AND b.group_id = v_group_id)
      );
  END LOOP;
END $$;
