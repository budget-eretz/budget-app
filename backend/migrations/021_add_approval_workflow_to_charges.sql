-- Add approval workflow fields to charges table
-- This allows charges to go through the same approval process as reimbursements

-- Update status column to support approval workflow
ALTER TABLE charges DROP CONSTRAINT IF EXISTS charges_status_check;
ALTER TABLE charges 
  ALTER COLUMN status SET DEFAULT 'pending',
  ADD CONSTRAINT charges_status_check CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'paid', 'active', 'settled', 'cancelled'));

-- Add approval workflow fields
ALTER TABLE charges ADD COLUMN reviewed_by INTEGER REFERENCES users(id);
ALTER TABLE charges ADD COLUMN reviewed_at TIMESTAMP;
ALTER TABLE charges ADD COLUMN notes TEXT;

-- Add under review fields
ALTER TABLE charges ADD COLUMN under_review_by INTEGER REFERENCES users(id);
ALTER TABLE charges ADD COLUMN under_review_at TIMESTAMP;
ALTER TABLE charges ADD COLUMN review_notes TEXT;

-- Add payment transfer link
ALTER TABLE charges ADD COLUMN payment_transfer_id INTEGER REFERENCES payment_transfers(id);

-- Add indexes for new fields
CREATE INDEX idx_charges_reviewed_by ON charges(reviewed_by);
CREATE INDEX idx_charges_under_review_by ON charges(under_review_by);
CREATE INDEX idx_charges_payment_transfer_id ON charges(payment_transfer_id);

-- Update existing 'active' charges to 'approved' status for backward compatibility
UPDATE charges SET status = 'approved' WHERE status = 'active';

-- Update existing 'settled' charges to 'paid' status for backward compatibility
UPDATE charges SET status = 'paid' WHERE status = 'settled';

-- Note: 'cancelled' charges remain as 'cancelled' (equivalent to 'rejected')

COMMENT ON COLUMN charges.status IS 'Charge status: pending (awaiting approval), under_review (flagged for review), approved (approved for payment), rejected (declined), paid (payment completed), cancelled (legacy rejected status)';
COMMENT ON COLUMN charges.reviewed_by IS 'Treasurer who approved or rejected the charge';
COMMENT ON COLUMN charges.reviewed_at IS 'Timestamp when charge was approved or rejected';
COMMENT ON COLUMN charges.notes IS 'Approval/rejection notes from treasurer';
COMMENT ON COLUMN charges.under_review_by IS 'Treasurer who marked charge for review';
COMMENT ON COLUMN charges.under_review_at IS 'Timestamp when charge was marked for review';
COMMENT ON COLUMN charges.review_notes IS 'Notes for items under review';
COMMENT ON COLUMN charges.payment_transfer_id IS 'Link to payment transfer when charge is approved';
