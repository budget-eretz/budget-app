# Project Structure & Organization

## Root Level Organization

```
budgetAPP/
├── backend/           # Node.js Express API server
├── frontend/          # React application  
├── scripts/           # Development setup scripts
├── screenshots/       # Project documentation images
├── .kiro/            # Kiro IDE configuration and steering
├── docker-compose.yml # Development environment
├── Makefile          # Build automation commands
├── render.yaml       # Production deployment config
└── package.json      # Workspace root configuration
```

## Backend Structure (`backend/`)

```
backend/
├── src/
│   ├── config/       # Database and app configuration
│   │   └── database.ts
│   ├── controllers/  # Route handlers and business logic
│   │   ├── authController.ts
│   │   ├── budgetController.ts
│   │   ├── chargeController.ts
│   │   ├── directExpenseController.ts
│   │   ├── expectedIncomeController.ts
│   │   ├── fundController.ts
│   │   ├── fundMonthlyAllocationController.ts
│   │   ├── groupController.ts
│   │   ├── incomeCategoryController.ts
│   │   ├── incomeController.ts
│   │   ├── paymentTransferController.ts
│   │   ├── plannedExpenseController.ts
│   │   ├── recurringTransferController.ts
│   │   ├── reimbursementController.ts
│   │   ├── reportController.ts
│   │   └── userController.ts
│   ├── db/          # Database utilities, migrations, seeds
│   │   ├── migrate.ts
│   │   ├── seed.ts
│   │   ├── seed-initial.ts  # Initial seed data
│   │   └── check-income-budget.ts  # Verification script for income budget
│   ├── middleware/   # Express middleware (auth, validation)
│   │   ├── accessControl.ts
│   │   └── auth.ts
│   ├── utils/       # Helper functions and utilities
│   │   └── paymentTransferHelpers.ts
│   ├── routes/      # API route definitions
│   │   ├── authRoutes.ts
│   │   ├── budgetRoutes.ts
│   │   ├── chargeRoutes.ts
│   │   ├── dashboardRoutes.ts
│   │   ├── directExpenseRoutes.ts
│   │   ├── expectedIncomeRoutes.ts
│   │   ├── fundRoutes.ts
│   │   ├── groupRoutes.ts
│   │   ├── incomeCategoryRoutes.ts
│   │   ├── incomeRoutes.ts
│   │   ├── paymentTransferRoutes.ts
│   │   ├── plannedExpenseRoutes.ts
│   │   ├── recurringTransferRoutes.ts
│   │   ├── reimbursementRoutes.ts
│   │   ├── reportRoutes.ts
│   │   └── userRoutes.ts
│   ├── types/       # TypeScript type definitions
│   │   └── index.ts
│   └── server.ts    # Application entry point
├── migrations/       # Database schema migrations
├── .env.example     # Environment variables template
├── Dockerfile       # Container configuration
└── package.json     # Backend dependencies and scripts
```

## Frontend Structure (`frontend/`)

