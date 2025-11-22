# מערכת ניהול תקציב להתאגדות שיתופית

מערכת ניהול תקציב מתקדמת עבור מעגל שיתופי וקבוצות. המערכת מאפשרת ניהול תקציבים, סעיפים, תכנונים, החזרים והכנסות.

## 🎯 תכונות

### גזבר מעגלי
- ניהול תקציב כולל של המעגל
- חלוקת תקציב לסעיפים מעגליים
- העברת תקציבים לקבוצות
- אישור/דחיית בקשות החזר (דף "אישור החזרים")
- ביצוע העברות תשלום (דף "העברות")
- ניהול משתמשים וקבוצות
- דוחות ורשימות תשלום

### גזבר קבוצתי
- ניהול תקציב הקבוצה
- חלוקה לסעיפים קבוצתיים
- אישור בקשות החזר של חברי הקבוצה (דף "אישור החזרים")
- ביצוע העברות תשלום לחברי הקבוצה (דף "העברות")

### חבר מעגל/קבוצה
- רישום תכנונים (הוצאות עתידיות)
- הגשת בקשות להחזר (כולל בשם אחרים)
- הגשת חיובים (חובות למעגל)
- רישום הכנסות
- מעקב אחר סטטוס בקשות
- עריכה ומחיקה של בקשות ממתינות
- צפייה בסיכום תשלומים (החזרים - חיובים)

### תכונות מתקדמות
- **בקרת גישה לסעיפים**: סעיפים מעגליים זמינים לכולם, סעיפים קבוצתיים רק לחברי הקבוצה
- **החזרים בשם אחרים**: אפשרות לשלוח תשלום למקבל שונה מהמגיש
- **ניהול חיובים**: מעקב אחר חובות שמקוזזים מההחזרים
- **סיכום תשלומים**: חישוב אוטומטי של נטו לתשלום (החזרים - חיובים)
- **הגשה מהירה**: כפתורי הגשה ישירה מדפי הסעיפים
- **העברות תשלום אוטומטיות**: קיבוץ אוטומטי של החזרים מאושרים לפי מקבל וסוג תקציב לביצוע יעיל של תשלומים

### דפי גזבר

המערכת כוללת שני דפים נפרדים לגזברים:

#### 1. אישור החזרים (Reimbursement Approval)
דף לסקירה ואישור בקשות החזר:
- ארבעה סטטוסים: ממתין לאישור, לבדיקה, אושר, נדחה
- פעולות אצווה (אישור/דחייה מרובה)
- סימון לבדיקה והחזרה לממתין
- מעבר לדף "העברות" לביצוע תשלומים

#### 2. העברות (Payment Transfers)
דף לביצוע העברות תשלום:
- קיבוץ אוטומטי של החזרים מאושרים לפי מקבל וסוג תקציב
- שני טאבים: ממתינות לביצוע ובוצעו
- ביצוע העברה מסמן אוטומטית את כל ההחזרים כ"שולם"
- מעקב מלא: מי ביצע, מתי, וכמה
- הפרדה בין תקציבים מעגליים וקבוצתיים
- בקרת גישה: גזבר מעגלי רואה רק העברות מעגליות, גזבר קבוצתי רואה רק העברות של הקבוצה שלו

## 🗄️ מבנה Database

המערכת כוללת 11 טבלאות:
1. **groups** - קבוצות במעגל
2. **users** - משתמשים (חברים וגזברים)
3. **user_groups** - קשרים רבים-לרבים בין משתמשים לקבוצות
4. **budgets** - תקציבים (מעגליים וקבוצתיים)
5. **funds** - סעיפים (חלוקת תקציב)
6. **planned_expenses** - תכנונים עתידיים
7. **reimbursements** - בקשות החזר (כולל שדה recipient_user_id ו-payment_transfer_id)
8. **payment_transfers** - העברות תשלום (קיבוץ החזרים מאושרים לפי מקבל וסוג תקציב)
9. **charges** - חיובים (חובות למעגל/קבוצה)
10. **incomes** - הכנסות
11. **budget_transfers** - העברות תקציב

## 🚀 התחלה

### דרישות מקדימות
- **Docker** + **Docker Compose** (מומלץ - הדרך הקלה ביותר!)
- או: Node.js 18+ + PostgreSQL 14+ (להרצה ללא Docker)

---

## 🐳 הרצה עם Docker (מומלץ!)

### התקנה מהירה - 3 פקודות בלבד!

