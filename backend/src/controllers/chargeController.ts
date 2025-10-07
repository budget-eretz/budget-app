import { Request, Response } from 'express';
import pool from '../config/database';
import { validateFundAccess } from '../middleware/accessControl';

export async function getMyCharges(req: Request, res: Response) {
  try {
    const { status } = req.query;
    const user = req.user!;

    let query = `
      SELECT c.*, f.name as fund_name, f.budget_id
      FROM charges c
      JOIN funds f ON c.fund_id = f.id
      WHERE c.user_id = $1
    `;

    const params: any[] = [user.userId];

    if (status) {
      query += ` AND c.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ' ORDER BY c.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get my charges error:', error);
    res.status(500).json({ error: 'Failed to get charges' });
  }
}

export async function createCharge(req: Request, res: Response) {
  try {
    const { fundId, amount, description, chargeDate } = req.body;
    const user = req.user!;

    // Validate fund access
    const hasAccess = await validateFundAccess(user.userId, fundId);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'אין לך הרשאה לגשת לקופה זו' });
    }

    const result = await pool.query(
      `INSERT INTO charges (fund_id, user_id, amount, description, charge_date, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING *`,
      [fundId, user.userId, amount, description, chargeDate]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create charge error:', error);
    res.status(500).json({ error: 'Failed to create charge' });
  }
}

export async function updateCharge(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { amount, description, chargeDate } = req.body;
    const user = req.user!;

    // Check ownership
    const existing = await pool.query(
      'SELECT user_id, status FROM charges WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Charge not found' });
    }

    if (existing.rows[0].user_id !== user.userId) {
      return res.status(403).json({ error: 'אין לך הרשאה לערוך חיוב זה' });
    }

    if (existing.rows[0].status !== 'active') {
      return res.status(400).json({ error: 'ניתן לערוך רק חיובים פעילים' });
    }

    const result = await pool.query(
      `UPDATE charges
       SET amount = COALESCE($1, amount),
           description = COALESCE($2, description),
           charge_date = COALESCE($3, charge_date),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [amount, description, chargeDate, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update charge error:', error);
    res.status(500).json({ error: 'Failed to update charge' });
  }
}

export async function deleteCharge(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user!;

    // Check ownership
    const existing = await pool.query(
      'SELECT user_id, status FROM charges WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Charge not found' });
    }

    if (existing.rows[0].user_id !== user.userId) {
      return res.status(403).json({ error: 'אין לך הרשאה למחוק חיוב זה' });
    }

    if (existing.rows[0].status !== 'active') {
      return res.status(400).json({ error: 'ניתן למחוק רק חיובים פעילים' });
    }

    await pool.query('DELETE FROM charges WHERE id = $1', [id]);

    res.json({ message: 'Charge deleted successfully' });
  } catch (error) {
    console.error('Delete charge error:', error);
    res.status(500).json({ error: 'Failed to delete charge' });
  }
}
