# הרחבת הרשאות גזבר קבוצה - תקציבים

## סיכום השינויים

הוספנו שתי יכולות חדשות לגזברי קבוצה:

### 1. העברת תקציבים (Budget Transfers)
גזבר קבוצה יכול כעת להעביר תקציבים **בין תקציבי הקבוצה שלו בלבד**.

**הגבלות:**
- גזבר קבוצה יכול להעביר רק בין תקציבים של קבוצות שהוא חבר בהן
- לא יכול להעביר מ/אל תקציבים מעגליים (רק גזבר מעגלי יכול)
- לא יכול להעביר בין תקציבים של קבוצות שונות שהוא לא חבר בהן

**שינויים בקוד:**

#### Backend
- **`backend/src/controllers/budgetController.ts`** - פונקציה `transferBudget`:
  - הוספנו בדיקת הרשאות לגזברי קבוצה
  - בדיקה שהתקציבים שייכים לקבוצות שהמשתמש חבר בהן
  - בדיקה שלא מדובר בתקציבים מעגליים (group_id !== null)

- **`backend/src/routes/budgetRoutes.ts`**:
  - שינינו את ה-middleware מ-`requireCircleTreasurer` ל-`requireTreasurer` ב-route של `/transfer`

- **`backend/src/controllers/fundController.ts`** - פונקציה `moveFundItems`:
  - הוספנו בדיקת הרשאות לגזברי קבוצה
  - בדיקה שהקרנות שייכות לתקציבי קבוצה (לא מעגליים)
  - בדיקה שהקבוצות שייכות למשתמש

- **`backend/src/routes/fundRoutes.ts`**:
  - שינינו את ה-middleware מ-`requireCircleTreasurer` ל-`requireTreasurer` ב-route של `/move-items`

#### Frontend
- **`frontend/src/pages/Budgets.tsx`**:
  - כפתור "העברת תנועות" מוצג כעת גם לגזברי קבוצה (לא רק לגזבר מעגלי)

- **`frontend/src/App.tsx`**:
  - שינינו את ה-route guard של `/movements/transfer` מ-`CircleTreasurerRoute` ל-`TreasurerRoute`
  - כעת גם גזברי קבוצה יכולים לגשת לדף העברת תנועות

- **`frontend/src/pages/TransferMovements.tsx`**:
  - עדכנו את הטקסט מ-"כלי גזבר מעגל" ל-"כלי גזבר" כדי להתאים לשני סוגי הגזברים
  - הוספנו סינון תקציבים: גזבר קבוצה רואה רק תקציבי הקבוצות שלו (לא תקציבים מעגליים)
  - הוספנו הודעת מידע לגזבר קבוצה המסבירה שהוא יכול להעביר רק בין תקציבי הקבוצות שלו

### 2. הפעלה/השבתה של תקציבים (is_active)
גזבר קבוצה יכול כעת לעדכן את הסטטוס `is_active` של תקציבי הקבוצה שלו.

**הגבלות:**
- גזבר קבוצה יכול לעדכן **רק** את השדה `is_active`
- לא יכול לעדכן שם, סכום כולל, או שנת תקציב של תקציבי קבוצה
- לא יכול לעדכן תקציבים מעגליים (רק גזבר מעגלי יכול)

**שינויים בקוד:**

#### Backend
- **`backend/src/controllers/budgetController.ts`** - פונקציה `updateBudget`:
  - הוספנו בדיקה אם התקציב הוא תקציב קבוצה או מעגלי
  - אם גזבר קבוצה מנסה לעדכן שדות מלבד `is_active`, מוחזרת שגיאה 403
  - גזבר מעגלי יכול לעדכן את כל השדות כרגיל

- **`backend/src/routes/budgetRoutes.ts`**:
  - שינינו את ה-middleware מ-`requireCircleTreasurer` ל-`requireTreasurer` ב-route של `PATCH /:id`

#### Frontend
- **`frontend/src/pages/BudgetDetail.tsx`**:
  - הקוד כבר תמך בכך שגזבר קבוצה יכול לערוך תקציבים של הקבוצה שלו
  - פונקציה `canManageBudget` בודקת אם המשתמש הוא גזבר קבוצה וחבר בקבוצה של התקציב

- **`frontend/src/components/BudgetForm.tsx`**:
  - הטופס כבר תומך בשדה `isActive` עם checkbox
  - הודעה מסבירה למשתמש מה המשמעות של תקציב פעיל/לא פעיל

## דוגמאות שימוש

### העברת תקציב (גזבר קבוצה)
```typescript
// Request
POST /api/budgets/transfer
{
  "fromBudgetId": 5,  // תקציב של קבוצה שהגזבר חבר בה
  "toBudgetId": 6,    // תקציב אחר של אותה קבוצה
  "amount": 5000,
  "description": "העברה לצורך פעילות מיוחדת"
}

// Response (Success)
{
  "id": 123,
  "from_budget_id": 5,
  "to_budget_id": 6,
  "amount": 5000,
  "transferred_by": 10,
  "description": "העברה לצורך פעילות מיוחדת",
  "created_at": "2025-01-19T..."
}

// Response (Error - trying to transfer from circle budget)
{
  "error": "Group treasurers can only transfer between group budgets"
}
```

### עדכון סטטוס תקציב (גזבר קבוצה)
```typescript
// Request - עדכון is_active בלבד (מותר)
PATCH /api/budgets/5
{
  "isActive": false
}

// Response (Success)
{
  "id": 5,
  "name": "תקציב קבוצת הצפון",
  "total_amount": 100000,
  "is_active": false,
  ...
}

// Request - ניסיון לעדכן שדות נוספים (לא מותר)
PATCH /api/budgets/5
{
  "name": "שם חדש",
  "totalAmount": 150000,
  "isActive": false
}

// Response (Error)
{
  "error": "Group treasurers can only update is_active status"
}
```

## בדיקות מומלצות

1. **בדיקת העברת תקציבים:**
   - התחבר כגזבר קבוצה
   - נסה להעביר תקציב בין שני תקציבים של הקבוצה שלך ✓
   - נסה להעביר תקציב מתקציב מעגלי (צריך להיכשל) ✗
   - נסה להעביר תקציב לקבוצה אחרת (צריך להיכשל) ✗

2. **בדיקת עדכון is_active:**
   - התחבר כגזבר קבוצה
   - עדכן את is_active של תקציב הקבוצה שלך ✓
   - נסה לעדכן שדות אחרים (שם, סכום) - צריך להיכשל ✗
   - נסה לעדכן תקציב מעגלי - צריך להיכשל ✗

3. **בדיקת UI:**
   - וודא שכפתור "העברת תנועות" מופיע לגזבר קבוצה בדף התקציבים
   - וודא שכפתור "ערוך תקציב" מופיע לגזבר קבוצה בדף פרטי התקציב
   - וודא שהטופס מאפשר לשנות את is_active

## הערות טכניות

- השינויים שומרים על תאימות לאחור - גזבר מעגלי ממשיך לפעול כרגיל
- כל הבדיקות מתבצעות גם ב-backend וגם ב-frontend לאבטחה מקסימלית
- השגיאות מוחזרות בעברית עם הודעות ברורות למשתמש
