# Design Document - Budget and Fund Management UI

## Overview

This design document outlines the implementation of a comprehensive budget and fund management interface for the budget management system. The solution will provide treasurers with full CRUD capabilities for budgets and funds through an intuitive, Hebrew-language interface that follows the existing design patterns in the application.

## Architecture

### Component Structure

```
frontend/src/
├── pages/
│   ├── Budgets.tsx              # Main budgets list page
│   ├── BudgetDetail.tsx         # Detailed budget view with funds
│   └── Dashboard.tsx            # Updated with navigation
├── components/
│   ├── BudgetForm.tsx           # Reusable budget create/edit form
│   ├── FundForm.tsx             # Reusable fund create/edit form
│   ├── BudgetCard.tsx           # Budget display card component
│   ├── FundCard.tsx             # Fund display card component
│   ├── Navigation.tsx           # New navigation component
│   ├── Button.tsx               # Existing (no changes)
│   ├── Modal.tsx                # Existing (no changes)
│   └── Toast.tsx                # Existing (no changes)
└── services/
    └── api.ts                   # Existing (already has budget/fund APIs)
```

### Routing Structure

```typescript
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
  <Route path="/budgets" element={<PrivateRoute><Budgets /></PrivateRoute>} />
  <Route path="/budgets/:id" element={<PrivateRoute><BudgetDetail /></PrivateRoute>} />
  <Route path="/payments" element={<PrivateRoute><Payments /></PrivateRoute>} />
  <Route path="/reimbursements/new" element={<PrivateRoute><NewReimbursement /></PrivateRoute>} />
  <Route path="/planned-expenses/new" element={<PrivateRoute><NewPlannedExpense /></PrivateRoute>} />
  <Route path="/" element={<Navigate to="/dashboard" />} />
</Routes>
```

## Components and Interfaces

### 1. Navigation Component

A persistent navigation bar that appears on all authenticated pages.

**Props:**
```typescript
interface NavigationProps {
  currentPath: string;
}
```

**Features:**
- Display app title
- Show user name and role
- Navigation links based on user role:
  - Dashboard (all users)
  - Budgets (treasurers only)
  - Payments (treasurers only)
- Logout button

**Design Pattern:**
- Horizontal navigation bar at the top
- Sticky positioning
- Responsive: collapses to hamburger menu on mobile

### 2. Budgets Page Component

Main page for viewing and managing all budgets.

**State:**
```typescript
interface BudgetsState {
  budgets: Budget[];
  loading: boolean;
  showCreateModal: boolean;
  editingBudget: Budget | null;
  showEditModal: boolean;
}
```

**Features:**
- Grid layout of budget cards
- "Create Budget" button (circle treasurer only)
- Search/filter functionality
- Sort by name, amount, or date
- Click on budget card to navigate to detail page

**Layout:**
- Header with title and create button
- Filter/search bar
- Grid of budget cards (3 columns on desktop, 2 on tablet, 1 on mobile)
- Empty state when no budgets exist

### 3. Budget Detail Page Component

Detailed view of a single budget with its funds.

**State:**
```typescript
interface BudgetDetailState {
  budget: Budget | null;
  funds: Fund[];
  incomes: Income[];
  loading: boolean;
  showCreateFundModal: boolean;
  editingFund: Fund | null;
  showEditFundModal: boolean;
  showDeleteConfirm: boolean;
}
```

**Features:**
- Budget summary card showing:
  - Name, fiscal year, group
  - Total amount
  - Total allocated to funds
  - Total spent
  - Total planned
  - Available amount
- Edit/Delete budget buttons (with permissions check)
- List of funds with their status
- "Create Fund" button
- Recent income entries
- Back to budgets list button

**Layout:**
- Header with budget name and actions
- Summary section with financial overview
- Funds section with grid of fund cards
- Income section with table of recent incomes

### 4. Budget Form Component

Reusable form for creating and editing budgets.

**Props:**
```typescript
interface BudgetFormProps {
  budget?: Budget;  // undefined for create, defined for edit
  onSubmit: (data: BudgetFormData) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

interface BudgetFormData {
  name: string;
  totalAmount: number;
  fiscalYear?: number;
  groupId?: number;
}
```

