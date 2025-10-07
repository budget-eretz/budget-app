-- Add recipient_user_id column to reimbursements table
ALTER TABLE reimbursements 
ADD COLUMN recipient_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Add index for recipient queries
CREATE INDEX idx_reimbursements_recipient_user_id ON reimbursements(recipient_user_id);

-- Update existing records to set recipient_user_id = user_id (submitter is also recipient by default)
UPDATE reimbursements SET recipient_user_id = user_id WHERE recipient_user_id IS NULL;
