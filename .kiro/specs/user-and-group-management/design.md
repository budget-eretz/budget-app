# Design Document: User and Group Management

## Overview

This feature extends the budget management system to provide Circle Treasurers with comprehensive user and group management capabilities. The design introduces a many-to-many relationship between users and groups (replacing the current one-to-many), adds administrative endpoints for user/group management, and implements row-level access control to ensure users only see data from their circle and assigned groups.

The implementation follows the existing architecture patterns: Express.js controllers with PostgreSQL database, JWT-based authentication, and React frontend with Axios API client.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ User Management  │  │ Group Management │                │
│  │     Page         │  │      Page        │                │
│  └────────┬─────────┘  └────────┬─────────┘                │
│           │                     │                            │
│           └──────────┬──────────┘                            │
│                      │                                       │
│              ┌───────▼────────┐                             │
│              │   API Service   │                             │
│              └───────┬────────┘                             │
└──────────────────────┼──────────────────────────────────────┘
                       │ HTTP/JSON
┌──────────────────────┼──────────────────────────────────────┐
│              ┌───────▼────────┐                             │
│              │  Express Routes │                             │
│              └───────┬────────┘                             │
│                      │                                       │
│         ┌────────────┼────────────┐                         │
│         │            │            │                         │
│  ┌──────▼──────┐ ┌──▼──────┐ ┌──▼──────────┐              │
│  │   User      │ │  Group  │ │  Auth       │              │
│  │ Controller  │ │Controller│ │ Middleware  │              │
│  └──────┬──────┘ └──┬──────┘ └──┬──────────┘              │
│         │           │            │                         │
│         └───────────┼────────────┘                         │
│                     │                                       │
│              ┌──────▼──────┐                               │
│              │  PostgreSQL  │                               │
│              │   Database   │                               │
│              └─────────────┘                               │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema Changes

The key change is introducing a many-to-many relationship between users and groups through a junction table:

```sql
-- New junction table
user_groups (
  user_id → users.id
  group_id → groups.id
  assigned_at
  PRIMARY KEY (user_id, group_id)
)

-- Modified users table (remove group_id column)
users (
  id
  email
  password_hash
  full_name
  phone
  is_circle_treasurer
  is_group_treasurer
  created_at
  updated_at
)

-- Existing groups table (no changes needed)
groups (
  id
  name
  description
  created_at
)
```

## Components and Interfaces

### Backend Components

#### 1. Database Migration

**File**: `backend/migrations/009_user_group_many_to_many.sql`

Creates the `user_groups` junction table and migrates existing `group_id` data from the users table.

```sql
-- Create junction table
CREATE TABLE user_groups (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, group_id)
);

-- Migrate existing data
INSERT INTO user_groups (user_id, group_id)
SELECT id, group_id FROM users WHERE group_id IS NOT NULL;

-- Remove old column
ALTER TABLE users DROP COLUMN group_id;

-- Add indexes
CREATE INDEX idx_user_groups_user_id ON user_groups(user_id);
CREATE INDEX idx_user_groups_group_id ON user_groups(group_id);
```

#### 2. User Management Controller

**File**: `backend/src/controllers/userController.ts`

Handles all user management operations for Circle Treasurers.

**Key Functions**:
- `getAllUsers()` - List all users with their groups and roles
- `getUserById(id)` - Get detailed user information
- `updateUserRole(id, role)` - Update user's treasurer role
- `assignUserToGroup(userId, groupId)` - Add user-group association
- `removeUserFromGroup(userId, groupId)` - Remove user-group association
- `getUserGroups(userId)` - Get all groups for a user

**Access Control**: All endpoints require Circle Treasurer role via `requireCircleTreasurer` middleware.

#### 3. Group Management Controller

**File**: `backend/src/controllers/groupController.ts`

Handles CRUD operations for groups.

**Key Functions**:
- `getAllGroups()` - List all groups with member counts
- `getGroupById(id)` - Get group details with member list
- `createGroup(name, description)` - Create new group
- `updateGroup(id, name, description)` - Update group information
- `deleteGroup(id)` - Delete group (with validation)
- `getGroupMembers(id)` - Get all users in a group

**Access Control**: All endpoints require Circle Treasurer role.

#### 4. Updated Auth Middleware

**File**: `backend/src/middleware/auth.ts`

Enhanced to support multiple group memberships in JWT payload.

**Changes**:
- JWT payload now includes `groupIds: number[]` instead of `groupId?: number`
- Token generation updated in auth controller to fetch all user groups

