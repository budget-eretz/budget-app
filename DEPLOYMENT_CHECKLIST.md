# Deployment Checklist - תקציב הכנסות אוטומטי

## לפני ה-Deployment

- [ ] קרא את `INCOME_BUDGET_FIX_HE.md` להבנת השינוי
- [ ] קרא את `INCOME_BUDGET_MIGRATION.md` לפרטים טכניים
- [ ] וודא שיש גיבוי של ה-database (מומלץ!)
- [ ] וודא שאין הכנסות בתהליך הוספה (למנוע race conditions)

## Deployment Steps

### שלב 1: Pull השינויים
```bash
git pull origin main
```

### שלב 2: עדכון Dependencies (אם צריך)
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### שלב 3: Build (Production)
```bash
# Backend
cd backend
npm run build

# Frontend
cd ../frontend
npm run build
```

### שלב 4: הרצת Migration
```bash
cd backend

# עם Docker
docker-compose exec backend npm run migrate up

# ללא Docker
npm run migrate up
```

**תוצאה צפויה:**
```
Migration 023_create_income_budget_and_migrate.sql started
NOTICE: Created income budget with ID: X
NOTICE: Migrated Y income records to income budget
NOTICE: Updated income budget total amount
Migration 023_create_income_budget_and_migrate.sql completed
```

### שלב 5: בדיקה
```bash
cd backend
npm run check:income-budget
```

**תוצאה צפויה:**
```
✅ Income budget exists
📊 Incomes in this budget: X
✅ No incomes in other budgets
```

### שלב 6: Restart Services
```bash
# עם Docker
docker-compose restart backend frontend

# ללא Docker
# Restart backend service
# Restart frontend service
```

### שלב 7: בדיקות Smoke

#### בדיקה 1: תקציב הכנסות קיים
- [ ] היכנס למערכת כגזבר מעגלי
- [ ] לך לדף "תקציבים"
- [ ] וודא שקיים תקציב "הכנסות"
- [ ] וודא שהסכום נכון (סכום כל ההכנסות)

#### בדיקה 2: הצגת הכנסות
- [ ] לך לדף "הכנסות"
- [ ] וודא שכל ההכנסות מוצגות
- [ ] וודא שבעמודה "תקציב" כתוב "הכנסות"

#### בדיקה 3: הוספת הכנסה חדשה
- [ ] לחץ "הוסף הכנסה"
- [ ] וודא שאין שדה "בחר תקציב"
- [ ] מלא את הפרטים: סכום, תאריך, מקור, תיאור
- [ ] שמור
- [ ] וודא שההכנסה נוספה
- [ ] וודא שהיא מופיעה עם תקציב "הכנסות"
- [ ] וודא שסכום תקציב ההכנסות עלה

#### בדיקה 4: עדכון הכנסה
- [ ] ערוך הכנסה קיימת
- [ ] שנה את הסכום (למשל מ-100 ל-150)
- [ ] שמור
- [ ] וודא שסכום תקציב ההכנסות עלה ב-50

#### בדיקה 5: מחיקת הכנסה
- [ ] מחק הכנסה (רצוי הכנסת בדיקה)
- [ ] וודא שסכום תקציב ההכנסות ירד

## אחרי ה-Deployment

### ניטור
- [ ] בדוק logs לשגיאות
- [ ] בדוק שאין תלונות ממשתמשים
- [ ] בדוק שהכנסות חדשות נכנסות לתקציב הכנסות

### תיעוד
- [ ] עדכן את המשתמשים על השינוי
- [ ] הסבר שלא צריך יותר לבחור תקציב
- [ ] שתף את `INCOME_BUDGET_FIX_HE.md` עם המשתמשים

## Rollback Plan (במקרה חירום)

אם יש בעיה קריטית:

### אופציה 1: Rollback מלא
```bash
# 1. חזור לגרסה הקודמת
git revert HEAD
git push

# 2. Redeploy
# 3. הכנסות חדשות יצטרכו לבחור תקציב שוב
```

### אופציה 2: תיקון קדימה
```bash
# 1. זהה את הבעיה
# 2. תקן את הקוד
# 3. Deploy התיקון
# 4. הרץ migration תיקון אם צריך
```

**המלצה:** תיקון קדימה עדיף על rollback כי המצב החדש נכון יותר.

## בעיות נפוצות ופתרונות

### בעיה 1: Migration נכשל
**תסמינים:** שגיאה בהרצת migration

**פתרון:**
```bash
# בדוק חיבור ל-database
psql -U budget_app_user -d budget_app -c "SELECT 1"

# בדוק אם migration כבר רץ
psql -U budget_app_user -d budget_app -c "SELECT * FROM pgmigrations WHERE name LIKE '%023%'"

# אם רץ חלקית, תקן ידנית או הרץ שוב
```

### בעיה 2: תקציב הכנסות לא נוצר
**תסמינים:** check script מראה שאין תקציב הכנסות

**פתרון:**
```sql
-- צור ידנית
INSERT INTO budgets (name, total_amount, group_id, fiscal_year, created_by, created_at, updated_at)
VALUES ('הכנסות', 0, NULL, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 1, NOW(), NOW());

-- עדכן את הסכום
UPDATE budgets
SET total_amount = (SELECT COALESCE(SUM(amount), 0) FROM incomes WHERE budget_id = (SELECT id FROM budgets WHERE name = 'הכנסות' AND group_id IS NULL))
WHERE name = 'הכנסות' AND group_id IS NULL;
```

### בעיה 3: הכנסות נשארו בתקציבים אחרים
**תסמינים:** check script מראה הכנסות בתקציבים אחרים

**פתרון:**
```sql
-- העבר ידנית
UPDATE incomes
SET budget_id = (SELECT id FROM budgets WHERE name = 'הכנסות' AND group_id IS NULL)
WHERE budget_id != (SELECT id FROM budgets WHERE name = 'הכנסות' AND group_id IS NULL);
```

### בעיה 4: שגיאה בהוספת הכנסה חדשה
**תסמינים:** שגיאה 500 בהוספת הכנסה

**פתרון:**
```bash
# בדוק logs
docker-compose logs backend | grep -i error

# בדוק שתקציב הכנסות קיים
npm run check:income-budget

# אם לא קיים, צור אותו (ראה בעיה 2)
```

## יצירת קשר

אם יש בעיה שלא מופיעה כאן:
1. בדוק את ה-logs
2. הרץ את check script
3. פתח issue בגיטהאב עם:
   - תיאור הבעיה
   - Logs רלוונטיים
   - תוצאת check script
   - צעדים לשחזור

## סיכום

השינוי הזה משפר את המערכת:
- ✅ פשוט יותר למשתמשים
- ✅ מדויק יותר במעקב הכנסות
- ✅ מונע טעויות בבחירת תקציב
- ✅ אוטומטי לחלוטין

בהצלחה! 🚀
