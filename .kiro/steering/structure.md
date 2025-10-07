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
│   ├── routes/      # API route definitions
│   │   ├── authRoutes.ts
│   │   ├── budgetRoutes.ts
│   │   ├── chargeRoutes.ts
│   │   ├── fundRoutes.ts
│   │   ├── groupRoutes.ts
│   │   ├── incomeRoutes.ts
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
│   │   ├── BudgetCard.tsx
│   │   ├── BudgetForm.tsx
│   │   ├── Button.tsx
│   │   ├── FundCard.tsx
│   │   ├── FundForm.tsx
│   │   ├── GroupFormModal.tsx
│   │   ├── Modal.tsx
│   │   ├── Navigation.tsx
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
│   │   ├── Payments.tsx
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
- **reimbursements**: Member expense reimbursement requests (enhanced with recipient_user_id)
- **charges**: User debts to circle/group that offset reimbursements
- **incomes**: Revenue and income tracking

### Enhanced Reimbursements Table
The reimbursements table includes:
- `recipient_user_id`: Optional field to specify payment recipient (different from submitter)
- Supports submitting reimbursements on behalf of others
- Defaults to submitter if no recipient specified

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
- `POST /api/reimbursements` - Create reimbursement (with optional recipientUserId)
- `PATCH /api/reimbursements/:id` - Update reimbursement (owner only, pending only)
- `DELETE /api/reimbursements/:id` - Delete reimbursement (owner only, pending only)

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