# מערכת ניהול תקציב להתאגדות שיתופית

מערכת ניהול תקציב מתקדמת עבור מעגל שיתופי וקבוצות. המערכת מאפשרת ניהול תקציבים, קופות, תכנונים, החזרים והכנסות.

## 🎯 תכונות

### גזבר מעגלי
- ניהול תקציב כולל של המעגל
- חלוקת תקציב לקופות מעגליות
- העברת תקציבים לקבוצות
- אישור/דחיית בקשות החזר
- דוחות ורשימות תשלום

### גזבר קבוצתי
- ניהול תקציב הקבוצה
- חלוקה לקופות קבוצתיות
- אישור בקשות החזר של חברי הקבוצה

### חבר מעגל/קבוצה
- רישום תכנונים (הוצאות עתידיות)
- הגשת בקשות להחזר
- רישום הכנסות
- מעקב אחר סטטוס בקשות

## 🗄️ מבנה Database

המערכת כוללת 8 טבלאות:
1. **groups** - קבוצות במעגל
2. **users** - משתמשים (חברים וגזברים)
3. **budgets** - תקציבים (מעגליים וקבוצתיים)
4. **funds** - קופות (חלוקת תקציב)
5. **planned_expenses** - תכנונים עתידיים
6. **reimbursements** - בקשות החזר
7. **incomes** - הכנסות
8. **budget_transfers** - העברות תקציב

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

| תפקיד | אימייל | סיסמה |
|------|--------|-------|
| גזבר מעגלי | treasurer@circle.com | password123 |
| גזבר קבוצה (צפון) | treasurer@north.com | password123 |
| גזבר קבוצה (מרכז) | treasurer@center.com | password123 |
| חבר | member1@circle.com | password123 |

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
- `GET /api/funds?budgetId=X` - רשימת קופות
- `POST /api/funds` - יצירת קופה (גזבר)
- `PATCH /api/funds/:id` - עדכון קופה
- `DELETE /api/funds/:id` - מחיקת קופה

### Planned Expenses
- `GET /api/planned-expenses` - רשימת תכנונים
- `POST /api/planned-expenses` - יצירת תכנון
- `PATCH /api/planned-expenses/:id` - עדכון תכנון
- `DELETE /api/planned-expenses/:id` - מחיקת תכנון

### Reimbursements
- `GET /api/reimbursements` - רשימת החזרים
- `POST /api/reimbursements` - יצירת בקשת החזר
- `POST /api/reimbursements/:id/approve` - אישור (גזבר)
- `POST /api/reimbursements/:id/reject` - דחייה (גזבר)
- `POST /api/reimbursements/:id/paid` - סימון כשולם (גזבר)

### Incomes
- `GET /api/incomes` - רשימת הכנסות
- `POST /api/incomes` - רישום הכנסה
- `DELETE /api/incomes/:id` - מחיקת הכנסה

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
- React Router
- Axios
- Vite

## 📝 רישיון

MIT

## 🤝 תרומה

Pull requests מתקבלים בברכה! לשינויים גדולים, אנא פתח issue קודם.

## 📧 יצירת קשר

לשאלות ותמיכה, פתח issue בגיטהאב.
