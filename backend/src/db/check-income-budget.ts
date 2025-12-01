/**
 * Script to check if income budget exists and show income distribution
 * Run with: npx tsx src/db/check-income-budget.ts
 */

import pool from '../config/database';

async function checkIncomeBudget() {
  try {
    console.log('🔍 Checking income budget status...\n');

    // Check if income budget exists
    const budgetResult = await pool.query(
      `SELECT id, name, total_amount, fiscal_year, created_at
       FROM budgets
       WHERE name = 'הכנסות' AND group_id IS NULL`
    );

    if (budgetResult.rows.length === 0) {
      console.log('❌ Income budget does not exist yet');
      console.log('   Run migration 023 to create it\n');
    } else {
      const budget = budgetResult.rows[0];
      console.log('✅ Income budget exists:');
      console.log(`   ID: ${budget.id}`);
      console.log(`   Name: ${budget.name}`);
      console.log(`   Total Amount: ₪${parseFloat(budget.total_amount).toFixed(2)}`);
      console.log(`   Fiscal Year: ${budget.fiscal_year}`);
      console.log(`   Created: ${budget.created_at}\n`);

      // Count incomes in this budget
      const incomeCountResult = await pool.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
         FROM incomes
         WHERE budget_id = $1`,
        [budget.id]
      );

      const { count, total } = incomeCountResult.rows[0];
      console.log(`📊 Incomes in this budget: ${count}`);
      console.log(`   Total: ₪${parseFloat(total).toFixed(2)}\n`);
    }

    // Check incomes in other budgets
    const otherBudgetsResult = await pool.query(
      `SELECT b.id, b.name, COUNT(i.id) as income_count, COALESCE(SUM(i.amount), 0) as total
       FROM budgets b
       LEFT JOIN incomes i ON b.id = i.budget_id
       WHERE b.name != 'הכנסות' OR b.group_id IS NOT NULL
       GROUP BY b.id, b.name
       HAVING COUNT(i.id) > 0
       ORDER BY COUNT(i.id) DESC`
    );

    if (otherBudgetsResult.rows.length > 0) {
      console.log('⚠️  Incomes found in other budgets:');
      for (const row of otherBudgetsResult.rows) {
        console.log(`   - ${row.name}: ${row.income_count} incomes (₪${parseFloat(row.total).toFixed(2)})`);
      }
      console.log('\n   These should be migrated to the income budget\n');
    } else {
      console.log('✅ No incomes in other budgets\n');
    }

    // Show total incomes
    const totalResult = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
       FROM incomes`
    );

    const { count: totalCount, total: totalAmount } = totalResult.rows[0];
    console.log(`📈 Total incomes in system: ${totalCount}`);
    console.log(`   Total amount: ₪${parseFloat(totalAmount).toFixed(2)}\n`);

    console.log('✨ Check complete!');

  } catch (error) {
    console.error('❌ Error checking income budget:', error);
  } finally {
    await pool.end();
  }
}

checkIncomeBudget();
