# Requirements Document - Payment Transfers (העברות תשלום)

## Introduction

This feature introduces a new concept of "Payment Transfers" (העברות) to the budget management system. Currently, approved reimbursements wait in an "Approved" table until they are marked as paid. The new Payment Transfer system will group approved reimbursements by recipient into transfer batches, allowing treasurers to manage and execute payments more efficiently.

A Payment Transfer represents a collection of all approved reimbursements for a specific recipient that haven't been paid yet. When a transfer is marked as executed, all associated reimbursements automatically transition to "Paid" status. This creates a clear audit trail and simplifies the payment execution process.

## Requirements

### Requirement 1: Payment Transfer Entity

**User Story:** As a treasurer, I want to group approved reimbursements by recipient into payment transfers, so that I can manage and execute payments more efficiently.

#### Acceptance Criteria

1. WHEN a reimbursement is approved THEN the system SHALL automatically associate it with an open (pending execution) payment transfer for that recipient and budget type
2. IF no open payment transfer exists for the recipient and budget type THEN the system SHALL create a new payment transfer automatically
3. WHEN a payment transfer is created THEN the system SHALL record the recipient user, budget type (circle or group), creation date, and initial status as "pending"
4. WHEN viewing a payment transfer THEN the system SHALL display the recipient name, budget type, total amount, number of reimbursements, creation date, and status
5. WHEN a payment transfer contains reimbursements THEN the system SHALL calculate and display the total amount as the sum of all associated reimbursements
6. WHEN grouping reimbursements into transfers THEN the system SHALL ensure circle budget reimbursements and group budget reimbursements are in separate transfers even for the same recipient

### Requirement 2: Payment Transfer Execution

**User Story:** As a treasurer, I want to mark payment transfers as executed, so that all associated reimbursements are automatically marked as paid.

#### Acceptance Criteria

1. WHEN a treasurer marks a payment transfer as executed THEN the system SHALL update the transfer status to "executed"
2. WHEN a payment transfer is marked as executed THEN the system SHALL update all associated reimbursements to "paid" status
3. WHEN a payment transfer is marked as executed THEN the system SHALL record the execution date and the treasurer who executed it
4. WHEN a reimbursement is approved after a transfer is executed THEN the system SHALL create a new pending payment transfer for that recipient
5. WHEN a payment transfer is executed THEN the system SHALL prevent any modifications to the transfer or its associated reimbursements

### Requirement 3: Payment Transfer Listing and Management

**User Story:** As a treasurer, I want to view all payment transfers with their status and details, so that I can track pending and completed payments.

#### Acceptance Criteria

1. WHEN a treasurer accesses the payment transfers page THEN the system SHALL display all payment transfers grouped by status (pending and executed)
2. WHEN viewing the payment transfers list THEN the system SHALL display recipient name, total amount, reimbursement count, creation date, and status for each transfer
3. WHEN a treasurer filters payment transfers THEN the system SHALL support filtering by status, recipient, and date range
4. WHEN a treasurer sorts payment transfers THEN the system SHALL support sorting by recipient name, amount, date, and status
5. WHEN viewing pending transfers THEN the system SHALL provide an action to mark the transfer as executed

### Requirement 4: Payment Transfer Details View

**User Story:** As a treasurer, I want to view detailed information about a payment transfer including all associated reimbursements, so that I can verify the payment before execution.

#### Acceptance Criteria

1. WHEN a treasurer clicks on a payment transfer THEN the system SHALL display a detailed view with all transfer information
2. WHEN viewing transfer details THEN the system SHALL display a list of all associated reimbursements with their details (submitter, recipient, fund, amount, description, date)
3. WHEN viewing transfer details THEN the system SHALL display the total amount and reimbursement count
4. WHEN viewing transfer details THEN the system SHALL display the creation date, execution date (if executed), and executing treasurer (if executed)
5. WHEN viewing a pending transfer's details THEN the system SHALL provide an option to execute the transfer from the details view

### Requirement 5: Reimbursement Status Transition

