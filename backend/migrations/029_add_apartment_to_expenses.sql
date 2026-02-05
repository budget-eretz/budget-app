-- Add apartment_id to reimbursements table (optional foreign key)
ALTER TABLE reimbursements
ADD COLUMN apartment_id INTEGER REFERENCES apartments(id) ON DELETE SET NULL;

-- Add apartment_id to planned_expenses table (optional foreign key)
ALTER TABLE planned_expenses
ADD COLUMN apartment_id INTEGER REFERENCES apartments(id) ON DELETE SET NULL;

-- Add apartment_id to direct_expenses table (optional foreign key)
ALTER TABLE direct_expenses
ADD COLUMN apartment_id INTEGER REFERENCES apartments(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX idx_reimbursements_apartment_id ON reimbursements(apartment_id);
CREATE INDEX idx_planned_expenses_apartment_id ON planned_expenses(apartment_id);
CREATE INDEX idx_direct_expenses_apartment_id ON direct_expenses(apartment_id);

-- Add comments
COMMENT ON COLUMN reimbursements.apartment_id IS 'Optional apartment association for tracking expenses per apartment';
COMMENT ON COLUMN planned_expenses.apartment_id IS 'Optional apartment association for tracking expenses per apartment';
COMMENT ON COLUMN direct_expenses.apartment_id IS 'Optional apartment association for tracking expenses per apartment';
