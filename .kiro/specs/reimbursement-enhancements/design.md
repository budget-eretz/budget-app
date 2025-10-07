# Design Document

## Overview

This design enhances the reimbursement management system with improved user experience, flexible submission workflows, and proper access control. The system will support Hebrew language throughout, enable submitting reimbursements on behalf of others, provide direct submission from fund pages, introduce charge submissions (debts), and allow users to manage their own reimbursement requests.

The design builds upon the existing reimbursement infrastructure while adding new database fields, API endpoints, UI components, and access control logic.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                          │
├─────────────────────────────────────────────────────────────┤
│  • MyReimbursements Page (new)                              │
│  • Enhanced NewReimbursement Form                            │
│  • Enhanced FundCard with Quick Actions                      │
│  • Navigation with "ההחזרים שלי" link                       │
│  • Hebrew Language Support (i18n)                            │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                      Backend Layer                           │
├─────────────────────────────────────────────────────────────┤
│  • Enhanced Reimbursement Controller                         │
│  • New Charge Controller                                     │
│  • Enhanced Fund Access Control Middleware                   │
│  • Reimbursement Routes (enhanced)                           │
│  • Charge Routes (new)                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓ SQL
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                          │
├─────────────────────────────────────────────────────────────┤
│  • reimbursements table (enhanced with recipient_user_id)   │
│  • charges table (new)                                       │
│  • funds table (existing)                                    │
│  • budgets table (existing)                                  │
│  • user_groups table (existing)                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Navigation**: User clicks "ההחזרים שלי" → Frontend fetches user's reimbursements and charges
2. **Fund Selection**: User opens reimbursement form → Backend returns funds grouped by budget based on access control
3. **Reimbursement Submission**: User submits form → Backend validates fund access → Creates reimbursement record
4. **Charge Submission**: User submits charge → Backend creates negative charge record → Affects net payment calculation
5. **Direct Submission**: User clicks action on fund page → Form opens with pre-selected fund

## Components and Interfaces

### Database Schema Changes

#### Enhanced Reimbursements Table

```sql
-- Add new column to existing reimbursements table
ALTER TABLE reimbursements 
ADD COLUMN recipient_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Add index for recipient queries
CREATE INDEX idx_reimbursements_recipient_user_id ON reimbursements(recipient_user_id);

-- Update existing records to set recipient_user_id = user_id
UPDATE reimbursements SET recipient_user_id = user_id WHERE recipient_user_id IS NULL;
```

**Fields**:
- `id`: Primary key
- `fund_id`: Reference to fund (existing)
- `user_id`: Submitter of reimbursement (existing)
- `recipient_user_id`: **NEW** - Who receives the payment (defaults to user_id)
- `amount`: Reimbursement amount (existing)
- `description`: Expense description (existing)
- `expense_date`: Date of expense (existing)
- `receipt_url`: Optional receipt link (existing)
- `status`: pending/approved/rejected/paid (existing)
- `reviewed_by`: Treasurer who reviewed (existing)
- `reviewed_at`: Review timestamp (existing)
- `notes`: Reviewer notes (existing)
- `created_at`, `updated_at`: Timestamps (existing)

#### New Charges Table

```sql
CREATE TABLE charges (
  id SERIAL PRIMARY KEY,
  fund_id INTEGER REFERENCES funds(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  charge_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'settled', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_charges_fund_id ON charges(fund_id);
CREATE INDEX idx_charges_user_id ON charges(user_id);
CREATE INDEX idx_charges_status ON charges(status);
```

**Purpose**: Track debts owed by users to the circle/group, which offset pending reimbursements.

### Backend API Endpoints

#### Enhanced Reimbursement Endpoints

**GET /api/reimbursements/my**
- Returns all reimbursements where user is submitter OR recipient
- Includes status, amounts, fund details
- Supports filtering by status

**GET /api/reimbursements**
- Enhanced to include recipient information
- Response includes both `user_name` (submitter) and `recipient_name`

**POST /api/reimbursements**
- Enhanced to accept optional `recipientUserId` field
- Validates fund access for submitter
- Defaults recipient to submitter if not specified

**PATCH /api/reimbursements/:id**
- Enhanced to allow updating recipient (only for pending reimbursements)
- Validates ownership (only submitter can edit)

**DELETE /api/reimbursements/:id**
- **NEW** - Allows submitter to delete their own reimbursement
- Only works for pending reimbursements
- Returns 403 if not owner or already approved

#### New Charge Endpoints

**GET /api/charges/my**
- Returns all charges for the authenticated user
- Includes fund details and status

**POST /api/charges**
- Creates a new charge record
- Validates fund access
- Requires: fundId, amount, description, chargeDate

**PATCH /api/charges/:id**
- Updates charge details (only for active charges)
- Only owner can update

**DELETE /api/charges/:id**
- Deletes a charge (only for active charges)
- Only owner can delete

**GET /api/reimbursements/my/summary**
- Returns net payment summary:
  - Total pending reimbursements
  - Total active charges
  - Net amount owed to user

#### Enhanced Fund Endpoints

