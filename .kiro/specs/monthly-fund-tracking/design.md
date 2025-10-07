# Design Document

## Overview

This feature adds monthly allocation tracking to the existing fund management system. The system currently supports annual budgets that allocate money to funds, but lacks the ability to break down fund allocations into monthly portions. This design introduces a new database table for monthly allocations, API endpoints for managing allocations, and UI components for viewing and managing monthly fund status.

The key concept is that a fund's total `allocated_amount` (from the budget) can be distributed across months. Users can choose between fixed monthly allocations (same amount every month) or variable allocations (different amounts per month). The system tracks spending against monthly allocations and prevents over-allocation.

## Architecture

### Database Layer
- New `fund_monthly_allocations` table to store monthly allocation data
- Queries to calculate monthly spending from reimbursements
- Queries to fetch planned expenses by month
- Validation to ensure total monthly allocations don't exceed fund's total allocation

### API Layer
- New endpoints for managing monthly allocations (CRUD operations)
- Enhanced fund endpoints to include monthly status data
- Endpoints for fetching monthly expenses and planned expenses
- Access control integration with existing treasurer permissions

### Frontend Layer
- Enhanced Dashboard to show current month fund status
- Enhanced Budget Detail page to show monthly fund status
- New Fund Detail/Monthly View component for detailed monthly tracking
- Month navigation controls
- Monthly allocation management UI (fixed vs variable)

## Components and Interfaces

### Database Schema

#### New Table: fund_monthly_allocations

```sql
CREATE TABLE fund_monthly_allocations (
  id SERIAL PRIMARY KEY,
  fund_id INTEGER REFERENCES funds(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  allocated_amount DECIMAL(12,2) NOT NULL CHECK (allocated_amount >= 0),
  allocation_type VARCHAR(20) NOT NULL CHECK (allocation_type IN ('fixed', 'variable')),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(fund_id, year, month)
);

CREATE INDEX idx_fund_monthly_allocations_fund_id ON fund_monthly_allocations(fund_id);
CREATE INDEX idx_fund_monthly_allocations_year_month ON fund_monthly_allocations(year, month);
```

**Fields:**
- `fund_id`: Reference to the fund
- `year`: Year of the allocation (e.g., 2025)
- `month`: Month number (1-12)
- `allocated_amount`: Amount allocated for this specific month
- `allocation_type`: Either 'fixed' or 'variable' to track allocation strategy
- `created_by`: User who created/updated the allocation
- `created_at`, `updated_at`: Audit timestamps

**Constraints:**
- Unique constraint on (fund_id, year, month) ensures one allocation per fund per month
- Check constraint ensures month is between 1 and 12
- Check constraint ensures allocated_amount is non-negative

### TypeScript Interfaces

```typescript
export interface FundMonthlyAllocation {
  id: number;
  fund_id: number;
  year: number;
  month: number;
  allocated_amount: number;
  allocation_type: 'fixed' | 'variable';
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface MonthlyFundStatus {
  fund_id: number;
  fund_name: string;
  year: number;
  month: number;
  allocated_amount: number;
  spent_amount: number;
  planned_amount: number;
  remaining_amount: number;
  allocation_type?: 'fixed' | 'variable';
}

export interface FundAllocationSummary {
  fund_id: number;
  total_fund_allocation: number;
  total_monthly_allocations: number;
  remaining_unallocated: number;
  monthly_allocations: FundMonthlyAllocation[];
}

export interface MonthlyExpenseDetail {
  id: number;
  fund_id: number;
  submitter_id: number;
  submitter_name: string;
  recipient_id: number;
  recipient_name: string;
  amount: number;
  description: string;
  expense_date: Date;
  status: string;
  receipt_url?: string;
}

export interface MonthlyPlannedExpenseDetail {
  id: number;
  fund_id: number;
  user_id: number;
  user_name: string;
  amount: number;
  description: string;
  planned_date: Date;
  status: string;
}
```

### API Endpoints

#### Monthly Allocation Management

**POST /api/funds/:fundId/monthly-allocations/fixed**
- Set fixed monthly allocation for a fund
- Body: `{ amount: number, startYear: number, startMonth: number }`
- Creates/updates allocations for current month forward
- Validates total doesn't exceed fund's allocated_amount
- Returns: Updated allocation summary

**POST /api/funds/:fundId/monthly-allocations/variable**
- Set variable monthly allocations
- Body: `{ allocations: Array<{ year: number, month: number, amount: number }> }`
- Creates/updates specific month allocations
- Validates total doesn't exceed fund's allocated_amount
- Returns: Updated allocation summary

**GET /api/funds/:fundId/monthly-allocations**
- Get all monthly allocations for a fund
- Returns: FundAllocationSummary with all monthly allocations

