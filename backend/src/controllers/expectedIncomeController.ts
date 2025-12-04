import { Request, Response } from 'express';
import pool from '../config/database';

export async function getExpectedIncomes(req: Request, res: Response) {
  try {
    const { budgetId, year, month, source, categoryId, frequency } = req.query;

    let query = `
      SELECT ei.*, b.name as budget_name
      FROM expected_incomes ei
      JOIN budgets b ON ei.budget_id = b.id
    `;

    const params: any[] = [];
    const conditions: string[] = [];
    let paramIndex = 1;

    // Apply filters
    if (budgetId) {
      conditions.push(`ei.budget_id = $${paramIndex}`);
      params.push(budgetId);
      paramIndex++;
    }

    if (year) {
      conditions.push(`ei.year = $${paramIndex}`);
      params.push(year);
      paramIndex++;
    }

    if (month) {
      conditions.push(`ei.month = $${paramIndex}`);
      params.push(month);
      paramIndex++;
    }

    if (source) {
      conditions.push(`ei.source_name = $${paramIndex}`);
      params.push(source);
      paramIndex++;
    }

    if (categoryId) {
      conditions.push(`EXISTS (
        SELECT 1 FROM expected_income_category_assignments eica
        WHERE eica.expected_income_id = ei.id AND eica.category_id = $${paramIndex}
      )`);
      params.push(categoryId);
      paramIndex++;
    }

    if (frequency) {
      conditions.push(`ei.frequency = $${paramIndex}`);
      params.push(frequency);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY ei.year DESC, ei.month DESC, ei.created_at DESC';

    const result = await pool.query(query, params);

    // Fetch categories for each expected income
    const expectedIncomes = result.rows;
    for (const expectedIncome of expectedIncomes) {
      const categoriesResult = await pool.query(
        `SELECT ic.id, ic.name, ic.description, ic.color
         FROM income_categories ic
         JOIN expected_income_category_assignments eica ON ic.id = eica.category_id
         WHERE eica.expected_income_id = $1
         ORDER BY ic.name`,
        [expectedIncome.id]
      );
      expectedIncome.categories = categoriesResult.rows;
    }

    res.json(expectedIncomes);
  } catch (error) {
    console.error('Get expected incomes error:', error);
    res.status(500).json({ error: 'שליפת הכנסות צפויות נכשלה' });
  }
}

export async function getExpectedIncome(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT ei.*, b.name as budget_name
       FROM expected_incomes ei
       JOIN budgets b ON ei.budget_id = b.id
       WHERE ei.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'הכנסה צפויה לא נמצאה' });
    }

    const expectedIncome = result.rows[0];

    // Fetch categories
    const categoriesResult = await pool.query(
      `SELECT ic.id, ic.name, ic.description, ic.color
       FROM income_categories ic
       JOIN expected_income_category_assignments eica ON ic.id = eica.category_id
       WHERE eica.expected_income_id = $1
       ORDER BY ic.name`,
      [expectedIncome.id]
    );
    expectedIncome.categories = categoriesResult.rows;

    res.json(expectedIncome);
  } catch (error) {
    console.error('Get expected income error:', error);
    res.status(500).json({ error: 'שליפת הכנסה צפויה נכשלה' });
  }
}

