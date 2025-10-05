# מסמך תיעוד למערכת ניהול תקציב - CLAUDE.md

## 📋 תיאור כללי

מערכת ניהול תקציב מקיפה עבור התאגדות שיתופית. המערכת נבנתה עבור **מעגל אחד** המכיל **קבוצות מרובות**.

## 🎯 מושגי יסוד

### היררכיה ארגונית
```
מעגל (אחד)
  └── קבוצות (מרובות)
      └── חברים
```

### תפקידים במערכת
1. **גזבר מעגלי** - מנהל את התקציב הכולל של כל המעגל
2. **גזבר קבוצתי** - מנהל את תקציב הקבוצה שלו
3. **חבר מעגל** - יכול להיות חלק מקבוצה או לא

**חשוב:** כל גזבר הוא גם חבר. לא כל חבר הוא גזבר.

### מושגי תקציב
- **תקציב** - סכום כסף קיים שניתן לחלוקה
  - **תקציב מעגלי** - מנוהל ע"י גזבר מעגלי
  - **תקציב קבוצתי** - הועבר לקבוצה מהתקציב המעגלי
- **קופה** - כסף מתוך התקציב שמיועד למטרה ספציפית
- **תכנון** - כסף שמתוכנן להוציא (עוד לא יצא בפועל)
- **החזר** - כסף שחבר הוציא ומבקש החזר עליו
- **הכנסה** - כסף שנכנס לתקציב

## 🗄️ מבנה Database

### טבלאות (8 טבלאות)

#### 1. groups
```sql
id, name, description, created_at
```
קבוצות שיתופיות במעגל.

#### 2. users
```sql
id, email, password_hash, full_name, phone,
group_id (nullable),
is_circle_treasurer (boolean),
is_group_treasurer (boolean),
created_at, updated_at
```
**לוגיקה:**
- `group_id = NULL` → חבר מעגל בלבד (לא חלק מקבוצה)
- `group_id != NULL` → חבר מעגל וגם חלק מקבוצה
- `is_circle_treasurer = true` → גזבר מעגלי
- `is_group_treasurer = true` → גזבר של הקבוצה שלו

#### 3. budgets
```sql
id, name, total_amount,
group_id (nullable),
fiscal_year, created_by, created_at, updated_at
```
**לוגיקה:**
- `group_id = NULL` → תקציב מעגלי
- `group_id != NULL` → תקציב קבוצתי

#### 4. funds (קופות)
```sql
id, budget_id, name, allocated_amount, description, created_at
```
חלוקת תקציב לקופות ספציפיות.

**חישוב זמינות:**
```
זמין = allocated_amount - spent_amount - planned_amount
```

#### 5. planned_expenses (תכנונים)
```sql
id, fund_id, user_id, amount, description,
planned_date,
status ('planned' | 'executed' | 'cancelled'),
created_at, updated_at
```
תכנונים של הוצאות עתידיות.

#### 6. reimbursements (החזרים)
```sql
id, fund_id, user_id, amount, description,
expense_date, receipt_url,
status ('pending' | 'approved' | 'rejected' | 'paid'),
reviewed_by, reviewed_at, notes,
created_at, updated_at
```
**Workflow:**
1. חבר מגיש → `status = 'pending'`
2. גזבר מאשר → `status = 'approved'`, `reviewed_by = גזבר`
3. לאחר תשלום → `status = 'paid'`

או: גזבר דוחה → `status = 'rejected'`

#### 7. incomes (הכנסות)
```sql
id, budget_id, user_id, amount, source,
description, income_date, created_at
```
רישום הכנסות שמגדילות את התקציב.

#### 8. budget_transfers (העברות תקציב)
```sql
id, from_budget_id, to_budget_id, amount,
transferred_by, description, created_at
```
מעקב אחר העברות כסף מתקציב מעגלי לתקציבי קבוצות.

## 🔐 מערכת הרשאות

### גזבר מעגלי
**יכול:**
- ✅ לראות את כל התקציבים (מעגלי + כל הקבוצות)
- ✅ ליצור תקציבים (מעגלי וקבוצתי)
- ✅ ליצור קופות מעגליות
- ✅ להעביר תקציב לקבוצות
- ✅ לאשר/לדחות כל בקשות ההחזר
- ✅ לראות רשימות תשלום
- ✅ לעשות כל מה שחבר רגיל יכול

