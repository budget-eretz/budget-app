# Implementation Plan

- [x] 1. Database schema changes





  - Create migration file for adding recipient_user_id to reimbursements table
  - Create migration file for new charges table with indexes
  - _Requirements: 3.1, 3.2, 3.3, 8.1, 8.2, 8.3_

- [x] 2. Backend: Fund access control middleware





  - [x] 2.1 Create validateFundAccess function in accessControl middleware


    - Implement logic to check if fund belongs to circle budget (accessible to all)
    - Implement logic to check user_groups table for group budget access
    - Return boolean indicating access permission
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_


  - [x] 2.2 Create validateReimbursementOwnership function

    - Query reimbursement by ID and check user_id matches authenticated user
    - Return boolean for ownership validation
    - _Requirements: 6.5, 7.5_

- [x] 3. Backend: Enhanced fund endpoints



  - [x] 3.1 Create GET /api/funds/accessible endpoint



    - Query all funds with their budget information
    - Filter funds based on user's group memberships using validateFundAccess
    - Group results by budget (circle vs group budgets)
    - Return structured response with budget type and group name
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3_
-

- [x] 4. Backend: Enhanced reimbursement endpoints







  - [x] 4.1 Add GET /api/reimbursements/my endpoint


    - Query reimbursements where user is submitter OR recipient
    - Join with users table to get both submitter and recipient names
    - Support status filtering via query params
    - _Requirements: 1.2, 1.3, 1.4_

  - [x] 4.2 Enhance POST /api/reimbursements endpoint


    - Add optional recipientUserId field to request body
    - Validate fund access using validateFundAccess middleware
    - Default recipient_user_id to user_id if not provided
    - Validate recipientUserId exists in users table if provided
    - _Requirements: 2.1, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.4, 5.5_

  - [x] 4.3 Enhance PATCH /api/reimbursements/:id endpoint


    - Add recipientUserId to updatable fields
    - Use validateReimbursementOwnership to check ownership
    - Ensure only pending reimbursements can be updated
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 4.4 Add DELETE /api/reimbursements/:id endpoint


    - Use validateReimbursementOwnership to check ownership
    - Only allow deletion of pending reimbursements
    - Return 403 if not owner, 400 if already approved
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 4.5 Enhance GET /api/reimbursements endpoint


    - Add recipient_name to joined fields in query
    - Include recipient information in response
    - _Requirements: 3.5_

- [x] 5. Backend: Charge management endpoints








  - [x] 5.1 Create charges controller with CRUD operations


    - Implement createCharge function with fund access validation
    - Implement getMyCharges function to fetch user's charges
    - Implement updateCharge function (only for active charges)
    - Implement deleteCharge function (only for active charges)
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 8.6_

  - [x] 5.2 Create GET /api/charges/my endpoint


    - Query charges for authenticated user
    - Join with funds table to get fund details
    - Filter by status if provided in query params
    - _Requirements: 8.1_

  - [x] 5.3 Create POST /api/charges endpoint


    - Accept fundId, amount, description, chargeDate
    - Validate fund access using validateFundAccess
    - Create charge record with status 'active'
    - _Requirements: 8.2, 8.3, 8.6_

  - [x] 5.4 Create GET /api/reimbursements/my/summary endpoint


    - Calculate total pending reimbursements for user
    - Calculate total active charges for user
    - Calculate net amount (reimbursements - charges)
    - Return summary with counts and amounts
    - _Requirements: 8.4_

  - [x] 5.5 Create charge routes and wire to Express app


    - Define routes for all charge endpoints
    - Apply authenticateToken middleware
    - Mount routes in server.ts
    - _Requirements: 8.1, 8.2_

- [x] 6. Backend: Update TypeScript types





  - Add recipient_user_id to Reimbursement interface
  - Add recipient_name to Reimbursement interface
  - Create new Charge interface
  - Create PaymentSummary interface
  - Create FundWithBudget interface
  - _Requirements: 3.1, 3.5, 8.1_
- [x] 7. Frontend: Enhanced Navigation component



- [ ] 7. Frontend: Enhanced Navigation component

  - [x] 7.1 Add "ההחזרים שלי" navigation link

    - Add new navigation button in navLinks section
    - Add to mobile menu as well
    - Apply active state styling when on /my-reimbursements route
    - Make visible to all authenticated users
    - _Requirements: 1.1, 1.2_
-