**GET /api/funds/:fundId/monthly-allocations/:year/:month**
- Get allocation for specific month
- Returns: FundMonthlyAllocation or null if not set

**DELETE /api/funds/:fundId/monthly-allocations/:year/:month**
- Delete allocation for specific month (variable allocations only)
- Returns: Success message

#### Monthly Status and Data

**GET /api/funds/:fundId/monthly-status/:year/:month**
- Get complete monthly status for a fund
- Returns: MonthlyFundStatus with allocated, spent, planned, and remaining amounts

**GET /api/funds/:fundId/monthly-expenses/:year/:month**
- Get all reimbursements for a fund in a specific month
- Filters by expense_date within the month
- Returns: Array of MonthlyExpenseDetail

**GET /api/funds/:fundId/monthly-planned/:year/:month**
- Get all planned expenses for a fund in a specific month
- Filters by planned_date within the month
- Returns: Array of MonthlyPlannedExpenseDetail

**GET /api/dashboard/monthly-status**
- Get current month status for all accessible funds
- Returns: Array of MonthlyFundStatus for current month

**GET /api/budgets/:budgetId/monthly-status/:year/:month**
- Get monthly status for all funds in a budget
- Returns: Array of MonthlyFundStatus

### Frontend Components

#### MonthlyAllocationManager Component
- Allows treasurers to set fixed or variable allocations
- Shows total fund allocation and remaining unallocated amount
- For fixed: Single input field with amount
- For variable: 12-month grid with individual inputs
- Real-time validation to prevent over-allocation
- Save/Cancel actions

#### MonthlyFundStatusCard Component
- Displays monthly status for a single fund
- Shows: allocated, spent, planned, remaining amounts
- Visual progress bar or indicator
- Click to view detailed monthly view
- Used in Dashboard and Budget Detail pages

#### FundMonthlyDetailView Component
- Full-page view for a specific fund's monthly data
- Month navigation controls (previous/next month, month picker)
- Monthly status summary at top
- Two tables: Expenses and Planned Expenses
- Treasurer can access allocation management from here

#### MonthNavigator Component
- Reusable month navigation control
- Previous/Next buttons
- Month/Year display in Hebrew
- Optional month picker dropdown

#### MonthlyExpenseTable Component
- Table showing all reimbursements for the month
- Columns: Submitter, Recipient, Description, Amount, Date, Status
- Sortable and filterable
- Link to receipt if available

#### MonthlyPlannedExpenseTable Component
- Table showing all planned expenses for the month
- Columns: User, Description, Amount, Planned Date, Status
- Sortable and filterable

### Calculation Logic

#### Monthly Spent Amount
```sql
SELECT COALESCE(SUM(amount), 0) as spent_amount
FROM reimbursements
WHERE fund_id = $1
  AND EXTRACT(YEAR FROM expense_date) = $2
  AND EXTRACT(MONTH FROM expense_date) = $3
  AND status IN ('approved', 'paid')
```

#### Monthly Planned Amount
```sql
SELECT COALESCE(SUM(amount), 0) as planned_amount
FROM planned_expenses
WHERE fund_id = $1
  AND EXTRACT(YEAR FROM planned_date) = $2
  AND EXTRACT(MONTH FROM planned_date) = $3
  AND status = 'planned'
```

#### Remaining Monthly Amount
```
remaining = allocated_amount - spent_amount
```
Note: Planned expenses are shown separately but don't reduce remaining amount (only approved/paid reimbursements do)

#### Total Monthly Allocations Validation
```sql
SELECT COALESCE(SUM(allocated_amount), 0) as total_monthly
FROM fund_monthly_allocations
WHERE fund_id = $1
```
Must ensure: `total_monthly <= fund.allocated_amount`

## Data Models

### Fund (Enhanced)
The existing `funds` table remains unchanged. The `allocated_amount` field represents the total allocation from the budget, which can then be distributed across months using the new `fund_monthly_allocations` table.

### FundMonthlyAllocation (New)
Stores individual month allocations. Multiple rows per fund (one per month that has an allocation set).

### Relationships
- Fund 1:N FundMonthlyAllocation
- FundMonthlyAllocation N:1 User (created_by)
- Reimbursements are linked to funds and filtered by expense_date for monthly calculations
- PlannedExpenses are linked to funds and filtered by planned_date for monthly calculations

## Error Handling

### Validation Errors
- **Over-allocation**: When total monthly allocations exceed fund's allocated_amount
  - HTTP 400: "Total monthly allocations (X) exceed fund's total allocation (Y). Remaining available: Z"
- **Invalid month**: When month is not between 1-12
  - HTTP 400: "Invalid month. Must be between 1 and 12"