### גזבר קבוצתי
**יכול:**
- ✅ לראות את תקציב הקבוצה שלו + תקציב מעגלי
- ✅ ליצור קופות בתקציב הקבוצה שלו
- ✅ לאשר/לדחות בקשות החזר של חברי הקבוצה
- ✅ לראות רשימות תשלום של הקבוצה
- ✅ לעשות כל מה שחבר רגיל יכול

### חבר רגיל
**יכול:**
- ✅ לראות תקציבים רלוונטיים (קבוצה שלו + מעגלי)
- ✅ לרשום תכנונים
- ✅ להגיש בקשות החזר
- ✅ לרשום הכנסות
- ✅ לראות את ההיסטוריה שלו

## 🌐 API Structure

### Base URL
```
Development: http://localhost:4567/api
Production: https://your-app.onrender.com/api
```

### Authentication
כל הבקשות (מלבד login/register) דורשות JWT token:
```
Header: Authorization: Bearer <token>
```

### Endpoints מרכזיים

#### Authentication
- `POST /auth/login` - התחברות
- `POST /auth/register` - הרשמה
- `GET /auth/me` - קבלת פרטי משתמש מחובר

#### Budgets
- `GET /budgets` - רשימת תקציבים (מסונן לפי הרשאות)
- `GET /budgets/:id` - פרטי תקציב ספציפי
- `POST /budgets` - יצירת תקציב חדש (גזבר מעגלי)
- `PATCH /budgets/:id` - עדכון תקציב (גזבר מעגלי)
- `POST /budgets/transfer` - העברת תקציב (גזבר מעגלי)

#### Funds
- `GET /funds?budgetId=X` - קופות של תקציב מסוים
- `GET /funds/:id` - פרטי קופה עם חישוב זמינות
- `POST /funds` - יצירת קופה (גזבר)
- `PATCH /funds/:id` - עדכון קופה (גזבר)
- `DELETE /funds/:id` - מחיקת קופה (גזבר)

#### Planned Expenses
- `GET /planned-expenses?fundId=X` - תכנונים
- `POST /planned-expenses` - יצירת תכנון
- `PATCH /planned-expenses/:id` - עדכון תכנון
- `DELETE /planned-expenses/:id` - מחיקת תכנון

#### Reimbursements
- `GET /reimbursements?status=pending&fundId=X` - החזרים
- `GET /reimbursements/:id` - פרטי החזר
- `POST /reimbursements` - יצירת בקשת החזר
- `PATCH /reimbursements/:id` - עדכון החזר (רק pending)
- `POST /reimbursements/:id/approve` - אישור (גזבר)
- `POST /reimbursements/:id/reject` - דחייה (גזבר)
- `POST /reimbursements/:id/paid` - סימון כשולם (גזבר)

#### Incomes
- `GET /incomes?budgetId=X` - הכנסות
- `POST /incomes` - רישום הכנסה
- `DELETE /incomes/:id` - מחיקת הכנסה

#### Reports
- `GET /reports/dashboard` - דשבורד מותאם אישית לפי תפקיד
- `GET /reports/payments` - רשימת תשלומים ממתינים (גזבר)
- `GET /reports/budget/:id` - דוח תקציב מפורט

## 🎨 Frontend Architecture

### מבנה קבצים
```
frontend/src/
├── components/        # רכיבים משותפים (עדיין לא מומש)
├── pages/            # דפים ראשיים
│   ├── Login.tsx     # דף התחברות
│   └── Dashboard.tsx # דשבורד ראשי
├── context/
│   └── AuthContext.tsx  # ניהול authentication
├── services/
│   └── api.ts        # API calls layer
├── types/
│   └── index.ts      # TypeScript interfaces
├── App.tsx           # Routing ראשי
├── main.tsx          # Entry point
└── index.css         # Styles גלובליים
```

### State Management
- **AuthContext** - ניהול משתמש מחובר וטוקן
- **Local State** - useState/useEffect בכל component
- **אין Redux/Zustand** - המערכת פשוטה מספיק

### Routing
```
/ → redirect to /dashboard
/login → דף התחברות
/dashboard → דשבורד (דורש authentication)
```

## 🔄 Workflows עיקריים

### 1. יצירת תקציב מעגלי וחלוקה לקבוצה
```
1. גזבר מעגלי יוצר תקציב מעגלי (₪500,000)
2. מחלק לקופות מעגליות:
   - אירועים: ₪100,000
   - תחבורה: ₪50,000
3. מעביר ₪150,000 לקבוצה א':
   POST /budgets/transfer
   {
     fromBudgetId: 1,  // תקציב מעגלי
     toBudgetId: 2,    // תקציב קבוצה א'
     amount: 150000,
     description: "תקציב שנתי לקבוצה א'"
   }
4. גזבר קבוצה א' מחלק לקופות קבוצתיות
```

