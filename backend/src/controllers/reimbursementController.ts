import { Request, Response } from 'express';
import pool from '../config/database';

export async function getReimbursements(req: Request, res: Response) {
  try {
    const { fundId, status } = req.query;
    const user = req.user!;

    let query = `
      SELECT r.*, f.name as fund_name, f.budget_id,
             u.full_name as user_name, u.email as user_email,
             reviewer.full_name as reviewer_name
      FROM reimbursements r
      JOIN funds f ON r.fund_id = f.id
      JOIN users u ON r.user_id = u.id
      LEFT JOIN users reviewer ON r.reviewed_by = reviewer.id
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    if (fundId) {
      conditions.push(`r.fund_id = $${params.length + 1}`);
      params.push(fundId);
    }

    if (status) {
      conditions.push(`r.status = $${params.length + 1}`);
      params.push(status);
    }

    // Regular users can only see their own reimbursements
    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      conditions.push(`r.user_id = $${params.length + 1}`);
      params.push(user.userId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY r.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get reimbursements error:', error);
    res.status(500).json({ error: 'Failed to get reimbursements' });
  }
}

export async function getReimbursementById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT r.*, f.name as fund_name, f.budget_id,
              u.full_name as user_name, u.email as user_email,
              reviewer.full_name as reviewer_name
       FROM reimbursements r
       JOIN funds f ON r.fund_id = f.id
       JOIN users u ON r.user_id = u.id
       LEFT JOIN users reviewer ON r.reviewed_by = reviewer.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reimbursement not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get reimbursement error:', error);
    res.status(500).json({ error: 'Failed to get reimbursement' });
  }
}

export async function createReimbursement(req: Request, res: Response) {
  try {
    const { fundId, amount, description, expenseDate, receiptUrl } = req.body;
    const user = req.user!;

    const result = await pool.query(
      `INSERT INTO reimbursements (fund_id, user_id, amount, description, expense_date, receipt_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [fundId, user.userId, amount, description, expenseDate, receiptUrl || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create reimbursement error:', error);
    res.status(500).json({ error: 'Failed to create reimbursement' });
  }
}

export async function updateReimbursement(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { amount, description, expenseDate, receiptUrl } = req.body;
    const user = req.user!;

    // Check ownership and that it's still pending
    const existing = await pool.query(
      'SELECT user_id, status FROM reimbursements WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Reimbursement not found' });
    }

    if (existing.rows[0].user_id !== user.userId) {
      return res.status(403).json({ error: 'Cannot update others reimbursements' });
    }

    if (existing.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Can only update pending reimbursements' });
    }

    const result = await pool.query(
      `UPDATE reimbursements
       SET amount = COALESCE($1, amount),
           description = COALESCE($2, description),
           expense_date = COALESCE($3, expense_date),
           receipt_url = COALESCE($4, receipt_url),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [amount, description, expenseDate, receiptUrl, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update reimbursement error:', error);
    res.status(500).json({ error: 'Failed to update reimbursement' });
  }
}

export async function approveReimbursement(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const user = req.user!;

    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      return res.status(403).json({ error: 'Treasurer access required' });
    }

    // Check reimbursement exists and is pending
    const existing = await pool.query(
      'SELECT status FROM reimbursements WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Reimbursement not found' });
    }

    if (existing.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Reimbursement is not pending' });
    }

    const result = await pool.query(
      `UPDATE reimbursements
       SET status = 'approved',
           reviewed_by = $1,
           reviewed_at = NOW(),
           notes = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [user.userId, notes || null, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Approve reimbursement error:', error);
    res.status(500).json({ error: 'Failed to approve reimbursement' });
  }
}

export async function rejectReimbursement(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const user = req.user!;

    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      return res.status(403).json({ error: 'Treasurer access required' });
    }

    const existing = await pool.query(
      'SELECT status FROM reimbursements WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Reimbursement not found' });
    }

    if (existing.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Reimbursement is not pending' });
    }

    const result = await pool.query(
      `UPDATE reimbursements
       SET status = 'rejected',
           reviewed_by = $1,
           reviewed_at = NOW(),
           notes = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [user.userId, notes || null, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Reject reimbursement error:', error);
    res.status(500).json({ error: 'Failed to reject reimbursement' });
  }
}

export async function markAsPaid(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user!;

    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      return res.status(403).json({ error: 'Treasurer access required' });
    }

    const existing = await pool.query(
      'SELECT status FROM reimbursements WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Reimbursement not found' });
    }

    if (existing.rows[0].status !== 'approved') {
      return res.status(400).json({ error: 'Can only mark approved reimbursements as paid' });
    }

    const result = await pool.query(
      `UPDATE reimbursements
       SET status = 'paid',
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Mark as paid error:', error);
    res.status(500).json({ error: 'Failed to mark as paid' });
  }
}