- **Invalid year**: When year is unreasonable (e.g., before 2000 or too far in future)
  - HTTP 400: "Invalid year"
- **Negative amount**: When allocated_amount is negative
  - HTTP 400: "Allocation amount must be non-negative"

### Authorization Errors
- **Unauthorized allocation**: When non-treasurer tries to set allocations
  - HTTP 403: "Only treasurers can manage monthly allocations"
- **Wrong group**: When group treasurer tries to manage another group's fund
  - HTTP 403: "Cannot manage allocations for funds outside your group"

### Not Found Errors
- **Fund not found**: When fund_id doesn't exist
  - HTTP 404: "Fund not found"
- **Allocation not found**: When querying non-existent allocation
  - HTTP 404: "No allocation found for this month"

### Database Errors
- **Constraint violation**: When unique constraint is violated
  - HTTP 409: "Allocation for this month already exists"
- **Foreign key violation**: When fund_id is invalid
  - HTTP 400: "Invalid fund ID"

## Testing Strategy

Manual testing will be performed to verify functionality. Key scenarios to test manually:

### Core Functionality
- Create fixed monthly allocation and verify it appears correctly
- Create variable monthly allocations for different months
- Verify over-allocation prevention works
- Submit reimbursement and verify monthly spent amount updates
- Navigate between months and verify data displays correctly

### Edge Cases
- Fund with no monthly allocations set (should show only total fund balance)
- Month with no expenses or planned expenses (should show full allocated amount as remaining)
- Attempting to allocate more than fund's total allocation
- Changing from fixed to variable allocation
- Viewing historical months with different allocation amounts

## UI/UX Considerations

### Hebrew Language Support
- All labels, buttons, and messages in Hebrew
- Month names in Hebrew (ינואר, פברואר, מרץ, etc.)
- RTL layout for all components
- Number formatting with Hebrew locale

### Visual Design
- Clear distinction between allocated, spent, and remaining amounts
- Color coding: Green for remaining budget, Red for over-spent, Yellow for warnings
- Progress bars or visual indicators for budget consumption
- Responsive design for mobile and desktop

### User Flows

#### Treasurer Setting Fixed Allocation
1. Navigate to Fund detail or Budget detail page
2. Click "ניהול הקצאות חודשיות" (Manage Monthly Allocations)
3. Select "הקצאה קבועה" (Fixed Allocation)
4. Enter amount
5. System validates against total fund allocation
6. Click "שמור" (Save)
7. System creates allocations for current month forward
8. Success message displayed

#### Treasurer Setting Variable Allocations
1. Navigate to Fund detail or Budget detail page
2. Click "ניהול הקצאות חודשיות" (Manage Monthly Allocations)
3. Select "הקצאה משתנה" (Variable Allocation)
4. View 12-month grid
5. Enter amounts for desired months
6. System shows running total and remaining unallocated
7. Click "שמור" (Save)
8. System validates total doesn't exceed fund allocation
9. Success message displayed

#### Member Viewing Monthly Status
1. View Dashboard or Budget detail page
2. See current month status for all accessible funds
3. Click on a fund to view detailed monthly view
4. See allocated, spent, and remaining for current month
5. Navigate to previous/next months to view history
6. View tables of expenses and planned expenses for selected month

### Accessibility
- Keyboard navigation support
- Screen reader friendly labels
- High contrast mode support
- Focus indicators on interactive elements

## Performance Considerations

### Database Optimization
- Indexes on fund_id, year, and month for fast lookups
- Efficient queries using date extraction functions
- Consider materialized views for dashboard if performance issues arise

### Caching Strategy
- Cache current month status for frequently accessed funds
- Invalidate cache when new reimbursements are approved or allocations change
- Consider Redis for caching if needed

### Query Optimization
- Use JOINs efficiently to minimize round trips
- Batch queries when fetching multiple funds' monthly status
- Use EXPLAIN ANALYZE to identify slow queries

## Migration Strategy

### Database Migration
1. Create `fund_monthly_allocations` table
2. Add indexes
3. No data migration needed (new feature, starts empty)

### Deployment Steps
1. Run database migration
2. Deploy backend with new API endpoints
3. Deploy frontend with new components
4. Announce feature to users with documentation

### Rollback Plan
- If issues arise, can disable feature in frontend
- Database table can remain (no harm if unused)
- If needed to rollback completely, drop table and indexes

## Future Enhancements

### Potential Future Features
- Automatic allocation suggestions based on historical spending
- Budget alerts when approaching monthly limit
- Bulk allocation management (set allocations for multiple funds at once)
- Allocation templates (copy allocations from one fund to another)
- Fiscal year support (allocations aligned with fiscal year instead of calendar year)
- Rollover unused budget to next month
- Monthly reports and analytics
- Export monthly data to CSV/Excel
