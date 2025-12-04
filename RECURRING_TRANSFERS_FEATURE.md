# תכונת העברות קבועות (Recurring Transfers)

## סקירה כללית

תכונה חדשה המאפשרת לגזברית המעגל להזין ולנהל העברות חודשיות קבועות לחברים, כמו דמי קופת חולים, תשלום טלפון סלולרי וכו'.

## מה נוסף?

### Backend

1. **טבלת מסד נתונים חדשה**: `recurring_transfers`
   - שדות: מקבל, קופה, סכום, תיאור, תדירות, תאריכים, סטטוס
   - Migration: `024_create_recurring_transfers.sql`

2. **Controller חדש**: `recurringTransferController.ts`
   - יצירה, עריכה, מחיקה של העברות קבועות
   - שליפת העברות קבועות (כל ההעברות או של משתמש ספציפי)
   - בקרת גישה: גזברים בלבד יכולים ליצור/לערוך, חברים יכולים לצפות בשלהם

3. **Routes חדשים**: `recurringTransferRoutes.ts`
   - `GET /api/recurring-transfers` - כל ההעברות (גזברים)
   - `GET /api/recurring-transfers/my` - ההעברות שלי
   - `POST /api/recurring-transfers` - יצירת העברה קבועה
   - `PATCH /api/recurring-transfers/:id` - עדכון
   - `DELETE /api/recurring-transfers/:id` - מחיקה

### Frontend

1. **קומפוננטות חדשות**:
   - `RecurringTransferFormModal.tsx` - טופס להוספה/עריכה של העברה קבועה
   - `RecurringTransferTable.tsx` - טבלה להצגת העברות קבועות

2. **עדכון דף העברות** (`PaymentTransfers.tsx`):
   - טאב חדש: "העברות קבועות"
   - כפתור להוספת העברה קבועה חדשה
   - טבלה עם אפשרויות עריכה, מחיקה, והשהיה/הפעלה

3. **עדכון דף ההחזרים שלי** (`MyReimbursements.tsx`):
   - סקציה חדשה: "העברות חודשיות קבועות"
   - טבלה נפרדת המציגה את ההעברות הקבועות של החבר
   - תצוגה לקריאה בלבד (ללא אפשרות עריכה)

## תכונות עיקריות

### לגזברים
- יצירת העברות קבועות עם תדירות: חודשי, רבעוני, שנתי
- עריכת סכום, תיאור, תדירות ותאריך סיום
- השהיה/הפעלה של העברות קבועות
- מחיקת העברות קבועות
- בקרת גישה: גזברי מעגל רואים הכל, גזברי קבוצה רואים רק של הקבוצה שלהם

### לחברים
- צפייה בהעברות הקבועות שלהם בדף "ההחזרים שלי"
- טבלה נפרדת ומובחנת מהחזרים רגילים
- הסבר שההעברות מבוצעות אוטומטית על ידי הגזברית
- אין אפשרות עריכה או מחיקה

## סטטוסים

- **פעיל (active)**: ההעברה פעילה ומתבצעת
- **מושהה (paused)**: ההעברה מושהתה זמנית
- **בוטל (cancelled)**: ההעברה בוטלה

## תדירויות

- **חודשי (monthly)**: העברה כל חודש
- **רבעוני (quarterly)**: העברה כל רבעון
- **שנתי (annual)**: העברה פעם בשנה

## איך להשתמש?

### גזברים

1. היכנס לדף "העברות" (`/payment-transfers`)
2. לחץ על הטאב "העברות קבועות"
3. לחץ על "הוסף העברה קבועה חדשה"
4. מלא את הפרטים:
   - בחר מקבל תשלום
   - בחר קופה
   - הזן סכום
   - הזן תיאור (למשל: "דמי קופת חולים")
   - בחר תדירות
   - בחר תאריך התחלה
   - (אופציונלי) בחר תאריך סיום
5. לחץ "הוסף"

### חברים

1. היכנס לדף "ההחזרים שלי" (`/my-reimbursements`)
2. גלול למטה לסקציה "העברות חודשיות קבועות"
3. צפה בכל ההעברות הקבועות שלך

## קבצים שנוצרו/עודכנו

### Backend
- `backend/migrations/024_create_recurring_transfers.sql` - חדש
- `backend/src/types/index.ts` - עודכן
- `backend/src/controllers/recurringTransferController.ts` - חדש
- `backend/src/routes/recurringTransferRoutes.ts` - חדש
- `backend/src/server.ts` - עודכן

### Frontend
- `frontend/src/types/index.ts` - עודכן
- `frontend/src/services/api.ts` - עודכן
- `frontend/src/components/RecurringTransferFormModal.tsx` - חדש
- `frontend/src/components/RecurringTransferTable.tsx` - חדש
- `frontend/src/pages/PaymentTransfers.tsx` - עודכן
- `frontend/src/pages/MyReimbursements.tsx` - עודכן

### תיעוד
- `.kiro/steering/product.md` - עודכן
- `.kiro/steering/structure.md` - עודכן
- `RECURRING_TRANSFERS_FEATURE.md` - חדש

## בדיקות

הפיצ'ר נבדק ב:
- ✅ Build של Backend עבר בהצלחה
- ✅ Build של Frontend עבר בהצלחה
- ✅ Migration רץ בהצלחה
- ✅ אין שגיאות TypeScript

## הערות

- ההעברות הקבועות מוצגות בטבלה נפרדת ולא מתערבבות עם החזרים רגילים
- חברים יכולים רק לצפות בהעברות הקבועות שלהם, לא לערוך
- גזברים יכולים להשהות העברה במקום למחוק אותה אם היא זמנית לא רלוונטית
- תאריך הסיום הוא אופציונלי - אם לא מוגדר, ההעברה ממשיכה ללא הגבלת זמן
