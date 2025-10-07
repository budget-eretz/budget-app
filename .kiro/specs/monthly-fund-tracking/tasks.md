# Implementation Plan

- [x] 1. Create database schema for monthly allocations





  - Create migration file for fund_monthly_allocations table
  - Add indexes for performance optimization
  - _Requirements: 1.1, 2.1, 3.1_



- [ ] 2. Add TypeScript types and interfaces

  - Add FundMonthlyAllocation interface to types/index.ts
  - Add MonthlyFundStatus interface
  - Add FundAllocationSummary interface


  - Add MonthlyExpenseDetail and MonthlyPlannedExpenseDetail interfaces


  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [ ] 3. Implement monthly allocation API endpoints

  - [ ] 3.1 Create fundMonthlyAllocationController.ts with CRUD operations
    - Implement setFixedAllocation function
    - Implement setVariableAllocations function


    - Implement getAllocations function
    - Implement getMonthAllocation function
    - Implement deleteMonthAllocation function
    - Add validation logic to prevent over-allocation
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 10.1, 10.2, 10.3, 10.4, 10.5_




  - [ ] 3.2 Create routes for monthly allocation endpoints
    - Add POST /api/funds/:fundId/monthly-allocations/fixed
    - Add POST /api/funds/:fundId/monthly-allocations/variable
    - Add GET /api/funds/:fundId/monthly-allocations
    - Add GET /api/funds/:fundId/monthly-allocations/:year/:month
    - Add DELETE /api/funds/:fundId/monthly-allocations/:year/:month
    - Wire up routes in server.ts
    - _Requirements: 1.1, 2.1, 3.1_

- [x] 4. Implement monthly status and data API endpoints



  - [x] 4.1 Add monthly status functions to fundController.ts

    - Implement getMonthlyStatus function with spent/planned calculations
    - Implement getMonthlyExpenses function
    - Implement getMonthlyPlannedExpenses function
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_


  - [x] 4.2 Create routes for monthly status endpoints

    - Add GET /api/funds/:fundId/monthly-status/:year/:month
    - Add GET /api/funds/:fundId/monthly-expenses/:year/:month
    - Add GET /api/funds/:fundId/monthly-planned/:year/:month
    - Wire up routes in server.ts
    - _Requirements: 2.1, 4.1, 5.1_
-

- [x] 5. Implement dashboard monthly status endpoint




  - Add getDashboardMonthlyStatus function to fundController.ts or create dashboardController.ts
  - Implement GET /api/dashboard/monthly-status endpoint
  - Query all accessible funds with current month status
  - Apply access control filtering
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
- [x] 6. Implement budget monthly status endpoint




- [ ] 6. Implement budget monthly status endpoint

  - Add getBudgetMonthlyStatus function to budgetController.ts
  - Implement GET /api/budgets/:budgetId/monthly-status/:year/:month endpoint
  - Query all funds in budget with monthly status for specified month
  - Apply access control filtering
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 7. Create frontend API service functions





  - Add monthly allocation API calls to services/api.ts
  - Add setFixedMonthlyAllocation function
  - Add setVariableMonthlyAllocations function
  - Add getMonthlyAllocations function
  - Add getMonthlyStatus function
  - Add getMonthlyExpenses function
  - Add getMonthlyPlannedExpenses function
  - Add getDashboardMonthlyStatus function
  - Add getBudgetMonthlyStatus function
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [x] 8. Create MonthNavigator component




  - Create components/MonthNavigator.tsx
  - Implement previous/next month navigation
  - Display current month/year in Hebrew
  - Add month picker dropdown (optional)
  - Handle year boundaries (December to January)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 9. Create MonthlyFundStatusCard component





  - Create components/MonthlyFundStatusCard.tsx
  - Display allocated, spent, planned, and remaining amounts
  - Add visual progress bar or indicator
  - Add click handler to navigate to detailed view
  - Style with Hebrew RTL support
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3_

- [x] 10. Create MonthlyExpenseTable component





  - Create components/MonthlyExpenseTable.tsx
  - Display reimbursements in table format
  - Show columns: Submitter, Recipient, Description, Amount, Date, Status
  - Add sorting capability
  - Add filtering capability
  - Add link to receipt if available
  - Style with Hebrew RTL support
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 11. Create MonthlyPlannedExpenseTable component



  - Create components/MonthlyPlannedExpenseTable.tsx
  - Display planned expenses in table format
  - Show columns: User, Description, Amount, Planned Date, Status
  - Add sorting capability
  - Add filtering capability
  - Style with Hebrew RTL support
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 12. Create MonthlyAllocationManager component




  - Create components/MonthlyAllocationManager.tsx
  - Add toggle between fixed and variable allocation modes
  - For fixed mode: single input field with amount
  - For variable mode: 12-month grid with individual inputs
  - Display total fund allocation and remaining unallocated amount
  - Add real-time validation to prevent over-allocation
  - Add Save/Cancel buttons
  - Handle API calls for creating/updating allocations
  - Display success/error messages
  - Style with Hebrew RTL support
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 13. Create FundMonthlyDetailView page






  - Create pages/FundMonthlyDetail.tsx
  - Add MonthNavigator component at top
  - Display monthly status summary (allocated, spent, planned, remaining)
  - Add MonthlyExpenseTable component
  - Add MonthlyPlannedExpenseTable component
  - Add button to open MonthlyAllocationManager (treasurer only)
  - Fetch data based on selected fund and month
  - Handle month navigation state
  - Style with Hebrew RTL support
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 14. Enhance Dashboard page with monthly status




  - Update pages/Dashboard.tsx
  - Fetch current month status for all accessible funds
  - Display MonthlyFundStatusCard for each fund
  - Add section header "מצב קופות חודשי" (Monthly Fund Status)
  - Handle loading and error states
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 15. Enhance BudgetDetail page with monthly status





  - Update pages/BudgetDetail.tsx
  - Fetch current month status for all funds in the budget
  - Display MonthlyFundStatusCard for each fund
  - Add section showing monthly status
  - Add button to manage allocations (treasurer only)
  - Handle loading and error states
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 16. Add routing for FundMonthlyDetailView





  - Update App.tsx with new route
  - Add route /funds/:fundId/monthly
  - Add navigation from Dashboard and BudgetDetail to monthly detail view
  - _Requirements: 4.1, 5.1, 6.1_
- [x] 17. Add allocation history tracking (optional enhancement)




- [ ] 17. Add allocation history tracking (optional enhancement)

  - Create fund_allocation_history table (optional)
  - Track changes to allocations with timestamp and user
  - Add API endpoint to fetch allocation history
  - Add UI to display allocation history in FundMonthlyDetailView
  - _Requirements: 7.1, 7.2, 7.3, 7.4_