export async function createAnnualPlanning(req: Request, res: Response) {
  const client = await pool.connect();
  try {
    const { budgetId, userId, sourceName, amount, description, year, frequency, categoryIds, selectedMonth } = req.body;
    const user = req.user!;

    // Validate required fields
    if (!budgetId || !sourceName || !amount || !year || !frequency) {
      return res.status(400).json({ error: 'שדות חובה חסרים' });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({ error: 'סכום חייב להיות חיובי' });
    }

    // Validate frequency
    const validFrequencies = ['one-time', 'monthly', 'quarterly', 'annual'];
    if (!validFrequencies.includes(frequency)) {
      return res.status(400).json({ error: 'תדירות לא תקינה' });
    }

    // For one-time frequency, selectedMonth is required
    if (frequency === 'one-time' && !selectedMonth) {
      return res.status(400).json({ error: 'יש לבחור חודש עבור הכנסה חד-פעמית' });
    }

    await client.query('BEGIN');

    // Create parent record
    const parentResult = await client.query(
      `INSERT INTO expected_incomes (budget_id, user_id, source_name, amount, description, year, month, frequency, is_manual, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [budgetId, userId || null, sourceName, amount, description || null, year, 1, frequency, false, user.userId]
    );

    const parentId = parentResult.rows[0].id;
    const createdRecords = [];

    // Create child records based on frequency
    if (frequency === 'monthly') {
      // Create 12 monthly records
      const monthlyAmount = amount / 12;
      for (let month = 1; month <= 12; month++) {
        const result = await client.query(
          `INSERT INTO expected_incomes (budget_id, user_id, source_name, amount, description, year, month, frequency, parent_annual_id, is_manual, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING *`,
          [budgetId, userId || null, sourceName, monthlyAmount, description || null, year, month, frequency, parentId, false, user.userId]
        );
        createdRecords.push(result.rows[0]);
      }
    } else if (frequency === 'quarterly') {
      // Create 4 quarterly records (months 1, 4, 7, 10)
      const quarterlyAmount = amount / 4;
      const quarterMonths = [1, 4, 7, 10];
      for (const month of quarterMonths) {
        const result = await client.query(
          `INSERT INTO expected_incomes (budget_id, user_id, source_name, amount, description, year, month, frequency, parent_annual_id, is_manual, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING *`,
          [budgetId, userId || null, sourceName, quarterlyAmount, description || null, year, month, frequency, parentId, false, user.userId]
        );
        createdRecords.push(result.rows[0]);
      }
    } else if (frequency === 'one-time') {
      // Create single record for selected month
      const result = await client.query(
        `INSERT INTO expected_incomes (budget_id, user_id, source_name, amount, description, year, month, frequency, parent_annual_id, is_manual, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [budgetId, userId || null, sourceName, amount, description || null, year, selectedMonth, frequency, parentId, false, user.userId]
      );
      createdRecords.push(result.rows[0]);
    } else if (frequency === 'annual') {
      // Create single record for month 1
      const result = await client.query(
        `INSERT INTO expected_incomes (budget_id, user_id, source_name, amount, description, year, month, frequency, parent_annual_id, is_manual, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [budgetId, userId || null, sourceName, amount, description || null, year, 1, frequency, parentId, false, user.userId]
      );
      createdRecords.push(result.rows[0]);
    }

    // Assign categories to all created records if provided
    if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
      for (const record of createdRecords) {
        for (const categoryId of categoryIds) {
          await client.query(
            `INSERT INTO expected_income_category_assignments (expected_income_id, category_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [record.id, categoryId]
          );
        }
      }
    }

    await client.query('COMMIT');

    // Fetch categories for created records
    for (const record of createdRecords) {
      const categoriesResult = await pool.query(
        `SELECT ic.id, ic.name, ic.description, ic.color
         FROM income_categories ic
         JOIN expected_income_category_assignments eica ON ic.id = eica.category_id
         WHERE eica.expected_income_id = $1
         ORDER BY ic.name`,
        [record.id]
      );
      record.categories = categoriesResult.rows;
    }

    res.status(201).json({
      message: 'תכנון שנתי נוצר בהצלחה',
      parent: parentResult.rows[0],
      records: createdRecords
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create annual planning error:', error);
    res.status(500).json({ error: 'יצירת תכנון שנתי נכשלה' });
  } finally {
    client.release();
  }
}

export async function createMonthlyExpectedIncome(req: Request, res: Response) {
  const client = await pool.connect();
  try {
    const { budgetId, userId, sourceName, amount, description, year, month, categoryIds } = req.body;
    const user = req.user!;

    // Validate required fields
    if (!budgetId || !sourceName || !amount || !year || !month) {
      return res.status(400).json({ error: 'שדות חובה חסרים' });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({ error: 'סכום חייב להיות חיובי' });
    }

    // Validate month
    if (month < 1 || month > 12) {
      return res.status(400).json({ error: 'חודש לא תקין' });
    }

    // Access control: non-treasurers can only add expected income for themselves
    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      if (!userId || userId !== user.userId) {
        return res.status(403).json({ error: 'ניתן להוסיף הכנסה צפויה רק על עצמך' });
      }
    }

    await client.query('BEGIN');

    // Create manual expected income
    const result = await client.query(
      `INSERT INTO expected_incomes (budget_id, user_id, source_name, amount, description, year, month, frequency, is_manual, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [budgetId, userId || null, sourceName, amount, description || null, year, month, 'one-time', true, user.userId]
    );

    const expectedIncome = result.rows[0];

    // Assign categories if provided
    if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
      for (const categoryId of categoryIds) {
        await client.query(
          `INSERT INTO expected_income_category_assignments (expected_income_id, category_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [expectedIncome.id, categoryId]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch categories for the created expected income
    const categoriesResult = await pool.query(
      `SELECT ic.id, ic.name, ic.description, ic.color
       FROM income_categories ic
       JOIN expected_income_category_assignments eica ON ic.id = eica.category_id
       WHERE eica.expected_income_id = $1
       ORDER BY ic.name`,
      [expectedIncome.id]
    );
    expectedIncome.categories = categoriesResult.rows;

    res.status(201).json(expectedIncome);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create monthly expected income error:', error);
    res.status(500).json({ error: 'יצירת הכנסה צפויה חודשית נכשלה' });
  } finally {
    client.release();
  }
}

export async function updateExpectedIncome(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { amount, description, sourceName, userId } = req.body;
    const user = req.user!;

    // Check if expected income exists
    const existing = await pool.query(
      'SELECT id, is_manual, user_id, created_by FROM expected_incomes WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'הכנסה צפויה לא נמצאה' });
    }

    const isManual = existing.rows[0].is_manual;
    const existingUserId = existing.rows[0].user_id;
    const createdBy = existing.rows[0].created_by;

    // Access control: non-treasurers can only update their own expected incomes
    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      if (existingUserId !== user.userId && createdBy !== user.userId) {
        return res.status(403).json({ error: 'ניתן לעדכן רק הכנסות צפויות שלך' });
      }
    }

    let result;

    if (!isManual) {
      // For automatic (from annual planning), only allow updating amount
      if (amount === undefined) {
        return res.status(400).json({ error: 'ניתן לעדכן רק סכום עבור הכנסות מתכנון שנתי' });
      }

      result = await pool.query(
        `UPDATE expected_incomes 
         SET amount = $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [amount, id]
      );
    } else {
      // For manual, allow updating all fields
      result = await pool.query(
        `UPDATE expected_incomes 
         SET amount = COALESCE($1, amount),
             description = COALESCE($2, description),
             source_name = COALESCE($3, source_name),
             user_id = COALESCE($4, user_id),
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [amount, description, sourceName, userId, id]
      );
    }

    const expectedIncome = result.rows[0];

    // Fetch categories for the updated expected income
    const categoriesResult = await pool.query(
      `SELECT ic.id, ic.name, ic.description, ic.color
       FROM income_categories ic
       JOIN expected_income_category_assignments eica ON ic.id = eica.category_id
       WHERE eica.expected_income_id = $1
       ORDER BY ic.name`,
      [expectedIncome.id]
    );
    expectedIncome.categories = categoriesResult.rows;

    res.json(expectedIncome);
  } catch (error) {
    console.error('Update expected income error:', error);
    res.status(500).json({ error: 'עדכון הכנסה צפויה נכשל' });
  }
}

export async function deleteExpectedIncome(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user!;

    // Check if expected income exists
    const existing = await pool.query(
      'SELECT id, is_manual, parent_annual_id, user_id, created_by FROM expected_incomes WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'הכנסה צפויה לא נמצאה' });
    }

    const existingUserId = existing.rows[0].user_id;
    const createdBy = existing.rows[0].created_by;

    // Access control: non-treasurers can only delete their own expected incomes
    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      if (existingUserId !== user.userId && createdBy !== user.userId) {
        return res.status(403).json({ error: 'ניתן למחוק רק הכנסות צפויות שלך' });
      }
    }

    const isManual = existing.rows[0].is_manual;
    const parentAnnualId = existing.rows[0].parent_annual_id;

    // Check if this is a parent record (has children)
    const childrenResult = await pool.query(
      'SELECT COUNT(*) as count FROM expected_incomes WHERE parent_annual_id = $1',
      [id]
    );

    const hasChildren = parseInt(childrenResult.rows[0].count) > 0;

    if (hasChildren) {
      // This is a parent record - cascade delete will handle children
      await pool.query('DELETE FROM expected_incomes WHERE id = $1', [id]);
      res.json({ 
        message: 'הכנסה צפויה ותכנון שנתי נמחקו בהצלחה',
        deletedChildren: true
      });
    } else if (!isManual && parentAnnualId) {
      // This is from annual planning but not a parent - only delete this specific record
      await pool.query('DELETE FROM expected_incomes WHERE id = $1', [id]);
      res.json({ 
        message: 'הכנסה צפויה נמחקה (רק לחודש זה)',
        deletedChildren: false
      });
    } else {
      // This is a manual record - simple delete
      await pool.query('DELETE FROM expected_incomes WHERE id = $1', [id]);
      res.json({ 
        message: 'הכנסה צפויה נמחקה בהצלחה',
        deletedChildren: false
      });
    }
  } catch (error) {
    console.error('Delete expected income error:', error);
    res.status(500).json({ error: 'מחיקת הכנסה צפויה נכשלה' });
  }
}

