# Requirements Document - Budget and Fund Management UI

## Introduction

מערכת ניהול התקציב כרגע חסרה ממשק משתמש לניהול תקציבים וקופות. גזברים (מעגליים וקבוצתיים) צריכים יכולת ליצור, לערוך ולמחוק תקציבים וקופות דרך הממשק. כרגע הפונקציונליות קיימת ב-backend אבל אין UI מתאים.

## Requirements

### Requirement 1: Budget Management Interface

**User Story:** As a circle treasurer, I want to manage budgets through a user interface, so that I can create, edit, and view budgets without using API calls directly.

#### Acceptance Criteria

1. WHEN the circle treasurer navigates to the budgets page THEN the system SHALL display a list of all budgets (circle and group budgets)
2. WHEN the circle treasurer clicks "Create Budget" THEN the system SHALL display a form with fields for name, total amount, fiscal year, and optional group selection
3. WHEN the circle treasurer submits a valid budget form THEN the system SHALL create the budget and display a success message
4. WHEN the circle treasurer clicks "Edit" on a budget THEN the system SHALL display a form pre-filled with the budget's current data
5. WHEN the circle treasurer updates a budget THEN the system SHALL save the changes and display a success message
6. IF the budget has associated funds THEN the system SHALL display a warning before allowing deletion
7. WHEN viewing a budget THEN the system SHALL display total amount, allocated to funds, available amount, and total income

### Requirement 2: Fund Management Interface

**User Story:** As a treasurer (circle or group), I want to manage funds within budgets, so that I can allocate budget money to specific purposes.

#### Acceptance Criteria

1. WHEN a treasurer views a budget detail page THEN the system SHALL display all funds associated with that budget
2. WHEN a treasurer clicks "Create Fund" THEN the system SHALL display a form with fields for name, allocated amount, and description
3. WHEN a treasurer submits a valid fund form THEN the system SHALL create the fund and display a success message
4. WHEN a treasurer clicks "Edit" on a fund THEN the system SHALL display a form pre-filled with the fund's current data
5. WHEN a treasurer updates a fund THEN the system SHALL save the changes and display a success message
6. IF the fund has associated reimbursements or planned expenses THEN the system SHALL display a warning before allowing deletion
7. WHEN viewing a fund THEN the system SHALL display allocated amount, spent amount, planned amount, and available amount
8. IF a group treasurer tries to manage funds for another group's budget THEN the system SHALL deny access with an error message

### Requirement 3: Budget Detail View

**User Story:** As a treasurer, I want to view detailed information about a specific budget, so that I can understand its financial status and associated funds.

#### Acceptance Criteria

1. WHEN a user clicks on a budget THEN the system SHALL navigate to a budget detail page
2. WHEN viewing budget details THEN the system SHALL display budget name, total amount, fiscal year, group name (if applicable), and creation date
3. WHEN viewing budget details THEN the system SHALL display a summary showing total allocated to funds, total spent, total planned, and available amount
4. WHEN viewing budget details THEN the system SHALL display a list of all associated funds with their financial status
5. WHEN viewing budget details THEN the system SHALL display recent income entries for that budget
6. IF the user is a circle treasurer THEN the system SHALL display action buttons for editing and deleting the budget
7. WHEN viewing a group budget as a group treasurer THEN the system SHALL only show action buttons if the budget belongs to their group

### Requirement 4: Navigation and Access Control

**User Story:** As a user, I want appropriate navigation to budget management features, so that I can easily access the functionality I need based on my role.

#### Acceptance Criteria

1. WHEN a treasurer logs in THEN the system SHALL display a "Budgets" navigation link in the header or sidebar
2. WHEN a regular member logs in THEN the system SHALL NOT display budget management navigation
3. WHEN a group treasurer accesses the budgets page THEN the system SHALL only display budgets for their group and circle budgets
4. WHEN a circle treasurer accesses the budgets page THEN the system SHALL display all budgets
5. IF a user tries to access budget management without treasurer permissions THEN the system SHALL redirect to the dashboard with an error message

### Requirement 5: Form Validation and Error Handling

**User Story:** As a treasurer, I want clear validation and error messages when managing budgets and funds, so that I can correct mistakes and understand what went wrong.

#### Acceptance Criteria

1. WHEN a treasurer submits a budget form with missing required fields THEN the system SHALL display field-specific error messages
2. WHEN a treasurer enters a negative amount THEN the system SHALL display an error message
3. WHEN a treasurer tries to allocate more funds than available in a budget THEN the system SHALL display a warning message
4. IF a network error occurs during save THEN the system SHALL display a user-friendly error message
5. WHEN a treasurer successfully creates or updates a budget/fund THEN the system SHALL display a success toast notification
6. IF a treasurer tries to delete a budget with existing funds THEN the system SHALL display a confirmation dialog with details about the funds

### Requirement 6: Responsive Design

**User Story:** As a treasurer, I want the budget management interface to work on different screen sizes, so that I can manage budgets from my phone or tablet.

#### Acceptance Criteria

1. WHEN viewing the budgets list on mobile THEN the system SHALL display budgets in a card layout instead of a table
2. WHEN viewing forms on mobile THEN the system SHALL stack form fields vertically
3. WHEN viewing budget details on mobile THEN the system SHALL display information in a mobile-friendly layout
4. WHEN using the interface on tablet THEN the system SHALL adapt the layout appropriately
5. WHEN using action buttons on mobile THEN the system SHALL ensure buttons are large enough for touch interaction
