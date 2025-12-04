import { Request, Response } from 'express';
import pool from '../config/database';

export async function getPlannedExpenses(req: Request, res: Response) {
  try {
    const { fundId } = req.query;
    const user = req.user!;

    let query = `
      SELECT pe.*, f.name as fund_name, u.full_name as user_name
      FROM planned_expenses pe
      JOIN funds f ON pe.fund_id = f.id
      JOIN users u ON pe.user_id = u.id
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    if (fundId) {
      conditions.push(`pe.fund_id = $${params.length + 1}`);
      params.push(fundId);
    }

    // Regular users can only see their own planned expenses
    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      conditions.push(`pe.user_id = $${params.length + 1}`);
      params.push(user.userId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY pe.planned_date DESC, pe.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get planned expenses error:', error);
    res.status(500).json({ error: 'Failed to get planned expenses' });
  }
}

export async function createPlannedExpense(req: Request, res: Response) {
  try {
    const { fundId, amount, description, plannedDate } = req.body;
    const user = req.user!;

    // Validate required fields
    if (!plannedDate) {
      return res.status(400).json({ error: 'תאריך מתוכנן הוא שדה חובה' });
    }

    const result = await pool.query(
      `INSERT INTO planned_expenses (fund_id, user_id, amount, description, planned_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [fundId, user.userId, amount, description, plannedDate]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create planned expense error:', error);
    res.status(500).json({ error: 'Failed to create planned expense' });
  }
}

export async function updatePlannedExpense(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { fundId, amount, description, plannedDate, status } = req.body;
    const user = req.user!;

    // Check ownership
    const existing = await pool.query(
      'SELECT user_id FROM planned_expenses WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Planned expense not found' });
    }

    if (existing.rows[0].user_id !== user.userId && !user.isCircleTreasurer && !user.isGroupTreasurer) {
      return res.status(403).json({ error: 'Cannot update others planned expenses' });
    }

    // Validate fund access if fundId is being changed
    if (fundId) {
      const { validateFundAccess } = await import('../middleware/accessControl');
      const hasAccess = await validateFundAccess(user.userId, fundId);

      if (!hasAccess) {
        return res.status(403).json({ error: 'אין לך הרשאה לסעיף זה' });
      }
    }

    const result = await pool.query(
      `UPDATE planned_expenses
       SET fund_id = COALESCE($1, fund_id),
           amount = COALESCE($2, amount),
           description = COALESCE($3, description),
           planned_date = COALESCE($4, planned_date),
           status = COALESCE($5, status),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [fundId, amount, description, plannedDate, status, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update planned expense error:', error);
    res.status(500).json({ error: 'Failed to update planned expense' });
  }
}

export async function deletePlannedExpense(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user!;

    // Check ownership
    const existing = await pool.query(
      'SELECT user_id FROM planned_expenses WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Planned expense not found' });
    }

    if (existing.rows[0].user_id !== user.userId && !user.isCircleTreasurer && !user.isGroupTreasurer) {
      return res.status(403).json({ error: 'Cannot delete others planned expenses' });
    }

    await pool.query('DELETE FROM planned_expenses WHERE id = $1', [id]);

    res.json({ message: 'Planned expense deleted successfully' });
  } catch (error) {
    console.error('Delete planned expense error:', error);
    res.status(500).json({ error: 'Failed to delete planned expense' });
  }
}

export async function getPlannedExpenseById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user!;

    const result = await pool.query(
      `SELECT pe.*, f.name as fund_name, u.full_name as user_name
       FROM planned_expenses pe
       JOIN funds f ON pe.fund_id = f.id
       JOIN users u ON pe.user_id = u.id
       WHERE pe.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Planned expense not found' });
    }

    const expense = result.rows[0];

    // Check access - only owner or treasurers can view
    if (expense.user_id !== user.userId && !user.isCircleTreasurer && !user.isGroupTreasurer) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(expense);
  } catch (error) {
    console.error('Get planned expense by ID error:', error);
    res.status(500).json({ error: 'Failed to get planned expense' });
  }
}