**GET /api/funds/accessible**
- **NEW** - Returns funds grouped by budget
- Applies access control:
  - All users: Circle budget funds
  - Group members: Their group budget funds
- Response format:
```json
{
  "budgets": [
    {
      "id": 1,
      "name": "תקציב מעגלי 2024",
      "type": "circle",
      "funds": [
        { "id": 1, "name": "קופת חינוך", "available_amount": 5000 }
      ]
    },
    {
      "id": 2,
      "name": "תקציב קבוצת א'",
      "type": "group",
      "groupName": "קבוצת א'",
      "funds": [
        { "id": 3, "name": "קופת אירועים", "available_amount": 2000 }
      ]
    }
  ]
}
```

### Frontend Components

#### New MyReimbursements Page

**Location**: `frontend/src/pages/MyReimbursements.tsx`

**Features**:
- Displays all reimbursements where user is submitter or recipient
- Tabs/filters for: All, Pending, Approved, Rejected, Paid
- Shows charges section with total debt
- Net payment summary card
- Actions: Edit (pending only), Delete (pending only), View Details
- Hebrew labels throughout

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│  ההחזרים שלי                                        │
├─────────────────────────────────────────────────────┤
│  [סיכום תשלומים]                                    │
│  סה"כ החזרים ממתינים: ₪1,500                       │
│  סה"כ חיובים: ₪-300                                │
│  נטו לתשלום: ₪1,200                                │
├─────────────────────────────────────────────────────┤
│  [הכל] [ממתין] [אושר] [נדחה] [שולם]               │
├─────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────┐  │
│  │ קופת חינוך | ₪500 | ממתין לאישור              │  │
│  │ תיאור: רכישת ספרים                            │  │
│  │ תאריך: 01/10/2025                             │  │
│  │ [ערוך] [מחק]                                  │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

#### Enhanced NewReimbursement Form

**Location**: `frontend/src/pages/NewReimbursement.tsx`

**Enhancements**:
- Fund dropdown grouped by budget (Circle / Group budgets)
- Optional "שלח תשלום ל" (Send payment to) user selector
- Pre-selection support when navigating from fund page
- Hebrew labels and error messages
- Validation for fund access

**New Fields**:
```typescript
interface ReimbursementFormData {
  fundId: string;
  amount: string;
  description: string;
  expenseDate: string;
  receiptUrl: string;
  recipientUserId?: string; // NEW - optional recipient
}
```

#### Enhanced FundCard Component

**Location**: `frontend/src/components/FundCard.tsx`

**Enhancements**:
- Add "הגש החזר" (Submit Reimbursement) button
- Add "הוסף תכנון" (Add Planned Expense) button
- Buttons navigate to forms with pre-selected fund
- Only show buttons if user has access to the fund

#### New ChargeForm Component

**Location**: `frontend/src/pages/NewCharge.tsx`

**Features**:
- Similar to reimbursement form but for charges
- Fields: Fund, Amount, Description, Charge Date
- Clearly labeled as "הגשת חיוב" (Submit Charge)
- Explanation text about offsetting reimbursements

#### Enhanced Navigation Component

**Location**: `frontend/src/components/Navigation.tsx`

**Enhancements**:
- Add "ההחזרים שלי" (My Reimbursements) navigation link
- Available to all authenticated users
- Active state styling when on reimbursements page

### Access Control Logic

#### Fund Access Validation

**Function**: `validateFundAccess(userId: number, fundId: number): Promise<boolean>`

**Logic**:
1. Get fund's budget_id
2. Get budget's group_id
3. If group_id is NULL → Circle budget → Allow all users
4. If group_id is NOT NULL → Group budget → Check user_groups table
5. Return true if user has access, false otherwise

**Implementation Location**: `backend/src/middleware/accessControl.ts`

```typescript
export async function validateFundAccess(userId: number, fundId: number): Promise<boolean> {
  const result = await pool.query(`
    SELECT b.group_id 
    FROM funds f
    JOIN budgets b ON f.budget_id = b.id
    WHERE f.id = $1
  `, [fundId]);
  
  if (result.rows.length === 0) return false;
  
  const groupId = result.rows[0].group_id;
  
  // Circle budget - accessible to all
  if (!groupId) return true;
  
  // Group budget - check membership
  const memberCheck = await pool.query(`
    SELECT 1 FROM user_groups 
    WHERE user_id = $1 AND group_id = $2
  `, [userId, groupId]);
  
  return memberCheck.rows.length > 0;
}
```

#### Reimbursement Ownership Validation

**Function**: `validateReimbursementOwnership(userId: number, reimbursementId: number): Promise<boolean>`

**Logic**:
1. Query reimbursement by ID
2. Check if user_id matches authenticated user
3. Return true if owner, false otherwise

## Data Models

### TypeScript Interfaces

