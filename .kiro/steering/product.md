# Product Overview

## Budget Management System for Cooperatives

A comprehensive budget management system designed for cooperative circles and groups, supporting Hebrew interface and multi-level financial management.

**Important Documentation**: See `PLANNING_VS_EXECUTION.md` in the project root for detailed explanation of the planning vs execution budget separation system (in Hebrew).

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
- **Monthly Fund Allocation**: Granular monthly budget allocation with fixed or variable strategies and comprehensive tracking
- **Income Tracking Enhancement**: Comprehensive income tracking with categorization, expected income planning, and comparison between planned and actual income

### Key Entities
- **Users**: System users with roles and group memberships (many-to-many)
- **Groups**: User groups for organizing members and budgets
- **Budgets**: Circle-wide and group-specific budget allocations
- **Funds**: Sub-budget categories for organized spending
- **Fund Monthly Allocations**: Monthly budget allocations per fund with fixed or variable strategies
- **Fund Allocation History**: Audit trail of all allocation changes
- **Planned Expenses**: Future expense planning and tracking
- **Reimbursements**: Member expense reimbursement workflow with recipient field support
- **Payment Transfers**: Grouped approved reimbursements by recipient and budget type for payment execution
- **Charges**: User debts to circle/group that offset reimbursements
- **Incomes**: Revenue and income tracking (actual and expected)
- **Income Categories**: Flexible categorization system for income tracking
- **Expected Incomes**: Planned income tracking with annual and monthly planning
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

#### Charge Submission and Approval (הגשת חיוב ואישור)
Users can submit charges representing debts owed to the circle/group:
- **Approval Workflow**: Charges now go through the same approval process as reimbursements
- **Status Tracking**: pending → under_review → approved → rejected → paid
- **Treasurer Review**: Treasurers can approve, reject, or mark charges for review
- **Batch Operations**: Support for batch approval, rejection, and review marking
- **Payment Integration**: Approved charges are linked to payment transfers and offset reimbursements
- **Net Calculation**: Charges reduce the amount owed to user in payment transfers
- Associated with specific fund for tracking
- Requires description, amount, and charge date
- Clearly distinguished from reimbursements in UI (negative amounts in red)

#### Payment Summary
Automatic calculation of net amount owed to user:
- Total pending reimbursements (money owed to user)
- Total pending charges (money user owes)
- Net amount = reimbursements - charges
- Updated in real-time as charges and reimbursements are approved
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

#### Direct Expenses (הוצאות ישירות)
Treasurers can record direct expenses from funds that are not reimbursements to members:
- **Purpose**: Track expenses paid directly from the fund (e.g., utility bills, supplier payments, direct purchases)
- **Access Control**:
  - Circle treasurers: Can create direct expenses for circle budget funds only
  - Group treasurers: Can create direct expenses for their group budget funds only
  - Members: Can view direct expenses but cannot create, edit, or delete them
- **Key Features**:
  - Record payee (free text field, not limited to system users)
  - Amount, description, expense date, and optional receipt
  - Edit and delete capabilities for treasurers with appropriate permissions
  - Integrated into monthly expense tracking alongside reimbursements
  - Counted in "spent" amount for monthly fund status
  - Displayed in unified expense table with "הוצאה ישירה" label in submitter column
- **Workflow**:
  - Treasurer navigates to fund monthly detail page
  - Clicks "הוסף הוצאה ישירה" button (visible only to authorized treasurers)
  - Fills in expense details (fund, payee, amount, description, date, receipt)
  - Expense appears immediately in monthly expense table
  - Can edit or delete from table actions column
- **Integration**:
  - Appears in monthly expense table alongside reimbursements
  - No status workflow (created directly, no approval needed)
  - Affects monthly "spent" calculation and remaining budget
  - Does not affect planning track (only execution track)

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

**Payment Transfer**: A collection of approved reimbursements and charges for a specific recipient from a specific budget type (circle or group). When a reimbursement or charge is approved, it automatically joins an open payment transfer for that recipient and budget type.

**Automatic Grouping**: The system automatically creates and manages payment transfers. When a treasurer approves a reimbursement or charge, it's associated with an open transfer for the recipient/charged user. If no open transfer exists, one is created automatically.

**Net Amount Calculation**: Payment transfers calculate the net amount by summing reimbursements (positive) and subtracting charges (negative). This ensures users receive the correct net payment after debts are deducted.

**Budget Type Separation**: Circle budget reimbursements/charges and group budget reimbursements/charges are kept in separate transfers even for the same user, ensuring proper budget tracking and access control.

#### Payment Transfer Workflow