#### 5. Access Control Helper

**File**: `backend/src/middleware/accessControl.ts`

New middleware for enforcing row-level access control on budgets and funds.

**Key Functions**:
- `canAccessBudget(userId, budgetId)` - Check if user can access a budget
- `canAccessFund(userId, fundId)` - Check if user can access a fund
- `getUserAccessibleGroupIds(userId)` - Get all group IDs user can access

**Logic**:
- Circle Treasurers: Access all budgets/funds
- Group Treasurers/Members: Access circle-level budgets + budgets from assigned groups

#### 6. Updated Routes

**File**: `backend/src/routes/userRoutes.ts` (new)
```typescript
GET    /api/users                    - Get all users
GET    /api/users/:id                - Get user by ID
PATCH  /api/users/:id/role           - Update user role
POST   /api/users/:id/groups         - Assign user to group
DELETE /api/users/:id/groups/:groupId - Remove user from group
GET    /api/users/:id/groups         - Get user's groups
```

**File**: `backend/src/routes/groupRoutes.ts` (new)
```typescript
GET    /api/groups                   - Get all groups
GET    /api/groups/:id               - Get group by ID
POST   /api/groups                   - Create group
PATCH  /api/groups/:id               - Update group
DELETE /api/groups/:id               - Delete group
GET    /api/groups/:id/members       - Get group members
```

### Frontend Components

#### 1. User Management Page

**File**: `frontend/src/pages/UserManagement.tsx`

Main interface for managing users.

**Features**:
- Searchable/filterable user list table
- Columns: Name, Email, Role, Groups, Actions
- Inline role editing (dropdown)
- Group assignment modal
- Visual indicators for treasurers

**State Management**:
- Users list
- Selected user for editing
- Group assignment modal state
- Search/filter criteria

#### 2. Group Management Page

**File**: `frontend/src/pages/GroupManagement.tsx`

Main interface for managing groups.

**Features**:
- Groups list with member counts
- Create group button → modal
- Edit group button → modal
- Delete group button → confirmation dialog
- View members button → member list modal

**State Management**:
- Groups list
- Selected group for editing
- Modal states (create/edit/delete/members)

#### 3. User Edit Modal

**File**: `frontend/src/components/UserEditModal.tsx`

Modal for editing user details.

**Features**:
- Role selection (Member, Group Treasurer, Circle Treasurer)
- Multi-select for group assignments
- Save/Cancel actions
- Validation feedback

#### 4. Group Form Modal

**File**: `frontend/src/components/GroupFormModal.tsx`

Reusable modal for creating/editing groups.

**Features**:
- Group name input (required)
- Description textarea (optional)
- Validation (unique name)
- Save/Cancel actions

#### 5. Updated API Service

**File**: `frontend/src/services/api.ts`

New API endpoints for user and group management.

```typescript
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id: number) => api.get(`/users/${id}`),
  updateRole: (id: number, role: string) => 
    api.patch(`/users/${id}/role`, { role }),
  assignToGroup: (userId: number, groupId: number) => 
    api.post(`/users/${userId}/groups`, { groupId }),
  removeFromGroup: (userId: number, groupId: number) => 
    api.delete(`/users/${userId}/groups/${groupId}`),
  getUserGroups: (userId: number) => 
    api.get(`/users/${userId}/groups`),
};

export const groupsAPI = {
  getAll: () => api.get('/groups'),
  getById: (id: number) => api.get(`/groups/${id}`),
  create: (data: { name: string; description?: string }) => 
    api.post('/groups', data),
  update: (id: number, data: { name?: string; description?: string }) => 
    api.patch(`/groups/${id}`, data),
  delete: (id: number) => api.delete(`/groups/${id}`),
  getMembers: (id: number) => api.get(`/groups/${id}/members`),
};
```

#### 6. Navigation Update

**File**: `frontend/src/components/Navigation.tsx`

Add navigation links for Circle Treasurers:
- "User Management" link (visible only to Circle Treasurers)
- "Group Management" link (visible only to Circle Treasurers)

## Data Models

### Updated TypeScript Interfaces

**File**: `backend/src/types/index.ts`