```
frontend/
├── src/
│   ├── components/   # Reusable React components
│   │   ├── ActionBar.tsx
│   │   ├── AllocationHistoryModal.tsx
│   │   ├── BudgetCard.tsx
│   │   ├── BudgetForm.tsx
│   │   ├── BudgetMonthlyAllocationManager.tsx
│   │   ├── BugReportFooter.tsx
│   │   ├── Button.tsx
│   │   ├── CategoryManager.tsx
│   │   ├── ComparisonTable.tsx
│   │   ├── ExpectedIncomeFormModal.tsx
│   │   ├── ExpectedIncomeTable.tsx
│   │   ├── FilterBar.tsx
│   │   ├── FundCard.tsx
│   │   ├── FundForm.tsx
│   │   ├── GroupFormModal.tsx
│   │   ├── IncomeFormModal.tsx
│   │   ├── IncomeTable.tsx
│   │   ├── Modal.tsx
│   │   ├── MonthNavigator.tsx
│   │   ├── MonthlyAllocationManager.tsx
│   │   ├── BudgetMonthlyAllocationManager.tsx
│   │   ├── MonthlyExpenseTable.tsx
│   │   ├── MonthlyFundStatusCard.tsx
│   │   ├── MonthlyPlannedExpenseTable.tsx
│   │   ├── Navigation.tsx
│   │   ├── PaymentTransferDetailsModal.tsx
│   │   ├── PaymentTransferTable.tsx
│   │   ├── RecurringTransferFormModal.tsx
│   │   ├── RecurringTransferTable.tsx
│   │   ├── ReimbursementDetailsModal.tsx
│   │   ├── ReimbursementTable.tsx
│   │   ├── RejectionModal.tsx
│   │   ├── Toast.tsx
│   │   └── UserEditModal.tsx
│   ├── context/     # React context providers (auth, state)
│   │   └── AuthContext.tsx
│   ├── hooks/       # Custom React hooks
│   │   └── useStickyTableHeader.ts
│   ├── pages/       # Route-level page components
│   │   ├── BudgetDetail.tsx
│   │   ├── Budgets.tsx
│   │   ├── Dashboard.tsx
│   │   ├── EditDirectExpense.tsx     # Edit direct expense page for treasurers
│   │   ├── FundMonthlyDetail.tsx # Monthly fund detail page with allocation management
│   │   ├── GroupManagement.tsx
│   │   ├── Incomes.tsx           # Comprehensive income tracking page with actual, expected, and comparison sections
│   │   ├── Login.tsx
│   │   ├── MyReimbursements.tsx
│   │   ├── NewCharge.tsx
│   │   ├── NewDirectExpense.tsx
│   │   ├── NewPlannedExpense.tsx
│   │   ├── NewReimbursement.tsx
│   │   ├── Payments.tsx          # Treasurer reimbursement approval with multi-status workflow (renamed from "ניהול העברות" to "אישור החזרים")
│   │   ├── PaymentTransfers.tsx  # Payment transfer execution page (העברות)
│   │   ├── Profile.tsx
│   │   └── UserManagement.tsx
│   ├── services/    # API client and external services
│   │   └── api.ts
│   ├── styles/      # Component-specific styles
│   │   └── NewReimbursement.css
│   ├── types/       # TypeScript interfaces
│   │   └── index.ts
│   ├── App.tsx      # Main application component
│   ├── index.css    # Global styles
│   └── main.tsx     # React application entry point
├── public/          # Static assets
├── Dockerfile       # Container configuration
└── package.json     # Frontend dependencies and scripts
```

## Database Schema

### Core Tables
- **users**: System users with authentication and roles
- **groups**: User groups for organizing members
- **user_groups**: Many-to-many relationship between users and groups
- **budgets**: Circle-wide and group-specific budget allocations
- **funds**: Sub-budget categories within budgets
- **fund_monthly_allocations**: Monthly budget allocations per fund with allocation type (fixed/variable)
- **fund_allocation_history**: Audit trail of all allocation changes with change type and user tracking
- **planned_expenses**: Future expense planning
- **reimbursements**: Member expense reimbursement requests (enhanced with recipient_user_id and payment_transfer_id)
- **payment_transfers**: Grouped approved reimbursements by recipient and budget type for payment execution
- **charges**: User debts to circle/group that offset reimbursements
- **direct_expenses**: Direct expenses from funds that are not reimbursements to members
- **incomes**: Revenue and income tracking (actual income received)
- **income_categories**: Custom categories for organizing income entries
- **income_category_assignments**: Many-to-many relationship between incomes and categories
- **expected_incomes**: Planned/expected income with annual and monthly planning support
- **expected_income_category_assignments**: Many-to-many relationship between expected incomes and categories