### 2. הגשת בקשת החזר ואישורה
```
1. חבר הוציא ₪500 על ציוד:
   POST /reimbursements
   {
     fundId: 5,              // קופת "ציוד קבוצתי"
     amount: 500,
     description: "ציוד קמפינג",
     expenseDate: "2025-10-01",
     receiptUrl: "https://..."
   }
   → status = 'pending'

2. גזבר קבוצתי רואה בדשבורד "בקשות ממתינות"

3. גזבר מאשר:
   POST /reimbursements/15/approve
   { notes: "אושר" }
   → status = 'approved'

4. בקשה מופיעה ב-GET /reports/payments

5. לאחר תשלום בפועל:
   POST /reimbursements/15/paid
   → status = 'paid'
```

### 3. תכנון הוצאה עתידית
```
1. חברה מתכננת להוציא ₪2,000 על השכרת אוטובוס:
   POST /planned-expenses
   {
     fundId: 3,           // קופת "תחבורה"
     amount: 2000,
     description: "השכרת אוטובוס לטיול",
     plannedDate: "2025-11-15"
   }

2. הקופה מראה:
   - מקורי: ₪50,000
   - יצא: ₪10,000
   - מתוכנן: ₪2,000  ← נוסף!
   - זמין: ₪38,000

3. לאחר ביצוע:
   PATCH /planned-expenses/8
   { status: 'executed' }

   והגשת החזר בפועל
```

## 🚀 Development Setup

### Prerequisites
**אופציה 1 (מומלץ):**
- Docker + Docker Compose

**אופציה 2:**
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### 🐳 הרצה עם Docker (מומלץ!)

#### התקנה מהירה - 3 פקודות בלבד:

```bash
# 1. Clone
git clone <repo>
cd budgetAPP

# 2. הרצת כל הסביבה (PostgreSQL + Backend + Frontend)
docker-compose up -d

# 3. אתחול DB (פעם אחת בלבד)
# Windows:
scripts\init-dev.bat

# Mac/Linux:
chmod +x scripts/init-dev.sh
./scripts/init-dev.sh

# או ידנית:
docker-compose exec backend npm run migrate
docker-compose exec backend npm run seed
```

**זהו! המערכת רצה:**
- Frontend: http://localhost:3456
- Backend: http://localhost:4567
- PostgreSQL: localhost:5433

#### פקודות Docker שימושיות:

```bash
# הצגת logs
docker-compose logs -f
docker-compose logs -f backend    # רק backend
docker-compose logs -f frontend   # רק frontend

# עצירה והרצה מחדש
docker-compose down
docker-compose up -d
docker-compose restart

# בניה מחדש (אחרי שינוי dependencies)
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# ניקוי מלא
docker-compose down -v

# פתיחת shell
docker-compose exec backend sh
docker-compose exec frontend sh
docker-compose exec postgres psql -U budget_app_user -d budget_app

# הרצת migrations/seed
docker-compose exec backend npm run migrate
docker-compose exec backend npm run seed
```

#### Makefile (קיצורים נוחים)

אם יש `make` (Mac/Linux/Git Bash):

```bash
make help          # הצג כל הפקודות
make dev           # הפעל סביבת פיתוח
make logs          # הצג logs
make migrate       # הרץ migrations
make seed          # seed database
make db-setup      # migrate + seed
make down          # עצור הכל
make clean         # ניקוי מלא
make rebuild       # בניה מחדש
make shell-backend # פתח shell ב-backend
make shell-db      # חבר ל-PostgreSQL
```

### 💻 הרצה ללא Docker (Manual)

```bash
# 1. Clone
git clone <repo>
cd budgetAPP

# 2. התקנת dependencies
npm install

# 3. הגדרת PostgreSQL
# צור database:
psql -U postgres
CREATE DATABASE budget_app;
CREATE USER budget_app_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE budget_app TO budget_app_user;

# 4. הגדרת .env
# ערוך backend/.env:
NODE_ENV=development
PORT=4567
PGHOST=localhost
PGPORT=5433
PGDATABASE=budget_app
PGUSER=budget_app_user
PGPASSWORD=your_password
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# 5. Migrations + Seed
cd backend
npm run migrate
npm run seed

# 6. הרצה
# Terminal 1 - Backend:
cd backend
npm run dev

# Terminal 2 - Frontend:
cd frontend
npm run dev

# 7. פתח דפדפן
http://localhost:3456
```

### 🐳 מבנה Docker

