# מסמך תכנון - שיפור מעקב הכנסות

## סקירה כללית

מסמך זה מתאר את התכנון הטכני למערכת מעקב הכנסות משופרת עבור גזברית המעגל. המערכת תרחיב את יכולות מעקב ההכנסות הקיימות ותוסיף תכונות של תכנון הכנסות צפויות, קטגוריזציה, והשוואה בין צפוי לבפועל.

### מטרות עיקריות
- הרחבת מודל ההכנסות הקיים לתמיכה בהכנסות צפויות ובפועל
- הוספת מערכת קטגוריות גמישה להכנסות
- מתן כלים לתכנון הכנסות שנתי וחודשי
- יצירת דשבורד להשוואה בין הכנסות צפויות לבפועל
- שמירה על תאימות עם מבנה המערכת הקיים

## ארכיטקטורה

### מבנה כללי

המערכת תבנה על בסיס הארכיטקטורה הקיימת:
- **Backend**: Node.js + Express + TypeScript + PostgreSQL
- **Frontend**: React + TypeScript + Vite
- **Authentication**: JWT-based עם role-based access control

### שכבות המערכת

```
┌─────────────────────────────────────────┐
│         Frontend (React)                │
│  ┌────────────────────────────────────┐ │
│  │  Pages: Incomes, IncomeCategories, │ │
│  │  IncomePlanning, IncomeDashboard   │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  Components: IncomeTable,          │ │
│  │  CategoryManager, MonthNavigator   │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                    │
                    │ REST API
                    ▼
┌─────────────────────────────────────────┐
│         Backend (Express)               │
│  ┌────────────────────────────────────┐ │
│  │  Routes: /api/incomes/*,           │ │
│  │  /api/income-categories/*,         │ │
│  │  /api/expected-incomes/*           │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  Controllers: incomeController,    │ │
│  │  incomeCategoryController,         │ │
│  │  expectedIncomeController          │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  Middleware: auth, accessControl   │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│         Database (PostgreSQL)           │
│  - incomes (existing, enhanced)         │
│  - income_categories (new)              │
│  - income_category_assignments (new)    │
│  - expected_incomes (new)               │
└─────────────────────────────────────────┘
```

## רכיבים וממשקים

### 1. מודלים ומבני נתונים

#### 1.1 טבלת incomes (קיימת - שיפורים)

הטבלה הקיימת תישאר כמעט ללא שינוי, אך נוסיף שדה לזיהוי סוג מקור:

```sql
-- Existing table structure (no changes needed)
CREATE TABLE incomes (
  id SERIAL PRIMARY KEY,
  budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  source VARCHAR(255) NOT NULL,  -- Will store user name or "מקור אחר"
  description TEXT,
  income_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**הערה**: השדה `source` הקיים יכיל:
- שם מלא של חבר (אם מקור ההכנסה הוא חבר)
- המחרוזת "מקור אחר" (אם מקור ההכנסה אינו חבר)

#### 1.2 טבלת income_categories (חדשה)

```sql
CREATE TABLE income_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7),  -- Hex color code (e.g., #FF5733)
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_income_categories_name ON income_categories(name);
```

#### 1.3 טבלת income_category_assignments (חדשה)

טבלת קשר many-to-many בין הכנסות לקטגוריות:

```sql
CREATE TABLE income_category_assignments (
  income_id INTEGER REFERENCES incomes(id) ON DELETE CASCADE NOT NULL,
  category_id INTEGER REFERENCES income_categories(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (income_id, category_id)
);

CREATE INDEX idx_income_category_income ON income_category_assignments(income_id);
CREATE INDEX idx_income_category_category ON income_category_assignments(category_id);
```

#### 1.4 טבלת expected_incomes (חדשה)

```sql
CREATE TABLE expected_incomes (
  id SERIAL PRIMARY KEY,
  budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES users(id),  -- NULL for "מקור אחר"
  source_name VARCHAR(255) NOT NULL,  -- User name or "מקור אחר"
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('one-time', 'monthly', 'quarterly', 'annual')),
  parent_annual_id INTEGER REFERENCES expected_incomes(id) ON DELETE CASCADE,  -- For monthly breakdown
  is_manual BOOLEAN DEFAULT false,  -- true if manually added, false if from annual planning
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_expected_incomes_budget ON expected_incomes(budget_id);
CREATE INDEX idx_expected_incomes_user ON expected_incomes(user_id);
CREATE INDEX idx_expected_incomes_year_month ON expected_incomes(year, month);
CREATE INDEX idx_expected_incomes_parent ON expected_incomes(parent_annual_id);
```

**הסבר שדות**:
- `user_id`: NULL אם המקור הוא "מקור אחר", אחרת מזהה החבר
- `source_name`: שם החבר או "מקור אחר" (לתצוגה)
- `frequency`: תדירות ההכנסה (חד-פעמי, חודשי, רבעוני, שנתי)
- `parent_annual_id`: קישור להכנסה שנתית שממנה נוצרה הכנסה חודשית
- `is_manual`: האם נוספה ידנית או נוצרה אוטומטית מתכנון שנתי

#### 1.5 טבלת expected_income_category_assignments (חדשה)

```sql
CREATE TABLE expected_income_category_assignments (
  expected_income_id INTEGER REFERENCES expected_incomes(id) ON DELETE CASCADE NOT NULL,
  category_id INTEGER REFERENCES income_categories(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (expected_income_id, category_id)
);

CREATE INDEX idx_expected_income_category_income ON expected_income_category_assignments(expected_income_id);
CREATE INDEX idx_expected_income_category_category ON expected_income_category_assignments(category_id);
```

### 2. TypeScript Interfaces

```typescript
// Enhanced Income interface
export interface Income {
  id: number;
  budget_id: number;
  user_id: number;
  amount: number;
  source: string;  // User name or "מקור אחר"
  description?: string;
  income_date: Date;
  created_at: Date;
  
  // Joined fields
  user_name?: string;
  budget_name?: string;
  categories?: IncomeCategory[];
}

// New interfaces
export interface IncomeCategory {
  id: number;
  name: string;
  description?: string;
  color?: string;
  created_by?: number;
  created_at: Date;
  updated_at: Date;
  
  // Joined fields
  income_count?: number;  // Number of incomes with this category
}

export interface ExpectedIncome {
  id: number;
  budget_id: number;
  user_id?: number;
  source_name: string;
  amount: number;
  description?: string;
  year: number;
  month: number;
  frequency: 'one-time' | 'monthly' | 'quarterly' | 'annual';
  parent_annual_id?: number;
  is_manual: boolean;
  created_by: number;
  created_at: Date;
  updated_at: Date;
  
  // Joined fields
  budget_name?: string;
  categories?: IncomeCategory[];
}

export interface IncomeComparison {
  source_name: string;
  user_id?: number;
  expected_amount: number;
  actual_amount: number;
  difference: number;
  percentage: number;  // (actual / expected) * 100
  status: 'not-received' | 'partial' | 'full' | 'exceeded';
  categories?: IncomeCategory[];
}

export interface MonthlyIncomeSummary {
  year: number;
  month: number;
  total_expected: number;
  total_actual: number;
  difference: number;
  fulfillment_percentage: number;
  by_category?: {
    category_id: number;
    category_name: string;
    expected: number;
    actual: number;
  }[];
  by_source?: IncomeComparison[];
}
```

### 3. API Endpoints

#### 3.1 Income Categories Management

```
GET    /api/income-categories              - Get all categories
POST   /api/income-categories              - Create new category (treasurer only)
PATCH  /api/income-categories/:id          - Update category (treasurer only)
DELETE /api/income-categories/:id          - Delete category (treasurer only)
```

#### 3.2 Actual Incomes (Enhanced)

```
GET    /api/incomes                        - Get all incomes (with filters)
GET    /api/incomes/:id                    - Get single income
POST   /api/incomes                        - Create income (treasurer only)
PATCH  /api/incomes/:id                    - Update income (treasurer only)
DELETE /api/incomes/:id                    - Delete income (treasurer only)
POST   /api/incomes/:id/categories         - Assign categories to income
DELETE /api/incomes/:id/categories/:catId  - Remove category from income
```

**Query parameters for GET /api/incomes**:
- `budgetId`: Filter by budget
- `startDate`, `endDate`: Date range filter
- `source`: Filter by source (user name or "מקור אחר")
- `categoryId`: Filter by category
- `year`, `month`: Filter by specific month

#### 3.3 Expected Incomes

```
GET    /api/expected-incomes                    - Get expected incomes (with filters)
GET    /api/expected-incomes/:id                - Get single expected income
POST   /api/expected-incomes/annual             - Create annual planning (treasurer only)
POST   /api/expected-incomes/monthly            - Create monthly expected income (treasurer only)
PATCH  /api/expected-incomes/:id                - Update expected income (treasurer only)
DELETE /api/expected-incomes/:id                - Delete expected income (treasurer only)
POST   /api/expected-incomes/:id/categories     - Assign categories
DELETE /api/expected-incomes/:id/categories/:catId - Remove category
```

**Query parameters for GET /api/expected-incomes**:
- `budgetId`: Filter by budget
- `year`, `month`: Filter by specific month
- `year`: Filter by year (for annual view)
- `source`: Filter by source
- `categoryId`: Filter by category
- `frequency`: Filter by frequency type

#### 3.4 Income Comparison & Dashboard

```
GET /api/incomes/comparison/monthly/:year/:month  - Get monthly comparison
GET /api/incomes/dashboard/summary               - Get dashboard summary for current month
```

### 4. Controllers Logic

#### 4.1 incomeCategoryController

**createCategory**:
- Validate treasurer permission
- Check for duplicate name
- Insert into income_categories
- Return created category

**updateCategory**:
- Validate treasurer permission
- Check category exists
- Update name, description, color
- Return updated category

**deleteCategory**:
- Validate treasurer permission
- Check if category is assigned to incomes
- If assigned, show count and require confirmation
- Delete category (cascade will remove assignments)

#### 4.2 incomeController (Enhanced)

**getIncomes**:
- Support multiple filters (date range, source, category)
- Join with income_category_assignments and income_categories
- Return incomes with categories array

**createIncome**:
- Validate treasurer permission
- Validate amount > 0
- Insert income
- If categories provided, insert assignments
- Return created income with categories

**updateIncome**:
- Validate treasurer permission
- Update income fields
- Return updated income

**assignCategories**:
- Validate treasurer permission
- Insert into income_category_assignments
- Handle duplicates gracefully

#### 4.3 expectedIncomeController

**createAnnualPlanning**:
- Validate treasurer permission
- Validate input (amount, frequency, year)
- Insert parent expected income record
- If frequency is monthly: create 12 child records (one per month)
- If frequency is quarterly: create 4 child records
- If frequency is one-time: create single record for specified month
- If categories provided, assign to all created records
- Return created records

**createMonthlyExpectedIncome**:
- Validate treasurer permission
- Set is_manual = true
- Insert expected income for specific month
- Assign categories if provided
- Return created record

**updateExpectedIncome**:
- Validate treasurer permission
- If is_manual = false (from annual planning):
  - Only allow updating amount for specific month
  - Mark as "modified from annual"
- If is_manual = true:
  - Allow full update
- Return updated record

**deleteExpectedIncome**:
- Validate treasurer permission
- If is_manual = false:
  - Show warning that only this month will be deleted
- Delete record (cascade will handle children if parent)

**getMonthlyComparison**:
- Get all expected incomes for month
- Get all actual incomes for month
- Group by source_name
- Calculate differences and percentages
- Determine status (not-received, partial, full, exceeded)
- Return comparison array

## מודלים נוספים

### 5. Access Control

**הרשאות לפי תפקיד**:

| תפקיד | צפייה בהכנסות | יצירה/עריכה | מחיקה | ניהול קטגוריות | תכנון הכנסות |
|-------|---------------|-------------|-------|----------------|--------------|
| גזברית מעגל | כל ההכנסות | ✓ | ✓ | ✓ | ✓ |
| גזברית קבוצה | כל ההכנסות (קריאה בלבד) | ✗ | ✗ | ✗ | ✗ |
| חבר מעגל/קבוצה | רק הכנסות שלו | ✗ | ✗ | ✗ | ✗ |

**מימוש**:
- שימוש ב-middleware `requireCircleTreasurer` לפעולות כתיבה
- סינון בשאילתות SQL לפי `user_id` עבור חברים רגילים
- גזברית קבוצה תקבל גישת קריאה בלבד

### 6. Business Logic

#### 6.1 תכנון שנתי - חלוקה אוטומטית

**חודשי (monthly)**:
```typescript
const monthlyAmount = annualAmount / 12;
for (let month = 1; month <= 12; month++) {
  createExpectedIncome({
    ...baseData,
    month,
    amount: monthlyAmount,
    parent_annual_id: parentId,
    is_manual: false
  });
}
```

**רבעוני (quarterly)**:
```typescript
const quarterlyAmount = annualAmount / 4;
const quarterMonths = [1, 4, 7, 10];  // ינואר, אפריל, יולי, אוקטובר
for (const month of quarterMonths) {
  createExpectedIncome({
    ...baseData,
    month,
    amount: quarterlyAmount,
    parent_annual_id: parentId,
    is_manual: false
  });
}
```

#### 6.2 חישוב סטטוס השוואה

```typescript
function calculateComparisonStatus(expected: number, actual: number): string {
  if (actual === 0) return 'not-received';
  const percentage = (actual / expected) * 100;
  if (percentage < 50) return 'partial';
  if (percentage >= 50 && percentage < 100) return 'partial';
  if (percentage === 100) return 'full';
  return 'exceeded';
}
```

#### 6.3 צבעי סטטוס

```typescript
const statusColors = {
  'not-received': '#EF4444',    // אדום
  'partial': '#F59E0B',         // כתום
  'full': '#10B981',            // ירוק
  'exceeded': '#10B981'         // ירוק
};
```

## רכיבי Frontend

### 1. Pages

#### 1.1 Incomes.tsx (דף יחיד מרכזי)

**מיקום**: `frontend/src/pages/Incomes.tsx`

**מבנה הדף - סגנון אחד מעל השני (כמו Payments.tsx)**:

הדף יכלול את כל הסעיפים הבאים בגלילה אנכית, עם כותרות וקווי הפרדה:

**1. כותרת ראשית וכפתורי פעולה**
- כותרת: "הכנסות"
- כפתורים: "הוסף הכנסה" | "נהל קטגוריות" (גזברית בלבד)

**2. סעיף: הכנסות בפועל**
- כותרת משנה: "הכנסות בפועל"
- סינון: תאריך (מ-עד), מקור, קטגוריה
- טבלה של כל ההכנסות בפועל
- מיון לפי כל עמודה
- עריכה ומחיקה של הכנסות (גזברית בלבד)

**3. סעיף: תכנון הכנסות שנתי**
- כותרת משנה: "תכנון הכנסות שנתי"
- בחירת שנה (dropdown)
- כפתור "הוסף הכנסה צפויה שנתית"
- טבלה של הכנסות צפויות שנתיות
- עמודות: מקור, סכום שנתי, תדירות, תיאור, קטגוריות, פעולות

**4. סעיף: תכנון הכנסות חודשי**
- כותרת משנה: "תכנון הכנסות חודשי"
- ניווט חודשים (MonthNavigator)
- כפתור "הוסף הכנסה צפויה לחודש זה"
- טבלה של הכנסות צפויות לחודש הנבחר
- סימון ויזואלי: הכנסות אוטומטיות (מתכנון שנתי) vs ידניות
- עריכה ומחיקה

**5. סעיף: השוואה צפוי מול בפועל**
- כותרת משנה: "השוואה - צפוי מול בפועל"
- ניווט חודשים
- קארד סיכום:
  - סך הכנסות צפויות
  - סך הכנסות בפועל
  - פער
  - אחוז התממשות
- סינון: קטגוריה, מקור
- טבלת השוואה מפורטת:
  - מקור הכנסה
  - סכום צפוי
  - סכום בפועל
  - פער
  - סטטוס (צבעוני: אדום/כתום/ירוק)

**State**:
```typescript
const [incomes, setIncomes] = useState<Income[]>([]);
const [expectedIncomes, setExpectedIncomes] = useState<ExpectedIncome[]>([]);
const [categories, setCategories] = useState<IncomeCategory[]>([]);
const [actualFilters, setActualFilters] = useState({
  startDate: '',
  endDate: '',
  source: '',
  categoryId: null
});
const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
const [comparisonMonth, setComparisonMonth] = useState({
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1
});
const [planningMonth, setPlanningMonth] = useState({
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1
});
const [comparison, setComparison] = useState<MonthlyIncomeSummary | null>(null);
const [showCategoryModal, setShowCategoryModal] = useState(false);
const [showIncomeModal, setShowIncomeModal] = useState(false);
const [showExpectedIncomeModal, setShowExpectedIncomeModal] = useState(false);
```

**הערה**: הסגנון דומה לדף Payments.tsx - כל הסעיפים בדף אחד עם גלילה, ללא טאבים.

### 2. Components

#### 2.1 IncomeTable.tsx

טבלה מתקדמת להצגת הכנסות עם:
- מיון לפי עמודות
- סינון
- תצוגת קטגוריות (badges צבעוניים)
- פעולות עריכה/מחיקה

#### 2.2 IncomeFormModal.tsx

מודאל לטופס הוספה/עריכה של הכנסה:
- שדות: סכום, תאריך, תיאור
- בחירת מקור: חבר (dropdown) או "מקור אחר"
- בחירת קטגוריות (multi-select)
- ולידציה

#### 2.3 CategoryManager.tsx

רכיב לניהול קטגוריות:
- רשימת קטגוריות עם אפשרות עריכה
- טופס הוספת קטגוריה
- בחירת צבע (color picker)
- אישור מחיקה עם הצגת מספר הכנסות

#### 2.4 ExpectedIncomeFormModal.tsx

מודאל לטופס הכנסה צפויה:
- שדות: סכום, תיאור, מקור
- בחירת תדירות (שנתי) או חודש ספציפי (חודשי)
- בחירת קטגוריות
- ולידציה

#### 2.5 ComparisonTable.tsx

טבלת השוואה עם:
- עמודות: מקור, צפוי, בפועל, פער, סטטוס
- צביעה לפי סטטוס
- סינון ומיון

#### 2.6 MonthNavigator.tsx (קיים - שימוש חוזר)

רכיב ניווט חודשים קיים במערכת, נשתמש בו גם כאן.

### 3. Services (API Client)

הרחבת `frontend/src/services/api.ts`:

```typescript
// Income Categories
export const getIncomeCategories = () => api.get('/income-categories');
export const createIncomeCategory = (data: any) => api.post('/income-categories', data);
export const updateIncomeCategory = (id: number, data: any) => api.patch(`/income-categories/${id}`, data);
export const deleteIncomeCategory = (id: number) => api.delete(`/income-categories/${id}`);

// Incomes (enhanced)
export const getIncomes = (params?: any) => api.get('/incomes', { params });
export const getIncome = (id: number) => api.get(`/incomes/${id}`);
export const createIncome = (data: any) => api.post('/incomes', data);
export const updateIncome = (id: number, data: any) => api.patch(`/incomes/${id}`, data);
export const deleteIncome = (id: number) => api.delete(`/incomes/${id}`);
export const assignIncomeCategories = (id: number, categoryIds: number[]) => 
  api.post(`/incomes/${id}/categories`, { categoryIds });

// Expected Incomes
export const getExpectedIncomes = (params?: any) => api.get('/expected-incomes', { params });
export const createAnnualExpectedIncome = (data: any) => api.post('/expected-incomes/annual', data);
export const createMonthlyExpectedIncome = (data: any) => api.post('/expected-incomes/monthly', data);
export const updateExpectedIncome = (id: number, data: any) => api.patch(`/expected-incomes/${id}`, data);
export const deleteExpectedIncome = (id: number) => api.delete(`/expected-incomes/${id}`);

// Comparison & Dashboard
export const getMonthlyComparison = (year: number, month: number) => 
  api.get(`/incomes/comparison/monthly/${year}/${month}`);
export const getIncomeDashboardSummary = () => api.get('/incomes/dashboard/summary');
```

## טיפול בשגיאות

### Backend Error Handling

```typescript
// Standard error responses
{
  error: string;           // Error message in Hebrew
  code?: string;          // Error code for client handling
  details?: any;          // Additional error details
}
```

**קודי שגיאה נפוצים**:
- `CATEGORY_IN_USE`: קטגוריה משויכת להכנסות
- `DUPLICATE_CATEGORY`: שם קטגוריה כבר קיים
- `INVALID_AMOUNT`: סכום לא תקין
- `INVALID_DATE`: תאריך לא תקין
- `UNAUTHORIZED`: אין הרשאה לפעולה

### Frontend Error Handling

- שימוש ב-Toast להצגת שגיאות
- הודעות שגיאה בעברית
- ולידציה בצד לקוח לפני שליחה לשרת



## שיקולי ביצועים

### Database Optimization

1. **Indexes**: כל הטבלאות כוללות indexes מתאימים
2. **Pagination**: הוספת pagination לרשימות ארוכות
3. **Caching**: שימוש ב-React Query לקאשינג בצד לקוח

### Frontend Optimization

1. **Lazy Loading**: טעינת דפים בצורה lazy
2. **Memoization**: שימוש ב-useMemo ו-useCallback
3. **Debouncing**: עבור חיפוש וסינון

## תאימות לאחור

- הטבלה `incomes` הקיימת לא משתנה במבנה
- ה-API הקיים (`GET /api/incomes`, `POST /api/incomes`, `DELETE /api/incomes/:id`) ימשיך לעבוד
- הוספת endpoints חדשים לא תשפיע על קוד קיים

## שלבי פריסה

1. **Phase 1**: Database migrations (טבלאות חדשות)
2. **Phase 2**: Backend API (controllers, routes)
3. **Phase 3**: Frontend components (רכיבים בסיסיים)
4. **Phase 4**: Frontend page (דף יחיד עם טאבים)
5. **Phase 5**: Integration & UI polish

## סיכום החלטות תכנון

1. **שימוש חוזר במבנה קיים**: הטבלה `incomes` נשארת כמעט ללא שינוי
2. **הפרדה בין בפועל לצפוי**: טבלאות נפרדות למעקב טוב יותר
3. **קטגוריות גמישות**: many-to-many relationship לתמיכה במספר קטגוריות
4. **תכנון היררכי**: parent-child relationship לתכנון שנתי וחודשי
5. **Access control**: הרשאות ברורות לפי תפקידים
6. **Hebrew-first**: כל הממשק והודעות בעברית