export async function assignCategories(req: Request, res: Response) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { categoryIds } = req.body;
    const user = req.user!;

    // Check if expected income exists
    const existing = await pool.query(
      'SELECT id, user_id, created_by FROM expected_incomes WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'הכנסה צפויה לא נמצאה' });
    }

    const existingUserId = existing.rows[0].user_id;
    const createdBy = existing.rows[0].created_by;

    // Access control: non-treasurers can only assign categories to their own expected incomes
    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      if (existingUserId !== user.userId && createdBy !== user.userId) {
        return res.status(403).json({ error: 'ניתן לשייך קטגוריות רק להכנסות צפויות שלך' });
      }
    }

    await client.query('BEGIN');

    // Delete existing category assignments
    await client.query(
      'DELETE FROM expected_income_category_assignments WHERE expected_income_id = $1',
      [id]
    );

    // Insert new category assignments
    if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
      for (const categoryId of categoryIds) {
        await client.query(
          `INSERT INTO expected_income_category_assignments (expected_income_id, category_id)
           VALUES ($1, $2)`,
          [id, categoryId]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch updated categories
    const categoriesResult = await pool.query(
      `SELECT ic.id, ic.name, ic.description, ic.color
       FROM income_categories ic
       JOIN expected_income_category_assignments eica ON ic.id = eica.category_id
       WHERE eica.expected_income_id = $1
       ORDER BY ic.name`,
      [id]
    );

    res.json({ 
      message: 'קטגוריות שויכו בהצלחה',
      categories: categoriesResult.rows 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Assign categories error:', error);
    res.status(500).json({ error: 'שיוך קטגוריות נכשל' });
  } finally {
    client.release();
  }
}

export async function getMonthlyComparison(req: Request, res: Response) {
  try {
    const { year, month } = req.params;

    // Validate year and month
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: 'שנה או חודש לא תקינים' });
    }

    // Get all expected incomes for the month
    const expectedResult = await pool.query(
      `SELECT ei.source_name, ei.user_id, SUM(ei.amount) as expected_amount
       FROM expected_incomes ei
       WHERE ei.year = $1 AND ei.month = $2
       GROUP BY ei.source_name, ei.user_id`,
      [yearNum, monthNum]
    );

    // Get all actual incomes for the month
    const actualResult = await pool.query(
      `SELECT i.source, i.user_id, SUM(i.amount) as actual_amount
       FROM incomes i
       WHERE EXTRACT(YEAR FROM i.income_date) = $1 
         AND EXTRACT(MONTH FROM i.income_date) = $2
       GROUP BY i.source, i.user_id`,
      [yearNum, monthNum]
    );

    // Create a map of actual incomes by source_name
    const actualMap = new Map<string, number>();
    for (const row of actualResult.rows) {
      actualMap.set(row.source, parseFloat(row.actual_amount));
    }

    // Build comparison array
    const comparisons = [];
    let totalExpected = 0;
    let totalActual = 0;

    // Process expected incomes
    for (const expected of expectedResult.rows) {
      const expectedAmount = parseFloat(expected.expected_amount);
      const actualAmount = actualMap.get(expected.source_name) || 0;
      const difference = actualAmount - expectedAmount;
      const percentage = expectedAmount > 0 ? (actualAmount / expectedAmount) * 100 : 0;

      // Determine status
      let status: 'not-received' | 'partial' | 'full' | 'exceeded';
      if (actualAmount === 0) {
        status = 'not-received';
      } else if (actualAmount < expectedAmount) {
        status = 'partial';
      } else if (actualAmount === expectedAmount) {
        status = 'full';
      } else {
        status = 'exceeded';
      }

      // Get categories for this source
      const categoriesResult = await pool.query(
        `SELECT DISTINCT ic.id, ic.name, ic.description, ic.color
         FROM income_categories ic
         JOIN expected_income_category_assignments eica ON ic.id = eica.category_id
         JOIN expected_incomes ei ON eica.expected_income_id = ei.id
         WHERE ei.source_name = $1 AND ei.year = $2 AND ei.month = $3
         ORDER BY ic.name`,
        [expected.source_name, yearNum, monthNum]
      );

      comparisons.push({
        source_name: expected.source_name,
        user_id: expected.user_id,
        expected_amount: expectedAmount,
        actual_amount: actualAmount,
        difference,
        percentage,
        status,
        categories: categoriesResult.rows
      });

      totalExpected += expectedAmount;
      totalActual += actualAmount;

      // Remove from actualMap so we can track incomes without expectations
      actualMap.delete(expected.source_name);
    }

    // Add any actual incomes that don't have expected incomes
    for (const [source, actualAmount] of actualMap.entries()) {
      const difference = actualAmount;
      
      // Get categories for this source from actual incomes
      const categoriesResult = await pool.query(
        `SELECT DISTINCT ic.id, ic.name, ic.description, ic.color
         FROM income_categories ic
         JOIN income_category_assignments ica ON ic.id = ica.category_id
         JOIN incomes i ON ica.income_id = i.id
         WHERE i.source = $1 
           AND EXTRACT(YEAR FROM i.income_date) = $2 
           AND EXTRACT(MONTH FROM i.income_date) = $3
         ORDER BY ic.name`,
        [source, yearNum, monthNum]
      );

      comparisons.push({
        source_name: source,
        user_id: null,
        expected_amount: 0,
        actual_amount: actualAmount,
        difference,
        percentage: 0,
        status: 'exceeded',
        categories: categoriesResult.rows
      });

      totalActual += actualAmount;
    }

    // Calculate overall summary
    const totalDifference = totalActual - totalExpected;
    const fulfillmentPercentage = totalExpected > 0 ? (totalActual / totalExpected) * 100 : 0;

    res.json({
      year: yearNum,
      month: monthNum,
      total_expected: totalExpected,
      total_actual: totalActual,
      difference: totalDifference,
      fulfillment_percentage: fulfillmentPercentage,
      by_source: comparisons
    });
  } catch (error) {
    console.error('Get monthly comparison error:', error);
    res.status(500).json({ error: 'שליפת השוואה חודשית נכשלה' });
  }
}