#### קבצים:
- `docker-compose.yml` - סביבת פיתוח
- `docker-compose.prod.yml` - סביבת production
- `backend/Dockerfile` - Dev image
- `backend/Dockerfile.prod` - Production image
- `frontend/Dockerfile` - Dev image
- `frontend/Dockerfile.prod` - Production image + nginx
- `Makefile` - פקודות נוחות

#### Services:
1. **postgres** - PostgreSQL 15 Alpine
   - Port: 5432
   - Volume: postgres_data (persistent)
   - Healthcheck: מוודא שה-DB מוכן

2. **backend** - Node.js + Express API
   - Port: 3000
   - Hot reload: volume mount על src/
   - תלוי ב-postgres healthcheck

3. **frontend** - Vite + React
   - Port: 5173
   - Hot reload: volume mount על src/
   - Proxy ל-backend דרך Vite config

## 📊 Queries חשובים

### חישוב כמה כסף יצא מקופה
```sql
SELECT COALESCE(SUM(amount), 0)
FROM reimbursements
WHERE fund_id = ?
AND status IN ('approved', 'paid');
```

### חישוב כמה כסף מתוכנן
```sql
SELECT COALESCE(SUM(amount), 0)
FROM planned_expenses
WHERE fund_id = ?
AND status = 'planned';
```

### כמה כסף זמין בקופה
```sql
allocated_amount -
(SELECT spent) -
(SELECT planned)
```

### רשימת החזרים לתשלום
```sql
SELECT r.*, u.full_name, u.email, f.name as fund_name
FROM reimbursements r
JOIN users u ON r.user_id = u.id
JOIN funds f ON r.fund_id = f.id
WHERE r.status = 'approved'
ORDER BY r.reviewed_at ASC;
```

## 🐛 Debugging Tips

### בעיות נפוצות

**1. "Token invalid"**
- בדוק שה-JWT_SECRET זהה בין backend ל-frontend
- בדוק שהטוקן נשמר ב-localStorage
- בדוק expiration time

**2. "Cannot read budgets"**
- בדוק הרשאות משתמש (is_circle_treasurer, is_group_treasurer)
- בדוק ש-group_id נכון
- בדוק את ה-WHERE conditions ב-query

**3. "Fund available amount is negative"**
- בדוק שסכום הקצאות קופות לא עובר את total_amount של התקציב
- בדוק חישוב spent_amount ו-planned_amount

**4. Migration fails**
- בדוק שהטבלאות רצות בסדר הנכון (groups → users → budgets → funds...)
- בדוק foreign key constraints

## 🎯 הרחבות עתידיות אפשריות

### תכונות שלא מומשו אך ניתן להוסיף:

1. **העלאת קבלות:**
   - שילוב עם Cloudinary/S3
   - שמירת URL ב-receipt_url

2. **התראות:**
   - Email/SMS כשבקשת החזר אושרה
   - התראה לגזבר על בקשה חדשה

3. **היסטוריה ו-Audit Log:**
   - מעקב אחר כל שינוי בתקציב
   - מי עשה מה ומתי

4. **דוחות מתקדמים:**
   - Excel export
   - גרפים וויזואליזציות
   - דוחות לפי קטגוריות

5. **תקציב רב-שנתי:**
   - השוואות בין שנים
   - תקציב מתוכנן vs. בפועל

6. **אפליקציית mobile:**
   - React Native
   - צילום קבלות ישירות

7. **Webhooks:**
   - שילוב עם מערכות חיצוניות
   - סנכרון עם בנק

## 📝 הערות חשובות

1. **Security:**
   - כל הסיסמאות מוצפנות עם bcrypt
   - JWT tokens פגים אחרי 7 ימים (ניתן לשנות)
   - Middleware בודק הרשאות לפני כל פעולה

2. **Performance:**
   - Indexes על כל foreign keys
   - Indexes על שדות מסוננים (status, dates)
   - Connection pooling ב-PostgreSQL

3. **Data Integrity:**
   - Foreign key constraints
   - CHECK constraints (amounts >= 0)
   - Transaction support להעברות תקציב

4. **RTL Support:**
   - כל ה-Frontend ב-RTL (עברית)
   - `dir="rtl"` ב-HTML
   - CSS מותאם

## 🔗 משאבים נוספים

- [Express.js Docs](https://expressjs.com/)
- [React Docs](https://react.dev/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [JWT.io](https://jwt.io/)
- [Render Docs](https://render.com/docs)

---

**נוצר על ידי Claude Code**
תאריך: אוקטובר 2025
גרסה: 1.0.0