```typescript
// Enhanced Reimbursement interface
export interface Reimbursement {
  id: number;
  fund_id: number;
  user_id: number;
  recipient_user_id: number | null; // NEW
  amount: number;
  description: string;
  expense_date: Date;
  receipt_url?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  reviewed_by?: number;
  reviewed_at?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  
  // Joined fields
  fund_name?: string;
  budget_id?: number;
  user_name?: string; // Submitter name
  recipient_name?: string; // NEW - Recipient name
  reviewer_name?: string;
}

// New Charge interface
export interface Charge {
  id: number;
  fund_id: number;
  user_id: number;
  amount: number;
  description: string;
  charge_date: Date;
  status: 'active' | 'settled' | 'cancelled';
  created_at: Date;
  updated_at: Date;
  
  // Joined fields
  fund_name?: string;
  budget_id?: number;
}

// New summary interface
export interface PaymentSummary {
  totalReimbursements: number;
  totalCharges: number;
  netAmount: number;
  pendingCount: number;
  approvedCount: number;
}

// Enhanced fund with budget info
export interface FundWithBudget extends Fund {
  budget_name: string;
  budget_type: 'circle' | 'group';
  group_name?: string;
}
```

## Error Handling

### Backend Error Responses

All errors return consistent JSON format:
```json
{
  "error": "הודעת שגיאה בעברית"
}
```

**Common Error Scenarios**:

1. **Fund Access Denied** (403)
   - Message: "אין לך הרשאה לגשת לקופה זו"
   - When: User tries to submit to unauthorized fund

2. **Reimbursement Not Found** (404)
   - Message: "בקשת החזר לא נמצאה"
   - When: Invalid reimbursement ID

3. **Cannot Edit Approved** (400)
   - Message: "לא ניתן לערוך בקשה שכבר אושרה"
   - When: Trying to edit non-pending reimbursement

4. **Not Owner** (403)
   - Message: "אין לך הרשאה לערוך בקשה זו"
   - When: User tries to edit/delete another user's reimbursement

5. **Invalid Recipient** (400)
   - Message: "משתמש מקבל לא תקין"
   - When: recipientUserId doesn't exist

### Frontend Error Handling

- Use Toast component for user-friendly error messages
- All error messages in Hebrew
- Validation before API calls to reduce errors
- Loading states during async operations
- Graceful degradation if data fails to load

## Manual Verification Scenarios

1. **My Reimbursements Page**:
   - Navigate to page and verify all user's reimbursements display
   - Verify filtering by status works
   - Verify summary calculations are correct

2. **Fund Selection**:
   - Open reimbursement form
   - Verify funds are grouped by budget
   - Verify only accessible funds appear

3. **Submit on Behalf**:
   - Submit reimbursement with different recipient
   - Verify both submitter and recipient are recorded
   - Verify recipient sees it in their list

4. **Direct Submission**:
   - Navigate to fund detail page
   - Click "הגש החזר" button
   - Verify fund is pre-selected

5. **Access Control**:
   - As regular user, verify cannot access group funds from other groups
   - As group member, verify can access own group funds
   - Verify all users can access circle funds

6. **Edit/Delete**:
   - Edit pending reimbursement and verify changes save
   - Try to edit approved reimbursement and verify error
   - Delete pending reimbursement and verify removal
   - Try to delete another user's reimbursement and verify error

7. **Charges**:
   - Submit a charge
   - Verify it appears in summary with negative amount
   - Verify net calculation is correct

8. **Hebrew Language**:
   - Verify all labels, buttons, messages are in Hebrew
   - Verify RTL layout works correctly
   - Verify error messages in Hebrew

## Design Decisions and Rationales

### 1. Separate Charges Table vs. Negative Reimbursements

**Decision**: Create separate `charges` table

**Rationale**:
- Clearer semantic meaning (debt vs. reimbursement)
- Easier to query and report separately
- Different workflow (charges don't need approval)
- Allows different fields/validation rules in future

### 2. Recipient Field vs. Separate Payment Table

**Decision**: Add `recipient_user_id` to reimbursements table

**Rationale**:
- Simpler implementation for MVP
- Most reimbursements have same submitter/recipient
- Nullable field with default to user_id keeps it optional
- Can extend to separate payment table later if needed

### 3. Fund Access Control in Middleware vs. Controller

**Decision**: Create reusable middleware function

**Rationale**:
- DRY principle - used across multiple endpoints
- Easier to test in isolation
- Consistent access control logic
- Can be reused for planned expenses too

### 4. Grouped Fund Display vs. Flat List

**Decision**: Group funds by budget in dropdown

**Rationale**:
- Better UX - users understand budget context
- Clearer which funds are circle vs. group
- Easier to find correct fund
- Matches mental model of budget hierarchy

### 5. Delete vs. Cancel Status

**Decision**: Hard delete for pending reimbursements

**Rationale**:
- Simpler for MVP
- Pending reimbursements have no financial impact yet
- Reduces clutter in database
- Can add soft delete/cancel later if audit trail needed

### 6. Hebrew Language Implementation

**Decision**: Hardcode Hebrew strings in components for MVP

**Rationale**:
- Single language requirement (Hebrew only)
- Faster implementation than i18n library
- Can refactor to i18n later if multi-language needed
- Keeps bundle size smaller
