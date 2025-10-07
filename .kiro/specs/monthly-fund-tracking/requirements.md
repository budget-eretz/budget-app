# Requirements Document

## Introduction

This feature extends the existing fund management system to support monthly allocation tracking within funds. Currently, budgets are annual and funds receive a total allocation from their budget, but there's no way to break down that fund allocation into monthly portions or track monthly spending. This enhancement will allow treasurers to allocate monthly amounts from a fund's total allocation, support both fixed monthly allocations (same amount every month) and variable allocations (different amounts per month), allow partial allocation with the ability to allocate remaining amounts later, and view monthly fund status with expenses and planned expenses across the dashboard and budget detail pages.

## Requirements

### Requirement 1: Fixed Monthly Allocation

**User Story:** As a treasurer, I want to set a fixed monthly allocation amount for a fund that repeats every month, so that I can easily manage funds with consistent monthly budgets.

#### Acceptance Criteria

1. WHEN viewing a fund THEN the system SHALL display an option to set a fixed monthly allocation amount
2. WHEN a treasurer sets a fixed monthly allocation THEN the system SHALL store the amount and apply it to all months
3. WHEN a fixed monthly allocation is set THEN the system SHALL automatically allocate that amount to each month
4. WHEN viewing any month with a fixed allocation THEN the system SHALL display the same allocation amount
5. WHEN a treasurer updates a fixed monthly allocation THEN the system SHALL apply the new amount from the current month forward
6. WHEN calculating total allocated THEN the system SHALL sum all monthly allocations and ensure it does not exceed the fund's total allocation from the budget

### Requirement 2: Variable Monthly Allocation

**User Story:** As a treasurer, I want to set different allocation amounts for different months, so that I can accommodate varying spending needs throughout the year.

#### Acceptance Criteria

1. WHEN viewing a fund THEN the system SHALL display an option to set variable monthly allocations
2. WHEN a treasurer chooses variable allocation THEN the system SHALL allow setting a specific amount for each month
3. WHEN setting variable allocations THEN the system SHALL display all 12 months of the year
4. WHEN a treasurer sets an amount for a specific month THEN the system SHALL store that amount for that month only
5. WHEN calculating total allocated THEN the system SHALL sum all monthly allocations and ensure it does not exceed the fund's total allocation from the budget
6. IF a month has no allocation set THEN the system SHALL display zero or allow setting an amount later

### Requirement 3: Partial Allocation and Remaining Balance

**User Story:** As a treasurer, I want to allocate only part of a fund's total allocation now and allocate the rest later, so that I can maintain flexibility in budget planning.

#### Acceptance Criteria

1. WHEN viewing a fund THEN the system SHALL display the total allocation from the budget
2. WHEN viewing a fund THEN the system SHALL display the sum of all monthly allocations already set
3. WHEN viewing a fund THEN the system SHALL display the remaining unallocated amount (total allocation minus sum of monthly allocations)
4. WHEN setting monthly allocations THEN the system SHALL prevent allocating more than the remaining unallocated amount
5. IF attempting to allocate more than available THEN the system SHALL display an error message with the remaining available amount
6. WHEN a treasurer wants to allocate remaining balance THEN the system SHALL allow distributing it across unallocated or partially allocated months

### Requirement 4: Dashboard Monthly Fund Status Display

**User Story:** As a user, I want to see the current monthly status of all funds on the dashboard, so that I can quickly understand how much budget remains for each fund this month.

#### Acceptance Criteria

1. WHEN viewing the dashboard THEN the system SHALL display current month fund status for all accessible funds
2. WHEN displaying monthly fund status THEN the system SHALL show the monthly allocation amount
3. WHEN displaying monthly fund status THEN the system SHALL show the amount spent this month
4. WHEN displaying monthly fund status THEN the system SHALL show the remaining monthly budget
5. WHEN displaying monthly fund status THEN the system SHALL calculate spent amount from approved and paid reimbursements in the current month
6. IF a fund has no monthly allocation set THEN the system SHALL display only the overall fund balance

### Requirement 5: Budget Detail Page Monthly Fund Status

