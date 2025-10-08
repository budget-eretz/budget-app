# תוכנית מימוש - שיפור מעקב הכנסות

- [x] 1. הגדרת מבני נתונים ומיגרציות






- [x] 1.1 יצירת migration לטבלת income_categories

  - יצירת קובץ migration חדש `016_create_income_categories.sql`
  - הגדרת טבלה עם שדות: id, name, description, color, created_by, created_at, updated_at
  - הוספת אינדקס על name
  - הוספת constraint UNIQUE על name
  - _Requirements: 3.1, 3.2, 3.3_


- [x] 1.2 יצירת migration לטבלת income_category_assignments

  - יצירת קובץ migration `017_create_income_category_assignments.sql`
  - הגדרת טבלת קשר many-to-many בין incomes לקטגוריות
  - הוספת אינדקסים על income_id ו-category_id
  - הגדרת PRIMARY KEY מורכב (income_id, category_id)
  - _Requirements: 3.1_


- [x] 1.3 יצירת migration לטבלת expected_incomes

  - יצירת קובץ migration `018_create_expected_incomes.sql`
  - הגדרת טבלה עם שדות: id, budget_id, user_id, source_name, amount, description, year, month, frequency, parent_annual_id, is_manual, created_by
  - הוספת אינדקסים על budget_id, user_id, year/month, parent_annual_id
  - הוספת constraints על year, month, frequency
  - _Requirements: 4.1, 4.3, 5.1_


- [x] 1.4 יצירת migration לטבלת expected_income_category_assignments

  - יצירת קובץ migration `019_create_expected_income_category_assignments.sql`
  - הגדרת טבלת קשר many-to-many בין expected_incomes לקטגוריות
  - הוספת אינדקסים
  - הגדרת PRIMARY KEY מורכב
  - _Requirements: 4.3, 5.4_


- [x] 1.5 עדכון TypeScript interfaces

  - עדכון `backend/src/types/index.ts` עם interfaces חדשים:
    - IncomeCategory
    - ExpectedIncome
    - IncomeComparison
    - MonthlyIncomeSummary
  - הוספת שדה categories אופציונלי ל-Income interface
  - _Requirements: כל הדרישות_
-

- [x] 2. מימוש Backend - ניהול קטגוריות





- [x] 2.1 יצירת incomeCategoryController

  - יצירת קובץ `backend/src/controllers/incomeCategoryController.ts`
  - מימוש getCategories: שליפת כל הקטגוריות עם מספר הכנסות לכל קטגוריה
  - מימוש createCategory: יצירת קטגוריה חדשה (בדיקת שם ייחודי)
  - מימוש updateCategory: עדכון קטגוריה קיימת
  - מימוש deleteCategory: מחיקת קטגוריה (בדיקה אם משויכת להכנסות)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_


- [x] 2.2 יצירת income category routes

  - יצירת קובץ `backend/src/routes/incomeCategoryRoutes.ts`
  - הגדרת routes:
    - GET / - getCategories
    - POST / - createCategory (treasurer only)
    - PATCH /:id - updateCategory (treasurer only)
    - DELETE /:id - deleteCategory (treasurer only)
  - שימוש ב-authenticateToken middleware
  - הוספת בדיקת הרשאות גזברית למסלולים הרלוונטיים
  - _Requirements: 7.1, 7.5, 7.6_


- [x] 2.3 רישום routes במערכת

  - עדכון `backend/src/server.ts`
  - הוספת import של incomeCategoryRoutes
  - רישום המסלול `/api/income-categories`
  - _Requirements: כל הדרישות_

- [x] 3. מימוש Backend - שיפור הכנסות בפועל



- [x] 3.1 שיפור incomeController - getIncomes


  - עדכון `backend/src/controllers/incomeController.ts`
  - הוספת תמיכה בסינונים: startDate, endDate, source, categoryId, year, month
  - הוספת JOIN עם income_category_assignments ו-income_categories
  - החזרת הכנסות עם מערך קטגוריות
  - _Requirements: 2.2, 2.8_

