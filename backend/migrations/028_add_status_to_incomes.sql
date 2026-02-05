-- Add status tracking to incomes table
-- This migration adds status workflow for income verification by circle treasurers

-- Add new columns for status tracking
ALTER TABLE incomes
ADD COLUMN status VARCHAR(50) DEFAULT 'confirmed'
  CHECK (status IN ('pending', 'confirmed')),
ADD COLUMN confirmed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN confirmed_at TIMESTAMP;

-- Update existing incomes to be confirmed
-- Existing incomes are already affecting budget, so they should be marked as confirmed
UPDATE incomes
SET confirmed_by = user_id,
    confirmed_at = created_at,
    status = 'confirmed'
WHERE status = 'confirmed';

-- Create indexes for performance
CREATE INDEX idx_incomes_status ON incomes(status);
CREATE INDEX idx_incomes_confirmed_by ON incomes(confirmed_by);

-- Create partial index for pending incomes (most commonly queried)
CREATE INDEX idx_incomes_pending ON incomes(status, created_at)
  WHERE status = 'pending';

-- Add documentation comments
COMMENT ON COLUMN incomes.status IS 'Income status: pending (awaiting confirmation) or confirmed (verified by circle treasurer)';
COMMENT ON COLUMN incomes.confirmed_by IS 'User ID of circle treasurer who confirmed the income';
COMMENT ON COLUMN incomes.confirmed_at IS 'Timestamp when income was confirmed';