**User Story:** As a system, I want to automatically manage reimbursement status transitions when they are approved or when transfers are executed, so that the payment workflow is seamless.

#### Acceptance Criteria

1. WHEN a reimbursement is approved THEN the system SHALL associate it with an open payment transfer for the recipient
2. WHEN a reimbursement status changes from approved to another status (e.g., rejected) THEN the system SHALL remove it from its associated payment transfer
3. WHEN a payment transfer is executed THEN the system SHALL update all associated reimbursements to "paid" status with the execution date
4. WHEN a reimbursement is marked as paid through a transfer THEN the system SHALL record the transfer ID in the reimbursement record
5. WHEN viewing a paid reimbursement THEN the system SHALL display which payment transfer it was paid through

### Requirement 6: Access Control and Permissions

**User Story:** As a system administrator, I want to ensure that only authorized treasurers can execute payment transfers, so that financial operations are secure.

#### Acceptance Criteria

1. WHEN a user accesses payment transfers THEN the system SHALL verify the user has treasurer role (circle or group)
2. WHEN a group treasurer views payment transfers THEN the system SHALL only display transfers for reimbursements from their group budgets
3. WHEN a circle treasurer views payment transfers THEN the system SHALL only display transfers for reimbursements from circle budgets (not group budgets)
4. WHEN a non-treasurer user attempts to access payment transfers THEN the system SHALL deny access with an appropriate error message
5. WHEN executing a payment transfer THEN the system SHALL verify the user has treasurer permissions for the budget type (circle or group) of the associated reimbursements
6. WHEN a payment transfer contains reimbursements from different budget types THEN the system SHALL NOT allow this and SHALL keep circle and group reimbursements in separate transfers

### Requirement 7: Audit Trail and History

**User Story:** As a treasurer, I want to view the complete history of payment transfers, so that I can track when payments were made and by whom.

#### Acceptance Criteria

1. WHEN a payment transfer is created THEN the system SHALL record the creation timestamp
2. WHEN a payment transfer is executed THEN the system SHALL record the execution timestamp and the treasurer who executed it
3. WHEN viewing executed transfers THEN the system SHALL display the execution date and executing treasurer
4. WHEN viewing a recipient's payment history THEN the system SHALL display all payment transfers (pending and executed) for that recipient
5. WHEN generating financial reports THEN the system SHALL include payment transfer information with execution dates and amounts

### Requirement 8: Fix Existing Reimbursement Access Control

**User Story:** As a circle treasurer, I want to see only reimbursements from circle budgets (not group budgets), so that I focus on my area of responsibility.

#### Acceptance Criteria

1. WHEN a circle treasurer views reimbursements in any status (pending, under review, approved, rejected, paid) THEN the system SHALL only display reimbursements associated with circle budgets
2. WHEN a group treasurer views reimbursements THEN the system SHALL only display reimbursements associated with their group budgets
3. WHEN filtering or searching reimbursements THEN the system SHALL apply budget type filtering automatically based on treasurer role
4. WHEN a circle treasurer attempts to approve/reject a group budget reimbursement THEN the system SHALL deny the action
5. WHEN a group treasurer attempts to approve/reject a circle budget reimbursement THEN the system SHALL deny the action
6. WHEN viewing reimbursement statistics and summaries THEN the system SHALL calculate totals based only on reimbursements the treasurer has access to

### Requirement 9: Integration with Existing Payment Management

**User Story:** As a treasurer, I want the payment transfer system to integrate seamlessly with the existing payment management interface, so that my workflow is not disrupted.

#### Acceptance Criteria

1. WHEN viewing the treasurer payment management page THEN the system SHALL provide a link or tab to access payment transfers
2. WHEN a reimbursement is approved from the payment management page THEN the system SHALL automatically handle the payment transfer association
3. WHEN viewing approved reimbursements THEN the system SHALL display which payment transfer they are associated with
4. WHEN a payment transfer is executed THEN the approved reimbursements SHALL automatically move to the paid status table
5. WHEN viewing the payment summary statistics THEN the system SHALL include payment transfer information (pending transfers count and total amount)
