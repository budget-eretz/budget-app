# Requirements Document

## Introduction

A comprehensive financial reporting system for treasurers to analyze income, expenses, budget execution, and housing costs with detailed breakdowns by categories, budgets, and time periods.

## Glossary

- **Report_System**: The financial reporting module that generates various financial analysis reports
- **Monthly_Closing**: End-of-month financial summary report
- **Budget_Execution**: Analysis of actual vs planned budget performance over time
- **Housing_Expense_Report**: Detailed housing cost analysis with apartment allocation
- **Income_Category**: Classification system for different income sources (repairs, youth movement, etc.)
- **Expense_Budget**: Budget categories for organizing expenses
- **Apartment_Allocation**: System for assigning housing expenses to specific apartments/buildings

## Requirements

### Requirement 1: Monthly Closing Report

**User Story:** As a treasurer, I want to generate monthly closing reports, so that I can review all income by categories and all expenses by budgets for a specific month.

#### Acceptance Criteria

1. WHEN a treasurer selects a month for closing report, THE Report_System SHALL display total income grouped by income categories
2. WHEN a treasurer selects a month for closing report, THE Report_System SHALL display total expenses grouped by budgets
3. WHEN generating monthly closing report, THE Report_System SHALL show category names and amounts for income
4. WHEN generating monthly closing report, THE Report_System SHALL show budget names and amounts for expenses
5. WHEN displaying monthly closing data, THE Report_System SHALL calculate and display monthly totals for income and expenses

### Requirement 2: Annual Budget Execution Report

**User Story:** As a treasurer, I want to track annual budget execution with monthly breakdowns, so that I can monitor financial performance throughout the year.

#### Acceptance Criteria

1. WHEN a treasurer requests annual budget execution report, THE Report_System SHALL display income summary by months for the selected year
2. WHEN a treasurer requests annual budget execution report, THE Report_System SHALL display expense summary by budgets for each month
3. WHEN displaying annual execution, THE Report_System SHALL calculate monthly balance (income minus expenses) for each month
4. WHEN displaying annual execution, THE Report_System SHALL provide yearly totals for income, expenses, and balance
5. WHEN generating annual report, THE Report_System SHALL allow year selection for historical analysis

### Requirement 3: Expense Execution Report

**User Story:** As a treasurer, I want detailed expense execution reports, so that I can analyze spending patterns by budget and time period.

#### Acceptance Criteria

1. WHEN a treasurer requests monthly expense execution, THE Report_System SHALL display budget execution summary for each budget in the selected month
2. WHEN displaying monthly expense execution, THE Report_System SHALL calculate total expenses across all budgets for the month
3. WHEN a treasurer requests annual expense execution, THE Report_System SHALL display yearly spending totals by budget
4. WHEN generating expense execution report, THE Report_System SHALL show both monthly and annual views simultaneously
5. WHEN displaying expense data, THE Report_System SHALL include actual amounts spent from reimbursements and direct expenses

### Requirement 4: Income Execution Report

**User Story:** As a treasurer, I want detailed income execution reports, so that I can analyze income patterns by category and time period.

#### Acceptance Criteria

1. WHEN a treasurer requests monthly income execution, THE Report_System SHALL display income summary by category for the selected month
2. WHEN displaying monthly income execution, THE Report_System SHALL calculate total income across all categories for the month
3. WHEN a treasurer requests annual income execution, THE Report_System SHALL display yearly income totals by category
4. WHEN generating income execution report, THE Report_System SHALL show both monthly and annual views simultaneously
5. WHEN displaying income data, THE Report_System SHALL include all actual income entries from the income tracking system



### Requirement 5: Access Control and Role-Based Reporting

**User Story:** As a system administrator, I want role-based access to reports, so that treasurers see appropriate data based on their permissions.

#### Acceptance Criteria

1. WHEN a circle treasurer accesses reports, THE Report_System SHALL display data for all budgets and income categories
2. WHEN a group treasurer accesses reports, THE Report_System SHALL display data only for their group's budgets and related income
3. WHEN generating reports, THE Report_System SHALL filter data based on user's access permissions
4. WHEN displaying budget data, THE Report_System SHALL respect existing fund access control rules
5. WHEN showing income data, THE Report_System SHALL apply appropriate filtering based on treasurer role

### Requirement 6: Report Navigation and User Interface

**User Story:** As a treasurer, I want intuitive report navigation, so that I can easily access different reports and time periods.

#### Acceptance Criteria

1. WHEN a treasurer accesses the reports page, THE Report_System SHALL display a navigation menu with all available report types
2. WHEN selecting a report type, THE Report_System SHALL provide appropriate time period selectors (month/year)
3. WHEN displaying reports, THE Report_System SHALL provide export functionality for data analysis
4. WHEN viewing reports, THE Report_System SHALL support Hebrew interface with RTL layout
5. WHEN navigating between reports, THE Report_System SHALL maintain selected time periods where applicable

### Requirement 7: Data Integration and Calculation

**User Story:** As a system architect, I want reports to integrate with existing data systems, so that reports reflect accurate and up-to-date financial information.

#### Acceptance Criteria

1. WHEN generating reports, THE Report_System SHALL pull data from existing income, expense, and budget systems
2. WHEN calculating report totals, THE Report_System SHALL include all approved reimbursements, direct expenses, and actual income
3. WHEN displaying budget execution, THE Report_System SHALL use actual spending data from the fund tracking system
4. WHEN showing income data, THE Report_System SHALL integrate with the income categories and tracking system
5. WHEN generating housing reports, THE Report_System SHALL integrate with expense allocation mechanisms