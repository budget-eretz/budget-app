# מסמך תכנון - ניהול העברות לגזברים

## סקירה כללית

תכונה זו תרחיב את דף ההעברות הקיים (Payments.tsx) ותוסיף פונקציונליות מלאה לניהול כל סטטוסי ההחזרים. הדף הקיים מציג כרגע רק החזרים מאושרים (approved) ומאפשר לסמן אותם כשולמו. התכנון החדש יוסיף:

1. תמיכה בסטטוס חדש "לבדיקה" (under_review)
2. ארגון החזרים ב-4 טבלאות נפרדות לפי סטטוס
3. בחירה מרובה ופעולות batch
4. סינון ומיון מתקדם
5. אפשרויות הצגה שונות (לפי חברים/קופה/הכל)

## ארכיטקטורה

### שינויים ב-Backend

#### 1. עדכון מבנה הנתונים

**טבלת reimbursements - הוספת סטטוס חדש:**
```sql
-- הוספת סטטוס "under_review" לטבלה הקיימת
ALTER TABLE reimbursements 
DROP CONSTRAINT IF EXISTS reimbursements_status_check;

ALTER TABLE reimbursements 
ADD CONSTRAINT reimbursements_status_check 
CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'paid'));
```

**שדות נוספים לטבלת reimbursements:**
- `under_review_by` (integer, nullable) - מזהה הגזבר שסימן לבדיקה
- `under_review_at` (timestamp, nullable) - מתי סומן לבדיקה
- `review_notes` (text, nullable) - הערות הגזבר לבדיקה

#### 2. API Endpoints חדשים

**GET /api/reimbursements/treasurer/all**
- מחזיר את כל ההחזרים עם קיבוץ לפי סטטוס
- תמיכה ב-query parameters:
  - `groupBy`: 'status' | 'user' | 'fund' | 'none'
  - `includeStatuses`: array של סטטוסים לכלול
- Response:
```typescript
{
  pending: Reimbursement[],
  under_review: Reimbursement[],
  approved: Reimbursement[],
  rejected: Reimbursement[],
  paid: Reimbursement[],
  summary: {
    pendingCount: number,
    underReviewCount: number,
    approvedCount: number,
    rejectedCount: number,
    paidCount: number,
    totalPendingAmount: number,
    totalApprovedAmount: number
  }
}
```

**POST /api/reimbursements/batch/mark-review**
- מסמן מספר החזרים לבדיקה
- Body: `{ reimbursementIds: number[], notes?: string }`
- מעדכן סטטוס ל-'under_review'

**POST /api/reimbursements/batch/approve**
- מאשר מספר החזרים בבת אחת
- Body: `{ reimbursementIds: number[], notes?: string }`

**POST /api/reimbursements/batch/reject**
- דוחה מספר החזרים בבת אחת
- Body: `{ reimbursementIds: number[], rejectionReason: string }`

**POST /api/reimbursements/batch/mark-paid**
- מסמן מספר החזרים כשולמו
- Body: `{ reimbursementIds: number[] }`

**POST /api/reimbursements/:id/mark-review**
- מסמן החזר בודד לבדיקה
- Body: `{ notes?: string }`

**POST /api/reimbursements/:id/return-to-pending**
- מחזיר החזר מ-'under_review' ל-'pending'

#### 3. עדכון Controller

**reimbursementController.ts - פונקציות חדשות:**

```typescript
// קבלת כל ההחזרים מקובצים לפי סטטוס
export async function getTreasurerReimbursements(req: Request, res: Response)

// סימון לבדיקה - בודד
export async function markForReview(req: Request, res: Response)

// החזרה לממתין
export async function returnToPending(req: Request, res: Response)

// פעולות batch
export async function batchMarkForReview(req: Request, res: Response)
export async function batchApprove(req: Request, res: Response)
export async function batchReject(req: Request, res: Response)
export async function batchMarkAsPaid(req: Request, res: Response)
```

**לוגיקת בקרת גישה:**
- גזבר מעגלי: גישה לכל ההחזרים
- גזבר קבוצתי: גישה רק להחזרים של הקבוצות שלו (דרך budget_id -> group_id)

### שינויים ב-Frontend

#### 1. עדכון Types