**Fields:**
- Name (text input, required)
- Total Amount (number input, required, min: 0)
- Fiscal Year (number input, optional, e.g., 2025)
- Group (select dropdown, optional, circle treasurer only)

**Validation:**
- Name: required, max 255 characters
- Total Amount: required, positive number
- Fiscal Year: optional, 4-digit year
- Group: optional, valid group ID

**Design:**
- Modal-based form
- Two-column layout on desktop, single column on mobile
- Clear error messages below each field
- Submit and Cancel buttons at bottom

### 5. Fund Form Component

Reusable form for creating and editing funds.

**Props:**
```typescript
interface FundFormProps {
  fund?: Fund;  // undefined for create, defined for edit
  budgetId: number;
  availableBudgetAmount: number;
  onSubmit: (data: FundFormData) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

interface FundFormData {
  name: string;
  allocatedAmount: number;
  description?: string;
}
```

**Fields:**
- Name (text input, required)
- Allocated Amount (number input, required, min: 0)
- Description (textarea, optional)
- Display available budget amount as info

**Validation:**
- Name: required, max 255 characters
- Allocated Amount: required, positive number, warning if exceeds available
- Description: optional, max 1000 characters

**Design:**
- Modal-based form
- Single column layout
- Show available budget amount prominently
- Warning message if allocation exceeds available
- Submit and Cancel buttons at bottom

### 6. Budget Card Component

Display component for budget summary in grid view.

**Props:**
```typescript
interface BudgetCardProps {
  budget: Budget;
  onClick: () => void;
}
```

**Display:**
- Budget name (bold, large)
- Group name or "תקציב מעגלי" (subtitle)
- Total amount (large, colored)
- Fiscal year (if available)
- Visual indicator for budget health (green/yellow/red based on usage)

**Design:**
- Card with shadow and hover effect
- Click to navigate to detail page
- Responsive sizing

### 7. Fund Card Component

Display component for fund summary in grid view.

**Props:**
```typescript
interface FundCardProps {
  fund: Fund;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions: boolean;
}
```

**Display:**
- Fund name (bold)
- Allocated amount
- Spent amount (red)
- Planned amount (orange)
- Available amount (green, bold)
- Progress bar showing usage
- Edit/Delete buttons (if showActions is true)

**Design:**
- Card with shadow
- Color-coded amounts
- Visual progress bar
- Action buttons in top-right corner

## Data Models

### Budget Interface

```typescript
interface Budget {
  id: number;
  name: string;
  total_amount: number;
  group_id: number | null;
  group_name?: string;
  fiscal_year: number | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  total_income?: number;
  allocated_to_funds?: number;
  total_spent?: number;
  total_planned?: number;
  available_amount?: number;
}
```

### Fund Interface

```typescript
interface Fund {
  id: number;
  budget_id: number;
  name: string;
  allocated_amount: number;
  description: string | null;
  created_at: string;
  spent_amount?: number;
  planned_amount?: number;
  available_amount?: number;
}
```

### Group Interface

```typescript
interface Group {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}
```

## Error Handling

### Client-Side Validation

1. **Form Validation:**
   - Required field validation before submission
   - Number format validation
   - Range validation (positive numbers)
   - Length validation for text fields

2. **User Feedback:**
   - Inline error messages below fields
   - Toast notifications for success/error
   - Loading states during API calls
   - Disabled buttons during submission

### Server-Side Error Handling

1. **API Error Responses:**
   - 400: Validation errors → Display specific field errors
   - 403: Permission denied → Redirect to dashboard with error toast
   - 404: Resource not found → Display not found message
   - 500: Server error → Display generic error message

2. **Network Errors:**
   - Connection timeout → Retry prompt
   - No internet → Offline message
   - Unexpected errors → Generic error message with support contact

### Permission Checks

1. **Frontend Guards:**
   - Check user role before rendering treasurer-only features
   - Hide/disable actions based on permissions
   - Redirect unauthorized users

2. **Backend Validation:**
   - All API calls validate user permissions
   - Return 403 for unauthorized actions
   - Log permission violations

## Testing Strategy

Manual testing will be performed to verify functionality. Focus on:

1. **Core Functionality:**
   - Create, edit, and delete budgets
   - Create, edit, and delete funds
   - Navigation between pages
   - Permission-based access control