- [x] 3.2 שיפור incomeController - createIncome


  - הוספת תמיכה בשיוך קטגוריות בעת יצירה
  - אם נשלח מערך categoryIds, הוספת רשומות ל-income_category_assignments
  - החזרת הכנסה עם קטגוריות
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3.3 הוספת updateIncome ל-incomeController


  - מימוש פונקציה לעדכון הכנסה קיימת
  - בדיקת הרשאות (גזברית בלבד)
  - אפשרות לעדכן: amount, description, income_date, source
  - _Requirements: 2.3, 2.4, 7.1, 7.6_

- [x] 3.4 הוספת assignCategories ל-incomeController


  - מימוש פונקציה לשיוך קטגוריות להכנסה קיימת
  - מחיקת שיוכים קיימים והוספת חדשים
  - בדיקת הרשאות (גזברית בלבד)
  - _Requirements: 1.1, 7.1_

- [x] 3.5 עדכון income routes


  - עדכון `backend/src/routes/incomeRoutes.ts`
  - הוספת PATCH /:id - updateIncome (treasurer only)
  - הוספת POST /:id/categories - assignCategories (treasurer only)
  - _Requirements: 2.3, 7.1_

- [x] 4. מימוש Backend - הכנסות צפויות





- [x] 4.1 יצירת expectedIncomeController - פונקציות בסיס


  - יצירת קובץ `backend/src/controllers/expectedIncomeController.ts`
  - מימוש getExpectedIncomes: שליפה עם סינונים (budgetId, year, month, source, categoryId, frequency)
  - מימוש getExpectedIncome: שליפת הכנסה צפויה בודדת
  - הוספת JOIN עם קטגוריות
  - _Requirements: 5.1, 5.2_

- [x] 4.2 מימוש createAnnualPlanning


  - פונקציה ליצירת תכנון שנתי
  - קבלת פרמטרים: budgetId, userId/sourceName, amount, description, year, frequency, categoryIds
  - יצירת רשומת parent
  - לוגיקה לחלוקה לפי תדירות:
    - monthly: יצירת 12 רשומות חודשיות
    - quarterly: יצירת 4 רשומות רבעוניות (חודשים 1,4,7,10)
    - one-time: יצירת רשומה אחת לחודש שנבחר
    - annual: יצירת רשומה אחת לחודש 1
  - שיוך קטגוריות לכל הרשומות שנוצרו
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 4.3 מימוש createMonthlyExpectedIncome


  - פונקציה ליצירת הכנסה צפויה חודשית ידנית
  - הגדרת is_manual = true
  - שיוך קטגוריות אם נשלחו
  - _Requirements: 5.4, 5.6_

- [x] 4.4 מימוש updateExpectedIncome


  - פונקציה לעדכון הכנסה צפויה
  - אם is_manual = false: אפשרות לעדכן רק amount (לחודש ספציפי)
  - אם is_manual = true: אפשרות לעדכן את כל השדות
  - _Requirements: 5.5, 5.7_

- [x] 4.5 מימוש deleteExpectedIncome


  - פונקציה למחיקת הכנסה צפויה
  - אם is_manual = false: מחיקה רק של הרשומה הספציפית (לא משפיע על חודשים אחרים)
  - אם parent (יש children): מחיקה קסקדית של כל הילדים
  - _Requirements: 5.8_

- [x] 4.6 יצירת expected income routes


  - יצירת קובץ `backend/src/routes/expectedIncomeRoutes.ts`
  - הגדרת routes:
    - GET / - getExpectedIncomes
    - GET /:id - getExpectedIncome
    - POST /annual - createAnnualPlanning (treasurer only)
    - POST /monthly - createMonthlyExpectedIncome (treasurer only)
    - PATCH /:id - updateExpectedIncome (treasurer only)
    - DELETE /:id - deleteExpectedIncome (treasurer only)
    - POST /:id/categories - assignCategories (treasurer only)
  - _Requirements: 4.1, 4.2, 5.1, 7.1_

- [x] 4.7 רישום expected income routes במערכת


  - עדכון `backend/src/server.ts`
  - הוספת import של expectedIncomeRoutes
  - רישום המסלול `/api/expected-incomes`
  - _Requirements: כל הדרישות_

