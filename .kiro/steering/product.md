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
- **Treasurer Payment Management**: Comprehensive payment workflow with multi-status tracking, batch operations, and review capabilities
- **Charge Submission**: Track debts owed to circle/group that offset pending reimbursements
- **Fund Access Control**: Budget-based access control for circle and group funds

### Key Entities
- **Users**: System users with roles and group memberships (many-to-many)
- **Groups**: User groups for organizing members and budgets
- **Budgets**: Circle-wide and group-specific budget allocations
- **Funds**: Sub-budget categories for organized spending
- **Planned Expenses**: Future expense planning and tracking
- **Reimbursements**: Member expense reimbursement workflow with recipient field support
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

### Treasurer Payment Management (ניהול העברות לגזברים)

A comprehensive payment management interface for treasurers to efficiently process and track reimbursements through their complete lifecycle.

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

### Target Deployment
- Development: Docker Compose
- Production: Render.com with PostgreSQL