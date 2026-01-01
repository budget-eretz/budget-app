# תכונת סטטוס פעיל/לא פעיל לתקציבים

## סקירה כללית

תכונה חדשה המאפשרת לגזברים להגדיר תקציבים כפעילים או לא פעילים. תקציבים לא פעילים:
- לא ניתן להגיש אליהם החזרים חדשים
- לא מופיעים ברשימת הסעיפים הזמינים בטפסי הגשת החזרים
- מסומנים בתג "לא פעיל" בממשק המשתמש

## שינויים במסד הנתונים

### מיגרציה 027: הוספת שדה is_active

**קובץ**: `backend/migrations/027_add_is_active_to_budgets.sql`

```sql
ALTER TABLE budgets 
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX idx_budgets_is_active ON budgets(is_active);
```

- ברירת מחדל: `true` (פעיל)
- אינדקס נוסף לביצועים טובים יותר בשאילתות

## שינויים בשרת (Backend)

### 1. Budget Controller (`backend/src/controllers/budgetController.ts`)

#### createBudget
- תמיכה בשדה `isActive` בבקשת יצירה
- ברירת מחדל: `true` אם לא צוין

```typescript
const result = await pool.query(
  `INSERT INTO budgets (name, total_amount, group_id, fiscal_year, created_by, is_active)
   VALUES ($1, $2, $3, $4, $5, $6)
   RETURNING *`,
  [name, totalAmount, groupId || null, fiscalYear || null, user.userId, isActive !== undefined ? isActive : true]
);
```

#### updateBudget
- תמיכה בעדכון שדה `isActive`

```typescript
const result = await pool.query(
  `UPDATE budgets
   SET name = COALESCE($1, name),
       total_amount = COALESCE($2, total_amount),
       fiscal_year = COALESCE($3, fiscal_year),
       is_active = COALESCE($4, is_active),
       updated_at = NOW()
   WHERE id = $5
   RETURNING *`,
  [name, totalAmount, fiscalYear, isActive, id]
);
```

### 2. Fund Controller (`backend/src/controllers/fundController.ts`)

#### getAccessibleFunds
- סינון אוטומטי של סעיפים השייכים לתקציבים לא פעילים

```typescript
WHERE b.is_active = true
```

### 3. Reimbursement Controller (`backend/src/controllers/reimbursementController.ts`)

#### createReimbursement
- בדיקה שהתקציב פעיל לפני יצירת החזר
- הודעת שגיאה בעברית: "לא ניתן להגיש החזר לתקציב לא פעיל"

```typescript
const budgetCheck = await pool.query(
  `SELECT b.is_active 
   FROM budgets b
   JOIN funds f ON f.budget_id = b.id
   WHERE f.id = $1`,
  [fundId]
);

if (!budgetCheck.rows[0].is_active) {
  return res.status(400).json({ error: 'לא ניתן להגיש החזר לתקציב לא פעיל' });
}
```

## שינויים בממשק (Frontend)

### 1. Types (`frontend/src/types/index.ts`)

הוספת שדה `is_active` לממשק Budget:

```typescript
export interface Budget {
  id: number;
  name: string;
  total_amount: number;
  group_id?: number;
  group_name?: string;
  fiscal_year?: number;
  created_by: number;
  created_at: string;
  total_income?: number;
  is_active: boolean;
}
```

### 2. API Service (`frontend/src/services/api.ts`)

עדכון חתימות ה-API:

```typescript
create: (data: { 
  name: string; 
  totalAmount: number; 
  groupId?: number; 
  fiscalYear?: number; 
  isActive?: boolean 
}) => api.post('/budgets', data),

update: (id: number, data: Partial<{ 
  name: string; 
  totalAmount: number; 
  fiscalYear: number; 
  isActive: boolean 
}>) => api.patch(`/budgets/${id}`, data),
```

### 3. Budget Form (`frontend/src/components/BudgetForm.tsx`)

#### תוספות לטופס

