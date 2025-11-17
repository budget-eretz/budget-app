import pool from '../config/database';
import bcrypt from 'bcrypt';

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create sample groups
    const groupsResult = await client.query(`
      INSERT INTO groups (name, description)
      VALUES
        ('קבוצת הצפון', 'קבוצה שיתופית באזור הצפון'),
        ('קבוצת המרכז', 'קבוצה שיתופית באזור המרכז'),
        ('קבוצת הדרום', 'קבוצה שיתופית באזור הדרום')
      RETURNING id
    `);

    const [group1, group2, group3] = groupsResult.rows;

    // Create sample users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Circle treasurer (no group)
    const hashedPassword123456 = await bcrypt.hash('123456', 10);
    const circleUserResult = await client.query(`
      INSERT INTO users (email, password_hash, full_name, phone, is_circle_treasurer)
      VALUES ('gizbarit@test.com', $1, 'גזברית מעגל', '050-1234567', TRUE)
      RETURNING id
    `, [hashedPassword123456]);

    const circleTreasurerId = circleUserResult.rows[0].id;

    // Group treasurers
    await client.query(`
      INSERT INTO users (email, password_hash, full_name, phone, group_id, is_group_treasurer)
      VALUES
        ('treasurer@north.com', $1, 'שרה לevi', '050-2345678', $2, TRUE),
        ('treasurer@center.com', $1, 'יוסי ישראלי', '050-3456789', $3, TRUE)
    `, [hashedPassword, group1.id, group2.id]);

    // Regular members
    await client.query(`
      INSERT INTO users (email, password_hash, full_name, phone, group_id)
      VALUES
        ('member1@circle.com', $1, 'מיכל אברהם', '050-4567890', $2),
        ('member2@circle.com', $1, 'רועי דוד', '050-5678901', $3),
        ('member3@circle.com', $1, 'נועה שלום', '050-6789012', $4),
        ('member4@circle.com', $1, 'עמית ברק', NULL, NULL)
    `, [hashedPassword, group1.id, group1.id, group2.id]);

    // Create circle budget
    const circleBudgetResult = await client.query(`
      INSERT INTO budgets (name, total_amount, fiscal_year, created_by)
      VALUES ('תקציב מעגלי 2025', 500000.00, 2025, $1)
      RETURNING id
    `, [circleTreasurerId]);

    const circleBudgetId = circleBudgetResult.rows[0].id;

    // Create circle funds
    await client.query(`
      INSERT INTO funds (budget_id, name, allocated_amount, description)
      VALUES
        ($1, 'אירועים מעגליים', 100000.00, 'תקציב לאירועי המעגל'),
        ($1, 'תחבורה', 50000.00, 'השכרת רכבים והסעות'),
        ($1, 'ציוד משותף', 75000.00, 'ציוד המשמש את כל המעגל')
    `, [circleBudgetId]);

    // Create group budgets (transferred from circle)
    const groupBudget1Result = await client.query(`
      INSERT INTO budgets (name, total_amount, group_id, fiscal_year, created_by)
      VALUES ('תקציב קבוצת הצפון 2025', 150000.00, $1, 2025, $2)
      RETURNING id
    `, [group1.id, circleTreasurerId]);

    const groupBudget2Result = await client.query(`
      INSERT INTO budgets (name, total_amount, group_id, fiscal_year, created_by)
      VALUES ('תקציב קבוצת המרכז 2025', 125000.00, $1, 2025, $2)
      RETURNING id
    `, [group2.id, circleTreasurerId]);

    // Record budget transfers
    await client.query(`
      INSERT INTO budget_transfers (from_budget_id, to_budget_id, amount, transferred_by, description)
      VALUES
        ($1, $2, 150000.00, $4, 'העברה ראשונית לקבוצת הצפון'),
        ($1, $3, 125000.00, $4, 'העברה ראשונית לקבוצת המרכז')
    `, [circleBudgetId, groupBudget1Result.rows[0].id, groupBudget2Result.rows[0].id, circleTreasurerId]);

    // Create group funds
    const groupFundsResult = await client.query(`
      INSERT INTO funds (budget_id, name, allocated_amount, description)
      VALUES
        ($1, 'אירועי קבוצה', 50000.00, 'אירועים פנימיים של הקבוצה'),
        ($1, 'ציוד קבוצתי', 60000.00, 'ציוד לשימוש הקבוצה'),
        ($1, 'תחזוקה', 40000.00, 'תחזוקה שוטפת')
      RETURNING id
    `, [groupBudget1Result.rows[0].id]);

    // Get fund IDs for direct expenses
    const circleFundsResult = await client.query(`
      SELECT id FROM funds WHERE budget_id = $1 LIMIT 2
    `, [circleBudgetResult.rows[0].id]);

    // Create sample direct expenses
    if (circleFundsResult.rows.length > 0) {
      await client.query(`
        INSERT INTO direct_expenses (fund_id, amount, description, expense_date, payee, created_by)
        VALUES
          ($1, 350.00, 'חשבון חשמל לחודש אוקטובר', '2025-10-05', 'חברת חשמל', $3),
          ($1, 120.00, 'חשבון מים לחודש אוקטובר', '2025-10-07', 'מקורות', $3),
          ($2, 450.00, 'רכישת ציוד משרדי', '2025-10-03', 'אופיס דיפו', $3),
          ($2, 85.00, 'שירותי ניקיון', '2025-10-01', 'חברת ניקיון בע"מ', $3)
      `, [circleFundsResult.rows[0].id, circleFundsResult.rows[1]?.id || circleFundsResult.rows[0].id, circleTreasurerId]);
    }

    console.log('✅ Sample data created successfully!');
    console.log('\n📝 Login credentials:');
    console.log('Circle Treasurer: gizbarit@test.com / 123456');
    console.log('Group Treasurer (North): treasurer@north.com / password123');
    console.log('Group Treasurer (Center): treasurer@center.com / password123');
    console.log('Member: member1@circle.com / password123');

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