- [x] 8. Frontend: MyReimbursements page



  - [x] 8.1 Create MyReimbursements page component


    - Create page structure with navigation
    - Fetch reimbursements from /api/reimbursements/my
    - Fetch charges from /api/charges/my
    - Fetch summary from /api/reimbursements/my/summary
    - Display loading state while fetching
    - _Requirements: 1.2, 1.3, 8.4_

  - [x] 8.2 Implement payment summary card

    - Display total pending reimbursements
    - Display total active charges
    - Display net amount owed to user
    - Use Hebrew labels and currency formatting
    - _Requirements: 8.4_

  - [x] 8.3 Implement reimbursements list with filtering

    - Create tabs/buttons for status filters (All, Pending, Approved, Rejected, Paid)
    - Filter displayed reimbursements based on selected status
    - Display reimbursement cards with fund name, amount, description, date, status
    - Show both submitter and recipient if different
    - Use Hebrew labels throughout
    - _Requirements: 1.3, 1.4, 3.5, 9.1, 9.2, 9.3, 9.4_

  - [x] 8.4 Implement edit and delete actions

    - Add "ערוך" button for pending reimbursements
    - Add "מחק" button for pending reimbursements
    - Navigate to edit form with pre-filled data on edit click
    - Show confirmation dialog on delete click
    - Call DELETE /api/reimbursements/:id on confirm
    - Update list after successful deletion
    - Show error toast in Hebrew if operation fails
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 9.5, 9.6_

  - [x] 8.5 Display charges section

    - Create separate section for charges below reimbursements
    - Display charge cards with fund name, amount, description, date
    - Clearly distinguish charges from reimbursements visually
    - Use Hebrew labels
    - _Requirements: 8.1, 8.7, 9.1, 9.2, 9.3_
-

- [x] 9. Frontend: Enhanced NewReimbursement form




  - [x] 9.1 Update fund selection to use grouped display


    - Call GET /api/funds/accessible instead of /api/funds
    - Group funds by budget in dropdown using optgroup
    - Display budget name and type (מעגלי/קבוצתי) as group headers
    - Display fund name and available amount in options
    - Handle empty funds list gracefully
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 5.1, 5.2, 5.3_

  - [x] 9.2 Add optional recipient user selector

    - Add "שלח תשלום ל (אופציונלי)" field to form
    - Fetch users list from /api/users
    - Create dropdown with user names
    - Make field optional (can be left empty)
    - Update form submission to include recipientUserId if selected
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 9.3 Support pre-selected fund from navigation

    - Accept fundId as URL query parameter or route state
    - Pre-select fund in dropdown if provided
    - Allow user to change selection
    - _Requirements: 4.2, 4.3, 4.4_

  - [x] 9.4 Update form validation and error messages


    - Ensure all error messages are in Hebrew
    - Validate fund access on submission
    - Display Hebrew error toast if fund access denied
    - _Requirements: 5.4, 5.5, 9.5_

- [x] 10. Frontend: Enhanced FundCard component




  - [x] 10.1 Add quick action buttons to fund cards


    - Add "הגש החזר" button to each fund card
    - Add "הוסף תכנון" button to each fund card
    - Navigate to /new-reimbursement with fundId on reimbursement button click
    - Navigate to /new-planned-expense with fundId on planned expense button click
    - Only show buttons if user has access to the fund
    - _Requirements: 4.1, 4.2, 4.5_

- [x] 11. Frontend: NewCharge page




  - [x] 11.1 Create NewCharge page component

    - Create form similar to NewReimbursement
    - Include fields: fund selection, amount, description, charge date
    - Use grouped fund display from /api/funds/accessible
    - Add explanation text about charges offsetting reimbursements
    - Use Hebrew labels: "הגשת חיוב", "סכום", "תיאור", "תאריך חיוב"
    - _Requirements: 8.2, 8.3, 8.5, 8.6, 9.1, 9.2, 9.3_


  - [x] 11.2 Implement charge submission

    - Call POST /api/charges on form submit
    - Validate required fields
    - Show success toast in Hebrew on successful submission
    - Navigate to MyReimbursements page after submission
    - Show error toast in Hebrew if submission fails
    - _Requirements: 8.2, 8.3, 9.5, 9.6_

- [x] 12. Frontend: Update API service




  - Add reimbursementsAPI.getMy() function
  - Add reimbursementsAPI.delete(id) function
  - Add reimbursementsAPI.getSummary() function
  - Add fundsAPI.getAccessible() function
  - Create chargesAPI object with getAll, create, update, delete functions
  - Update reimbursementsAPI.create() to accept recipientUserId
  - Update reimbursementsAPI.update() to accept recipientUserId
  - _Requirements: 1.2, 3.1, 6.1, 8.1, 8.2, 8.4_

- [x] 13. Frontend: Update routing



  - Add route for /my-reimbursements pointing to MyReimbursements component
  - Add route for /new-charge pointing to NewCharge component
  - Ensure routes are protected with authentication
  - _Requirements: 1.1, 8.2_

- [x] 14. Frontend: Update TypeScript types




  - Add recipient_user_id to Reimbursement interface
  - Add recipient_name to Reimbursement interface
  - Create Charge interface
  - Create PaymentSummary interface
  - Create FundWithBudget interface for grouped fund display
  - _Requirements: 3.1, 3.5, 8.1_

- [x] 15. Update steering documentation




  - Update .kiro/steering/structure.md with new components and pages (MyReimbursements, NewCharge)
  - Update .kiro/steering/structure.md with new API endpoints (charges, enhanced reimbursements)
  - Update .kiro/steering/structure.md with new database tables (charges, enhanced reimbursements)
  - Update .kiro/steering/product.md with new reimbursement management features
  - Document charge submission feature and payment offsetting
  - Document recipient field for reimbursements
  - _Requirements: All_