1. **שדה חדש**: תיבת סימון לסטטוס פעיל
2. **ברירת מחדל**: פעיל עבור תקציבים חדשים
3. **כפתור דינמי**: הטקסט משתנה בהתאם לסטטוס
   - תקציב חדש פעיל: "שמור והפעל"
   - תקציב חדש לא פעיל: "שמור כלא פעיל"
   - עריכה: "עדכן תקציב"

```typescript
<div style={styles.field}>
  <label style={styles.label}>סטטוס תקציב</label>
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
    <input
      type="checkbox"
      id="isActive"
      checked={formData.isActive}
      onChange={(e) => handleChange('isActive', e.target.checked)}
      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
      disabled={isLoading}
    />
    <label htmlFor="isActive" style={{ fontSize: '14px', color: '#2d3748', cursor: 'pointer' }}>
      תקציב פעיל
    </label>
  </div>
  <small style={{ color: '#718096', fontSize: '13px', marginTop: '4px' }}>
    {formData.isActive 
      ? 'ניתן להגיש החזרים לתקציב זה'
      : 'לא ניתן להגיש החזרים חדשים לתקציב זה'}
  </small>
</div>
```

### 4. Budget Card (`frontend/src/components/BudgetCard.tsx`)

#### תג "לא פעיל"

תצוגה ויזואלית של תקציבים לא פעילים:

```typescript
{!budget.is_active && (
  <span style={styles.inactiveBadge}>לא פעיל</span>
)}
```