-

- [x] 5. מימוש Backend - השוואה ודשבורד



- [x] 5.1 מימוש getMonthlyComparison


  - הוספה ל-`backend/src/controllers/expectedIncomeController.ts` או יצירת controller נפרד
  - שליפת כל expected_incomes לחודש מסוים
  - שליפת כל incomes (בפועל) לאותו חודש
  - קיבוץ לפי source_name
  - חישוב הפרשים ואחוזים
  - קביעת סטטוס (not-received, partial, full, exceeded)
  - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.6, 6.7_

- [x] 5.2 מימוש getDashboardSummary

  - פונקציה לסיכום החודש הנוכחי
  - חישוב סך הכנסות צפויות
  - חישוב סך הכנסות בפועל
  - חישוב פער ואחוז התממשות
  - אופציונלי: פירוט לפי קטגוריות
  - _Requirements: 6.1_

- [x] 5.3 הוספת comparison routes


  - עדכון routes (או יצירת comparisonRoutes.ts)
  - GET /api/incomes/comparison/monthly/:year/:month - getMonthlyComparison
  - GET /api/incomes/dashboard/summary - getDashboardSummary
  - _Requirements: 6.1, 6.2_

- [x] 6. מימוש Frontend - רכיבים בסיסיים




- [x] 6.1 יצירת IncomeTable component

  - יצירת `frontend/src/components/IncomeTable.tsx`
  - טבלה להצגת הכנסות בפועל
  - עמודות: תאריך, מקור, תיאור, סכום, קטגוריות, פעולות
  - תמיכה במיון לפי עמודות
  - הצגת קטגוריות כ-badges צבעוניים
  - כפתורי עריכה ומחיקה (גזברית בלבד)
  - _Requirements: 2.2, 2.7, 8.1, 8.2, 8.3, 8.4_



- [x] 6.2 יצירת IncomeFormModal component
  - יצירת `frontend/src/components/IncomeFormModal.tsx`
  - מודאל לטופס הוספה/עריכה של הכנסה
  - שדות: סכום, תאריך, תיאור
  - בחירת מקור: dropdown של חברים או "מקור אחר"
  - בחירת קטגוריות (multi-select)
  - ולידציה: סכום חיובי, תאריך חובה, מקור חובה
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.4, 8.8, 8.9_


- [x] 6.3 יצירת CategoryManager component

  - יצירת `frontend/src/components/CategoryManager.tsx`
  - רשימת קטגוריות עם אפשרות עריכה
  - טופס הוספת קטגוריה חדשה
  - בחירת צבע (color picker או preset colors)
  - כפתורי עריכה ומחיקה
  - אישור מחיקה עם הצגת מספר הכנסות משויכות
  - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 3.7, 3.8, 8.1_

- [x] 6.4 יצירת ExpectedIncomeTable component


  - יצירת `frontend/src/components/ExpectedIncomeTable.tsx`
  - טבלה להצגת הכנסות צפויות
  - עמודות: מקור, סכום, תיאור, קטגוריות, סוג (אוטומטי/ידני), פעולות
  - סימון ויזואלי להכנסות אוטומטיות vs ידניות
  - כפתורי עריכה ומחיקה
  - _Requirements: 5.2, 5.3, 8.1, 8.2_


- [x] 6.5 יצירת ExpectedIncomeFormModal component

  - יצירת `frontend/src/components/ExpectedIncomeFormModal.tsx`
  - מודאל לטופס הכנסה צפויה
  - מצבים: שנתי (עם תדירות) או חודשי (לחודש ספציפי)
  - שדות: מקור, סכום, תיאור, קטגוריות
  - בחירת תדירות (one-time/monthly/quarterly/annual) - רק במצב שנתי
  - בחירת חודש ספציפי - רק אם תדירות one-time
  - ולידציה
  - _Requirements: 4.1, 4.2, 4.3, 5.4, 8.4, 8.8, 8.9_


