-- Add rejected status and notes to incomes table
-- This allows circle treasurers to reject incomes with explanation

-- Drop existing CHECK constraint and recreate with rejected status
ALTER TABLE incomes
DROP CONSTRAINT IF EXISTS incomes_status_check;

ALTER TABLE incomes
ADD CONSTRAINT incomes_status_check
  CHECK (status IN ('pending', 'confirmed', 'rejected'));

-- Add notes column for rejection/confirmation notes
ALTER TABLE incomes
ADD COLUMN notes TEXT;

-- Add index for rejected incomes
CREATE INDEX idx_incomes_rejected ON incomes(status, created_at)
  WHERE status = 'rejected';

-- Add documentation
COMMENT ON COLUMN incomes.notes IS 'Notes from circle treasurer when confirming or rejecting income';