2. **User Scenarios:**
   - Circle treasurer workflow
   - Group treasurer workflow
   - Error handling and validation

## Accessibility

1. **Keyboard Navigation:**
   - All interactive elements accessible via keyboard
   - Logical tab order
   - Enter key submits forms
   - Escape key closes modals

2. **Screen Readers:**
   - Semantic HTML elements
   - ARIA labels for icons and buttons
   - Form labels properly associated
   - Error messages announced

3. **Visual:**
   - Sufficient color contrast
   - Focus indicators visible
   - Text scalable
   - No information conveyed by color alone

## Performance Considerations

1. **Data Loading:**
   - Load budgets list on page mount
   - Load budget details on demand
   - Cache budget list in component state
   - Refresh data after mutations

2. **Rendering:**
   - Use React.memo for card components
   - Virtualize long lists if needed
   - Debounce search/filter inputs
   - Lazy load budget detail page

3. **API Optimization:**
   - Batch related API calls where possible
   - Use loading states to prevent duplicate requests
   - Implement optimistic updates for better UX

## Responsive Design

### Breakpoints

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Layout Adaptations

1. **Mobile (< 768px):**
   - Navigation collapses to hamburger menu
   - Budget grid: 1 column
   - Fund grid: 1 column
   - Forms: single column
   - Tables: card layout instead of table

2. **Tablet (768px - 1024px):**
   - Navigation: full horizontal bar
   - Budget grid: 2 columns
   - Fund grid: 2 columns
   - Forms: single column
   - Tables: scrollable horizontal

3. **Desktop (> 1024px):**
   - Navigation: full horizontal bar
   - Budget grid: 3 columns
   - Fund grid: 3 columns
   - Forms: two columns where appropriate
   - Tables: full table layout

## Security Considerations

1. **Authentication:**
   - All pages require authentication
   - Token stored in localStorage
   - Token sent with every API request
   - Redirect to login if token invalid

2. **Authorization:**
   - Frontend checks user role before rendering features
   - Backend validates permissions on every request
   - Sensitive actions require confirmation

3. **Data Validation:**
   - Client-side validation for UX
   - Server-side validation for security
   - Sanitize user inputs
   - Prevent XSS attacks

## Styling Approach

### Design System

Following the existing application patterns:

1. **Colors:**
   - Primary: #667eea (purple-blue)
   - Success: #38a169 (green)
   - Danger: #e53e3e (red)
   - Warning: #dd6b20 (orange)
   - Secondary: #718096 (gray)
   - Background: #f7fafc (light gray)

2. **Typography:**
   - Font: System font stack
   - Sizes: 13px (small), 14px (body), 16px (large), 18px (heading), 20px (title), 24px (page title)
   - Weights: 400 (normal), 600 (semibold), 700 (bold)

3. **Spacing:**
   - Base unit: 4px
   - Common: 8px, 12px, 16px, 20px, 24px, 32px, 40px

4. **Shadows:**
   - Card: 0 1px 3px rgba(0,0,0,0.1)
   - Modal: 0 20px 60px rgba(0,0,0,0.3)
   - Hover: 0 4px 6px rgba(0,0,0,0.1)

5. **Border Radius:**
   - Small: 4px
   - Medium: 6px
   - Large: 8px
   - Pill: 12px

### Component Styling

- Use inline styles (React.CSSProperties) for consistency with existing code
- Create style objects at component bottom
- Use responsive styles with media queries where needed
- Maintain RTL (right-to-left) support for Hebrew

## Implementation Notes

1. **Reuse Existing Patterns:**
   - Follow Dashboard.tsx structure for page layout
   - Use existing Button and Modal components
   - Match existing form styling from NewReimbursement.tsx
   - Use existing Toast system for notifications

2. **API Integration:**
   - budgetsAPI and fundsAPI already exist in api.ts
   - No backend changes needed
   - Handle all API responses consistently

3. **State Management:**
   - Use React hooks (useState, useEffect)
   - No global state management needed
   - Local component state sufficient

4. **Navigation:**
   - Add Navigation component to all authenticated pages
   - Update App.tsx with new routes
   - Use React Router's useNavigate for programmatic navigation

5. **Permissions:**
   - Use AuthContext to access user role
   - Check isCircleTreasurer and isGroupTreasurer
   - Hide/disable features based on permissions
