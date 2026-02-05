import { Request, Response } from 'express';
import pool from '../config/database';

export async function getIncomes(req: Request, res: Response) {
  try {
    const { budgetId, startDate, endDate, source, categoryId, year, month, status } = req.query;

    let query = `
      SELECT i.*, u.full_name as user_name, b.name as budget_name,
             c.full_name as confirmed_by_name
      FROM incomes i
      JOIN users u ON i.user_id = u.id
      JOIN budgets b ON i.budget_id = b.id
      LEFT JOIN users c ON i.confirmed_by = c.id
    `;

    const params: any[] = [];
    const conditions: string[] = [];
    let paramIndex = 1;

    // Apply filters
    if (budgetId) {
      conditions.push(`i.budget_id = $${paramIndex}`);
      params.push(budgetId);
      paramIndex++;
    }

    if (startDate) {
      conditions.push(`i.income_date >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`i.income_date <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    if (source) {
      conditions.push(`i.source = $${paramIndex}`);
      params.push(source);
      paramIndex++;
    }

    if (categoryId) {
      conditions.push(`EXISTS (
        SELECT 1 FROM income_category_assignments ica
        WHERE ica.income_id = i.id AND ica.category_id = $${paramIndex}
      )`);
      params.push(categoryId);
      paramIndex++;
    }

    if (year) {
      conditions.push(`EXTRACT(YEAR FROM i.income_date) = $${paramIndex}`);
      params.push(year);
      paramIndex++;
    }

    if (month) {
      conditions.push(`EXTRACT(MONTH FROM i.income_date) = $${paramIndex}`);
      params.push(month);
      paramIndex++;
    }

    if (status) {
      conditions.push(`i.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY i.income_date DESC, i.created_at DESC';

    const result = await pool.query(query, params);

    // Fetch categories for each income
    const incomes = result.rows;
    for (const income of incomes) {
      const categoriesResult = await pool.query(
        `SELECT ic.id, ic.name, ic.description, ic.color
         FROM income_categories ic
         JOIN income_category_assignments ica ON ic.id = ica.category_id
         WHERE ica.income_id = $1
         ORDER BY ic.name`,
        [income.id]
      );
      income.categories = categoriesResult.rows;
    }

    res.json(incomes);
  } catch (error) {
    console.error('Get incomes error:', error);
    res.status(500).json({ error: 'Failed to get incomes' });
  }
}

export async function createIncome(req: Request, res: Response) {
  const client = await pool.connect();
  try {
    const { amount, source, description, incomeDate, categoryIds, status: requestedStatus } = req.body;
    const user = req.user!;

    await client.query('BEGIN');

    // Get or create the income budget (הכנסות)
    let incomeBudgetResult = await client.query(
      `SELECT id FROM budgets WHERE name = 'הכנסות' AND group_id IS NULL`
    );

    let incomeBudgetId: number;

    if (incomeBudgetResult.rows.length === 0) {
      // Create income budget if it doesn't exist
      const createBudgetResult = await client.query(
        `INSERT INTO budgets (name, total_amount, group_id, fiscal_year, created_by, created_at, updated_at)
         VALUES ('הכנסות', 0, NULL, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, $1, NOW(), NOW())
         RETURNING id`,
        [user.userId]
      );
      incomeBudgetId = createBudgetResult.rows[0].id;
    } else {
      incomeBudgetId = incomeBudgetResult.rows[0].id;
    }

    // Determine status: default is pending for all users (can be overridden by requestedStatus)
    const status = requestedStatus || 'pending';

    // Insert income with the income budget and status
    const result = await client.query(
      `INSERT INTO incomes (budget_id, user_id, amount, source, description, income_date, status, confirmed_by, confirmed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        incomeBudgetId,
        user.userId,
        amount,
        source,
        description || null,
        incomeDate,
        status,
        status === 'confirmed' ? user.userId : null,
        status === 'confirmed' ? new Date() : null
      ]
    );

    const income = result.rows[0];

    // Update income budget total amount only if status is confirmed
    if (status === 'confirmed') {
      await client.query(
        `UPDATE budgets
         SET total_amount = total_amount + $1, updated_at = NOW()
         WHERE id = $2`,
        [amount, incomeBudgetId]
      );
    }

    // Assign categories if provided
    if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
      for (const categoryId of categoryIds) {
        await client.query(
          `INSERT INTO income_category_assignments (income_id, category_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [income.id, categoryId]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch categories for the created income
    const categoriesResult = await pool.query(
      `SELECT ic.id, ic.name, ic.description, ic.color
       FROM income_categories ic
       JOIN income_category_assignments ica ON ic.id = ica.category_id
       WHERE ica.income_id = $1
       ORDER BY ic.name`,
      [income.id]
    );
    income.categories = categoriesResult.rows;

    res.status(201).json(income);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create income error:', error);
    res.status(500).json({ error: 'Failed to create income' });
  } finally {
    client.release();
  }
}

export async function updateIncome(req: Request, res: Response) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { amount, description, incomeDate, source, status: requestedStatus } = req.body;
    const user = req.user!;

    await client.query('BEGIN');

    // Check if income exists and get owner, current amount, and status
    const existing = await client.query(
      'SELECT id, user_id, amount, budget_id, status FROM incomes WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'הכנסה לא נמצאה' });
    }

    // Users can update their own incomes, treasurers can update any income
    const isOwner = existing.rows[0].user_id === user.userId;
    const isTreasurer = user.isCircleTreasurer || user.isGroupTreasurer;

    if (!isOwner && !isTreasurer) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'אין לך הרשאה לעדכן הכנסה זו' });
    }

    const oldAmount = parseFloat(existing.rows[0].amount);
    const budgetId = existing.rows[0].budget_id;
    const currentStatus = existing.rows[0].status;

    // Prevent direct status changes (only through confirmIncome)
    if (requestedStatus && requestedStatus !== currentStatus) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'לא ניתן לשנות סטטוס ישירות. השתמש באישור להכנסות ממתינות.' });
    }

    // Update income
    const result = await client.query(
      `UPDATE incomes
       SET amount = COALESCE($1, amount),
           description = COALESCE($2, description),
           income_date = COALESCE($3, income_date),
           source = COALESCE($4, source)
       WHERE id = $5
       RETURNING *`,
      [amount, description, incomeDate, source, id]
    );

    const income = result.rows[0];

    // Update budget total amount if amount changed AND income is confirmed
    if (amount && amount !== oldAmount && currentStatus === 'confirmed') {
      const amountDiff = parseFloat(amount) - oldAmount;
      await client.query(
        `UPDATE budgets
         SET total_amount = total_amount + $1, updated_at = NOW()
         WHERE id = $2`,
        [amountDiff, budgetId]
      );
    }

    await client.query('COMMIT');

    // Fetch categories for the updated income
    const categoriesResult = await pool.query(
      `SELECT ic.id, ic.name, ic.description, ic.color
       FROM income_categories ic
       JOIN income_category_assignments ica ON ic.id = ica.category_id
       WHERE ica.income_id = $1
       ORDER BY ic.name`,
      [income.id]
    );
    income.categories = categoriesResult.rows;

    res.json(income);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update income error:', error);
    res.status(500).json({ error: 'עדכון הכנסה נכשל' });
  } finally {
    client.release();
  }
}

export async function assignCategories(req: Request, res: Response) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { categoryIds } = req.body;
    const user = req.user!;

    // Check if income exists and get owner
    const existing = await pool.query(
      'SELECT id, user_id FROM incomes WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'הכנסה לא נמצאה' });
    }

    // Users can assign categories to their own incomes, treasurers can assign to any income
    const isOwner = existing.rows[0].user_id === user.userId;
    const isTreasurer = user.isCircleTreasurer || user.isGroupTreasurer;
    
    if (!isOwner && !isTreasurer) {
      return res.status(403).json({ error: 'אין לך הרשאה לשייך קטגוריות להכנסה זו' });
    }

    await client.query('BEGIN');

    // Delete existing category assignments
    await client.query(
      'DELETE FROM income_category_assignments WHERE income_id = $1',
      [id]
    );

    // Insert new category assignments
    if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
      for (const categoryId of categoryIds) {
        await client.query(
          `INSERT INTO income_category_assignments (income_id, category_id)
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
       JOIN income_category_assignments ica ON ic.id = ica.category_id
       WHERE ica.income_id = $1
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

export async function deleteIncome(req: Request, res: Response) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const user = req.user!;

    await client.query('BEGIN');

    // Check ownership or treasurer permission and get amount and status
    const existing = await client.query(
      'SELECT user_id, amount, budget_id, status FROM incomes WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Income not found' });
    }

    if (existing.rows[0].user_id !== user.userId && !user.isCircleTreasurer && !user.isGroupTreasurer) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Cannot delete others incomes' });
    }

    const amount = parseFloat(existing.rows[0].amount);
    const budgetId = existing.rows[0].budget_id;
    const status = existing.rows[0].status;

    // Delete income
    await client.query('DELETE FROM incomes WHERE id = $1', [id]);

    // Update budget total amount only if income was confirmed
    if (status === 'confirmed') {
      await client.query(
        `UPDATE budgets
         SET total_amount = total_amount - $1, updated_at = NOW()
         WHERE id = $2`,
        [amount, budgetId]
      );
    }

    await client.query('COMMIT');

    res.json({ message: 'Income deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete income error:', error);
    res.status(500).json({ error: 'Failed to delete income' });
  } finally {
    client.release();
  }
}

export async function confirmIncome(req: Request, res: Response) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const user = req.user!;

    // Only circle treasurers can confirm
    if (!user.isCircleTreasurer) {
      return res.status(403).json({ error: 'רק גזבר מעגלי יכול לאשר הכנסות' });
    }

    await client.query('BEGIN');

    // Check income exists and is pending
    const existing = await client.query(
      'SELECT id, amount, budget_id, status FROM incomes WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'הכנסה לא נמצאה' });
    }

    if (existing.rows[0].status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'הכנסה כבר אושרה' });
    }

    const amount = parseFloat(existing.rows[0].amount);
    const budgetId = existing.rows[0].budget_id;

    // Update income status
    await client.query(
      `UPDATE incomes
       SET status = 'confirmed',
           confirmed_by = $1,
           confirmed_at = NOW()
       WHERE id = $2`,
      [user.userId, id]
    );

    // Update budget: add to total_amount (only confirmed incomes affect budget)
    await client.query(
      `UPDATE budgets
       SET total_amount = total_amount + $1,
           updated_at = NOW()
       WHERE id = $2`,
      [amount, budgetId]
    );

    await client.query('COMMIT');

    // Fetch full income data
    const fullIncome = await pool.query(
      `SELECT i.*, u.full_name as user_name, b.name as budget_name,
              c.full_name as confirmed_by_name
       FROM incomes i
       JOIN users u ON i.user_id = u.id
       JOIN budgets b ON i.budget_id = b.id
       LEFT JOIN users c ON i.confirmed_by = c.id
       WHERE i.id = $1`,
      [id]
    );

    // Fetch categories for the income
    const categoriesResult = await pool.query(
      `SELECT ic.id, ic.name, ic.description, ic.color
       FROM income_categories ic
       JOIN income_category_assignments ica ON ic.id = ica.category_id
       WHERE ica.income_id = $1
       ORDER BY ic.name`,
      [id]
    );
    fullIncome.rows[0].categories = categoriesResult.rows;

    res.json(fullIncome.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Confirm income error:', error);
    res.status(500).json({ error: 'אישור הכנסה נכשל' });
  } finally {
    client.release();
  }
}
