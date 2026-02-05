-- Add snapshot columns to recurring_transfer_applications table
-- This preserves historical data even if the recurring transfer is deleted

-- Add snapshot columns
ALTER TABLE recurring_transfer_applications
ADD COLUMN description VARCHAR(500),
ADD COLUMN fund_name VARCHAR(255),
ADD COLUMN frequency VARCHAR(20);

-- Drop the old foreign key constraint with CASCADE
ALTER TABLE recurring_transfer_applications
DROP CONSTRAINT IF EXISTS recurring_transfer_applications_recurring_transfer_id_fkey;

-- Make recurring_transfer_id nullable (so we keep records even if parent is deleted)
ALTER TABLE recurring_transfer_applications
ALTER COLUMN recurring_transfer_id DROP NOT NULL;

-- Add new foreign key with SET NULL behavior
ALTER TABLE recurring_transfer_applications
ADD CONSTRAINT recurring_transfer_applications_recurring_transfer_id_fkey
FOREIGN KEY (recurring_transfer_id) REFERENCES recurring_transfers(id) ON DELETE SET NULL;

-- Update existing records with snapshot data from recurring_transfers
UPDATE recurring_transfer_applications rta
SET
  description = rt.description,
  fund_name = f.name,
  frequency = rt.frequency
FROM recurring_transfers rt
JOIN funds f ON rt.fund_id = f.id
WHERE rta.recurring_transfer_id = rt.id
  AND rta.description IS NULL;

COMMENT ON COLUMN recurring_transfer_applications.description IS 'Snapshot of the recurring transfer description at time of application';
COMMENT ON COLUMN recurring_transfer_applications.fund_name IS 'Snapshot of the fund name at time of application';
COMMENT ON COLUMN recurring_transfer_applications.frequency IS 'Snapshot of the frequency at time of application';
