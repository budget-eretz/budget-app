# Product Overview

## Budget Management System for Cooperatives

A comprehensive budget management system designed for cooperative circles and groups, supporting Hebrew interface and multi-level financial management.

### Core Features
- **Circle Treasurer**: Manages overall circle budget, allocates funds to groups, approves reimbursements, manages users and groups
- **Group Treasurer**: Manages group-specific budgets and member reimbursements  
- **Members**: Submit expense plans, reimbursement requests, charges, and income records
- **User Management**: Create, edit, and manage users with role assignments and group memberships
- **Group Management**: Create and manage groups with many-to-many user relationships
- **Enhanced Reimbursement Management**: Personal reimbursement tracking, editing, deletion, and submission on behalf of others
- **Treasurer Reimbursement Approval**: Comprehensive approval workflow with multi-status tracking, batch operations, and review capabilities
- **Payment Transfers**: Automatic grouping of approved reimbursements by recipient and budget type for efficient payment execution
- **Charge Submission**: Track debts owed to circle/group that offset pending reimbursements
- **Fund Access Control**: Budget-based access control for circle and group funds

### Key Entities
- **Users**: System users with roles and group memberships (many-to-many)
- **Groups**: User groups for organizing members and budgets
- **Budgets**: Circle-wide and group-specific budget allocations
- **Funds**: Sub-budget categories for organized spending
- **Planned Expenses**: Future expense planning and tracking
- **Reimbursements**: Member expense reimbursement workflow with recipient field support
- **Payment Transfers**: Grouped approved reimbursements by recipient and budget type for payment execution
- **Charges**: User debts to circle/group that offset reimbursements
- **Incomes**: Revenue and income tracking
- **Reports**: Financial reporting and analytics

### User Roles
- Circle Treasurer (full system access, user/group management)
- Group Treasurer (group-scoped access)
- Circle/Group Members (personal financial tracking)

### Access Control
- Row-level access control for data permissions
- Users can belong to multiple groups simultaneously
- Role-based authorization for sensitive operations
- Group-scoped data visibility for treasurers

### Enhanced Reimbursement Management

#### My Reimbursements (ההחזרים שלי)
Users can view and manage all their reimbursement requests in one place:
- View all reimbursements where they are submitter or recipient
- Filter by status (All, Pending, Approved, Rejected, Paid)
- See payment summary with net amount calculation
- Edit pending reimbursements
- Delete pending reimbursements
- View both submitter and recipient information

#### Submit Reimbursement on Behalf of Others
Users can submit reimbursements where a different person receives the payment:
- Optional "שלח תשלום ל" (Send payment to) field in reimbursement form
- Defaults to submitter if no recipient specified
- Useful for expenses paid by one person but reimbursed to another
- Both submitter and recipient are tracked and displayed

#### Charge Submission (הגשת חיוב)
Users can submit charges representing debts owed to the circle/group:
- Charges offset pending reimbursements in net payment calculation
- Associated with specific fund for tracking
- Requires description, amount, and charge date
- Clearly distinguished from reimbursements in UI
- Status tracking (active/settled/cancelled)

#### Payment Summary
Automatic calculation of net amount owed to user:
- Total pending reimbursements (money owed to user)
- Total active charges (money user owes)
- Net amount = reimbursements - charges
- Displayed prominently in My Reimbursements page

#### Fund Access Control
Budget-based access control for fund selection:
- Circle budget funds: Accessible to all users
- Group budget funds: Accessible only to group members
- Funds grouped by budget in selection dropdowns
- Validation on submission to prevent unauthorized access
- Clear visual grouping (מעגלי/קבוצתי labels)

#### Direct Submission from Fund Pages
Quick action buttons on fund cards:
- "הגש החזר" (Submit Reimbursement) button
- "הוסף תכנון" (Add Planned Expense) button
- Pre-selects fund when navigating to form
- Reduces navigation steps for common actions

#### Hebrew Language Interface
Complete Hebrew language support throughout:
- All labels, buttons, and messages in Hebrew
- Hebrew status values (ממתין לאישור, לבדיקה, אושר, נדחה, שולם)
- Hebrew error messages and confirmations
- RTL-friendly layout and design

### Treasurer Reimbursement Approval (אישור החזרים לגזברים)

A comprehensive reimbursement approval interface for treasurers to efficiently review and approve reimbursements through their complete lifecycle. This page was previously called "ניהול העברות" (Payment Management) and has been renamed to "אישור החזרים" (Reimbursement Approval) to better reflect its purpose.

#### Payment Workflow Statuses
The system supports five distinct reimbursement statuses:
- **ממתין לאישור (Pending)**: Newly submitted reimbursements awaiting treasurer review
- **לבדיקה (Under Review)**: Reimbursements flagged by treasurer for additional verification or clarification
- **אושר (Approved)**: Reimbursements approved for payment
- **נדחה (Rejected)**: Reimbursements that were declined with documented reason
- **שולם (Paid)**: Reimbursements that have been paid out

#### Key Features