```typescript
// Updated User interface (remove group_id)
export interface User {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  phone?: string;
  is_circle_treasurer: boolean;
  is_group_treasurer: boolean;
  created_at: Date;
  updated_at: Date;
}

// New interface for user with groups
export interface UserWithGroups extends Omit<User, 'password_hash'> {
  groups: Group[];
}

// New interface for user-group association
export interface UserGroup {
  user_id: number;
  group_id: number;
  assigned_at: Date;
}

// Updated JWT payload
export interface JWTPayload {
  userId: number;
  email: string;
  isCircleTreasurer: boolean;
  isGroupTreasurer: boolean;
  groupIds: number[]; // Changed from groupId?: number
}

// Group with member count
export interface GroupWithMemberCount extends Group {
  member_count: number;
}
```

**File**: `frontend/src/types/index.ts`

```typescript
export interface User {
  id: number;
  email: string;
  fullName: string;
  phone?: string;
  isCircleTreasurer: boolean;
  isGroupTreasurer: boolean;
  groups?: Group[]; // Optional, populated when needed
}

export interface Group {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
  memberCount?: number; // Optional, for list views
}

export interface UserGroup {
  userId: number;
  groupId: number;
  assignedAt: string;
}
```

## Error Handling

### Backend Error Scenarios

1. **Duplicate Group Name**
   - Status: 409 Conflict
   - Message: "Group with this name already exists"

2. **Group Has Dependencies**
   - Status: 400 Bad Request
   - Message: "Cannot delete group with associated budgets or funds"

3. **User Not Found**
   - Status: 404 Not Found
   - Message: "User not found"

4. **Group Not Found**
   - Status: 404 Not Found
   - Message: "Group not found"

5. **Unauthorized Access**
   - Status: 403 Forbidden
   - Message: "Circle treasurer access required"

6. **Invalid Role Assignment**
   - Status: 400 Bad Request
   - Message: "Group Treasurer must be assigned to at least one group"

7. **Database Constraint Violation**
   - Status: 500 Internal Server Error
   - Message: "Failed to perform operation"
   - Log detailed error for debugging

### Frontend Error Handling

- Display toast notifications for all errors
- Show validation errors inline on forms
- Confirmation dialogs for destructive actions (delete group, remove user from group)
- Loading states during API calls
- Graceful degradation if API calls fail

## Security Considerations

1. **Authentication**: All management endpoints require valid JWT token
2. **Authorization**: Circle Treasurer role required for all management operations
3. **Input Validation**: Validate all user inputs (email format, name length, etc.)
4. **SQL Injection Prevention**: Use parameterized queries for all database operations
5. **Password Security**: Existing bcrypt hashing maintained
6. **Token Refresh**: Regenerate JWT after role changes to update permissions immediately
7. **Audit Trail**: Log all administrative actions (role changes, group assignments)
8. **Rate Limiting**: Consider adding rate limiting to management endpoints (future enhancement)

## Migration Strategy

### Database Migration

1. Run migration `009_user_group_many_to_many.sql`
2. Verify data migration (all existing group_id values transferred to user_groups)
3. Verify foreign key constraints
4. Test rollback procedure if needed

### Deployment Steps

1. **Backend Deployment**
   - Deploy new code with backward-compatible changes
   - Run database migration
   - Verify migration success
   - Restart backend service

2. **Frontend Deployment**
   - Deploy new frontend code
   - Clear browser caches if needed
   - Verify new pages accessible to Circle Treasurers

3. **Verification**
   - Test user management operations
   - Test group management operations
   - Verify access control on existing features
   - Check that existing users can still log in and access their data

### Rollback Plan

If issues arise:
1. Revert backend code
2. Rollback database migration (restore group_id column, drop user_groups table)
3. Revert frontend code
4. Verify system functionality restored

## Performance Considerations

1. **Database Indexes**: Indexes on user_groups table for fast lookups
2. **Query Optimization**: Use JOINs efficiently when fetching users with groups
3. **Pagination**: Implement pagination for user/group lists if counts grow large (future enhancement)
4. **Caching**: Consider caching user group memberships in JWT payload (already implemented)
5. **Lazy Loading**: Load group members only when viewing group details

## Future Enhancements

1. **Bulk Operations**: Assign multiple users to a group at once
2. **User Import/Export**: CSV import for bulk user creation
3. **Audit Log**: Detailed audit trail for all administrative actions
4. **Email Notifications**: Notify users when assigned to groups or promoted to treasurer
5. **Advanced Permissions**: Fine-grained permissions beyond the three roles
6. **Group Hierarchy**: Support for nested groups or sub-groups
7. **User Deactivation**: Soft delete users instead of hard delete
