import { Request, Response } from 'express';
import pool from '../config/database';

export async function getBudgets(req: Request, res: Response) {
  try {
    const user = req.user!;
    let query = '';
    let params: any[] = [];

    if (user.isCircleTreasurer) {
      // Circle treasurer can see all budgets
      query = `
        SELECT b.*, g.name as group_name
        FROM budgets b
        LEFT JOIN groups g ON b.group_id = g.id
        ORDER BY b.created_at DESC
      `;
    } else if (user.isGroupTreasurer && user.groupId) {
      // Group treasurer can see their group's budgets
      query = `
        SELECT b.*, g.name as group_name
        FROM budgets b
        LEFT JOIN groups g ON b.group_id = g.id
        WHERE b.group_id = $1
        ORDER BY b.created_at DESC
      `;
      params = [user.groupId];
    } else {
      // Regular members can see budgets related to their group
      if (user.groupId) {
        query = `
          SELECT b.*, g.name as group_name
          FROM budgets b
          LEFT JOIN groups g ON b.group_id = g.id
          WHERE b.group_id = $1 OR b.group_id IS NULL
          ORDER BY b.created_at DESC
        `;
        params = [user.groupId];
      } else {
        // Circle member without group sees only circle budgets
        query = `
          SELECT b.*, g.name as group_name
          FROM budgets b
          LEFT JOIN groups g ON b.group_id = g.id
          WHERE b.group_id IS NULL
          ORDER BY b.created_at DESC
        `;
      }
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({ error: 'Failed to get budgets' });
  }
}

export async function getBudgetById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT b.*, g.name as group_name,
              (SELECT COALESCE(SUM(amount), 0) FROM incomes WHERE budget_id = b.id) as total_income
       FROM budgets b
       LEFT JOIN groups g ON b.group_id = g.id
       WHERE b.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get budget error:', error);
    res.status(500).json({ error: 'Failed to get budget' });
  }
}

export async function createBudget(req: Request, res: Response) {
  try {
    const { name, totalAmount, groupId, fiscalYear } = req.body;
    const user = req.user!;

    // Validate permissions
    if (groupId && !user.isCircleTreasurer) {
      return res.status(403).json({ error: 'Only circle treasurer can create group budgets' });
    }

    if (!groupId && !user.isCircleTreasurer) {
      return res.status(403).json({ error: 'Only circle treasurer can create circle budgets' });
    }

    const result = await pool.query(
      `INSERT INTO budgets (name, total_amount, group_id, fiscal_year, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, totalAmount, groupId || null, fiscalYear || null, user.userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create budget error:', error);
    res.status(500).json({ error: 'Failed to create budget' });
  }
}

export async function updateBudget(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, totalAmount, fiscalYear } = req.body;

    const result = await pool.query(
      `UPDATE budgets
       SET name = COALESCE($1, name),
           total_amount = COALESCE($2, total_amount),
           fiscal_year = COALESCE($3, fiscal_year),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name, totalAmount, fiscalYear, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update budget error:', error);
    res.status(500).json({ error: 'Failed to update budget' });
  }
}

export async function transferBudget(req: Request, res: Response) {
  try {
    const { fromBudgetId, toBudgetId, amount, description } = req.body;
    const user = req.user!;

    if (!user.isCircleTreasurer) {
      return res.status(403).json({ error: 'Only circle treasurer can transfer budgets' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check from budget has enough funds
      const fromBudget = await client.query(
        'SELECT total_amount FROM budgets WHERE id = $1',
        [fromBudgetId]
      );

      if (fromBudget.rows.length === 0) {
        throw new Error('Source budget not found');
      }

      // Update budgets
      await client.query(
        'UPDATE budgets SET total_amount = total_amount - $1, updated_at = NOW() WHERE id = $2',
        [amount, fromBudgetId]
      );

      await client.query(
        'UPDATE budgets SET total_amount = total_amount + $1, updated_at = NOW() WHERE id = $2',
        [amount, toBudgetId]
      );

      // Record transfer
      const transfer = await client.query(
        `INSERT INTO budget_transfers (from_budget_id, to_budget_id, amount, transferred_by, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [fromBudgetId, toBudgetId, amount, user.userId, description || null]
      );

      await client.query('COMMIT');

      res.status(201).json(transfer.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Transfer budget error:', error);
    res.status(500).json({ error: 'Failed to transfer budget' });
  }
}
