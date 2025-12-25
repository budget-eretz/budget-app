/**
 * Verification script for reporting views
 * Tests that all reporting views are created and return expected data structure
 */

import { Pool } from 'pg';
import pool from '../config/database';

async function verifyReportingViews() {
  try {
    console.log('🔍 Verifying reporting views...');
    
    // Test 1: Verify all views exist
    const viewsQuery = `
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'monthly_income_by_category',
        'monthly_expenses_by_budget', 
        'annual_income_by_category',
        'annual_expenses_by_budget',
        'fund_expense_summary'
      )
      ORDER BY table_name;
    `;
    
    const viewsResult = await pool.query(viewsQuery);
    const expectedViews = [
      'annual_expenses_by_budget',
      'annual_income_by_category', 
      'fund_expense_summary',
      'monthly_expenses_by_budget',
      'monthly_income_by_category'
    ];
    
    console.log('📋 Found views:', viewsResult.rows.map(r => r.table_name));
    
    if (viewsResult.rows.length !== expectedViews.length) {
      throw new Error(`Expected ${expectedViews.length} views, found ${viewsResult.rows.length}`);
    }
    
    // Test 2: Verify monthly_income_by_category structure
    const monthlyIncomeTest = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'monthly_income_by_category' 
      ORDER BY ordinal_position;
    `);
    
    const expectedIncomeColumns = ['year', 'month', 'category_id', 'category_name', 'category_color', 'total_amount', 'income_count'];
    const actualIncomeColumns = monthlyIncomeTest.rows.map(r => r.column_name);
    
    console.log('📊 Monthly income view columns:', actualIncomeColumns);
    
    if (!expectedIncomeColumns.every(col => actualIncomeColumns.includes(col))) {
      throw new Error('Monthly income view missing expected columns');
    }
    
    // Test 3: Verify monthly_expenses_by_budget structure
    const monthlyExpensesTest = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'monthly_expenses_by_budget' 
      ORDER BY ordinal_position;
    `);
    
    const expectedExpenseColumns = ['year', 'month', 'budget_id', 'budget_name', 'budget_type', 'group_name', 'total_amount', 'expense_count'];
    const actualExpenseColumns = monthlyExpensesTest.rows.map(r => r.column_name);
    
    console.log('💰 Monthly expenses view columns:', actualExpenseColumns);
    
    if (!expectedExpenseColumns.every(col => actualExpenseColumns.includes(col))) {
      throw new Error('Monthly expenses view missing expected columns');
    }
    
    // Test 4: Verify fund_expense_summary structure
    const fundSummaryTest = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'fund_expense_summary' 
      ORDER BY ordinal_position;
    `);
    
    const expectedFundColumns = ['fund_id', 'fund_name', 'allocated_amount', 'budget_id', 'budget_name', 'budget_type', 'group_name', 'year', 'month', 'spent_amount', 'expense_count', 'remaining_amount', 'utilization_percentage'];
    const actualFundColumns = fundSummaryTest.rows.map(r => r.column_name);
    
    console.log('📈 Fund expense summary columns:', actualFundColumns);
    
    if (!expectedFundColumns.every(col => actualFundColumns.includes(col))) {
      throw new Error('Fund expense summary view missing expected columns');
    }
    
    // Test 5: Verify indexes exist
    const indexQuery = `
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND (
        indexname LIKE 'idx_%year_month%' OR 
        indexname LIKE 'idx_%status_fund%' OR
        indexname LIKE 'idx_%budget_date%' OR
        indexname LIKE 'idx_%fund_date%'
      )
      ORDER BY indexname;
    `;
    
    const indexResult = await pool.query(indexQuery);
    console.log('🔍 Found performance indexes:', indexResult.rows.map(r => r.indexname));
    
    if (indexResult.rows.length < 5) {
      console.warn('⚠️  Warning: Expected more performance indexes');
    }
    
    // Test 6: Sample data queries
    console.log('📊 Testing sample queries...');
    
    const sampleIncome = await pool.query('SELECT COUNT(*) as count FROM monthly_income_by_category');
    console.log(`✅ Monthly income view: ${sampleIncome.rows[0].count} records`);
    
    const sampleExpenses = await pool.query('SELECT COUNT(*) as count FROM monthly_expenses_by_budget');
    console.log(`✅ Monthly expenses view: ${sampleExpenses.rows[0].count} records`);
    
    const sampleFunds = await pool.query('SELECT COUNT(*) as count FROM fund_expense_summary');
    console.log(`✅ Fund expense summary: ${sampleFunds.rows[0].count} records`);
    
    console.log('🎉 All reporting views verified successfully!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

// Run verification if called directly
if (require.main === module) {
  verifyReportingViews()
    .then(() => {
      console.log('✅ Verification completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Verification failed:', error);
      process.exit(1);
    });
}

export { verifyReportingViews };