**User Story:** As a treasurer, I want to see monthly fund status when viewing a specific budget, so that I can monitor all funds within that budget on a monthly basis.

#### Acceptance Criteria

1. WHEN viewing a budget detail page THEN the system SHALL display current monthly status for all funds in that budget
2. WHEN displaying fund status on budget page THEN the system SHALL show monthly allocation, spent amount, and remaining amount
3. WHEN displaying fund status THEN the system SHALL use the same calculation logic as the dashboard
4. IF viewing as a treasurer THEN the system SHALL allow editing monthly allocations directly from the budget page

### Requirement 6: Monthly Expense List View

**User Story:** As a user, I want to view a list of all expenses from a specific fund for the current month, so that I can see what has been spent from the monthly allocation.

#### Acceptance Criteria

1. WHEN viewing a fund's monthly details THEN the system SHALL display a table of all reimbursements charged to that fund in the selected month
2. WHEN displaying monthly expenses THEN the system SHALL show submitter, recipient, description, amount, date, and status
3. WHEN displaying monthly expenses THEN the system SHALL include only approved and paid reimbursements in the spent calculation
4. WHEN displaying monthly expenses THEN the system SHALL show pending reimbursements separately with a visual distinction
5. IF there are no expenses for the month THEN the system SHALL display an appropriate empty state message

### Requirement 7: Monthly Planned Expenses View

**User Story:** As a user, I want to view all planned expenses for a specific fund in the current month, so that I can see what spending is anticipated and plan accordingly.

#### Acceptance Criteria

1. WHEN viewing a fund's monthly details THEN the system SHALL display a table of all planned expenses for that fund in the selected month
2. WHEN displaying planned expenses THEN the system SHALL show description, amount, planned date, and status
3. WHEN displaying planned expenses THEN the system SHALL filter by the expense_date field falling within the selected month
4. WHEN displaying planned expenses THEN the system SHALL show the total planned amount for the month
5. IF there are no planned expenses for the month THEN the system SHALL display an appropriate empty state message

### Requirement 8: Month Navigation

**User Story:** As a user, I want to navigate between different months when viewing fund details, so that I can review historical spending and plan for future months.

#### Acceptance Criteria

1. WHEN viewing monthly fund details THEN the system SHALL display the current selected month prominently
2. WHEN viewing monthly fund details THEN the system SHALL provide navigation controls to move to previous and next months
3. WHEN navigating to a different month THEN the system SHALL update all displayed data (expenses, planned expenses, status) for that month
4. WHEN navigating to a different month THEN the system SHALL maintain the selected fund context
5. WHEN viewing a past month THEN the system SHALL display historical data accurately
6. WHEN viewing a future month THEN the system SHALL show planned expenses and monthly allocation if set
7. WHEN navigating months THEN the system SHALL use Hebrew month names and formatting (e.g., "ינואר 2025")

### Requirement 9: Monthly Allocation History

**User Story:** As a treasurer, I want to see when monthly allocations were changed, so that I can track budget adjustments over time.

#### Acceptance Criteria

1. WHEN a monthly allocation is created or updated THEN the system SHALL record the change with timestamp and user
2. WHEN viewing fund details THEN the system SHALL optionally display allocation change history
3. WHEN displaying allocation history THEN the system SHALL show the date, amount, and user who made the change
4. IF viewing a historical month THEN the system SHALL use the allocation amount that was active during that month

### Requirement 10: Access Control for Monthly Allocations

**User Story:** As a system administrator, I want to ensure only authorized treasurers can set monthly allocations, so that budget control remains secure.

#### Acceptance Criteria

1. WHEN a user attempts to set a monthly allocation THEN the system SHALL verify the user has treasurer permissions for that fund's budget
2. IF a user is a circle treasurer THEN the system SHALL allow setting monthly allocations for all circle budget funds
3. IF a user is a group treasurer THEN the system SHALL allow setting monthly allocations only for their group's funds
4. IF a user is a regular member THEN the system SHALL NOT allow setting monthly allocations
5. WHEN unauthorized access is attempted THEN the system SHALL return an appropriate error message