export async function getDashboardSummary(req: Request, res: Response) {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Get total expected incomes for current month
    const expectedResult = await pool.query(
      `SELECT SUM(amount) as total_expected
       FROM expected_incomes
       WHERE year = $1 AND month = $2`,
      [currentYear, currentMonth]
    );

    // Get total actual incomes for current month
    const actualResult = await pool.query(
      `SELECT SUM(amount) as total_actual
       FROM incomes
       WHERE EXTRACT(YEAR FROM income_date) = $1 
         AND EXTRACT(MONTH FROM income_date) = $2`,
      [currentYear, currentMonth]
    );

    const totalExpected = parseFloat(expectedResult.rows[0].total_expected || 0);
    const totalActual = parseFloat(actualResult.rows[0].total_actual || 0);
    const difference = totalActual - totalExpected;
    const fulfillmentPercentage = totalExpected > 0 ? (totalActual / totalExpected) * 100 : 0;

    // Optional: Get breakdown by categories
    const categoryBreakdown = await pool.query(
      `SELECT 
         ic.id as category_id,
         ic.name as category_name,
         COALESCE(SUM(DISTINCT ei.amount), 0) as expected,
         COALESCE(SUM(DISTINCT i.amount), 0) as actual
       FROM income_categories ic
       LEFT JOIN expected_income_category_assignments eica ON ic.id = eica.category_id
       LEFT JOIN expected_incomes ei ON eica.expected_income_id = ei.id 
         AND ei.year = $1 AND ei.month = $2
       LEFT JOIN income_category_assignments ica ON ic.id = ica.category_id
       LEFT JOIN incomes i ON ica.income_id = i.id 
         AND EXTRACT(YEAR FROM i.income_date) = $1 
         AND EXTRACT(MONTH FROM i.income_date) = $2
       GROUP BY ic.id, ic.name
       HAVING COALESCE(SUM(DISTINCT ei.amount), 0) > 0 OR COALESCE(SUM(DISTINCT i.amount), 0) > 0
       ORDER BY ic.name`,
      [currentYear, currentMonth]
    );

    res.json({
      year: currentYear,
      month: currentMonth,
      total_expected: totalExpected,
      total_actual: totalActual,
      difference,
      fulfillment_percentage: fulfillmentPercentage,
      by_category: categoryBreakdown.rows.map(row => ({
        category_id: row.category_id,
        category_name: row.category_name,
        expected: parseFloat(row.expected),
        actual: parseFloat(row.actual)
      }))
    });
  } catch (error) {
    console.error('Get dashboard summary error:', error);
    res.status(500).json({ error: 'שליפת סיכום דשבורד נכשלה' });
  }
}