### Enhanced Reimbursements Table
The reimbursements table includes:
- `recipient_user_id`: Optional field to specify payment recipient (different from submitter)
- `payment_transfer_id`: Links reimbursement to its payment transfer (set when approved)
- `under_review_by`: Treasurer who marked reimbursement for review
- `under_review_at`: Timestamp when marked for review
- `review_notes`: Optional notes for items under review
- Supports submitting reimbursements on behalf of others
- Defaults to submitter if no recipient specified
- Status includes: pending, under_review, approved, rejected, paid

### Payment Transfers Table
New table for grouping approved reimbursements by recipient and budget type:
- `recipient_user_id`: User who will receive the payment
- `budget_type`: Either 'circle' or 'group' to separate transfers by budget type
- `group_id`: For group budget transfers, stores the specific group (NULL for circle transfers)
- `status`: 'pending' (awaiting execution) or 'executed' (completed)
- `total_amount`: Calculated sum of all associated reimbursements
- `reimbursement_count`: Number of reimbursements in this transfer
- `created_at`: Timestamp when transfer was created
- `executed_at`: Timestamp when transfer was executed
- `executed_by`: Treasurer who executed the transfer

### Charges Table
New table for tracking user debts:
- `fund_id`: Associated fund for the charge
- `user_id`: User who owes the money
- `amount`: Charge amount (positive value)
- `description`: Charge description
- `charge_date`: Date of the charge
- `status`: active/settled/cancelled

### Direct Expenses Table
New table for tracking direct expenses from funds:
- `fund_id`: Associated fund for the expense
- `amount`: Expense amount (positive value)
- `description`: Expense description
- `expense_date`: Date of the expense
- `payee`: Who received the payment (free text, not user_id)
- `receipt_url`: Optional link to receipt/invoice
- `created_by`: Treasurer who created the expense
- `created_at`: Timestamp when expense was created
- `updated_at`: Timestamp when expense was last updated

### Recurring Transfers Table
Table for tracking regular recurring transfers to members:
- `id`: Primary key
- `recipient_user_id`: User receiving the transfer (references users table)
- `fund_id`: Fund from which transfer is made (references funds table)
- `amount`: Transfer amount (positive value)
- `description`: Transfer description (e.g., "דמי קופת חולים", "תשלום טלפון")
- `start_date`: Date when transfers begin
- `end_date`: Optional end date for time-limited transfers
- `frequency`: Transfer frequency ('monthly', 'quarterly', 'annual')
- `status`: Transfer status ('active', 'paused', 'cancelled')
- `created_by`: Treasurer who created the transfer (references users table)
- `created_at`: Timestamp when transfer was created
- `updated_at`: Timestamp when transfer was last updated

### Fund Monthly Allocations Table
Table for tracking monthly budget allocations per fund:
- `fund_id`: Associated fund for the allocation
- `year`: Year of the allocation
- `month`: Month of the allocation (1-12)
- `allocated_amount`: Amount allocated for this month
- `allocation_type`: Either 'fixed' or 'variable'
- `created_at`: Timestamp when allocation was created
- `updated_at`: Timestamp when allocation was last updated

### Fund Allocation History Table
Audit trail table for tracking all allocation changes:
- `fund_id`: Associated fund
- `year`: Year of the allocation
- `month`: Month of the allocation (1-12)
- `allocated_amount`: Amount that was allocated
- `allocation_type`: Type of allocation (fixed/variable)
- `changed_by`: User ID who made the change
- `changed_at`: Timestamp of the change
- `change_type`: Type of change (created/updated/deleted)

