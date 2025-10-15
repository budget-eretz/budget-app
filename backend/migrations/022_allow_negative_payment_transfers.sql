-- Migration: Allow negative total_amount in payment_transfers
-- This allows payment transfers to temporarily have negative amounts when charges exceed reimbursements
-- These negative transfers will be handled during execution by converting to carry-forward charges

-- Drop the existing constraint that prevents negative amounts
ALTER TABLE payment_transfers 
DROP CONSTRAINT payment_transfers_total_amount_check;
