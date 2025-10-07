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
│   │   ├── fundController.ts
│   │   ├── groupController.ts
│   │   ├── incomeController.ts
│   │   ├── paymentTransferController.ts
│   │   ├── plannedExpenseController.ts
│   │   ├── reimbursementController.ts
│   │   ├── reportController.ts
│   │   └── userController.ts
│   ├── db/          # Database utilities, migrations, seeds
│   │   ├── migrate.ts
│   │   └── seed.ts
│   ├── middleware/   # Express middleware (auth, validation)
│   │   ├── accessControl.ts
│   │   └── auth.ts
│   ├── utils/       # Helper functions and utilities
│   │   └── paymentTransferHelpers.ts
│   ├── routes/      # API route definitions
│   │   ├── authRoutes.ts
│   │   ├── budgetRoutes.ts
│   │   ├── chargeRoutes.ts
│   │   ├── fundRoutes.ts
│   │   ├── groupRoutes.ts
│   │   ├── incomeRoutes.ts
│   │   ├── paymentTransferRoutes.ts
│   │   ├── plannedExpenseRoutes.ts
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
│   │   ├── BudgetCard.tsx
│   │   ├── BudgetForm.tsx
│   │   ├── Button.tsx
│   │   ├── FilterBar.tsx
│   │   ├── FundCard.tsx
│   │   ├── FundForm.tsx
│   │   ├── GroupFormModal.tsx
│   │   ├── Modal.tsx
│   │   ├── Navigation.tsx
│   │   ├── PaymentTransferDetailsModal.tsx
│   │   ├── PaymentTransferTable.tsx
│   │   ├── ReimbursementDetailsModal.tsx
│   │   ├── ReimbursementTable.tsx
│   │   ├── RejectionModal.tsx
│   │   ├── Toast.tsx
│   │   └── UserEditModal.tsx
│   ├── context/     # React context providers (auth, state)
│   │   └── AuthContext.tsx
│   ├── pages/       # Route-level page components
│   │   ├── BudgetDetail.tsx
│   │   ├── Budgets.tsx
│   │   ├── Dashboard.tsx
│   │   ├── GroupManagement.tsx
│   │   ├── Login.tsx
│   │   ├── MyReimbursements.tsx
│   │   ├── NewCharge.tsx
│   │   ├── NewPlannedExpense.tsx
│   │   ├── NewReimbursement.tsx
│   │   ├── Payments.tsx          # Treasurer reimbursement approval with multi-status workflow (renamed from "ניהול העברות" to "אישור החזרים")
│   │   ├── PaymentTransfers.tsx  # Payment transfer execution page (העברות)
│   │   └── UserManagement.tsx
│   ├── services/    # API client and external services
│   │   └── api.ts
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
- **planned_expenses**: Future expense planning
- **reimbursements**: Member expense reimbursement requests (enhanced with recipient_user_id and payment_transfer_id)
- **payment_transfers**: Grouped approved reimbursements by recipient and budget type for payment execution
- **charges**: User debts to circle/group that offset reimbursements
- **incomes**: Revenue and income tracking

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

### Charge Endpoints (New)
- `GET /api/charges/my` - Get user's charges
- `POST /api/charges` - Create new charge
- `PATCH /api/charges/:id` - Update charge (owner only, active only)
- `DELETE /api/charges/:id` - Delete charge (owner only, active only)

### Fund Endpoints (Enhanced)
- `GET /api/funds` - List all funds
- `GET /api/funds/accessible` - Get funds grouped by budget with access control

### Other Endpoints
- Authentication: `/api/auth/*`
- Budgets: `/api/budgets/*`
- Groups: `/api/groups/*`
- Users: `/api/users/*`
- Planned Expenses: `/api/planned-expenses/*`
- Incomes: `/api/incomes/*`
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