- [x] 6.6 יצירת ComparisonTable component


  - יצירת `frontend/src/components/ComparisonTable.tsx`
  - טבלת השוואה בין צפוי לבפועל
  - עמודות: מקור, צפוי, בפועל, פער, סטטוס
  - צביעה לפי סטטוס:
    - אדום: לא התקבל
    - כתום: התקבל חלקית
    - ירוק: התקבל במלואו או יותר
  - תמיכה במיון וסינון
  - _Requirements: 6.2, 6.4, 6.7, 6.8, 6.9, 8.1, 8.2_
- [x] 7. מימוש Frontend - עדכון API service




- [ ] 7. מימוש Frontend - עדכון API service

- [x] 7.1 הוספת income categories API calls


  - עדכון `frontend/src/services/api.ts`
  - הוספת פונקציות:
    - getIncomeCategories()
    - createIncomeCategory(data)
    - updateIncomeCategory(id, data)
    - deleteIncomeCategory(id)
  - _Requirements: 3.1, 3.2, 3.5, 3.6_

- [x] 7.2 שיפור incomes API calls

  - עדכון פונקציות קיימות:
    - getIncomes(params) - תמיכה בפרמטרים נוספים
    - createIncome(data) - תמיכה ב-categoryIds
  - הוספת פונקציות חדשות:
    - updateIncome(id, data)
    - assignIncomeCategories(id, categoryIds)
  - _Requirements: 1.1, 2.2, 2.3, 2.8_

- [x] 7.3 הוספת expected incomes API calls

  - הוספת פונקציות:
    - getExpectedIncomes(params)
    - getExpectedIncome(id)
    - createAnnualExpectedIncome(data)
    - createMonthlyExpectedIncome(data)
    - updateExpectedIncome(id, data)
    - deleteExpectedIncome(id)
    - assignExpectedIncomeCategories(id, categoryIds)
  - _Requirements: 4.1, 4.2, 5.1, 5.4, 5.5, 5.8_

- [x] 7.4 הוספת comparison API calls

  - הוספת פונקציות:
    - getMonthlyComparison(year, month)
    - getIncomeDashboardSummary()
  - _Requirements: 6.1, 6.2_

- [x] 8. מימוש Frontend - דף Incomes ראשי



- [x] 8.1 יצירת מבנה בסיסי של דף Incomes

  - יצירת `frontend/src/pages/Incomes.tsx`
  - הגדרת state management (incomes, expectedIncomes, categories, filters, etc.)
  - הגדרת כותרת ראשית וכפתורי פעולה עליונים
  - טעינת נתונים ראשונית (useEffect)
  - _Requirements: כל הדרישות, 8.1_


- [x] 8.2 מימוש סעיף "הכנסות בפועל"

  - כותרת משנה: "הכנסות בפועל"
  - שדות סינון: תאריך (מ-עד), מקור (dropdown), קטגוריה (dropdown)
  - שימוש ב-IncomeTable component
  - כפתור "הוסף הכנסה" - פותח IncomeFormModal
  - טיפול בעריכה ומחיקה של הכנסות
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_


- [x] 8.3 מימוש סעיף "תכנון הכנסות שנתי"

  - כותרת משנה: "תכנון הכנסות שנתי"
  - dropdown לבחירת שנה
  - כפתור "הוסף הכנסה צפויה שנתית" - פותח ExpectedIncomeFormModal במצב שנתי
  - שימוש ב-ExpectedIncomeTable component
  - טעינת הכנסות צפויות לשנה הנבחרת
  - טיפול בעריכה ומחיקה
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_



- [x] 8.4 מימוש סעיף "תכנון הכנסות חודשי"

  - כותרת משנה: "תכנון הכנסות חודשי"
  - שימוש ב-MonthNavigator component (קיים)
  - כפתור "הוסף הכנסה צפויה לחודש זה" - פותח ExpectedIncomeFormModal במצב חודשי
  - שימוש ב-ExpectedIncomeTable component
  - סימון ויזואלי: הכנסות אוטומטיות (מתכנון שנתי) vs ידניות
  - טעינת הכנסות צפויות לחודש הנבחר
  - טיפול בעריכה ומחיקה (עם אזהרות מתאימות)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_




