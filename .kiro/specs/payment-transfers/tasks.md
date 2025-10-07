# Implementation Plan - Payment Transfers (העברות תשלום)

- [x] 1. Create database migration for payment_transfers table





  - Create migration file `013_create_payment_transfers.sql`
  - Define payment_transfers table with all required fields (recipient_user_id, budget_type, group_id, status, total_amount, reimbursement_count, created_at, executed_at, executed_by)
  - Add indexes for performance (recipient, status, budget_type, group_id)
  - Add payment_transfer_id column to reimbursements table
  - Add index on payment_transfer_id in reimbursements table
  - Migrate existing approved reimbursements to payment transfers (group by recipient and budget type)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5_
-

- [x] 2. Implement backend helper functions for payment transfers




  - Create helper function `getBudgetTypeForFund` to determine if fund is from circle or group budget
  - Create helper function `canAccessBudgetType` to check treasurer permissions for budget type
  - Create helper function `getOrCreateOpenTransfer` to find or create open transfer for recipient and budget type
  - Create helper function `updateTransferTotals` to recalculate transfer amount and count
  - Create helper function `associateReimbursementWithTransfer` to link reimbursement to transfer
  - _Requirements: 1.1, 1.2, 1.5, 5.1, 6.1, 6.2, 6.3, 6.5, 6.6_

- [x] 3. Create payment transfer controller





  - Create `backend/src/controllers/paymentTransferController.ts`
  - Implement `getPaymentTransfers` function with access control filtering by budget type
  - Implement `getPaymentTransferById` function to get transfer with all associated reimbursements
  - Implement `executePaymentTransfer` function to mark transfer as executed and update all reimbursements to paid
  - Implement `getPaymentTransferStats` function to get statistics (pending count, pending amount, executed count, executed amount)
  - Add proper error handling for all functions
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3_

- [x] 4. Create payment transfer routes




  - Create `backend/src/routes/paymentTransferRoutes.ts`
  - Add GET `/api/payment-transfers` route for listing transfers
  - Add GET `/api/payment-transfers/stats` route for statistics
  - Add GET `/api/payment-transfers/:id` route for transfer details
  - Add POST `/api/payment-transfers/:id/execute` route for executing transfer
  - Apply authentication and treasurer authorization middleware to all routes
  - Register routes in main server file
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.4_

- [x] 5. Modify reimbursement controller to associate with transfers




  - Update `approveReimbursement` function to call `associateReimbursementWithTransfer` after approval
  - Update `batchApprove` function to associate each approved reimbursement with transfer
  - Update `getTreasurerReimbursements` function to filter by budget type based on treasurer role
  - Add budget type filtering: circle treasurer sees only circle budgets, group treasurer sees only their group budgets
  - Remove or deprecate individual `markAsPaid` and `batchMarkAsPaid` functions (replaced by transfer execution)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 6. Update TypeScript types for payment transfers




  - Add `PaymentTransfer` interface in `backend/src/types/index.ts`
  - Add `PaymentTransferDetails` interface (extends PaymentTransfer with reimbursements array)
  - Add `PaymentTransferStats` interface
  - Update `Reimbursement` interface to include `paymentTransferId` and `paymentTransferStatus` fields
  - Add same interfaces in `frontend/src/types/index.ts`
  - _Requirements: 1.4, 4.1, 4.2, 4.3, 7.1, 7.2, 7.3_

-

- [x] 7. Create PaymentTransferTable component



  - Create `frontend/src/components/PaymentTransferTable.tsx`
  - Display transfers in table format with columns: recipient name, budget type, reimbursement count, total amount, creation date, status
  - Add sortable columns (click header to sort)
  - Add execute button for pending transfers
  - Add click handler to open transfer details
  - Style with Hebrew RTL support
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 8. Create PaymentTransferDetailsModal component




  - Create `frontend/src/components/PaymentTransferDetailsModal.tsx`
  - Display transfer summary (recipient, budget type, total, count, dates)
  - Display list of all associated reimbursements with details
  - Show execution information if transfer is executed (executed by, executed at)
  - Add execute button for pending transfers (if user has permission)
  - Add close button
  - Style with Hebrew RTL support
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.3, 7.4_
-

- [x] 9. Create PaymentTransfers page




  - Create `frontend/src/pages/PaymentTransfers.tsx`
  - Set page title to "העברות" (Transfers)
  - Add two tabs: "ממתינות לביצוע" (Pending) and "בוצעו" (Executed)
  - Display summary statistics at top (pending count, pending amount, executed count, executed amount)
  - Use PaymentTransferTable component for each tab
  - Add filter controls (by recipient, date range)
  - Implement transfer execution with confirmation dialog
  - Show success/error toast messages
  - Handle loading and error states
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 7.5_




- [X] 10. Update Payments page for integration



  - Change page title from "ניהול העברות" to "אישור החזרים"
  - Add prominent button at top: "עבור להעברות" linking to PaymentTransfers page
  - In approved reimbursements table, add column showing payment transfer ID and recipient
  - Add informational note in approved section: "לביצוע תשלומים, עבור לעמוד העברות"

  - Remove batch "Mark as Paid" button from ActionBar (no longer needed)
  - Update statistics to show pending transfer information
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 11. Update Navigation component




  - Add new navigation item for "העברות" (Transfers) page
  - Show only for treasurers (circle or group)
  - Update existing "העברות" navigation item text to "אישור החזרים" (Reimbursement Approval)
  - Ensure proper routing to new PaymentTransfers page
  - _Requirements: 6.1, 6.2, 6.3_


- [x] 12. Update API service for payment transfers




  - Add `getPaymentTransfers` function in `frontend/src/services/api.ts`
  - Add `getPaymentTransferById` function
  - Add `executePaymentTransfer` function
  - Add `getPaymentTransferStats` function
  - Add proper error handling and TypeScript types
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 13. Add routing for PaymentTransfers page





  - Add route `/payment-transfers` in `frontend/src/App.tsx`
  - Protect route with treasurer authentication
  - Ensure proper navigation between Payments and PaymentTransfers pages
  - _Requirements: 6.1, 6.2, 6.3, 9.1, 9.2_
- [x] 14. Run database migration and verify






- [ ] 14. Run database migration and verify

  - Run migration script to create payment_transfers table
  - Verify table structure and indexes
  - Verify existing approved reimbursements are migrated to transfers
  - Test that new approvals create/join transfers correctly
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2_
-

- [x] 15. Manual end-to-end testing




  - Test complete workflow: submit reimbursement → approve → verify transfer created → execute transfer → verify marked as paid
  - Test budget type separation: approve circle and group reimbursements for same recipient → verify separate transfers
  - Test access control: circle treasurer can only see circle transfers, group treasurer can only see their group transfers
  - Test multiple recipients: approve reimbursements for different recipients → verify separate transfers → execute one → verify only that recipient's reimbursements marked as paid
  - Test UI: verify all Hebrew labels, RTL layout, navigation, error messages
  - Can use Playwright MCP if needed
  - _Requirements: All requirements_

- [x] 16. Update documentation and steering files






  - Update `.kiro/steering/product.md` to document the new Payment Transfers feature
  - Update `.kiro/steering/structure.md` to include new files and components (PaymentTransfers page, PaymentTransferTable, PaymentTransferDetailsModal, payment transfer controller, routes)
  - Update `README.md` to mention the new "העברות" (Transfers) page and explain the difference between "אישור החזרים" and "העברות"
  - Update `.claude/CLAUDE.md` if needed to document the payment_transfers table
  - Document the renamed Payments page (from "ניהול העברות" to "אישור החזרים")
  - _Requirements: 7.5_