**עיצוב התג**:
- צבע רקע: אדום בהיר (#fed7d7)
- צבע טקסט: אדום (#e53e3e)
- גופן: מודגש
- מיקום: ליד אינדיקטור הבריאות

### 5. Budgets Page (`frontend/src/pages/Budgets.tsx`)

עדכון פונקציות יצירה ועריכה לכלול את שדה `isActive`:

```typescript
await budgetsAPI.create({
  name: data.name,
  totalAmount: data.totalAmount,
  fiscalYear: data.fiscalYear,
  groupId: data.groupId,
  isActive: data.isActive,
});

await budgetsAPI.update(editingBudget.id, {
  name: data.name,
  totalAmount: data.totalAmount,
  fiscalYear: data.fiscalYear,
  isActive: data.isActive,
});
```

### 6. Toast Component (`frontend/src/components/Toast.tsx`)

תיקון wrapper ל-`showToast` לתמיכה בחתימה פשוטה:

```typescript
const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
  addToast({ type, title: message, message: '' });
};
```

## תרחישי שימוש

### 1. יצירת תקציב חדש

**גזבר מעגלי**:
1. לוחץ על "צור תקציב חדש"
2. ממלא את פרטי התקציב
3. בוחר האם התקציב פעיל או לא:
   - ✅ מסומן: התקציב יהיה פעיל (ברירת מחדל)
   - ❌ לא מסומן: התקציב יהיה לא פעיל
4. לוחץ על "שמור והפעל" או "שמור כלא פעיל"

### 2. עריכת תקציב קיים

**גזבר**:
1. לוחץ על כרטיס תקציב
2. לוחץ על "ערוך תקציב"
3. משנה את הסטטוס (פעיל/לא פעיל)
4. לוחץ על "עדכן תקציב"

### 3. הגשת החזר

**חבר מעגל/קבוצה**:
1. נכנס לטופס הגשת החזר
2. **רואה רק סעיפים מתקציבים פעילים** ברשימת הסעיפים
3. אם מנסה להגיש החזר לסעיף מתקציב לא פעיל (דרך API ישירות):
   - מקבל הודעת שגיאה: "לא ניתן להגיש החזר לתקציב לא פעיל"

### 4. צפייה בתקציבים

**כל המשתמשים**:
- תקציבים לא פעילים מסומנים בתג אדום "לא פעיל"
- ניתן לצפות בכל התקציבים (פעילים ולא פעילים)
- ניתן לראות את כל הסעיפים והנתונים ההיסטוריים

## אבטחה ובקרת גישה

### הרשאות

- **יצירת תקציב**: רק גזבר מעגלי
- **עריכת תקציב**: גזבר מעגלי או גזבר קבוצה (לתקציבי הקבוצה שלו)
- **שינוי סטטוס**: כחלק מעריכת תקציב (אותן הרשאות)
- **הגשת החזר**: כל המשתמשים (רק לתקציבים פעילים)

### אימות

1. **בצד השרת**: בדיקה שהתקציב פעיל לפני יצירת החזר
2. **בצד הלקוח**: סינון סעיפים מתקציבים לא פעילים
3. **הגנה כפולה**: גם UI וגם API

## תאימות לאחור

- **תקציבים קיימים**: אוטומטית מסומנים כפעילים (DEFAULT true)
- **API קיים**: עובד ללא שינויים (isActive אופציונלי)
- **ממשק קיים**: תקציבים ללא שדה is_active מטופלים כפעילים

## בדיקות מומלצות

### בדיקות ידניות

1. ✅ יצירת תקציב פעיל חדש
2. ✅ יצירת תקציב לא פעיל חדש
3. ✅ עריכת תקציב קיים והפיכתו ללא פעיל
4. ✅ ניסיון הגשת החזר לתקציב לא פעיל (צריך להיכשל)
5. ✅ הגשת החזר לתקציב פעיל (צריך להצליח)
6. ✅ תצוגת תג "לא פעיל" בכרטיס תקציב
7. ✅ סינון סעיפים בטופס החזר (רק מתקציבים פעילים)

### בדיקות אוטומטיות (מומלץ להוסיף)

```typescript
// Backend tests
describe('Budget Active Status', () => {
  it('should create budget as active by default', async () => {
    // Test implementation
  });

  it('should prevent reimbursement creation for inactive budget', async () => {
    // Test implementation
  });

  it('should allow reimbursement creation for active budget', async () => {
    // Test implementation
  });
});

// Frontend tests
describe('BudgetForm', () => {
  it('should default to active for new budgets', () => {
    // Test implementation
  });

  it('should show correct button text based on active status', () => {
    // Test implementation
  });
});
```

## קבצים ששונו

### Backend
- `backend/migrations/027_add_is_active_to_budgets.sql` (חדש)
- `backend/src/controllers/budgetController.ts`
- `backend/src/controllers/fundController.ts`
- `backend/src/controllers/reimbursementController.ts`

### Frontend
- `frontend/src/types/index.ts`
- `frontend/src/services/api.ts`
- `frontend/src/components/BudgetForm.tsx`
- `frontend/src/components/BudgetCard.tsx`
- `frontend/src/components/Toast.tsx`
- `frontend/src/pages/Budgets.tsx`

## הערות נוספות

1. **ביצועים**: אינדקס נוסף על `is_active` משפר ביצועים בשאילתות
2. **UX**: הודעות שגיאה בעברית ברורות
3. **גמישות**: ניתן להפוך תקציב ללא פעיל ובחזרה לפעיל בכל עת
4. **שמירת נתונים**: תקציבים לא פעילים שומרים את כל הנתונים ההיסטוריים
5. **דוחות**: תקציבים לא פעילים עדיין מופיעים בדוחות ובסטטיסטיקות

## תיעוד API

### POST /api/budgets
```json
{
  "name": "תקציב 2025",
  "totalAmount": 100000,
  "fiscalYear": 2025,
  "groupId": null,
  "isActive": true
}
```

### PATCH /api/budgets/:id
```json
{
  "name": "תקציב 2025 (מעודכן)",
  "isActive": false
}
```

### Response
```json
{
  "id": 1,
  "name": "תקציב 2025",
  "total_amount": 100000,
  "fiscal_year": 2025,
  "group_id": null,
  "is_active": true,
  "created_by": 1,
  "created_at": "2025-01-01T12:00:00Z",
  "updated_at": "2025-01-01T12:00:00Z"
}
```