### Income Categories Table
Custom categories for organizing income entries:
- `id`: Primary key
- `name`: Category name (unique)
- `description`: Optional category description
- `color`: Hex color code for visual identification (e.g., #FF5733)
- `created_by`: User who created the category
- `created_at`: Timestamp when category was created
- `updated_at`: Timestamp when category was last updated

### Income Category Assignments Table
Many-to-many relationship between incomes and categories:
- `income_id`: Reference to income entry
- `category_id`: Reference to income category
- `assigned_at`: Timestamp when category was assigned
- Primary key: (income_id, category_id)

### Expected Incomes Table
Planned/expected income with annual and monthly planning:
- `id`: Primary key
- `budget_id`: Associated budget
- `user_id`: User who is the income source (NULL for "מקור אחר")
- `source_name`: Display name of income source (user name or "מקור אחר")
- `amount`: Expected income amount
- `description`: Optional description
- `year`: Year of expected income
- `month`: Month of expected income (1-12)
- `frequency`: Income frequency (one-time, monthly, quarterly, annual)
- `parent_annual_id`: Reference to parent annual plan (for auto-generated monthly entries)
- `is_manual`: Boolean indicating if manually added (true) or auto-generated from annual plan (false)
- `created_by`: User who created the expected income
- `created_at`: Timestamp when created
- `updated_at`: Timestamp when last updated

### Expected Income Category Assignments Table
Many-to-many relationship between expected incomes and categories:
- `expected_income_id`: Reference to expected income entry
- `category_id`: Reference to income category
- `assigned_at`: Timestamp when category was assigned
- Primary key: (expected_income_id, category_id)

## API Endpoints

### Reimbursement Endpoints (Enhanced)
- `GET /api/reimbursements` - List all reimbursements (includes recipient info)
- `GET /api/reimbursements/my` - Get user's reimbursements (as submitter or recipient)
- `GET /api/reimbursements/my/summary` - Get payment summary (reimbursements - charges)
- `GET /api/reimbursements/treasurer/all` - Get all reimbursements grouped by status (treasurer only, filtered by budget type)
- `POST /api/reimbursements` - Create reimbursement (with optional recipientUserId)
- `POST /api/reimbursements/:id/mark-review` - Mark single reimbursement for review (treasurer only)
- `POST /api/reimbursements/:id/return-to-pending` - Return reimbursement from review to pending (treasurer only)
- `POST /api/reimbursements/batch/approve` - Batch approve reimbursements (treasurer only, associates with payment transfer)
- `POST /api/reimbursements/batch/reject` - Batch reject reimbursements with reason (treasurer only)
- `POST /api/reimbursements/batch/mark-review` - Batch mark reimbursements for review (treasurer only)
- `PATCH /api/reimbursements/:id` - Update reimbursement (owner only, pending only)
- `DELETE /api/reimbursements/:id` - Delete reimbursement (owner only, pending only)

### Payment Transfer Endpoints (New)
- `GET /api/payment-transfers` - List all payment transfers (with access control filtering by budget type)
- `GET /api/payment-transfers/stats` - Get transfer statistics (pending/executed counts and amounts)
- `GET /api/payment-transfers/:id` - Get transfer details with all associated reimbursements
- `POST /api/payment-transfers/:id/execute` - Execute a payment transfer (marks all reimbursements as paid)

### Charge Endpoints (Enhanced with Approval Workflow)
- `GET /api/charges/my` - Get user's charges
- `GET /api/charges` - List all charges (filtered by access control)
- `GET /api/charges/:id` - Get charge by ID
- `GET /api/charges/treasurer/all` - Get all charges grouped by status (treasurer only, filtered by budget type)
- `POST /api/charges` - Create new charge (status: pending)
- `POST /api/charges/:id/mark-review` - Mark single charge for review (treasurer only)
- `POST /api/charges/:id/return-to-pending` - Return charge from review to pending (treasurer only)
- `POST /api/charges/batch/approve` - Batch approve charges (treasurer only, associates with payment transfer)
- `POST /api/charges/batch/reject` - Batch reject charges with reason (treasurer only)
- `POST /api/charges/batch/mark-review` - Batch mark charges for review (treasurer only)
- `PATCH /api/charges/:id` - Update charge (owner only, pending only)
- `DELETE /api/charges/:id` - Delete charge (owner only, pending only)

### Direct Expense Endpoints (New)
- `GET /api/direct-expenses/:id` - Get direct expense by ID
- `POST /api/direct-expenses` - Create new direct expense (treasurer only, with fund access validation)
- `PATCH /api/direct-expenses/:id` - Update direct expense (treasurer only, with fund access validation)
- `DELETE /api/direct-expenses/:id` - Delete direct expense (treasurer only, with fund access validation)

### Recurring Transfer Endpoints (New)
- `GET /api/recurring-transfers` - Get all recurring transfers (treasurer only, filtered by access control)
- `GET /api/recurring-transfers/my` - Get user's recurring transfers
- `GET /api/recurring-transfers/:id` - Get single recurring transfer by ID
- `POST /api/recurring-transfers` - Create recurring transfer (treasurer only)
- `PATCH /api/recurring-transfers/:id` - Update recurring transfer (treasurer only)
- `DELETE /api/recurring-transfers/:id` - Delete recurring transfer (treasurer only)

### Fund Endpoints (Enhanced)
- `GET /api/funds` - List all funds
- `GET /api/funds/accessible` - Get funds grouped by budget with access control
- `GET /api/funds/:fundId/monthly-status/:year/:month` - Get monthly status for a fund
- `GET /api/funds/:fundId/monthly-expenses/:year/:month` - Get monthly expenses for a fund (returns unified list of reimbursements and direct expenses)
- `GET /api/funds/:fundId/monthly-planned/:year/:month` - Get monthly planned expenses for a fund
- `GET /api/funds/:fundId/allocation-history` - Get allocation change history for a fund

### Monthly Allocation Endpoints (New)
- `GET /api/funds/:fundId/monthly-allocations` - Get all monthly allocations for a fund
- `POST /api/funds/:fundId/monthly-allocations/fixed` - Set fixed monthly allocation (treasurer only)
- `POST /api/funds/:fundId/monthly-allocations/variable` - Set variable monthly allocations (treasurer only)

### Budget Endpoints (Enhanced)
- `GET /api/budgets/:budgetId/monthly-summary/:year/:month` - Get monthly summary for all funds in a budget

### Dashboard Endpoints (New)
- `GET /api/dashboard/monthly-status` - Get current month status for all accessible funds

### Planned Expense Endpoints
- `GET /api/planned-expenses` - List all planned expenses (filtered by access control)
- `GET /api/planned-expenses/:id` - Get planned expense by ID (owner or treasurer only)
- `POST /api/planned-expenses` - Create new planned expense
- `PATCH /api/planned-expenses/:id` - Update planned expense (owner only)
- `DELETE /api/planned-expenses/:id` - Delete planned expense (owner only)

### Income Category Endpoints (New)
- `GET /api/income-categories` - Get all income categories
- `POST /api/income-categories` - Create new category (treasurer only)
- `PATCH /api/income-categories/:id` - Update category (treasurer only)
- `DELETE /api/income-categories/:id` - Delete category with usage check (treasurer only)

### Income Endpoints (Enhanced)
- `GET /api/incomes` - Get all incomes with filters (date, source, category, year, month)
- `GET /api/incomes/:id` - Get single income by ID
- `POST /api/incomes` - Create new income (treasurer only, **no budgetId required** - automatically uses "הכנסות" budget)
- `PATCH /api/incomes/:id` - Update income (treasurer only, automatically updates budget total)
- `DELETE /api/incomes/:id` - Delete income (treasurer only, automatically updates budget total)
- `POST /api/incomes/:id/categories` - Assign categories to income
- `DELETE /api/incomes/:id/categories/:catId` - Remove category from income

**Note**: All actual income entries automatically go to a dedicated "הכנסות" (Income) budget. The system creates this budget if it doesn't exist and automatically maintains its total amount.

### Expected Income Endpoints (New)
- `GET /api/expected-incomes` - Get expected incomes with filters (budget, year, month, source, category, frequency)
- `GET /api/expected-incomes/:id` - Get single expected income by ID
- `POST /api/expected-incomes/annual` - Create annual income planning (treasurer only)
- `POST /api/expected-incomes/monthly` - Create monthly expected income (treasurer only)
- `PATCH /api/expected-incomes/:id` - Update expected income (treasurer only)
- `DELETE /api/expected-incomes/:id` - Delete expected income (treasurer only)
- `POST /api/expected-incomes/:id/categories` - Assign categories to expected income
- `DELETE /api/expected-incomes/:id/categories/:catId` - Remove category from expected income

### Income Comparison Endpoints (New)
- `GET /api/incomes/comparison/monthly/:year/:month` - Get monthly comparison between expected and actual income
- `GET /api/incomes/dashboard/summary` - Get dashboard summary for current month

### Other Endpoints
- Authentication: `/api/auth/*`
- Budgets: `/api/budgets/*`
- Groups: `/api/groups/*`
- Users: `/api/users/*`
- Reports: `/api/reports/*`

## Treasurer Payment Management Components

### ReimbursementTable.tsx
Advanced table component for displaying reimbursements with:
- Multi-select with checkboxes (individual and select all)
- Sortable columns (click header to sort ascending/descending)
- Filterable columns with dropdown filters
- Status-specific action buttons
- Receipt access and details modal trigger
- Responsive grid layout

### ActionBar.tsx
Batch operations toolbar that appears when items are selected:
- Selection count and total amount display
- Context-aware action buttons based on selected items' statuses
- Sticky positioning for easy access
- Actions: Approve, Reject, Mark for Review, Mark as Paid, Return to Pending

### FilterBar.tsx
Global filtering and grouping controls:
- Group by selector: Show All / By Members / By Fund
- Applies to all status tables simultaneously
- Clear and intuitive Hebrew interface

### ReimbursementDetailsModal.tsx
Full details modal for individual reimbursements:
- Complete reimbursement information
- Submitter and recipient details
- Fund and budget information
- Status history and timestamps
- Receipt link if available
- Review notes display

### RejectionModal.tsx
Rejection workflow modal:
- Required rejection reason text field
- Validation to ensure reason is provided
- Confirm/Cancel actions
- Used for both single and batch rejections

### Payments.tsx (Reimbursement Approval)
Comprehensive treasurer reimbursement approval page (renamed from "ניהול העברות" to "אישור החזרים"):
- Four separate status sections: Pending, Under Review, Approved, Rejected
- Summary statistics header
- FilterBar for grouping options
- ActionBar for batch operations
- Multiple ReimbursementTable instances
- Modal management for details and rejections
- Real-time updates after actions
- Link to Payment Transfers page for executing payments
- Display payment transfer ID for approved reimbursements
- Batch "Mark as Paid" removed (replaced by transfer execution)

### Payment Transfer Components (New)

#### PaymentTransferTable.tsx
Table component for displaying payment transfers:
- Columns: recipient name, budget type, reimbursement count, total amount, creation date, status
- Sortable columns (click header to sort)
- Execute button for pending transfers
- Click handler to open transfer details
- Hebrew RTL support

#### PaymentTransferDetailsModal.tsx
Modal for viewing payment transfer details:
- Transfer summary (recipient, budget type, total, count, dates)
- List of all associated reimbursements with details
- Execution information if transfer is executed (executed by, executed at)
- Execute button for pending transfers (if user has permission)
- Close button
- Hebrew RTL support

#### PaymentTransfers.tsx
Main payment transfer execution page (העברות):
- Page title: "העברות" (Transfers)
- Two tabs: "ממתינות לביצוע" (Pending) and "בוצעו" (Executed)
- Summary statistics at top (pending count, pending amount, executed count, executed amount)
- PaymentTransferTable component for each tab
- Filter controls (by recipient, date range)
- Transfer execution with confirmation dialog
- Success/error toast messages
- Loading and error states
- Access control: circle treasurers see only circle transfers, group treasurers see only their group transfers

### Monthly Fund Tracking Components (New)

#### MonthlyAllocationManager.tsx
Modal component for managing monthly fund allocations for a single fund (treasurer only):
- Toggle between fixed and variable allocation modes
- Fixed mode: Single amount input with annual calculation
- Variable mode: Grid of 12 month inputs with Hebrew month names
- Real-time validation against total fund budget
- Summary display: total allocated, remaining unallocated
- Prevents over-allocation with error messages
- Saves to fund_monthly_allocations table
- Creates audit trail in fund_allocation_history
- Accessed from individual fund detail pages

#### BudgetMonthlyAllocationManager.tsx
Modal component for managing monthly allocations for all funds in a budget (treasurer only):
- Manage allocations for all funds in a budget from one place
- Expandable/collapsible sections for each fund
- Each fund shows: budget, allocated, remaining
- Toggle between fixed and variable allocation modes per fund
- Fixed mode: Single monthly amount with annual calculation
- Variable mode: Grid of 12 month inputs with Hebrew month names
- Real-time validation per fund against fund budget
- Visual indicators for over-allocation (red) and available budget (green)
- Batch save all fund allocations at once
- Accessed from budget detail page via "ניהול הקצאות חודשיות" button

#### AllocationHistoryModal.tsx
Modal component for viewing allocation change history:
- Table of all allocation changes for a fund
- Columns: date, month, amount, allocation type, action, changed by
- Change type badges (created/updated/deleted)
- Hebrew month names and labels
- Sortable by date
- Read-only view for audit purposes

#### MonthNavigator.tsx
Reusable month navigation component:
- Previous/next month arrow buttons
- Current month/year display with Hebrew month names
- Optional month/year picker for quick jumps
- Callback on month change
- Used across all monthly tracking pages
- Consistent navigation experience

#### MonthlyFundStatusCard.tsx
Dashboard card component showing monthly fund status:
- Fund name and current month
- Allocated, spent, planned, and remaining amounts
- Visual progress bar with color coding (green/yellow/red)
- Percentage of budget used
- Click to navigate to FundMonthlyDetail page
- Compact display for dashboard overview

#### MonthlyExpenseTable.tsx
Table component for displaying monthly expenses:
- Shows all reimbursements for a specific fund and month
- Columns: submitter, recipient, amount, description, date, status
- Sortable columns
- Receipt link if available
- Status badges with Hebrew labels
- Responsive grid layout

#### MonthlyPlannedExpenseTable.tsx
Table component for displaying monthly planned expenses:
- Shows all planned expenses for a specific fund and month
- Columns: user, amount, description, planned date, status
- Sortable columns
- Status badges with Hebrew labels
- Responsive grid layout

#### FundMonthlyDetail.tsx
Full page for monthly fund detail and management:
- Fund name and back button
- Month navigator for browsing months
- Monthly status summary card with progress bar
- Monthly expenses table
- Monthly planned expenses table
- "ניהול הקצאות חודשיות" button (treasurer only) - opens MonthlyAllocationManager
- "היסטוריית הקצאות" button (treasurer only) - opens AllocationHistoryModal
- Real-time data loading per selected month
- Access control based on fund permissions

### Recurring Transfer Components (New)

#### RecurringTransferFormModal.tsx
Modal form component for creating/editing recurring transfers:
- Recipient selection dropdown (all users)
- Fund selection grouped by budget (circle/group)
- Amount input with validation (positive numbers only)
- Description text field
- Frequency selector (monthly, quarterly, annual)
- Start date picker (required)
- End date picker (optional)
- Save and cancel actions
- Validation and Hebrew error messages
- RTL-friendly layout

#### RecurringTransferTable.tsx
Table component for displaying recurring transfers:
- Columns: recipient, fund, amount, description, frequency, start date, end date, status
- Status badges with color coding (active/paused/cancelled)
- Frequency labels in Hebrew (חודשי/רבעוני/שנתי)
- Optional actions column with edit, delete, and pause/resume buttons
- Responsive grid layout
- Hebrew RTL support
- Empty state message when no transfers exist

### Income Tracking Components (New)

#### CategoryManager.tsx
Component for managing income categories (treasurer only):
- List of all income categories with edit/delete actions
- Add new category form with name, description, and color picker
- Category usage statistics (number of incomes per category)
- Delete confirmation with usage warning
- Color-coded category badges
- Hebrew labels and RTL support

#### IncomeTable.tsx
Advanced table component for displaying actual income entries:
- Columns: date, source, description, amount, categories, actions
- Sortable columns (click header to sort)
- Filter controls (date range, source, category)
- Category badges with custom colors
- Edit and delete actions (treasurer only)
- Receipt/document link if available
- Responsive grid layout
- Hebrew RTL support

#### IncomeFormModal.tsx
Modal form for adding/editing actual income:
- Amount input with validation (positive numbers only)
- Date picker for income date
- Description text field
- Source selection: member dropdown or "מקור אחר" (other source)
- Multi-select for categories with color-coded badges
- Save and cancel actions
- Validation and error messages in Hebrew
- RTL-friendly layout

#### ExpectedIncomeTable.tsx
Table component for displaying expected income entries:
- Columns: source, amount, description, frequency, categories, type (manual/automatic), actions
- Visual distinction between manual and automatic entries
- Sortable columns
- Edit and delete actions with appropriate warnings
- Category badges
- Frequency indicators (one-time, monthly, quarterly, annual)
- Hebrew labels and RTL support

#### ExpectedIncomeFormModal.tsx
Modal form for adding/editing expected income:
- Planning level selector: annual or monthly
- Amount input with validation
- Source selection (member or other source)
- Description text field
- Frequency selector (for annual planning): one-time, monthly, quarterly, annual
- Month selector (for one-time or monthly planning)
- Year selector
- Multi-select for categories
- Automatic breakdown preview (for annual planning)
- Save and cancel actions
- Validation and Hebrew error messages

#### ComparisonTable.tsx
Table component for income comparison (expected vs actual):
- Columns: source, expected amount, actual amount, difference, fulfillment percentage, status
- Color-coded status indicators:
  - Red (אדום): Not received (0% fulfillment)
  - Orange (כתום): Partial (1-99% fulfillment)
  - Green (ירוק): Full or exceeded (100%+ fulfillment)
- Sortable columns
- Filter by category or source
- Summary row with totals
- Percentage calculations
- Hebrew labels and RTL support

#### Incomes.tsx
Comprehensive income tracking page with multiple sections:
- **Header**: Page title "הכנסות" with action buttons (Add Income, Manage Categories)
- **Section 1 - Actual Income**: IncomeTable with filters and actions
- **Section 2 - Annual Planning**: Year selector, ExpectedIncomeTable, add annual planning button
- **Section 3 - Monthly Planning**: MonthNavigator, ExpectedIncomeTable for selected month, add monthly income button
- **Section 4 - Comparison**: MonthNavigator, summary card, ComparisonTable with filters
- All sections in single scrollable page (similar to Payments.tsx structure)
- Access control: treasurer-only actions, member view of own income
- Real-time data updates after actions
- Toast notifications for success/error messages
- Hebrew interface with RTL layout

## Key Configuration Files

- **Environment**: `backend/.env` (development), Render dashboard (production)
- **Database**: Migrations in `backend/migrations/`, seeds in `backend/src/db/`
- **Docker**: `docker-compose.yml` (dev), `docker-compose.prod.yml` (prod)
- **TypeScript**: `tsconfig.json` in both backend and frontend
- **Build**: Vite config in `frontend/vite.config.ts`

## Development Workflow

1. **Setup**: Use Docker Compose or manual Node.js setup
2. **Database**: Run migrations and seeds for initial data
3. **Development**: Backend on :4567, Frontend on :3456
4. **API**: RESTful endpoints under `/api/` prefix
5. **Authentication**: JWT-based with role-based access control

## Naming Conventions

- **Files**: kebab-case for components, camelCase for utilities
- **API Routes**: RESTful with plural nouns (`/api/budgets`, `/api/reimbursements`)
- **Database**: snake_case for tables and columns
- **Components**: PascalCase React components
- **Types**: PascalCase interfaces and types