**Multi-Status Organization**
- Separate tables for each status category (Pending, Under Review, Approved, Rejected)
- Clear visual separation and status-specific actions
- Real-time status updates and automatic table transitions

**Review and Flagging System**
- Mark reimbursements for review when additional verification needed
- Add optional notes for follow-up tracking
- Return flagged items back to pending after clarification
- Track who flagged items and when

**Batch Operations**
- Select multiple reimbursements across tables
- Batch approve pending reimbursements
- Batch reject with shared reason
- Batch mark as paid for approved items
- Batch flag for review
- Visual selection counter with total amount display

**Advanced Filtering and Sorting**
- Sort by any column (submitter, recipient, fund, amount, date)
- Filter by submitter, recipient, or fund
- Multiple simultaneous filters with AND logic
- Clear all filters option
- Group display options: by status (default), by member, by fund, or show all

**Detailed Information Display**
- Submitter and recipient information (with distinction when different)
- Fund and budget association
- Expense description and amount
- Expense date and submission date
- Receipt attachment access
- Full reimbursement details modal

**Action Bar**
- Sticky action bar appears when items selected
- Shows selection count and total amount
- Context-aware actions based on selected items' statuses
- Quick access to common batch operations

**Access Control**
- Circle treasurers: Full access to all reimbursements
- Group treasurers: Access limited to their groups' reimbursements
- Automatic filtering based on treasurer role and permissions

**Rejection Workflow**
- Required rejection reason for declined reimbursements
- Rejection reason visible to submitter
- Documented audit trail for all decisions

**Summary Statistics**
- Count of reimbursements in each status
- Total amounts pending and approved
- Quick overview of workload and payment obligations

**Integration with Payment Transfers**
- Link to Payment Transfers page for executing payments
- Display payment transfer ID for approved reimbursements
- Informational note directing treasurers to Payment Transfers page for payment execution
- Batch "Mark as Paid" functionality removed (replaced by transfer execution)

### Payment Transfers (העברות)

A new payment execution system that groups approved reimbursements by recipient and budget type, allowing treasurers to efficiently execute payments in batches.

#### Key Concepts

**Payment Transfer**: A collection of approved reimbursements for a specific recipient from a specific budget type (circle or group). When a reimbursement is approved, it automatically joins an open payment transfer for that recipient and budget type.

**Automatic Grouping**: The system automatically creates and manages payment transfers. When a treasurer approves a reimbursement, it's associated with an open transfer for the recipient. If no open transfer exists, one is created automatically.

**Budget Type Separation**: Circle budget reimbursements and group budget reimbursements are kept in separate transfers even for the same recipient, ensuring proper budget tracking and access control.

#### Payment Transfer Workflow

1. **Approval**: When a reimbursement is approved in the "אישור החזרים" (Reimbursement Approval) page, it automatically joins an open payment transfer for the recipient and budget type
2. **Grouping**: All approved reimbursements for the same recipient and budget type are grouped into a single pending transfer
3. **Execution**: Treasurer navigates to "העברות" (Transfers) page and executes the transfer
4. **Completion**: All reimbursements in the transfer are automatically marked as "paid" with execution timestamp and executor recorded

#### Key Features

**Automatic Transfer Management**
- Transfers created automatically when reimbursements are approved
- No manual transfer creation required
- Automatic calculation of total amount and reimbursement count
- Real-time updates as reimbursements are approved

**Transfer Listing and Filtering**
- Two tabs: Pending (awaiting execution) and Executed (completed)
- Filter by recipient, date range
- Sort by recipient name, amount, date, count
- Summary statistics showing pending and executed transfer counts and amounts

**Transfer Details View**
- Complete transfer information with all associated reimbursements
- Submitter and recipient details for each reimbursement
- Fund and budget information
- Creation date, execution date, and executing treasurer
- Execute button for pending transfers (with permission check)

**Access Control**
- Circle treasurers: See only transfers for circle budget reimbursements
- Group treasurers: See only transfers for their group budget reimbursements
- Budget type filtering applied automatically based on treasurer role
- Execution permission verified before allowing transfer execution

**Audit Trail**
- Complete history of all transfers (pending and executed)
- Execution timestamp and executing treasurer recorded
- Payment transfer ID maintained in reimbursements after execution
- Clear tracking of when payments were made and by whom

**Integration with Reimbursement Approval**
- Seamless workflow from approval to payment
- Link from "אישור החזרים" page to "העברות" page
- Approved reimbursements show associated transfer ID
- Automatic status transition from approved to paid when transfer executed

#### Navigation

The system now has two separate treasurer pages:

1. **אישור החזרים (Reimbursement Approval)** - `/payments`
   - Review and approve/reject reimbursements
   - Multi-status workflow (pending, under review, approved, rejected)
   - Batch operations for approval and rejection
   - Link to Payment Transfers page

2. **העברות (Transfers)** - `/payment-transfers`
   - Execute payment transfers
   - View pending and executed transfers
   - Transfer details with all associated reimbursements
   - Payment execution with audit trail

### Target Deployment
- Development: Docker Compose
- Production: Render.com with PostgreSQL