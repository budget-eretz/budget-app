# Implementation Plan

- [x] 1. Database schema migration for many-to-many user-groups relationship





  - Create migration file `009_user_group_many_to_many.sql` that creates the `user_groups` junction table
  - Migrate existing `group_id` data from users table to the new junction table
  - Drop the `group_id` column from users table
  - Add appropriate indexes for performance
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 7.1, 7.2, 7.6_

- [x] 2. Update backend type definitions






  - Remove `group_id` field from User interface in `backend/src/types/index.ts`
  - Add `UserWithGroups` interface that includes groups array
  - Add `UserGroup` interface for junction table
  - Update `JWTPayload` interface to use `groupIds: number[]` instead of `groupId?: number`
  - Add `GroupWithMemberCount` interface for list views
  - _Requirements: 1.1, 1.2, 2.1, 7.1_
-

- [x] 3. Create access control middleware




  - Create new file `backend/src/middleware/accessControl.ts`
  - Implement `getUserAccessibleGroupIds(userId)` function to fetch all group IDs for a user
  - Implement `canAccessBudget(userId, budgetId)` function to check budget access permissions
  - Implement `canAccessFund(userId, fundId)` function to check fund access permissions
  - Add helper function to check if user is Circle Treasurer (full access)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
 

- [x] 4. Update authentication to support multiple groups





  - Modify `backend/src/controllers/authController.ts` login function to fetch all user groups from `user_groups` table
  - Update JWT token generation to include `groupIds` array in payload
  - Modify register function to handle initial group assignments if provided
  - Update `getMe` function to return user's groups
  - _Requirements: 2.1, 2.6, 7.6_

- [x] 5. Create user management controller







  - Create new file `backend/src/controllers/userController.ts`
  - Implement `getAllUsers()` function to fetch all users with their groups (JOIN with user_groups and groups tables)
  - Implement `getUserById(id)` function to fetch single user with groups
  - Implement `updateUserRole(id, role)` function to update is_circle_treasurer and is_group_treasurer flags
  - Implement `assignUserToGroup(userId, groupId)` function to insert into user_groups table
  - Implement `removeUserFromGroup(userId, groupId)` function to delete from user_groups table
  - Implement `getUserGroups(userId)` function to fetch all groups for a user
  - Add validation: Group Treasurer must have at least one group assignment
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

-

- [x] 6. Create group management controller





  - Create new file `backend/src/controllers/groupController.ts`
  - Implement `getAllGroups()` function with member counts (LEFT JOIN with user_groups, GROUP BY)
  - Implement `getGroupById(id)` function with member list
  - Implement `createGroup(name, description)` function with unique name validation
  - Implement `updateGroup(id, name, description)` function with unique name validation
  - Implement `deleteGroup(id)` function with dependency check (budgets/funds)
  - Implement `getGroupMembers(id)` function to fetch all users in a group
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 8.3, 8.4_

-

- [x] 7. Create user management routes





  - Create new file `backend/src/routes/userRoutes.ts`
  - Define GET `/api/users` route with `requireCircleTreasurer` middleware
  - Define GET `/api/users/:id` route with `requireCircleTreasurer` middleware
  - Define PATCH `/api/users/:id/role` route with `requireCircleTreasurer` middleware
  - Define POST `/api/users/:id/groups` route with `requireCircleTreasurer` middleware
  - Define DELETE `/api/users/:id/groups/:groupId` route with `requireCircleTreasurer` middleware
  - Define GET `/api/users/:id/groups` route with `requireCircleTreasurer` middleware
  - Register routes in `backend/src/server.ts`
  - _Requirements: 1.4, 8.1, 8.2, 8.5, 8.6_


- [x] 8. Create group management routes





  - Create new file `backend/src/routes/groupRoutes.ts`
  - Define GET `/api/groups` route with `requireCircleTreasurer` middleware
  - Define GET `/api/groups/:id` route with `requireCircleTreasurer` middleware
  - Define POST `/api/groups` route with `requireCircleTreasurer` middleware
  - Define PATCH `/api/groups/:id` route with `requireCircleTreasurer` middleware
  - Define DELETE `/api/groups/:id` route with `requireCircleTreasurer` middleware
  - Define GET `/api/groups/:id/members` route with `requireCircleTreasurer` middleware
  - Register routes in `backend/src/server.ts`
  - _Requirements: 1.4, 8.3, 8.4, 8.5, 8.6_