1. **Approval**: When a reimbursement or charge is approved in the "אישור החזרים" (Reimbursement Approval) page, it automatically joins an open payment transfer for the user and budget type
2. **Grouping**: All approved reimbursements and charges for the same user and budget type are grouped into a single pending transfer
3. **Net Calculation**: Transfer total = sum of reimbursements - sum of charges
4. **Execution**: Treasurer navigates to "העברות" (Transfers) page and executes the transfer
5. **Completion**: All reimbursements and charges in the transfer are automatically marked as "paid" with execution timestamp and executor recorded

#### Key Features

**Automatic Transfer Management**
- Transfers created automatically when reimbursements or charges are approved
- No manual transfer creation required
- Automatic calculation of net amount (reimbursements - charges) and item count
- Real-time updates as reimbursements and charges are approved

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
   - Manage recurring transfers (העברות קבועות)

### Recurring Transfers (העברות קבועות)

A system for managing regular, recurring payments to members (e.g., health insurance, phone bills, etc.) that are executed automatically by the circle treasurer.

#### Key Features

**Recurring Transfer Management**:
- Create recurring transfers with recipient, fund, amount, description, frequency, and date range
- Support for multiple frequencies: monthly (חודשי), quarterly (רבעוני), annual (שנתי)
- Optional end date for time-limited transfers
- Status management: active (פעיל), paused (מושהה), cancelled (בוטל)

**Access Control**:
- Circle treasurers: Can create and manage recurring transfers for all funds
- Group treasurers: Can create and manage recurring transfers for their group funds only
- Members: Can view their own recurring transfers (read-only)

**Integration with Payment System**:
- Recurring transfers are displayed separately from regular reimbursements
- Members can see their recurring transfers in "ההחזרים שלי" page in a dedicated table
- Clear distinction from one-time reimbursements and charges

**Treasurer Management** (in Payment Transfers page):
- New tab "העברות קבועות" in the Payment Transfers page
- Add, edit, pause/resume, and delete recurring transfers
- View all recurring transfers with full details (recipient, fund, amount, frequency, dates, status)
- Toggle status between active and paused
- Delete recurring transfers with confirmation

**Member View** (in My Reimbursements page):
- Separate section "העברות חודשיות קבועות" showing all recurring transfers for the member
- Read-only view with full transfer details
- Informational note explaining these are automatic transfers by the treasurer
- No edit or delete actions available to members

#### Database Schema

**recurring_transfers table**:
- `id`: Primary key
- `recipient_user_id`: User receiving the transfer
- `fund_id`: Fund from which transfer is made
- `amount`: Transfer amount
- `description`: Transfer description (e.g., "דמי קופת חולים", "תשלום טלפון")
- `start_date`: When transfers begin
- `end_date`: Optional end date for time-limited transfers
- `frequency`: monthly, quarterly, or annual
- `status`: active, paused, or cancelled
- `created_by`: Treasurer who created the transfer
- `created_at`, `updated_at`: Timestamps

#### API Endpoints

- `GET /api/recurring-transfers` - Get all recurring transfers (treasurer only, filtered by access control)
- `GET /api/recurring-transfers/my` - Get user's recurring transfers
- `GET /api/recurring-transfers/:id` - Get single recurring transfer by ID
- `POST /api/recurring-transfers` - Create recurring transfer (treasurer only)
- `PATCH /api/recurring-transfers/:id` - Update recurring transfer (treasurer only)
- `DELETE /api/recurring-transfers/:id` - Delete recurring transfer (treasurer only)

#### Components

**RecurringTransferFormModal.tsx**:
- Modal form for creating/editing recurring transfers
- Recipient selection from all users
- Fund selection grouped by budget (circle/group)
- Amount, description, frequency, start date, and optional end date inputs
- Validation for required fields and positive amounts

**RecurringTransferTable.tsx**:
- Table displaying recurring transfers
- Columns: recipient, fund, amount, description, frequency, start date, end date, status
- Optional actions column for edit, delete, and pause/resume (treasurer only)
- Status badges with color coding
- Frequency labels in Hebrew

### Monthly Fund Allocation and Tracking

A comprehensive system for managing and tracking fund allocations on a monthly basis, providing granular financial planning and monitoring capabilities.

#### Key Concepts

**Monthly Allocation**: The amount of money allocated to a fund for a specific month. Treasurers can set allocations using either fixed (same amount every month) or variable (different amounts per month) strategies.

**Allocation Types**:
- **Fixed Allocation**: Set a single amount that applies to all months starting from the current month
- **Variable Allocation**: Set different amounts for each month of the year individually