**frontend/src/types/index.ts:**
```typescript
export type ReimbursementStatus = 
  | 'pending' 
  | 'under_review' 
  | 'approved' 
  | 'rejected' 
  | 'paid';

export interface Reimbursement {
  // ... שדות קיימים
  status: ReimbursementStatus;
  under_review_by?: number;
  under_review_at?: string;
  review_notes?: string;
}

export interface ReimbursementsByStatus {
  pending: Reimbursement[];
  under_review: Reimbursement[];
  approved: Reimbursement[];
  rejected: Reimbursement[];
  paid: Reimbursement[];
  summary: {
    pendingCount: number;
    underReviewCount: number;
    approvedCount: number;
    rejectedCount: number;
    paidCount: number;
    totalPendingAmount: number;
    totalApprovedAmount: number;
  };
}

export type GroupByOption = 'status' | 'user' | 'fund' | 'none';
```

#### 2. עדכון API Service

**frontend/src/services/api.ts:**
```typescript
export const reimbursementsAPI = {
  // ... פונקציות קיימות
  
  getTreasurerAll: (groupBy?: GroupByOption) => 
    api.get<ReimbursementsByStatus>('/reimbursements/treasurer/all', { 
      params: { groupBy } 
    }),
  
  markForReview: (id: number, notes?: string) =>
    api.post(`/reimbursements/${id}/mark-review`, { notes }),
  
  returnToPending: (id: number) =>
    api.post(`/reimbursements/${id}/return-to-pending`),
  
  batchMarkForReview: (ids: number[], notes?: string) =>
    api.post('/reimbursements/batch/mark-review', { 
      reimbursementIds: ids, 
      notes 
    }),
  
  batchApprove: (ids: number[], notes?: string) =>
    api.post('/reimbursements/batch/approve', { 
      reimbursementIds: ids, 
      notes 
    }),
  
  batchReject: (ids: number[], rejectionReason: string) =>
    api.post('/reimbursements/batch/reject', { 
      reimbursementIds: ids, 
      rejectionReason 
    }),
  
  batchMarkAsPaid: (ids: number[]) =>
    api.post('/reimbursements/batch/mark-paid', { 
      reimbursementIds: ids 
    }),
};
```

#### 3. רכיבים חדשים

**ReimbursementTable.tsx**
- רכיב טבלה מתקדם עם תמיכה במיון וסינון
- Props:
  - `reimbursements: Reimbursement[]`
  - `status: ReimbursementStatus`
  - `onSelect: (ids: number[]) => void`
  - `selectedIds: number[]`
  - `onAction: (action: string, ids: number[]) => void`
- Features:
  - Checkbox לכל שורה + "סמן הכל"
  - מיון לפי כל עמודה (לחיצה על כותרת)
  - סינון לפי עמודה (dropdown בכותרת)
  - הצגת מידע מפורט (מגיש, מקבל, קרן, סכום, תאריך)

**ActionBar.tsx**
- רכיב לפעולות batch
- Props:
  - `selectedCount: number`
  - `totalAmount: number`
  - `availableActions: string[]`
  - `onAction: (action: string) => void`
- מציג: מספר נבחרים, סכום כולל, כפתורי פעולה

**FilterBar.tsx**
- רכיב לסינון והצגה
- Props:
  - `groupBy: GroupByOption`
  - `onGroupByChange: (option: GroupByOption) => void`
- אפשרויות: הצג הכל / לפי חברים / לפי קופה

**ReimbursementDetailsModal.tsx**
- מודל להצגת פרטים מלאים של החזר
- כולל: כל השדות, היסטוריה, קבלה (אם קיימת)

**RejectionModal.tsx**
- מודל לבקשת סיבת דחייה
- שדה טקסט חובה + כפתורי אישור/ביטול

#### 4. עדכון Payments.tsx

**מבנה הדף החדש:**

```typescript
interface PaymentsState {
  data: ReimbursementsByStatus | null;
  loading: boolean;
  groupBy: GroupByOption;
  selectedIds: Set<number>;
  activeModal: 'details' | 'rejection' | null;
  selectedReimbursement: Reimbursement | null;
}

// Sections:
1. Header - כותרת + סטטיסטיקות כלליות
2. FilterBar - אפשרויות הצגה וסינון
3. ActionBar - פעולות על נבחרים (מוצג רק כשיש נבחרים)
4. Tables Section:
   - PendingTable (ממתינים לאישור)
   - UnderReviewTable (לבדיקה)
   - ApprovedTable (אושרו)
   - RejectedTable (נדחו)
```