- [x] 9. Apply access control to existing budget endpoints





  - Update `backend/src/controllers/budgetController.ts` getAll function to filter by accessible groups
  - Add access control check in getById function using `canAccessBudget` middleware
  - Add access control check in update function
  - Add access control check in delete function
  - Ensure Circle Treasurers bypass filters (see all budgets)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

-

- [x] 10. Apply access control to existing fund endpoints





  - Update `backend/src/controllers/fundController.ts` getAll function to filter by accessible budgets
  - Add access control check in getById function using `canAccessFund` middleware
  - Add access control check in update function
  - Add access control check in delete function
  - Ensure Circle Treasurers bypass filters (see all funds)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 11. Update frontend type definitions







  - Update `frontend/src/types/index.ts` User interface to remove groupId and add optional groups array
  - Add Group interface with optional memberCount
  - Add UserGroup interface
  - _Requirements: 1.1, 1.2, 8.1, 8.3_


- [x] 12. Update frontend API service





  - Add `usersAPI` object to `frontend/src/services/api.ts` with all user management endpoints
  - Add `groupsAPI` object with all group management endpoints
  - Include proper TypeScript types for request/response data
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 4.1, 5.1, 6.1, 8.1, 8.3_


- [x] 13. Create UserEditModal component





  - Create new file `frontend/src/components/UserEditModal.tsx`
  - Implement modal with role selection dropdown (Member, Group Treasurer, Circle Treasurer)
  - Implement multi-select for group assignments
  - Add form validation (Group Treasurer requires at least one group)
  - Implement save handler that calls updateRole and assignToGroup/removeFromGroup APIs
  - Add loading and error states
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 8.2, 8.5, 8.6_


- [x] 14. Create GroupFormModal component




  - Create new file `frontend/src/components/GroupFormModal.tsx`
  - Implement reusable modal for create and edit modes
  - Add name input field (required) with validation
  - Add description textarea (optional)
  - Implement save handler that calls create or update API
  - Add loading and error states with toast notifications
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 8.5, 8.6_


- [x] 15. Create UserManagement page






  - Create new file `frontend/src/pages/UserManagement.tsx`
  - Implement user list table with columns: Name, Email, Role, Groups, Actions
  - Add search/filter functionality for user list
  - Add "Edit" button for each user that opens UserEditModal
  - Fetch users on component mount using usersAPI.getAll()
  - Handle modal state and refresh list after edits
  - Add loading state and error handling with toast notifications
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.1, 8.1, 8.2, 8.5, 8.6_


- [x] 16. Create GroupManagement page




  - Create new file `frontend/src/pages/GroupManagement.tsx`
  - Implement groups list with name, description, and member count
  - Add "Create Group" button that opens GroupFormModal in create mode
  - Add "Edit" button for each group that opens GroupFormModal in edit mode
  - Add "Delete" button with confirmation dialog that checks for dependencies
  - Add "View Members" button that shows member list in a modal
  - Fetch groups on component mount using groupsAPI.getAll()
  - Handle all modal states and refresh list after operations
  - _Requirements: 4.1, 5.1, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 8.3, 8.4, 8.5, 8.6_


- [x] 17. Update Navigation component






  - Modify `frontend/src/components/Navigation.tsx` to add "User Management" link
  - Add "Group Management" link
  - Show both links only when user.isCircleTreasurer is true
  - Add appropriate routing paths
  - _Requirements: 1.4, 8.1, 8.3_

-

- [x] 18. Add routes for new pages





  - Update `frontend/src/App.tsx` to add route for `/users` pointing to UserManagement page
  - Add route for `/groups` pointing to GroupManagement page
  - Protect both routes with Circle Treasurer check (redirect if not authorized)
  - _Requirements: 1.4, 8.1, 8.3_


- [x] 19. Update AuthContext to handle multiple groups





  - Modify `frontend/src/context/AuthContext.tsx` to handle groups array in user object
  - Update login function to store updated user data with groups
  - Ensure token refresh after role changes (optional enhancement)
  - _Requirements: 2.6, 7.6_


