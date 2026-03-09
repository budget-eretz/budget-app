import pool from '../config/database';
import bcrypt from 'bcrypt';

type SeedGroup = { name: string; description?: string };
type SeedUser = {
  email: string;
  fullName: string;
  phone?: string;
  role: 'admin' | 'circle_treasurer' | 'group_treasurer' | 'member';
  groupNames?: string[];
  forceGroupTreasurer?: boolean;
};

const groups: SeedGroup[] = [
  { name: 'קבוצה א', description: 'קבוצה שיתופית ראשונה' },
  { name: 'קבוצה ב', description: 'קבוצה שיתופית שנייה' },
  { name: 'קבוצה ג', description: 'קבוצה שיתופית שלישית' },
];

const users: SeedUser[] = [
  {
    email: 'gizbar@circle.com',
    fullName: 'גזברית מעגל',
    phone: '050-1111111',
    role: 'circle_treasurer',
  },
  {
    email: 'gizbar.a@circle.com',
    fullName: 'גזברית קבוצה א',
    phone: '050-2222222',
    role: 'group_treasurer',
    groupNames: ['קבוצה א'],
  },
  {
    email: 'gizbar.b@circle.com',
    fullName: 'גזבר קבוצה ב',
    phone: '050-3333333',
    role: 'group_treasurer',
    groupNames: ['קבוצה ב'],
  },
  {
    email: 'member1@circle.com',
    fullName: 'מיכל אברהם',
    phone: '050-4444444',
    role: 'member',
    groupNames: ['קבוצה א'],
  },
  {
    email: 'member2@circle.com',
    fullName: 'רועי דוד',
    phone: '050-5555555',
    role: 'member',
    groupNames: ['קבוצה א'],
  },
  {
    email: 'member3@circle.com',
    fullName: 'נועה שלום',
    phone: '050-6666666',
    role: 'member',
    groupNames: ['קבוצה ב'],
  },
  {
    email: 'member4@circle.com',
    fullName: 'עמית ברק',
    phone: '050-7777777',
    role: 'member',
    groupNames: ['קבוצה ג'],
  },
];

const incomeCategories = [
  { name: 'דמי חבר', description: 'תשלומי חבר שנתיים', color: '#4CAF50' },
  { name: 'תרומות', description: 'תרומות מחברים ותומכים', color: '#2196F3' },
  { name: 'אירועים', description: 'הכנסות מאירועים ופעילויות', color: '#FF9800' },
  { name: 'השכרת ציוד', description: 'הכנסות מהשכרת ציוד לחברים', color: '#9C27B0' },
  { name: 'מענקים', description: 'מענקים ממוסדות ורשויות', color: '#F44336' },
  { name: 'אחר', description: 'הכנסות שונות שאינן בקטגוריה אחרת', color: '#607D8B' },
];

function roleFlags(user: SeedUser) {
  const role = user.role;
  return {
    isCircleTreasurer: role === 'circle_treasurer' || role === 'admin',
    isGroupTreasurer: role === 'group_treasurer' || user.forceGroupTreasurer === true,
  };
}