**Planning vs Execution Separation**: The system maintains a clear separation between planning and actual execution:
- **Planning Track**: Shows what was planned (planned expenses) vs what wasn't planned (buffer)
- **Execution Track**: Shows what actually happened (spent) vs what remains available
- **Variance Analysis**: Compares planning to execution to identify deviations

This separation allows for:
- Better budget analysis and forecasting
- Understanding planning accuracy
- Identifying systematic over/under-spending patterns
- Maintaining realistic available budgets (not reduced by plans that may not materialize)

**Monthly Tracking**: Track actual spending, planned expenses, and remaining budget for each fund on a monthly basis with three parallel views:
1. **Actual Execution**: Allocated → Spent → Remaining
2. **Planning**: Allocated → Planned → Unplanned
3. **Variance**: Planned vs Actual with deviation percentage

#### Monthly Allocation Management

**Fund-Level Allocation Manager Modal** (ניהול הקצאות חודשיות):
- Accessible from individual fund detail pages (treasurer only)
- Toggle between fixed and variable allocation modes
- Real-time validation against total fund budget
- Visual summary showing total allocated, remaining unallocated
- Prevents over-allocation with clear error messages
- Saves allocation history for audit trail

**Budget-Level Allocation Manager Modal** (ניהול הקצאות חודשיות - ברמת תקציב):
- Accessible from budget detail page via "ניהול הקצאות חודשיות" button (treasurer only)
- Manage allocations for all funds in a budget from one centralized interface
- Expandable/collapsible sections for each fund
- Each fund displays: total budget, allocated amount, remaining unallocated
- Toggle between fixed and variable allocation modes per fund independently
- Real-time validation per fund against individual fund budgets
- Visual indicators: red for over-allocation, green for available budget
- Batch save all fund allocations at once
- Efficient workflow for treasurers managing multiple funds

**Fixed Allocation Mode**:
- Enter a single monthly amount
- Automatically calculates annual total (amount × 12)
- Applied to all months starting from current month
- Simple and quick for consistent monthly budgets

**Variable Allocation Mode**:
- Grid of 12 month inputs (Hebrew month names)
- Set different amounts for each month
- Flexible for seasonal or varying budgets
- Shows total across all months

**Allocation History** (היסטוריית הקצאות):
- Complete audit trail of all allocation changes
- Shows who made changes and when
- Tracks created, updated, and deleted allocations
- Displays allocation type (fixed/variable) for each entry
- Sortable and filterable history table

#### Monthly Fund Status Tracking

**Fund Monthly Detail Page** (`/funds/:fundId/monthly`):
- Month navigator for browsing different months
- Three separate status tables showing:
  1. **Actual Execution Table**: Allocated, Spent, Remaining (what actually happened)
  2. **Planning Table**: Allocated, Planned, Unplanned (what was planned)
  3. **Variance Table**: Planned vs Actual with deviation indicators
- Monthly expenses table with all reimbursements for the month
- Monthly planned expenses table
- Access to allocation manager and history (treasurer only)

**Monthly Status Cards** (Dashboard):
- Display current month status for all accessible funds
- Shows actual execution (spent vs remaining)
- Shows variance from planning (if planned expenses exist)
- Color-coded indicators for budget health and planning deviation
- Click to navigate to detailed monthly view

**Month Navigation**:
- Navigate between months with arrow buttons
- Month/year picker for quick jumps
- Consistent navigation across all monthly views
- Maintains context when switching between funds

#### API Endpoints

**Monthly Allocation Management**:
- `GET /api/funds/:fundId/monthly-allocations` - Get all allocations for a fund
- `POST /api/funds/:fundId/monthly-allocations/fixed` - Set fixed monthly allocation
- `POST /api/funds/:fundId/monthly-allocations/variable` - Set variable monthly allocations
- `GET /api/funds/:fundId/allocation-history` - Get allocation change history

**Monthly Status and Tracking**:
- `GET /api/funds/:fundId/monthly-status/:year/:month` - Get monthly status for a fund
- `GET /api/funds/:fundId/monthly-expenses/:year/:month` - Get monthly expenses
- `GET /api/funds/:fundId/monthly-planned/:year/:month` - Get monthly planned expenses
- `GET /api/dashboard/monthly-status` - Get current month status for all accessible funds

**Budget-Level Monthly Tracking**:
- `GET /api/budgets/:budgetId/monthly-summary/:year/:month` - Get monthly summary for all funds in a budget

#### Key Features

