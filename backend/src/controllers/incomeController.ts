import { Request, Response } from 'express';
import pool from '../config/database';

export async function getIncomes(req: Request, res: Response) {
  try {
    const { budgetId, startDate, endDate, source, categoryId, year, month } = req.query;

    let query = `
      SELECT i.*, u.full_name as user_name, b.name as budget_name
      FROM incomes i
      JOIN users u ON i.user_id = u.id
      JOIN budgets b ON i.budget_id = b.id
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
    const { budgetId, amount, source, description, incomeDate, categoryIds } = req.body;
    const user = req.user!;

    await client.query('BEGIN');

    // Insert income
    const result = await client.query(
      `INSERT INTO incomes (budget_id, user_id, amount, source, description, income_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [budgetId, user.userId, amount, source, description || null, incomeDate]
    );

    const income = result.rows[0];

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
  try {
    const { id } = req.params;
    const { amount, description, incomeDate, source } = req.body;
    const user = req.user!;

    // Check if income exists
    const existing = await pool.query(
      'SELECT id FROM incomes WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'הכנסה לא נמצאה' });
    }

    // Only treasurers can update incomes
    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      return res.status(403).json({ error: 'רק גזברים יכולים לעדכן הכנסות' });
    }

    // Update income
    const result = await pool.query(
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
    console.error('Update income error:', error);
    res.status(500).json({ error: 'עדכון הכנסה נכשל' });
  }
}

export async function assignCategories(req: Request, res: Response) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { categoryIds } = req.body;
    const user = req.user!;

    // Check if income exists
    const existing = await pool.query(
      'SELECT id FROM incomes WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'הכנסה לא נמצאה' });
    }

    // Only treasurers can assign categories
    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      return res.status(403).json({ error: 'רק גזברים יכולים לשייך קטגוריות' });
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
  try {
    const { id } = req.params;
    const user = req.user!;

    // Check ownership or treasurer permission
    const existing = await pool.query(
      'SELECT user_id FROM incomes WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Income not found' });
    }

    if (existing.rows[0].user_id !== user.userId && !user.isCircleTreasurer && !user.isGroupTreasurer) {
      return res.status(403).json({ error: 'Cannot delete others incomes' });
    }

    await pool.query('DELETE FROM incomes WHERE id = $1', [id]);

    res.json({ message: 'Income deleted successfully' });
  } catch (error) {
    console.error('Delete income error:', error);
    res.status(500).json({ error: 'Failed to delete income' });
  }
}