**לוגיקת הפעולות:**

```typescript
// פעולות זמינות לפי סטטוס:
const availableActions = {
  pending: ['approve', 'reject', 'mark-review'],
  under_review: ['approve', 'reject', 'return-pending'],
  approved: ['mark-paid'],
  rejected: [],
  paid: []
};

// טיפול בפעולות:
const handleAction = async (action: string, ids: number[]) => {
  switch(action) {
    case 'approve':
      await reimbursementsAPI.batchApprove(ids);
      break;
    case 'reject':
      // פתיחת מודל דחייה
      setActiveModal('rejection');
      break;
    case 'mark-review':
      await reimbursementsAPI.batchMarkForReview(ids);
      break;
    case 'mark-paid':
      await reimbursementsAPI.batchMarkAsPaid(ids);
      break;
    case 'return-pending':
      // לולאה על כל id
      for (const id of ids) {
        await reimbursementsAPI.returnToPending(id);
      }
      break;
  }
  
  // רענון נתונים
  await loadData();
  
  // ניקוי בחירה
  setSelectedIds(new Set());
};
```

## רכיבים וממשקים

### Component Hierarchy

```
Payments (Page)
├── Navigation
├── PageHeader
│   ├── Title
│   └── Summary Stats
├── FilterBar
│   └── GroupBy Selector
├── ActionBar (conditional)
│   ├── Selection Info
│   └── Action Buttons
├── TablesSection
│   ├── PendingSection
│   │   ├── SectionHeader
│   │   └── ReimbursementTable
│   ├── UnderReviewSection
│   │   ├── SectionHeader
│   │   └── ReimbursementTable
│   ├── ApprovedSection
│   │   ├── SectionHeader
│   │   └── ReimbursementTable
│   └── RejectedSection
│       ├── SectionHeader
│       └── ReimbursementTable
├── ReimbursementDetailsModal (conditional)
└── RejectionModal (conditional)
```

### Data Models

**ReimbursementTable Column Structure:**
```typescript
interface Column {
  key: string;
  label: string;
  sortable: boolean;
  filterable: boolean;
  render: (reimbursement: Reimbursement) => ReactNode;
}

const columns: Column[] = [
  { key: 'checkbox', label: '', sortable: false, filterable: false },
  { key: 'submitter', label: 'מגיש', sortable: true, filterable: true },
  { key: 'recipient', label: 'מקבל תשלום', sortable: true, filterable: true },
  { key: 'fund', label: 'קופה', sortable: true, filterable: true },
  { key: 'description', label: 'תיאור', sortable: false, filterable: true },
  { key: 'amount', label: 'סכום', sortable: true, filterable: false },
  { key: 'expense_date', label: 'תאריך הוצאה', sortable: true, filterable: false },
  { key: 'created_at', label: 'תאריך הגשה', sortable: true, filterable: false },
  { key: 'actions', label: 'פעולות', sortable: false, filterable: false }
];
```

## טיפול בשגיאות

### Backend Error Handling

```typescript
// Validation errors
- 400: Invalid status transition
- 400: Missing required fields (rejection reason)
- 403: Insufficient permissions
- 404: Reimbursement not found
- 409: Concurrent modification

// Error responses
{
  error: string (Hebrew message),
  code?: string,
  details?: any
}
```

### Frontend Error Handling

```typescript
// Toast notifications for all errors
- Network errors: "שגיאת תקשורת, נסה שוב"
- Permission errors: "אין לך הרשאה לבצע פעולה זו"
- Validation errors: הצגת ההודעה מהשרת
- Success messages: "הפעולה בוצעה בהצלחה"

// Optimistic updates with rollback
- עדכון UI מיידי
- במקרה של שגיאה - החזרה למצב קודם
```



## שיקולי ביצועים

### Backend Optimization

1. **Database Queries:**
   - שימוש ב-JOIN במקום queries נפרדים
   - אינדקסים על: `status`, `fund_id`, `user_id`, `recipient_user_id`
   - Pagination לטבלאות גדולות (עתידי)

2. **Batch Operations:**
   - שימוש ב-transaction לפעולות batch
   - Bulk updates במקום updates בודדים

### Frontend Optimization