**Automatic Calculations**:
- Real-time calculation of total allocated vs. fund budget
- Automatic remaining budget calculation (allocated - spent)
- Automatic unplanned budget calculation (allocated - planned)
- Monthly spending aggregation from reimbursements
- Planned expense totals per month
- Variance calculation (actual vs planned) with percentage deviation

**Validation and Constraints**:
- Prevent over-allocation beyond fund budget
- Require positive amounts for allocations
- Validate date ranges and month selections
- Ensure at least one allocation when using variable mode

**Access Control**:
- Only treasurers can manage allocations
- Circle treasurers: Full access to all fund allocations
- Group treasurers: Access limited to their group funds
- All users can view monthly status for accessible funds

**Audit Trail**:
- Complete history of all allocation changes
- Track who made changes and when
- Record change type (created/updated/deleted)
- Maintain historical allocation data

**Hebrew Interface**:
- Hebrew month names (ינואר, פברואר, etc.)
- Hebrew labels and messages throughout
- RTL-friendly layout and design
- Hebrew status indicators and summaries

#### Integration with Existing Features

**Fund Management**:
- Monthly allocations linked to fund total budget
- Validation ensures monthly allocations don't exceed fund budget
- Fund detail pages include monthly tracking access

**Budget Detail Pages**:
- Display monthly summary for all funds in budget
- Aggregate monthly status across funds
- Quick access to individual fund monthly details

**Dashboard**:
- Current month status cards for all accessible funds
- Quick overview of monthly budget health
- Direct navigation to monthly detail pages

**Expense Tracking**:
- Reimbursements automatically counted in monthly spending (actual execution)
- Planned expenses tracked separately and do NOT reduce available budget
- Variance tracking shows deviation between planned and actual spending
- Real-time updates as expenses are added or approved
- Clear separation between planning and execution for better budget analysis

### Income Tracking Enhancement (הכנסות)

A comprehensive income tracking system that allows treasurers to track actual income, plan expected income, categorize income sources, and compare planned vs actual income.

#### Key Concepts

**Income Types**:
- **Actual Income (הכנסות בפועל)**: Income that has been received
- **Expected Income (הכנסות צפויות)**: Planned income for future periods

**Income Sources**:
- **Member Income**: Income from specific circle/group members
- **Other Sources**: Income from external sources (מקור אחר)

**Income Categories**: Flexible categorization system allowing multiple categories per income entry for better organization and analysis.

**Planning Frequencies**:
- **One-time (חד-פעמי)**: Single income event in a specific month
- **Monthly (חודשי)**: Recurring monthly income (automatically creates 12 monthly entries)
- **Quarterly (רבעוני)**: Recurring quarterly income (automatically creates 4 quarterly entries)
- **Annual (שנתי)**: Annual income planning

#### Income Management Features

**Actual Income Recording**:
- Record income received from members or other sources
- **Automatic Income Budget**: All actual income entries automatically go to a dedicated "הכנסות" (Income) budget
  - System automatically creates/finds the income budget when adding income
  - No need to select budget manually - simplified user experience
  - Budget total automatically updates when income is added, edited, or deleted
  - All income consolidated in one place for easy tracking
- Assign multiple categories to each income entry
- Track income date, amount, description, and source
- Edit and delete income entries (treasurer only)
- Filter and sort by date, source, category, and amount

**Income Categories**:
- Create custom income categories with names, descriptions, and colors
- Assign multiple categories to income entries (many-to-many relationship)
- Edit and delete categories with usage tracking
- Visual color coding for easy identification
- Category usage statistics (number of income entries per category)

**Expected Income Planning - Annual Level**:
- Plan expected income for the entire year
- Set income frequency (one-time, monthly, quarterly, annual)
- Automatic breakdown into monthly entries based on frequency
- Monthly frequency: Creates 12 equal monthly entries
- Quarterly frequency: Creates 4 entries (January, April, July, October)
- One-time: Creates single entry for specified month
- Assign categories to planned income

**Expected Income Planning - Monthly Level**:
- View and manage expected income for specific months
- Add manual expected income entries for specific months
- Edit expected income amounts for specific months (without affecting annual plan)
- Distinguish between automatic (from annual plan) and manual entries
- Delete expected income entries with warnings for annual plan entries

**Income Comparison & Analysis**:
- Compare expected vs actual income by month
- View comparison by source (member or other source)
- Filter comparison by category or source
- Calculate fulfillment percentage (actual / expected × 100)
- Status indicators with color coding:
  - Not Received (אדום - red): No actual income received
  - Partial (כתום - orange): Actual income less than expected
  - Full (ירוק - green): Actual income equals expected
  - Exceeded (ירוק - green): Actual income exceeds expected
