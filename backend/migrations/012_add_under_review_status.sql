-- Add under_review status and related columns to reimbursements table

-- Add new columns for under_review tracking
ALTER TABLE reimbursements 
ADD COLUMN under_review_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN under_review_at TIMESTAMP,
ADD COLUMN review_notes TEXT;

-- Update status constraint to include 'under_review'
ALTER TABLE reimbursements 
DROP CONSTRAINT IF EXISTS reimbursements_status_check;

ALTER TABLE reimbursements 
ADD CONSTRAINT reimbursements_status_check 
CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'paid'));

-- Create index on under_review_by for efficient queries
CREATE INDEX idx_reimbursements_under_review_by ON reimbursements(under_review_by);

-- Create index for under_review reimbursements (commonly queried)
CREATE INDEX idx_reimbursements_under_review ON reimbursements(status, under_review_at) WHERE status = 'under_review';
