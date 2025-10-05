# Implementation Plan - Budget and Fund Management UI

- [x] 1. Create Navigation Component





  - Create Navigation.tsx component with header layout
  - Add navigation links (Dashboard, Budgets, Payments) with role-based visibility
  - Add user info display and logout button
  - Style with existing design patterns (white background, shadow, sticky positioning)
  - _Requirements: 4.1, 4.2_
-

- [x] 2. Create Budget Card Component




  - Create BudgetCard.tsx component
  - Display budget name, group name, total amount, fiscal year
  - Add click handler for navigation to detail page
  - Style as card with hover effect
  - _Requirements: 1.1, 1.7_

- [x] 3. Create Budgets List Page





  - Create Budgets.tsx page component
  - Fetch and display list of budgets using budgetsAPI.getAll()
  - Add "Create Budget" button (visible only to circle treasurer)
  - Implement loading state and error handling
  - Use BudgetCard component in grid layout
  - Add empty state when no budgets exist
  - _Requirements: 1.1, 4.3, 4.4_

- [x] 4. Create Budget Form Component

.




  - Create BudgetForm.tsx component
  - Add form fields: name, totalAmount, fiscalYear, groupId
  - Implement client-side validation
  - Add submit and cancel handlers
  - Style as modal form with two-column layout
  - _Requirements: 1.2, 1.3, 5.1, 5.2_
- [ ] 5. Integrate Budget Create/Edit in Budgets Page








- [ ] 5. Integrate Budget Create/Edit in Budgets Page

  - Add state for create/edit modals in Budgets.tsx
  - Implement create budget handler using budgetsAPI.create()
  - Implement edit budget handler using budgetsAPI.update()
  - Show success/error toast notifications
  - Refresh budget list after successful create/edit
  - _Requirements: 1.2, 1.3, 1.4, 5.5_
-

- [x] 6. Create Fund Card Component




  - Create FundCard.tsx component
  - Display fund name, allocated amount, spent, planned, available
  - Add visual progress bar showing usage
  - Add edit/delete action buttons (conditional based on permissions)
  - Style as card with color-coded amounts
  - _Requirements: 2.7_
- [x] 7. Create Fund Form Component




- [ ] 7. Create Fund Form Component

  - Create FundForm.tsx component
  - Add form fields: name, allocatedAmount, description
  - Display available budget amount
  - Implement client-side validation
  - Add warning if allocation exceeds available budget
  - Add submit and cancel handlers
  - Style as modal form
  - _Requirements: 2.2, 2.3, 5.1, 5.2, 5.3_

- [x] 8. Create Budget Detail Page



  - Create BudgetDetail.tsx page component
  - Fetch budget details using budgetsAPI.getById()
  - Fetch associated funds using fundsAPI.getAll(budgetId)
  - Display budget summary section with financial overview
  - Display funds grid using FundCard component
  - Add "Create Fund" button (with permission check)
  - Add edit/delete budget buttons (with permission check)
  - Implement loading state and error handling
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 3.7_

- [x] 9. Integrate Fund Create/Edit/Delete in Budget Detail Page





  - Add state for fund modals in BudgetDetail.tsx
  - Implement create fund handler using fundsAPI.create()
  - Implement edit fund handler using fundsAPI.update()
  - Implement delete fund handler with confirmation dialog using fundsAPI.delete()
  - Show success/error toast notifications
  - Refresh funds list after successful operations
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 5.5, 5.6_
-

- [x] 10. Add Budget Delete Functionality




  - Add delete confirmation modal in BudgetDetail.tsx
  - Check if budget has associated funds before deletion
  - Show warning if funds exist
  - Implement delete handler (note: no delete endpoint exists in backend, may need to skip or add backend endpoint)
  - Navigate back to budgets list after successful deletion
- [ ] 11. Update App Routing


- [ ] 11. Update App Routing




- [x] 11. Update App Routing

  - Add Navigation component to all authenticated pages
  - Add /budgets route in App.tsx
  - Add /budgets/:id route in App.tsx
  - Update PrivateRoute to check treasurer permissions for budget routes
  - _Requirements: 4.1, 4.5_

- [x] 12. Update Dashboard with Budget Navigation




  - Add "Manage Budgets" button or link in Dashboard.tsx (for treasurers)
  - Update budget cards in dashboard to link to budget detail page
  - _Requirements: 4.1_

- [x] 13. Implement Responsive Design





  - Add media queries for mobile layout in Navigation component
  - Adjust budget grid to 1 column on mobile, 2 on tablet, 3 on desktop
  - Adjust fund grid to 1 column on mobile, 2 on tablet, 3 on desktop
  - Make forms single column on mobile
  - Ensure touch-friendly button sizes on mobile
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
-

- [x] 14. Add Permission Guards and Error Handling




  - Add permission checks in Budgets page (redirect non-treasurers)
  - Add permission checks in BudgetDetail page
  - Implement proper error handling for API failures
  - Add user-friendly error messages
  - Handle 403 permission errors with redirect and toast
  - Handle 404 not found errors with appropriate message

- [x] 15. Polish and Final Integration





    -with playwright mcp
  - Verify all toast notifications work correctly
  - Verify loading states display properly
  - Verify form validation messages are clear
  - Test navigation flow between all pages
  - Verify role-based feature visibility
  - Test with different user roles (circle treasurer, group treasurer, member)
  - _Requirements: 5.5_