export async function runInitialSeed(options?: { closePool?: boolean; skipFlagCheck?: boolean }) {
  const closePool = options?.closePool !== false;
  const skipFlagCheck = options?.skipFlagCheck === true;

  if (!skipFlagCheck && process.env.SEED !== 'TRUE') {
    console.log('SEED flag is not TRUE, skipping seed.');
    if (closePool) await pool.end();
    return;
  }

  const defaultPassword = process.env.DEFAULT_PASSWORD;
  if (!defaultPassword) {
    throw new Error('DEFAULT_PASSWORD is required');
  }

  const hashedPassword = await bcrypt.hash(defaultPassword, 10);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ─── Groups ───────────────────────────────────────────────────────────────
    const groupNameToId: Record<string, number> = {};
    for (const group of groups) {
      const existing = await client.query('SELECT id FROM groups WHERE name = $1', [group.name]);
      let groupId: number;
      if (existing.rows.length > 0) {
        groupId = existing.rows[0].id;
        await client.query('UPDATE groups SET description = $2 WHERE id = $1', [groupId, group.description || null]);
      } else {
        const created = await client.query(
          'INSERT INTO groups (name, description) VALUES ($1, $2) RETURNING id',
          [group.name, group.description || null]
        );
        groupId = created.rows[0].id;
      }
      groupNameToId[group.name] = groupId;
    }

    // ─── Users ────────────────────────────────────────────────────────────────
    let circleTreasurerId!: number;
    let groupATreasurerId!: number;
    let groupBTreasurerId!: number;
    const memberIds: number[] = [];

    for (const user of users) {
      const { isCircleTreasurer, isGroupTreasurer } = roleFlags(user);
      const result = await client.query(
        `INSERT INTO users (email, password_hash, full_name, phone, is_circle_treasurer, is_group_treasurer)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO UPDATE
         SET full_name = EXCLUDED.full_name,
             phone = EXCLUDED.phone,
             is_circle_treasurer = EXCLUDED.is_circle_treasurer,
             is_group_treasurer = EXCLUDED.is_group_treasurer,
             password_hash = EXCLUDED.password_hash
         RETURNING id`,
        [user.email, hashedPassword, user.fullName, user.phone || null, isCircleTreasurer, isGroupTreasurer]
      );
      const userId: number = result.rows[0].id;

      if (user.email === 'gizbar@circle.com') circleTreasurerId = userId;
      if (user.email === 'gizbar.a@circle.com') groupATreasurerId = userId;
      if (user.email === 'gizbar.b@circle.com') groupBTreasurerId = userId;
      if (user.role === 'member') memberIds.push(userId);

      for (const groupName of user.groupNames || []) {
        const groupId = groupNameToId[groupName];
        if (!groupId) throw new Error(`Group "${groupName}" not found for user ${user.email}`);
        await client.query(
          'INSERT INTO user_groups (user_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [userId, groupId]
        );
      }
    }

    // ─── Income Categories ────────────────────────────────────────────────────
    const categoryNameToId: Record<string, number> = {};
    for (const cat of incomeCategories) {
      const result = await client.query(
        `INSERT INTO income_categories (name, description, color, created_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (name) DO UPDATE
         SET description = EXCLUDED.description, color = EXCLUDED.color
         RETURNING id`,
        [cat.name, cat.description, cat.color, circleTreasurerId]
      );
      categoryNameToId[cat.name] = result.rows[0].id;
    }

    // ─── Budgets ──────────────────────────────────────────────────────────────
    const group1Id = groupNameToId['קבוצה א'];
    const group2Id = groupNameToId['קבוצה ב'];

    // תקציב מעגלי כללי
    const circleBudgetResult = await client.query(
      `INSERT INTO budgets (name, total_amount, group_id, fiscal_year, created_by, budget_type)
       VALUES ('תקציב מעגלי 2026', 600000.00, NULL, 2026, $1, 'general')
       RETURNING id`,
      [circleTreasurerId]
    );
    const circleBudgetId: number = circleBudgetResult.rows[0].id;

    // תקציב גזברות (circle-only treasurers budget)
    const treasurersBudgetResult = await client.query(
      `INSERT INTO budgets (name, total_amount, group_id, fiscal_year, created_by, budget_type)
       VALUES ('תקציב גזברות 2026', 50000.00, NULL, 2026, $1, 'treasurers')
       RETURNING id`,
      [circleTreasurerId]
    );
    const treasurersBudgetId: number = treasurersBudgetResult.rows[0].id;

    // תקציב קבוצה א
    const groupABudgetResult = await client.query(
      `INSERT INTO budgets (name, total_amount, group_id, fiscal_year, created_by, budget_type)
       VALUES ('תקציב קבוצה א 2026', 150000.00, $1, 2026, $2, 'general')
       RETURNING id`,
      [group1Id, circleTreasurerId]
    );
    const groupABudgetId: number = groupABudgetResult.rows[0].id;

    // תקציב קבוצה ב
    const groupBBudgetResult = await client.query(
      `INSERT INTO budgets (name, total_amount, group_id, fiscal_year, created_by, budget_type)
       VALUES ('תקציב קבוצה ב 2026', 100000.00, $1, 2026, $2, 'general')
       RETURNING id`,
      [group2Id, circleTreasurerId]
    );
    const groupBBudgetId: number = groupBBudgetResult.rows[0].id;

    // Find or use income budget (created by migration 023)
    const incomeBudgetResult = await client.query(
      `SELECT id FROM budgets WHERE name = 'הכנסות' AND group_id IS NULL LIMIT 1`
    );
    let incomeBudgetId: number;
    if (incomeBudgetResult.rows.length > 0) {
      incomeBudgetId = incomeBudgetResult.rows[0].id;
      await client.query(
        `UPDATE budgets SET created_by = $1 WHERE id = $2`,
        [circleTreasurerId, incomeBudgetId]
      );
    } else {
      const created = await client.query(
        `INSERT INTO budgets (name, total_amount, group_id, fiscal_year, created_by, budget_type)
         VALUES ('הכנסות', 0, NULL, 2026, $1, 'general') RETURNING id`,
        [circleTreasurerId]
      );
      incomeBudgetId = created.rows[0].id;
    }

    // ─── Budget Transfers ─────────────────────────────────────────────────────
    await client.query(
      `INSERT INTO budget_transfers (from_budget_id, to_budget_id, amount, transferred_by, description)
       VALUES
         ($1, $2, 150000.00, $4, 'העברה ראשונית לקבוצה א – 2026'),
         ($1, $3, 100000.00, $4, 'העברה ראשונית לקבוצה ב – 2026')`,
      [circleBudgetId, groupABudgetId, groupBBudgetId, circleTreasurerId]
    );

    // ─── Funds ────────────────────────────────────────────────────────────────

    // Circle funds
    const circleFundsResult = await client.query(
      `INSERT INTO funds (budget_id, name, allocated_amount, description)
       VALUES
         ($1, 'אירועים מעגליים',  80000.00, 'אירועים ופעילויות ברמת המעגל'),
         ($1, 'תחבורה מעגלית',    40000.00, 'השכרת כלי רכב והסעות'),
         ($1, 'ציוד משותף',       60000.00, 'ציוד המשמש את כל הקבוצות'),
         ($1, 'תחזוקה ותשתיות',  30000.00, 'תחזוקה שוטפת ושדרוג תשתיות')
       RETURNING id, name`,
      [circleBudgetId]
    );
    const circleFundMap: Record<string, number> = {};
    for (const row of circleFundsResult.rows) circleFundMap[row.name] = row.id;

    // Treasurers budget fund
    const treasurersFundsResult = await client.query(
      `INSERT INTO funds (budget_id, name, allocated_amount, description)
       VALUES
         ($1, 'הוצאות גזברות',    20000.00, 'הוצאות ניהול וגזברות'),
         ($1, 'ייעוץ ורואה חשבון', 15000.00, 'שכר ייעוץ מקצועי')
       RETURNING id, name`,
      [treasurersBudgetId]
    );
    const treasurersFundMap: Record<string, number> = {};
    for (const row of treasurersFundsResult.rows) treasurersFundMap[row.name] = row.id;

    // Group A funds
    const groupAFundsResult = await client.query(
      `INSERT INTO funds (budget_id, name, allocated_amount, description)
       VALUES
         ($1, 'אירועי קבוצה',  60000.00, 'אירועים ומפגשים קבוצתיים'),
         ($1, 'ציוד קבוצתי',   50000.00, 'ציוד לשימוש הקבוצה'),
         ($1, 'תחבורה קבוצתית',40000.00, 'הסעות ותחבורה לחברי הקבוצה')
       RETURNING id, name`,
      [groupABudgetId]
    );
    const groupAFundMap: Record<string, number> = {};
    for (const row of groupAFundsResult.rows) groupAFundMap[row.name] = row.id;

    // Group B funds
    const groupBFundsResult = await client.query(
      `INSERT INTO funds (budget_id, name, allocated_amount, description)
       VALUES
         ($1, 'פעילויות',       50000.00, 'פעילויות ותוכניות לחברי הקבוצה'),
         ($1, 'ציוד',           30000.00, 'ציוד ומשאבים'),
         ($1, 'הוצאות שוטפות', 20000.00, 'הוצאות שוטפות ותפעוליות')
       RETURNING id, name`,
      [groupBBudgetId]
    );
    const groupBFundMap: Record<string, number> = {};
    for (const row of groupBFundsResult.rows) groupBFundMap[row.name] = row.id;

    // ─── Fund Monthly Allocations ─────────────────────────────────────────────
    const circleFundIds = Object.values(circleFundMap);
    for (const fundId of circleFundIds) {
      for (let month = 1; month <= 3; month++) {
        await client.query(
          `INSERT INTO fund_monthly_allocations (fund_id, year, month, allocated_amount, allocation_type, created_by)
           VALUES ($1, 2026, $2, 5000.00, 'fixed', $3)
           ON CONFLICT (fund_id, year, month) DO NOTHING`,
          [fundId, month, circleTreasurerId]
        );
      }
    }

    // ─── Incomes ──────────────────────────────────────────────────────────────
    const membershipCatId = categoryNameToId['דמי חבר'];
    const donationCatId   = categoryNameToId['תרומות'];
    const grantCatId      = categoryNameToId['מענקים'];

    // confirmed incomes
    const confirmedIncomes = [
      { userId: memberIds[0], amount: 1800, source: 'דמי חבר שנתיים', desc: 'מיכל אברהם – דמי חבר 2026', date: '2026-01-05', catId: membershipCatId },
      { userId: memberIds[1], amount: 1800, source: 'דמי חבר שנתיים', desc: 'רועי דוד – דמי חבר 2026',   date: '2026-01-07', catId: membershipCatId },
      { userId: memberIds[2], amount: 1800, source: 'דמי חבר שנתיים', desc: 'נועה שלום – דמי חבר 2026',  date: '2026-01-10', catId: membershipCatId },
      { userId: memberIds[3], amount: 1800, source: 'דמי חבר שנתיים', desc: 'עמית ברק – דמי חבר 2026',   date: '2026-01-12', catId: membershipCatId },
      { userId: circleTreasurerId, amount: 5000, source: 'תרומה', desc: 'תרומה לקרן ציוד משותף',         date: '2026-02-01', catId: donationCatId },
      { userId: circleTreasurerId, amount: 20000, source: 'מענק עירייה', desc: 'מענק תמיכה שנתי מהרשות', date: '2026-02-15', catId: grantCatId },
    ];
    for (const inc of confirmedIncomes) {
      const r = await client.query(
        `INSERT INTO incomes (budget_id, user_id, amount, source, description, income_date, status, confirmed_by, confirmed_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', $7, NOW())
         RETURNING id`,
        [incomeBudgetId, inc.userId, inc.amount, inc.source, inc.desc, inc.date, circleTreasurerId]
      );
      await client.query(
        `INSERT INTO income_category_assignments (income_id, category_id) VALUES ($1, $2)`,
        [r.rows[0].id, inc.catId]
      );
    }

    // pending incomes (waiting for treasurer confirmation)
    const pendingIncome1 = await client.query(
      `INSERT INTO incomes (budget_id, user_id, amount, source, description, income_date, status)
       VALUES ($1, $2, 1800, 'דמי חבר שנתיים', 'גזברית קבוצה א – דמי חבר 2026', '2026-03-01', 'pending')
       RETURNING id`,
      [incomeBudgetId, groupATreasurerId]
    );
    await client.query(
      `INSERT INTO income_category_assignments (income_id, category_id) VALUES ($1, $2)`,
      [pendingIncome1.rows[0].id, membershipCatId]
    );
    const pendingIncome2 = await client.query(
      `INSERT INTO incomes (budget_id, user_id, amount, source, description, income_date, status)
       VALUES ($1, $2, 3000, 'תרומה', 'תרומה אנונימית לאירועים', '2026-03-05', 'pending')
       RETURNING id`,
      [incomeBudgetId, memberIds[0]]
    );
    await client.query(
      `INSERT INTO income_category_assignments (income_id, category_id) VALUES ($1, $2)`,
      [pendingIncome2.rows[0].id, donationCatId]
    );

    // rejected income
    await client.query(
      `INSERT INTO incomes (budget_id, user_id, amount, source, description, income_date, status, confirmed_by, confirmed_at, notes)
       VALUES ($1, $2, 500, 'שונות', 'תשלום לא מזוהה', '2026-02-20', 'rejected', $3, NOW(), 'לא ניתן לאמת את מקור התשלום')`,
      [incomeBudgetId, memberIds[1], circleTreasurerId]
    );

    // Update income budget total_amount with confirmed incomes
    await client.query(
      `UPDATE budgets SET total_amount = (
         SELECT COALESCE(SUM(amount), 0) FROM incomes WHERE budget_id = $1 AND status = 'confirmed'
       ) WHERE id = $1`,
      [incomeBudgetId]
    );

    // ─── Expected Incomes ─────────────────────────────────────────────────────
    // Annual expected income (parent)
    const expectedAnnualResult = await client.query(
      `INSERT INTO expected_incomes
         (budget_id, user_id, source_name, amount, description, year, month, frequency, created_by)
       VALUES ($1, $2, 'דמי חבר שנתיים', 36000.00, 'סה"כ דמי חבר שנתיים מכלל החברים', 2026, 1, 'annual', $3)
       RETURNING id`,
      [incomeBudgetId, circleTreasurerId, circleTreasurerId]
    );
    const expectedAnnualId = expectedAnnualResult.rows[0].id;
    await client.query(
      `INSERT INTO expected_income_category_assignments (expected_income_id, category_id) VALUES ($1, $2)`,
      [expectedAnnualId, membershipCatId]
    );

    // Monthly breakdown
    for (let month = 1; month <= 12; month++) {
      const r = await client.query(
        `INSERT INTO expected_incomes
           (budget_id, user_id, source_name, amount, description, year, month, frequency, parent_annual_id, created_by)
         VALUES ($1, $2, 'דמי חבר חודשיים', 3000.00, $3, 2026, $4, 'monthly', $5, $6)
         RETURNING id`,
        [incomeBudgetId, circleTreasurerId, `דמי חבר – ${month}/2026`, month, expectedAnnualId, circleTreasurerId]
      );
      await client.query(
        `INSERT INTO expected_income_category_assignments (expected_income_id, category_id) VALUES ($1, $2)`,
        [r.rows[0].id, membershipCatId]
      );
    }

    // One-time expected grant
    const expectedGrantResult = await client.query(
      `INSERT INTO expected_incomes
         (budget_id, user_id, source_name, amount, description, year, month, frequency, created_by)
       VALUES ($1, $2, 'מענק עירייה', 30000.00, 'מענק תמיכה שנתי צפוי מהרשות המקומית', 2026, 3, 'one-time', $3)
       RETURNING id`,
      [incomeBudgetId, circleTreasurerId, circleTreasurerId]
    );
    await client.query(
      `INSERT INTO expected_income_category_assignments (expected_income_id, category_id) VALUES ($1, $2)`,
      [expectedGrantResult.rows[0].id, grantCatId]
    );

    // ─── Reimbursements ───────────────────────────────────────────────────────
    const eventsFundId     = circleFundMap['אירועים מעגליים'];
    const equipFundId      = circleFundMap['ציוד משותף'];
    const groupAEventsFundId = groupAFundMap['אירועי קבוצה'];
    const groupAEquipFundId  = groupAFundMap['ציוד קבוצתי'];
    const groupBActivityId   = groupBFundMap['פעילויות'];

    // pending reimbursements
    await client.query(
      `INSERT INTO reimbursements (fund_id, user_id, recipient_user_id, amount, description, expense_date, status)
       VALUES
         ($1, $3, $3, 350.00, 'רכישת חומרי יצירה לסדנה', '2026-02-10', 'pending'),
         ($2, $4, $4, 520.00, 'השכרת ציוד לאירוע', '2026-02-20', 'pending')`,
      [groupAEventsFundId, groupAEquipFundId, memberIds[0], memberIds[1]]
    );

    // approved reimbursements
    const approvedR1 = await client.query(
      `INSERT INTO reimbursements
         (fund_id, user_id, recipient_user_id, amount, description, expense_date, status, reviewed_by, reviewed_at, notes)
       VALUES ($1, $2, $2, 800.00, 'ציוד טיול – אוהלים ושמיכות', '2026-01-15', 'approved', $3, NOW() - INTERVAL '2 days', 'אושר')
       RETURNING id`,
      [equipFundId, memberIds[0], circleTreasurerId]
    );
    const approvedR2 = await client.query(
      `INSERT INTO reimbursements
         (fund_id, user_id, recipient_user_id, amount, description, expense_date, status, reviewed_by, reviewed_at, notes)
       VALUES ($1, $2, $2, 1200.00, 'הוצאות הסעה לאירוע מעגלי', '2026-01-20', 'approved', $3, NOW() - INTERVAL '1 day', 'אושר')
       RETURNING id`,
      [eventsFundId, memberIds[2], circleTreasurerId]
    );

    // Create payment transfers for the approved reimbursements
    const pt1 = await client.query(
      `INSERT INTO payment_transfers (recipient_user_id, budget_type, status, total_amount, reimbursement_count)
       VALUES ($1, 'circle', 'pending', 800.00, 1) RETURNING id`,
      [memberIds[0]]
    );
    const pt2 = await client.query(
      `INSERT INTO payment_transfers (recipient_user_id, budget_type, status, total_amount, reimbursement_count)
       VALUES ($1, 'circle', 'pending', 1200.00, 1) RETURNING id`,
      [memberIds[2]]
    );
    await client.query(`UPDATE reimbursements SET payment_transfer_id = $1 WHERE id = $2`, [pt1.rows[0].id, approvedR1.rows[0].id]);
    await client.query(`UPDATE reimbursements SET payment_transfer_id = $1 WHERE id = $2`, [pt2.rows[0].id, approvedR2.rows[0].id]);

    // paid reimbursement
    await client.query(
      `INSERT INTO reimbursements
         (fund_id, user_id, recipient_user_id, amount, description, expense_date, status, reviewed_by, reviewed_at, notes)
       VALUES ($1, $2, $2, 450.00, 'רכישת חומרי ניקיון לשטח', '2026-01-05', 'paid', $3, NOW() - INTERVAL '10 days', 'שולם בהעברה בנקאית')`,
      [groupBActivityId, memberIds[3], groupBTreasurerId]
    );

    // rejected reimbursement
    await client.query(
      `INSERT INTO reimbursements
         (fund_id, user_id, recipient_user_id, amount, description, expense_date, status, reviewed_by, reviewed_at, notes)
       VALUES ($1, $2, $2, 980.00, 'קניות לא קשורות לפעילות', '2026-02-01', 'rejected', $3, NOW() - INTERVAL '5 days', 'ההוצאה אינה מאושרת – אינה קשורה לפעילות הקבוצה')`,
      [groupAEventsFundId, memberIds[1], groupATreasurerId]
    );

    // ─── Planned Expenses ─────────────────────────────────────────────────────
    const transportFundId = circleFundMap['תחבורה מעגלית'];
    await client.query(
      `INSERT INTO planned_expenses (fund_id, user_id, amount, description, planned_date, status)
       VALUES
         ($1, $3, 3500.00, 'השכרת אוטובוס לאירוע קיץ',     '2026-06-15', 'planned'),
         ($2, $3, 1200.00, 'עמדת שמע ותאורה לאירוע',        '2026-04-20', 'planned'),
         ($4, $5, 600.00,  'ציוד ספורט לפעילות קבוצתית',    '2026-03-30', 'planned'),
         ($2, $3, 800.00,  'מיקרופון וציוד הגברה',           '2026-01-25', 'executed'),
         ($1, $3, 2200.00, 'הסעה לטיול שנבטל',               '2026-02-10', 'cancelled')`,
      [transportFundId, eventsFundId, circleTreasurerId, groupAEquipFundId, memberIds[0]]
    );

    // ─── Direct Expenses ──────────────────────────────────────────────────────
    await client.query(
      `INSERT INTO direct_expenses (fund_id, amount, description, expense_date, payee, created_by)
       VALUES
         ($1, 450.00,  'חשבון חשמל – ינואר 2026',    '2026-01-31', 'חברת חשמל',         $3),
         ($1, 130.00,  'חשבון מים – ינואר 2026',      '2026-01-31', 'מקורות',             $3),
         ($2, 2800.00, 'שכירת מקום לאירוע גדול',      '2026-02-12', 'אולם אירועים מרכז', $3),
         ($2, 650.00,  'פרסום ומדיה לאירוע',           '2026-02-05', 'סוכנות פרסום',      $3),
         ($4, 1100.00, 'ייעוץ משפטי – חוזים',         '2026-01-20', 'עו"ד שמש ושות''',   $3),
         ($5, 340.00,  'תיקון מזגן בחדר הישיבות',     '2026-02-18', 'טכנאי מזגנים',      $3)`,
      [
        treasurersFundMap['הוצאות גזברות'],
        eventsFundId,
        circleTreasurerId,
        treasurersFundMap['ייעוץ ורואה חשבון'],
        circleFundMap['תחזוקה ותשתיות'],
      ]
    );

    // ─── Recurring Transfers ──────────────────────────────────────────────────
    await client.query(
      `INSERT INTO recurring_transfers
         (recipient_user_id, fund_id, amount, description, start_date, end_date, frequency, status, created_by)
       VALUES
         ($1, $5, 400.00,  'ביטוח בריאות',         '2026-01-01', NULL,         'monthly',   'active',   $4),
         ($2, $5, 400.00,  'ביטוח בריאות',         '2026-01-01', NULL,         'monthly',   'active',   $4),
         ($3, $6, 250.00,  'השתתפות בטלפון',       '2026-01-01', '2026-12-31', 'monthly',   'active',   $4),
         ($1, $7, 1500.00, 'תגמול נסיעות רבעוני',  '2026-01-01', NULL,         'quarterly', 'active',   $4),
         ($2, $5, 300.00,  'מענק הכשרה',            '2026-01-01', '2026-06-30', 'monthly',   'paused',   $4)`,
      [
        memberIds[0],
        memberIds[1],
        memberIds[2],
        circleTreasurerId,
        circleFundMap['ציוד משותף'],
        groupBFundMap['הוצאות שוטפות'],
        circleFundMap['תחבורה מעגלית'],
      ]
    );

    // ─── Charges ──────────────────────────────────────────────────────────────
    await client.query(
      `INSERT INTO charges (fund_id, user_id, amount, description, charge_date, status)
       VALUES
         ($1, $3, 250.00, 'חלק בעלות ציוד קבוצתי שנאבד',        '2026-01-20', 'pending'),
         ($2, $4, 180.00, 'השתתפות בדמי רישום לקורס שנרשם אך לא הגיע', '2026-02-05', 'pending')`,
      [groupAEquipFundId, groupBActivityId, memberIds[1], memberIds[2]]
    );
    await client.query(
      `INSERT INTO charges (fund_id, user_id, amount, description, charge_date, status, reviewed_by, reviewed_at, notes)
       VALUES
         ($1, $2, 500.00, 'נזק לציוד משותף', '2026-01-10', 'approved', $3, NOW() - INTERVAL '7 days', 'אושר לאחר בדיקה')`,
      [equipFundId, memberIds[0], circleTreasurerId]
    );

    await client.query('COMMIT');

    console.log('✅ Seed completed successfully.');
    console.log('\n📝 פרטי כניסה (סיסמה אחידה לכולם):');
    console.log(`  גזברית מעגל:    gizbar@circle.com`);
    console.log(`  גזברית קבוצה א: gizbar.a@circle.com`);
    console.log(`  גזבר קבוצה ב:   gizbar.b@circle.com`);
    console.log(`  חבר (קבוצה א):  member1@circle.com`);
    console.log(`  סיסמה:          ${defaultPassword}`);
    console.log('\n📊 נתונים שנוצרו:');
    console.log('  • 3 קבוצות, 7 משתמשים, 6 קטגוריות הכנסה');
    console.log('  • 5 תקציבים (מעגלי, גזברות, קבוצה א, קבוצה ב, הכנסות)');
    console.log('  • 13 סעיפים (funds) עם הקצאות חודשיות');
    console.log('  • 9 הכנסות (6 מאושרות, 2 ממתינות, 1 נדחתה)');
    console.log('  • 14 הכנסות צפויות (שנתית + 12 חודשיות + חד-פעמית)');
    console.log('  • 5 החזרים (2 ממתינים, 2 מאושרים, 1 שולם, 1 נדחה)');
    console.log('  • 5 תכנוני הוצאות (3 מתוכנן, 1 בוצע, 1 בוטל)');
    console.log('  • 6 הוצאות ישירות');
    console.log('  • 5 העברות קבועות (4 פעילות, 1 מושהית)');
    console.log('  • 3 חיובים (2 ממתינים, 1 מאושר)');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    client.release();
    if (closePool) await pool.end();
  }
}

if (require.main === module) {
  runInitialSeed()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => {
      process.exit(0);
    });
}
