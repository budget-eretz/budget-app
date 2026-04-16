-- Add recipient_group_id to recurring_transfers for group recipients
ALTER TABLE recurring_transfers
    ADD COLUMN recipient_group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE;

-- Make recipient_user_id nullable (group transfers don't have a user recipient)
ALTER TABLE recurring_transfers
    ALTER COLUMN recipient_user_id DROP NOT NULL;

-- Ensure exactly one recipient type is set
ALTER TABLE recurring_transfers
    ADD CONSTRAINT chk_recipient_type CHECK (
        (recipient_user_id IS NOT NULL AND recipient_group_id IS NULL) OR
        (recipient_user_id IS NULL AND recipient_group_id IS NOT NULL)
    );

-- Index for group recipient lookups
CREATE INDEX idx_recurring_transfers_recipient_group ON recurring_transfers(recipient_group_id);

COMMENT ON COLUMN recurring_transfers.recipient_group_id IS 'Group recipient for recurring bank transfers to groups (mutually exclusive with recipient_user_id)';