- Monthly summary with total expected, total actual, difference, and fulfillment percentage
- Breakdown by category showing expected vs actual per category

#### Incomes Page Structure

The Incomes page (`/incomes`) is a comprehensive single-page interface with multiple sections (similar to Payments page structure):

**1. Actual Income Section (הכנסות בפועל)**:
- Table of all actual income entries
- Filters: date range, source, category
- Sort by any column
- Add, edit, delete income entries (treasurer only)
- Category badges with color coding

**2. Annual Income Planning Section (תכנון הכנסות שנתי)**:
- Year selector
- Table of annual expected income entries
- Add annual expected income with frequency selection
- Edit and delete annual plans
- Automatic breakdown display

**3. Monthly Income Planning Section (תכנון הכנסות חודשי)**:
- Month navigator for browsing months
- Table of expected income for selected month
- Visual distinction between automatic (from annual plan) and manual entries
- Add manual expected income for specific month
- Edit monthly amounts (with or without affecting annual plan)
- Delete monthly entries with warnings

**4. Comparison Section (השוואה - צפוי מול בפועל)**:
- Month navigator
- Summary card: total expected, total actual, difference, fulfillment percentage
- Filters: category, source
- Detailed comparison table by source
- Color-coded status indicators
- Breakdown by category (optional)

#### API Endpoints

**Income Categories**:
- `GET /api/income-categories` - Get all categories
- `POST /api/income-categories` - Create category (treasurer only)
- `PATCH /api/income-categories/:id` - Update category (treasurer only)
- `DELETE /api/income-categories/:id` - Delete category (treasurer only)

**Actual Incomes (Enhanced)**:
- `GET /api/incomes` - Get all incomes with filters (date, source, category)
- `GET /api/incomes/:id` - Get single income
- `POST /api/incomes` - Create income (treasurer only)
- `PATCH /api/incomes/:id` - Update income (treasurer only)
- `DELETE /api/incomes/:id` - Delete income (treasurer only)
- `POST /api/incomes/:id/categories` - Assign categories to income
- `DELETE /api/incomes/:id/categories/:catId` - Remove category from income

**Expected Incomes**:
- `GET /api/expected-incomes` - Get expected incomes with filters
- `GET /api/expected-incomes/:id` - Get single expected income
- `POST /api/expected-incomes/annual` - Create annual planning (treasurer only)
- `POST /api/expected-incomes/monthly` - Create monthly expected income (treasurer only)
- `PATCH /api/expected-incomes/:id` - Update expected income (treasurer only)
- `DELETE /api/expected-incomes/:id` - Delete expected income (treasurer only)
- `POST /api/expected-incomes/:id/categories` - Assign categories
- `DELETE /api/expected-incomes/:id/categories/:catId` - Remove category

**Income Comparison**:
- `GET /api/incomes/comparison/monthly/:year/:month` - Get monthly comparison
- `GET /api/incomes/dashboard/summary` - Get dashboard summary for current month

#### Access Control

**Circle Treasurer**:
- Full access to all income tracking features
- Create, edit, delete actual and expected income
- Manage income categories
- View all income entries and comparisons

**Group Treasurer**:
- Read-only access to circle-level income data
- Cannot create, edit, or delete income entries
- Cannot manage categories

**Circle/Group Members**:
- View only their own income entries (where they are the source)
- Cannot create, edit, or delete actual income entries
- Cannot manage categories
- **Can create, edit, and delete expected income entries for themselves only**
- Can add monthly expected income planning for their own future income
- Cannot create annual expected income plans (treasurer-only feature)

#### Key Features

**Flexible Categorization**:
- Multiple categories per income entry
- Custom category names, descriptions, and colors
- Category usage tracking and statistics
- Safe category deletion with usage warnings

**Automatic Planning Breakdown**:
- Annual plans automatically create monthly entries
- Quarterly plans create 4 entries at appropriate months
- Monthly plans create 12 equal entries
- Manual override capability for specific months

**Comprehensive Comparison**:
- Real-time comparison between expected and actual income
- Multiple filtering and grouping options
- Visual status indicators with color coding
- Percentage-based fulfillment tracking

**Hebrew Interface**:
- Complete Hebrew language support
- Hebrew labels, buttons, and messages
- RTL-friendly layout
- Hebrew status indicators and summaries

**Integration with Budget System**:
- Income entries linked to budgets
- Budget-level income tracking and reporting
- Integration with budget detail pages
- Income data available for financial reports

### Target Deployment
- Development: Docker Compose
- Production: Render.com with PostgreSQL