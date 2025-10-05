import { Request, Response } from 'express';
import pool from '../config/database';

export async function getIncomes(req: Request, res: Response) {
  try {
    const { budgetId } = req.query;

    let query = `
      SELECT i.*, u.full_name as user_name, b.name as budget_name
      FROM incomes i
      JOIN users u ON i.user_id = u.id
      JOIN budgets b ON i.budget_id = b.id
    `;

    const params: any[] = [];

    if (budgetId) {
      query += ' WHERE i.budget_id = $1';
      params.push(budgetId);
    }

    query += ' ORDER BY i.income_date DESC, i.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get incomes error:', error);
    res.status(500).json({ error: 'Failed to get incomes' });
  }
}

export async function createIncome(req: Request, res: Response) {
  try {
    const { budgetId, amount, source, description, incomeDate } = req.body;
    const user = req.user!;

    const result = await pool.query(
      `INSERT INTO incomes (budget_id, user_id, amount, source, description, income_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [budgetId, user.userId, amount, source, description || null, incomeDate]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create income error:', error);
    res.status(500).json({ error: 'Failed to create income' });
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
