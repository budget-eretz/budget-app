# Budget Monthly Allocation Manager

## Overview
A comprehensive modal component that allows treasurers to manage monthly allocations for all funds within a budget from a single centralized interface.

## Purpose
Previously, treasurers had to navigate to each individual fund's detail page to manage its monthly allocations. This component provides a more efficient workflow by allowing batch management of all fund allocations from the budget level.

## Features

### Multi-Fund Management
- View and manage all funds in a budget simultaneously
- Expandable/collapsible sections for each fund
- Clear visual hierarchy and organization

### Per-Fund Allocation Control
- Each fund can be configured independently
- Toggle between fixed and variable allocation modes per fund
- Fixed mode: Set a single monthly amount (automatically calculates annual total)
- Variable mode: Set different amounts for each of the 12 months

### Real-Time Validation
- Validates each fund's allocations against its total budget
- Visual indicators:
  - **Green**: Available budget remaining
  - **Red**: Over-allocated (exceeds fund budget)
- Prevents saving when any fund is over-allocated

### Fund Summary Display
Each fund shows:
- Fund name
- Total fund budget (תקציב)
- Total allocated amount (הוקצה)
- Remaining unallocated amount (יתרה)

### Batch Operations
- Save all fund allocations at once
- Single API call per fund
- Success/error feedback for the entire operation

## Usage

### Access
The component is accessible from the Budget Detail page (`/budgets/:id`) via the "ניהול הקצאות חודשיות" button in the "מצב סעיפים חודשי" section.

### Permissions
- Only treasurers with permission to manage the budget can access this feature
- Circle treasurers: Full access to all budgets
- Group treasurers: Access only to their group's budgets

### Workflow
1. Click "ניהול הקצאות חודשיות" button on budget detail page
2. Modal opens showing all funds in the budget
3. Click on a fund to expand its allocation settings
4. Choose allocation type (fixed or variable)
5. Enter allocation amounts
6. Repeat for other funds as needed
7. Click "שמור הכל" to save all changes at once

## Technical Details

### Props
```typescript
interface BudgetMonthlyAllocationManagerProps {
  budgetId: number;           // Budget ID
  budgetName: string;         // Budget name for display
  funds: Fund[];              // Array of funds in the budget
  onClose: () => void;        // Callback when modal closes
  onSuccess: () => void;      // Callback after successful save
}
```

### State Management
- Loads existing allocations for all funds on mount
- Maintains separate state for each fund's allocation type and amounts
- Tracks expanded/collapsed state for each fund section

### API Integration
- Uses `monthlyAllocationsAPI.getAllocations()` to load existing data
- Uses `monthlyAllocationsAPI.setFixedAllocation()` for fixed allocations
- Uses `monthlyAllocationsAPI.setVariableAllocations()` for variable allocations
- Saves all funds in parallel using `Promise.all()`

### Validation Rules
- Fixed amounts must be positive numbers
- Variable amounts can be zero (no allocation for that month)
- Total allocated amount cannot exceed fund's total budget
- At least one non-zero allocation required for variable mode

## Related Components
- **MonthlyAllocationManager.tsx**: Single-fund allocation manager (accessed from fund detail page)
- **AllocationHistoryModal.tsx**: View allocation change history
- **MonthNavigator.tsx**: Navigate between months

## Styling
- Uses `BudgetMonthlyAllocationManager.css` for component-specific styles
- Responsive design with mobile support
- RTL (right-to-left) layout for Hebrew interface
- Consistent with application design system

## Future Enhancements
- Bulk copy allocations from one fund to another
- Template-based allocation (save and reuse allocation patterns)
- Import/export allocations from CSV
- Allocation comparison view (compare allocations across funds)