1. **Data Management:**
   - Cache של נתונים ב-state
   - רענון חכם - רק הטבלאות שהשתנו
   - Debounce לסינון ומיון

2. **Rendering:**
   - Virtualization לטבלאות ארוכות (עתידי)
   - Memoization של רכיבים כבדים
   - Lazy loading של מודלים

## שיקולי אבטחה

1. **Authorization:**
   - בדיקת הרשאות בכל endpoint
   - גזבר קבוצתי: גישה רק לקבוצות שלו
   - מניעת IDOR attacks

2. **Input Validation:**
   - ולידציה של IDs (מספרים חיוביים)
   - ולידציה של סטטוסים (enum)
   - Sanitization של טקסט חופשי

3. **Rate Limiting:**
   - הגבלת קצב לפעולות batch
   - מניעת spam של בקשות

## תרחישי שימוש עיקריים

### תרחיש 1: אישור מרובה של החזרים

1. גזבר נכנס לדף העברות
2. רואה רשימת החזרים ממתינים
3. בוחר מספר החזרים (checkbox)
4. לוחץ "אשר נבחרים"
5. המערכת מעדכנת את הסטטוס ומעבירה לטבלת "אושרו"
6. הודעת הצלחה מוצגת

### תרחיש 2: סימון לבדיקה

1. גזבר רואה החזר חשוד
2. לוחץ "סמן לבדיקה"
3. מוסיף הערה (אופציונלי): "לברר עם החבר על הסכום"
4. ההחזר עובר לטבלת "לבדיקה"
5. לאחר בירור, הגזבר יכול לאשר או להחזיר לממתין

### תרחיש 3: דחייה עם סיבה

1. גזבר בוחר החזר לדחייה
2. לוחץ "דחה"
3. מודל נפתח עם שדה חובה לסיבת דחייה
4. מזין: "הקבלה לא ברורה, נא להגיש מחדש"
5. מאשר
6. ההחזר עובר לטבלת "נדחו"
7. החבר רואה את סיבת הדחייה בדף "ההחזרים שלי"

### תרחיש 4: סימון כשולם

1. גזבר מבצע העברה בנקאית
2. נכנס לטבלת "אושרו"
3. בוחר את ההחזרים ששולמו
4. לוחץ "סמן כשולם"
5. ההחזרים מוסרים מהטבלה (או עוברים לארכיון)

## מיגרציה והטמעה

### Database Migration

```sql
-- Migration: add_under_review_status.sql

-- 1. הוספת עמודות חדשות
ALTER TABLE reimbursements 
ADD COLUMN under_review_by INTEGER REFERENCES users(id),
ADD COLUMN under_review_at TIMESTAMP,
ADD COLUMN review_notes TEXT;

-- 2. עדכון constraint של status
ALTER TABLE reimbursements 
DROP CONSTRAINT IF EXISTS reimbursements_status_check;

ALTER TABLE reimbursements 
ADD CONSTRAINT reimbursements_status_check 
CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'paid'));

-- 3. יצירת אינדקסים
CREATE INDEX idx_reimbursements_status ON reimbursements(status);
CREATE INDEX idx_reimbursements_under_review_by ON reimbursements(under_review_by);

-- 4. הערה: לא צריך לעדכן נתונים קיימים כי הסטטוס החדש הוא אופציונלי
```

### Deployment Steps

1. **Backend:**
   - הרצת migration
   - deploy של קוד חדש
   - בדיקת endpoints חדשים

2. **Frontend:**
   - deploy של קוד חדש
   - בדיקת תצוגה ופונקציונליות

3. **Documentation:**
   - עדכון steering files
   - עדכון product.md
   - עדכון structure.md

## תיעוד נוסף

### API Documentation

כל ה-endpoints החדשים יתועדו ב-format הבא:

```
POST /api/reimbursements/batch/approve
Description: מאשר מספר החזרים בבת אחת
Auth: Treasurer required
Body: {
  reimbursementIds: number[],
  notes?: string
}
Response: {
  success: boolean,
  updated: number,
  errors?: Array<{id: number, error: string}>
}
```

### User Guide (עתידי)

מדריך למשתמש יכלול:
- הסבר על הסטטוסים השונים
- איך לבצע פעולות batch
- איך להשתמש בסינון ומיון
- תרחישי שימוש נפוצים
