-- Make planned_date required in planned_expenses table

-- First, update any existing NULL values to a default date (today)
UPDATE planned_expenses 
SET planned_date = CURRENT_DATE 
WHERE planned_date IS NULL;

-- Now make the column NOT NULL
ALTER TABLE planned_expenses 
ALTER COLUMN planned_date SET NOT NULL;