- [x] 8.5 מימוש סעיף "השוואה צפוי מול בפועל"
  - כותרת משנה: "השוואה - צפוי מול בפועל"
  - שימוש ב-MonthNavigator component
  - קארד סיכום עם:
    - סך הכנסות צפויות
    - סך הכנסות בפועל
    - פער (בסכום ובאחוזים)
    - אחוז התממשות
  - שדות סינון: קטגוריה, מקור
  - שימוש ב-ComparisonTable component
  - טעינת נתוני השוואה לחודש הנבחר
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_




- [x] 8.6 מימוש ניהול קטגוריות

  - כפתור "נהל קטגוריות" בכותרת הראשית (גזברית בלבד)
  - פתיחת מודאל עם CategoryManager component
  - טיפול ביצירה, עריכה ומחיקה של קטגוריות
  - רענון רשימת הקטגוריות לאחר שינויים
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_


- [x] 8.7 הוספת הרשאות וגישה

  - בדיקת הרשאות גזברית לפעולות כתיבה
  - הסתרת כפתורים ופעולות ממשתמשים לא מורשים
  - הצגת הודעות שגיאה מתאימות
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_


- [x] 8.8 שיפור חוויית משתמש ועיצוב

  - וידוא שכל הטקסטים בעברית
  - פריסה RTL נכונה
  - פורמט תאריכים עברי (DD/MM/YYYY)
  - פורמט סכומים עם פסיק (1,500 ₪)
  - הודעות משוב (Toast) בעברית
  - tooltips הסבר בעברית
  - סימון שדות חובה (כוכבית אדומה)
  - הודעות שגיאה ברורות מתחת לשדות
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_
-

- [x] 9. אינטגרציה וניווט



- [x] 9.1 הוספת דף Incomes לניווט


  - עדכון `frontend/src/components/Navigation.tsx`
  - הוספת לינק "הכנסות" לסרגל הניווט
  - הצגה לכל המשתמשים (גזברים וחברים)
  - _Requirements: כל הדרישות_

- [x] 9.2 הוספת route לדף Incomes


  - עדכון `frontend/src/App.tsx`
  - הוספת route: `/incomes` -> Incomes component
  - הגנה עם authentication
  - _Requirements: כל הדרישות_

- [x] 9.3 בדיקת אינטגרציה מלאה (ידנית - אפשר להשתמש ב-Playwright MCP)


  - בדיקת זרימה מלאה: יצירת קטגוריה → יצירת הכנסה בפועל → תכנון שנתי → תכנון חודשי → השוואה
  - בדיקת הרשאות: גזברית vs חבר רגיל
  - בדיקת סינונים ומיונים
  - בדיקת עריכה ומחיקה
  - בדיקת הודעות שגיאה והצלחה
  - הערה: כל הבדיקות הן ידניות, אפשר להשתמש ב-MCP של Playwright לצורך בדיקות אינטראקטיביות
  - _Requirements: כל הדרישות_


- [x] 10. ליטוש ואופטימיזציה





- [x] 10.1 אופטימיזציית ביצועים

  - הוספת pagination לטבלאות ארוכות (אם נדרש)
  - debouncing לשדות חיפוש וסינון
  - שימוש ב-useMemo ו-useCallback במקומות מתאימים
  - _Requirements: 8.10_


- [x] 10.2 טיפול בשגיאות ו-edge cases

  - טיפול בשגיאות רשת
  - טיפול במצבי loading
  - טיפול ברשימות ריקות (empty states)
  - ולידציות מקיפות
  - _Requirements: כל הדרישות_



- [ ] 10.3 בדיקה סופית ותיקוני באגים (ידנית - אפשר להשתמש ב-Playwright MCP)
  - בדיקת כל הפונקציונליות
  - תיקון באגים שנמצאו
  - וידוא עקביות ויזואלית עם שאר המערכת
  - בדיקת responsive design (אם רלוונטי)
  - הערה: כל הבדיקות הן ידניות, אפשר להשתמש ב-MCP של Playwright לצורך בדיקות אינטראקטיביות
  - _Requirements: כל הדרישות_
