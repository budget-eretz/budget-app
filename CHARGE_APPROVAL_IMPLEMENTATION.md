# Charge Approval Workflow Implementation

## Overview
Implemented a complete approval workflow for charges, mirroring the reimbursement approval process. Charges now go through the same multi-status workflow (pending → under_review → approved → rejected → paid) and are integrated with the payment transfer system.

## Changes Made

### 1. Database Migration (021_add_approval_workflow_to_charges.sql)
Added approval workflow fields to the `charges` table:
- **Status field**: Updated to support: `pending`, `under_review`, `approved`, `rejected`, `paid` (plus legacy `active`, `settled`, `cancelled`)
- **Approval fields**: `reviewed_by`, `reviewed_at`, `notes`
- **Review fields**: `under_review_by`, `under_review_at`, `review_notes`
- **Payment integration**: `payment_transfer_id` (links to payment transfers)
- **Backward compatibility**: Migrated existing `active` → `approved`, `settled` → `paid`

### 2. Backend Controller (chargeController.ts)
Created comprehensive charge controller with:
- **User endpoints**: `getMyCharges`, `getCharges`, `getChargeById`, `createCharge`, `updateCharge`, `deleteCharge`
- **Treasurer endpoints**: `getTreasurerCharges`, `markForReview`, `returnToPending`
- **Batch operations**: `batchApprove`, `batchReject`, `batchMarkForReview`
- **Access control**: Budget-based filtering (circle/group treasurers)
- **Transaction safety**: Uses database transactions for batch operations

### 3. Payment Transfer Integration
Updated `paymentTransferHelpers.ts`:
- **New function**: `associateChargeWithTransfer()` - Links approved charges to payment transfers
- **Updated function**: `updateTransferTotals()` - Now calculates net amount (reimbursements - charges)
- **Net calculation**: Transfer total = sum of reimbursements - sum of charges

### 4. Payment Transfer Controller Updates
Enhanced `paymentTransferController.ts`:
- **Transfer details**: Now includes both reimbursements and charges with `item_type` field
- **Charge display**: Charges shown with negative amounts in transfer details
- **Execution**: Both reimbursements and charges marked as `paid` when transfer executed
- **Sorting**: Combined items sorted by date

### 5. Routes (chargeRoutes.ts)
Created complete route definitions:
- User routes: `/my`, `/`, `/:id`, `POST /`, `PATCH /:id`, `DELETE /:id`
- Treasurer routes: `/treasurer/all`, `/:id/mark-review`, `/:id/return-to-pending`
- Batch routes: `/batch/approve`, `/batch/reject`, `/batch/mark-review`

### 6. Summary Calculation Update
Updated `reimbursementController.getMySummary()`:
- Changed from `status = 'active'` to `status = 'pending'` for charges
- Now calculates net amount based on pending charges (not approved/active)

## Key Features

### Approval Workflow
1. **Pending**: User submits charge, awaits treasurer review
2. **Under Review**: Treasurer flags charge for additional verification
3. **Approved**: Treasurer approves charge, automatically linked to payment transfer
4. **Rejected**: Treasurer declines charge with documented reason
5. **Paid**: Charge marked as paid when payment transfer executed

### Batch Operations
- Select multiple charges across status tables
- Batch approve with optional notes
- Batch reject with required reason
- Batch mark for review with optional notes
- Transaction-safe operations with rollback on error

### Payment Transfer Integration
- Approved charges automatically join open payment transfer for user
- Charges reduce the net amount owed to user
- Transfer total = reimbursements - charges
- Both reimbursements and charges marked as paid on execution

### Access Control
- **Circle Treasurers**: Can approve/reject charges from circle budget funds only
- **Group Treasurers**: Can approve/reject charges from their group budget funds only
- **Users**: Can only view/edit their own pending charges

## API Endpoints

### User Endpoints
- `GET /api/charges/my` - Get user's charges
- `GET /api/charges` - List all charges (filtered by access)
- `GET /api/charges/:id` - Get charge by ID
- `POST /api/charges` - Create new charge (status: pending)
- `PATCH /api/charges/:id` - Update charge (owner only, pending only)
- `DELETE /api/charges/:id` - Delete charge (owner only, pending only)

### Treasurer Endpoints
- `GET /api/charges/treasurer/all` - Get all charges grouped by status
- `POST /api/charges/:id/mark-review` - Mark charge for review
- `POST /api/charges/:id/return-to-pending` - Return charge to pending
- `POST /api/charges/batch/approve` - Batch approve charges
- `POST /api/charges/batch/reject` - Batch reject charges
- `POST /api/charges/batch/mark-review` - Batch mark for review

## Database Schema

```sql
charges (
  id SERIAL PRIMARY KEY,
  fund_id INTEGER REFERENCES funds(id),
  user_id INTEGER REFERENCES users(id),
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  charge_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',  -- pending, under_review, approved, rejected, paid
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  notes TEXT,
  under_review_by INTEGER REFERENCES users(id),
  under_review_at TIMESTAMP,
  review_notes TEXT,
  payment_transfer_id INTEGER REFERENCES payment_transfers(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

## Next Steps (Frontend)

To complete the implementation, the following frontend work is needed:

1. **Update MyReimbursements page** to include charges with approval status
2. **Update Payments page** (Treasurer Approval) to show charges alongside reimbursements
3. **Add visual distinction** for charges (negative amounts in red, charge icon)
4. **Update PaymentTransferDetailsModal** to display both reimbursements and charges
5. **Update charge submission form** to reflect new pending status
6. **Add charge approval components** similar to reimbursement approval

## Testing Checklist

- [ ] Create charge with pending status
- [ ] Edit pending charge
- [ ] Delete pending charge
- [ ] Treasurer mark charge for review
- [ ] Treasurer return charge to pending
- [ ] Treasurer approve single charge
- [ ] Treasurer reject single charge
- [ ] Treasurer batch approve charges
- [ ] Treasurer batch reject charges
- [ ] Verify charge linked to payment transfer
- [ ] Verify net amount calculation (reimbursements - charges)
- [ ] Execute payment transfer with charges
- [ ] Verify charges marked as paid
- [ ] Test access control (circle vs group treasurers)

## Migration Notes

- Existing charges with `status = 'active'` were migrated to `status = 'approved'`
- Existing charges with `status = 'settled'` were migrated to `status = 'paid'`
- Existing charges with `status = 'cancelled'` remain as `cancelled` (equivalent to rejected)
- All new charges will be created with `status = 'pending'`