1. **Clone הפרויקט:**
\`\`\`bash
git clone <repository-url>
cd budgetAPP
\`\`\`

2. **הפעלת הסביבה:**
\`\`\`bash
docker-compose up -d
\`\`\`

3. **אתחול מסד נתונים (פעם אחת):**

**Windows:**
\`\`\`bash
scripts\init-dev.bat
\`\`\`

**Mac/Linux:**
\`\`\`bash
chmod +x scripts/init-dev.sh
./scripts/init-dev.sh
\`\`\`

או ידנית:
\`\`\`bash
docker-compose exec backend npm run migrate
docker-compose exec backend npm run seed
\`\`\`

**זהו! המערכת רצה! 🎉**
- Frontend: http://localhost:3456
- Backend: http://localhost:4567

### פקודות Docker שימושיות

\`\`\`bash
# הצגת logs
docker-compose logs -f

# logs של שרת ספציפי
docker-compose logs -f backend
docker-compose logs -f frontend

# עצירת הכל
docker-compose down

# הרצה מחדש
docker-compose restart

# בניה מחדש (אחרי שינויים ב-dependencies)
docker-compose down
docker-compose build
docker-compose up -d

# ניקוי מלא (כולל volumes)
docker-compose down -v

# פתיחת shell בקונטיינר
docker-compose exec backend sh
docker-compose exec frontend sh

# חיבור ל-PostgreSQL
docker-compose exec postgres psql -U budget_app_user -d budget_app
\`\`\`

### שימוש ב-Makefile (מומלץ!)

אם יש לך `make` מותקן (Mac/Linux, או Windows עם Git Bash/WSL):

\`\`\`bash
make help          # הצג כל הפקודות
make dev           # הפעל סביבת פיתוח
make logs          # הצג logs
make migrate       # הרץ migrations
make seed          # seed database
make db-setup      # migrate + seed ביחד
make down          # עצור הכל
make clean         # ניקוי מלא
make rebuild       # בניה מחדש
\`\`\`

---

## 💻 הרצה ללא Docker (Manual Setup)

### דרישות
- Node.js 18+
- PostgreSQL 14+
- npm או yarn

### שלבים

1. **Clone הפרויקט:**
\`\`\`bash
git clone <repository-url>
cd budgetAPP
\`\`\`

2. **התקנת dependencies:**
\`\`\`bash
npm install
\`\`\`

3. **הגדרת PostgreSQL:**
צור מסד נתונים חדש:
\`\`\`sql
CREATE DATABASE budget_app;
CREATE USER budget_app_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE budget_app TO budget_app_user;
\`\`\`

4. **הגדרת משתני סביבה:**
ערוך את הקובץ `backend/.env`:
\`\`\`env
NODE_ENV=development
PORT=4567

# PostgreSQL
PGHOST=localhost
PGPORT=5433
PGDATABASE=budget_app
PGUSER=budget_app_user
PGPASSWORD=your_password

# JWT
JWT_SECRET=your-very-secret-key-change-this
JWT_EXPIRES_IN=7d
\`\`\`

5. **הרצת migrations ו-seed:**
\`\`\`bash
cd backend
npm run migrate
npm run seed
\`\`\`

6. **הפעלת הפרויקט:**

Terminal 1 - Backend:
\`\`\`bash
cd backend
npm run dev
\`\`\`

Terminal 2 - Frontend:
\`\`\`bash
cd frontend
npm run dev
\`\`\`

7. **פתיחת הדפדפן:**
גש ל-http://localhost:3456

## 👥 חשבונות לדוגמה

לאחר הרצת ה-seed, ניתן להיכנס עם:

| תפקיד | אימייל | סיסמה | קבוצות |
|------|--------|-------|--------|
| גזבר מעגלי | treasurer@circle.com | password123 | - |
| גזבר קבוצה (צפון) | treasurer@north.com | password123 | צפון |
| גזבר קבוצה (מרכז) | treasurer@center.com | password123 | מרכז |
| חבר | member1@circle.com | password123 | צפון |
| חבר | member2@circle.com | password123 | מרכז |
| חבר | member3@circle.com | password123 | צפון, מרכז |

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - הרשמה
- `POST /api/auth/login` - התחברות
- `GET /api/auth/me` - קבלת פרטי משתמש

### Budgets
- `GET /api/budgets` - רשימת תקציבים
- `POST /api/budgets` - יצירת תקציב (גזבר מעגלי)
- `PATCH /api/budgets/:id` - עדכון תקציב
- `POST /api/budgets/transfer` - העברת תקציב

### Funds
- `GET /api/funds?budgetId=X` - רשימת סעיפים
- `POST /api/funds` - יצירת סעיף (גזבר)
- `PATCH /api/funds/:id` - עדכון סעיף
- `DELETE /api/funds/:id` - מחיקת סעיף

### Planned Expenses
- `GET /api/planned-expenses` - רשימת תכנונים
- `POST /api/planned-expenses` - יצירת תכנון
- `PATCH /api/planned-expenses/:id` - עדכון תכנון
- `DELETE /api/planned-expenses/:id` - מחיקת תכנון

### Reimbursements
- `GET /api/reimbursements` - רשימת החזרים
- `GET /api/reimbursements/my` - ההחזרים שלי (כמגיש או מקבל)
- `GET /api/reimbursements/my/summary` - סיכום תשלומים (החזרים - חיובים)
- `GET /api/reimbursements/treasurer/all` - כל ההחזרים מקובצים לפי סטטוס (גזבר, מסונן לפי סוג תקציב)
- `POST /api/reimbursements` - יצירת בקשת החזר (כולל recipientUserId אופציונלי)
- `PATCH /api/reimbursements/:id` - עדכון בקשה (רק ממתינות)
- `DELETE /api/reimbursements/:id` - מחיקת בקשה (רק ממתינות)
- `POST /api/reimbursements/:id/mark-review` - סימון לבדיקה (גזבר)
- `POST /api/reimbursements/:id/return-to-pending` - החזרה לממתין (גזבר)
- `POST /api/reimbursements/batch/approve` - אישור אצווה (גזבר, משייך להעברת תשלום)
- `POST /api/reimbursements/batch/reject` - דחייה אצווה (גזבר)
- `POST /api/reimbursements/batch/mark-review` - סימון אצווה לבדיקה (גזבר)

### Payment Transfers (חדש!)
- `GET /api/payment-transfers` - רשימת העברות תשלום (עם בקרת גישה לפי סוג תקציב)
- `GET /api/payment-transfers/stats` - סטטיסטיקות העברות (ספירות וסכומים)
- `GET /api/payment-transfers/:id` - פרטי העברה עם כל ההחזרים המשויכים
- `POST /api/payment-transfers/:id/execute` - ביצוע העברת תשלום (מסמן את כל ההחזרים כשולם)

### Charges (חדש!)
- `GET /api/charges/my` - החיובים שלי
- `POST /api/charges` - יצירת חיוב חדש
- `PATCH /api/charges/:id` - עדכון חיוב (רק פעילים)
- `DELETE /api/charges/:id` - מחיקת חיוב (רק פעילים)

### Funds
- `GET /api/funds` - רשימת סעיפים
- `GET /api/funds/accessible` - סעיפים נגישים (מקובצים לפי תקציב עם בקרת גישה)
- `POST /api/funds` - יצירת סעיף (גזבר)
- `PATCH /api/funds/:id` - עדכון סעיף
- `DELETE /api/funds/:id` - מחיקת סעיף

### Incomes
- `GET /api/incomes` - רשימת הכנסות
- `POST /api/incomes` - רישום הכנסה
- `DELETE /api/incomes/:id` - מחיקת הכנסה

### Users & Groups
- `GET /api/users` - רשימת משתמשים (גזבר מעגלי)
- `POST /api/users` - יצירת משתמש (גזבר מעגלי)
- `PATCH /api/users/:id` - עדכון משתמש (גזבר מעגלי)
- `DELETE /api/users/:id` - מחיקת משתמש (גזבר מעגלי)
- `GET /api/groups` - רשימת קבוצות
- `POST /api/groups` - יצירת קבוצה (גזבר מעגלי)
- `PATCH /api/groups/:id` - עדכון קבוצה (גזבר מעגלי)
- `DELETE /api/groups/:id` - מחיקת קבוצה (גזבר מעגלי)

### Reports
- `GET /api/reports/dashboard` - דשבורד מותאם אישית
- `GET /api/reports/payments` - רשימת תשלומים (גזבר)
- `GET /api/reports/budget/:id` - דוח תקציב מפורט

## 🌐 Deployment ל-Render

1. צור חשבון ב-[Render](https://render.com)
2. חבר את ה-repository
3. Render יזהה את קובץ \`render.yaml\` ויקים:
   - PostgreSQL database
   - Backend API service
   - Frontend static site
4. הגדר את משתני הסביבה (JWT_SECRET יווצר אוטומטית)
5. לאחר ה-deployment, הרץ migrations:
\`\`\`bash
# דרך Render Shell
cd backend && npm run migrate && npm run seed
\`\`\`

## 🛠️ טכנולוגיות

**Backend:**
- Node.js + Express
- TypeScript
- PostgreSQL
- JWT Authentication
- bcrypt

**Frontend:**
- React 18
- TypeScript
- React Router v6
- Axios
- Vite
- Context API (AuthContext)

## 📝 רישיון

MIT

## 🤝 תרומה

Pull requests מתקבלים בברכה! לשינויים גדולים, אנא פתח issue קודם.

## 📧 יצירת קשר

לשאלות ותמיכה, פתח issue בגיטהאב.
