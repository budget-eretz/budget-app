import { Request, Response } from 'express';
import pool from '../config/database';

export async function getMyReimbursements(req: Request, res: Response) {
  try {
    const { status } = req.query;
    const user = req.user!;

    let query = `
      SELECT r.*, f.name as fund_name, f.budget_id,
             submitter.full_name as user_name, submitter.email as user_email,
             recipient.full_name as recipient_name, recipient.email as recipient_email,
             reviewer.full_name as reviewer_name
      FROM reimbursements r
      JOIN funds f ON r.fund_id = f.id
      JOIN users submitter ON r.user_id = submitter.id
      LEFT JOIN users recipient ON r.recipient_user_id = recipient.id
      LEFT JOIN users reviewer ON r.reviewed_by = reviewer.id
      WHERE (r.user_id = $1 OR r.recipient_user_id = $1)
    `;

    const params: any[] = [user.userId];

    if (status) {
      query += ` AND r.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ' ORDER BY r.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get my reimbursements error:', error);
    res.status(500).json({ error: 'Failed to get reimbursements' });
  }
}

export async function getReimbursements(req: Request, res: Response) {
  try {
    const { fundId, status } = req.query;
    const user = req.user!;

    let query = `
      SELECT r.*, f.name as fund_name, f.budget_id,
             submitter.full_name as user_name, submitter.email as user_email,
             recipient.full_name as recipient_name, recipient.email as recipient_email,
             reviewer.full_name as reviewer_name
      FROM reimbursements r
      JOIN funds f ON r.fund_id = f.id
      JOIN users submitter ON r.user_id = submitter.id
      LEFT JOIN users recipient ON r.recipient_user_id = recipient.id
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
              submitter.full_name as user_name, submitter.email as user_email,
              recipient.full_name as recipient_name, recipient.email as recipient_email,
              reviewer.full_name as reviewer_name
       FROM reimbursements r
       JOIN funds f ON r.fund_id = f.id
       JOIN users submitter ON r.user_id = submitter.id
       LEFT JOIN users recipient ON r.recipient_user_id = recipient.id
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
    const { fundId, amount, description, expenseDate, receiptUrl, recipientUserId } = req.body;
    const user = req.user!;

    // Validate fund access
    const { validateFundAccess } = await import('../middleware/accessControl');
    const hasAccess = await validateFundAccess(user.userId, fundId);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'אין לך הרשאה לגשת לקופה זו' });
    }

    // Default recipient to submitter if not provided
    const finalRecipientId = recipientUserId || user.userId;

    // Validate recipient exists if provided
    if (recipientUserId) {
      const recipientCheck = await pool.query(
        'SELECT id FROM users WHERE id = $1',
        [recipientUserId]
      );
      
      if (recipientCheck.rows.length === 0) {
        return res.status(400).json({ error: 'משתמש מקבל לא תקין' });
      }
    }

    const result = await pool.query(
      `INSERT INTO reimbursements (fund_id, user_id, recipient_user_id, amount, description, expense_date, receipt_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [fundId, user.userId, finalRecipientId, amount, description, expenseDate, receiptUrl || null]
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
    const { amount, description, expenseDate, receiptUrl, recipientUserId } = req.body;
    const user = req.user!;

    // Validate ownership using middleware function
    const { validateReimbursementOwnership } = await import('../middleware/accessControl');
    const isOwner = await validateReimbursementOwnership(user.userId, parseInt(id));
    
    if (!isOwner) {
      return res.status(403).json({ error: 'אין לך הרשאה לערוך בקשה זו' });
    }

    // Check that it's still pending
    const existing = await pool.query(
      'SELECT status FROM reimbursements WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'בקשת החזר לא נמצאה' });
    }

    if (existing.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'לא ניתן לערוך בקשה שכבר אושרה' });
    }

    // Validate recipient exists if provided
    if (recipientUserId) {
      const recipientCheck = await pool.query(
        'SELECT id FROM users WHERE id = $1',
        [recipientUserId]
      );
      
      if (recipientCheck.rows.length === 0) {
        return res.status(400).json({ error: 'משתמש מקבל לא תקין' });
      }
    }

    const result = await pool.query(
      `UPDATE reimbursements
       SET amount = COALESCE($1, amount),
           description = COALESCE($2, description),
           expense_date = COALESCE($3, expense_date),
           receipt_url = COALESCE($4, receipt_url),
           recipient_user_id = COALESCE($5, recipient_user_id),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [amount, description, expenseDate, receiptUrl, recipientUserId, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update reimbursement error:', error);
    res.status(500).json({ error: 'Failed to update reimbursement' });
  }
}

export async function deleteReimbursement(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user!;

    // Validate ownership using middleware function
    const { validateReimbursementOwnership } = await import('../middleware/accessControl');
    const isOwner = await validateReimbursementOwnership(user.userId, parseInt(id));
    
    if (!isOwner) {
      return res.status(403).json({ error: 'אין לך הרשאה למחוק בקשה זו' });
    }

    // Check that it's still pending
    const existing = await pool.query(
      'SELECT status FROM reimbursements WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'בקשת החזר לא נמצאה' });
    }

    if (existing.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'לא ניתן למחוק בקשה שכבר אושרה' });
    }

    await pool.query('DELETE FROM reimbursements WHERE id = $1', [id]);

    res.json({ message: 'Reimbursement deleted successfully' });
  } catch (error) {
    console.error('Delete reimbursement error:', error);
    res.status(500).json({ error: 'Failed to delete reimbursement' });
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

export async function getMySummary(req: Request, res: Response) {
  try {
    const user = req.user!;

    // Calculate total pending reimbursements
    const reimbursementsResult = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count
       FROM reimbursements
       WHERE recipient_user_id = $1`,
      [user.userId]
    );

    // Calculate total active charges
    const chargesResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_charges
       FROM charges
       WHERE user_id = $1 AND status = 'active'`,
      [user.userId]
    );

    const totalReimbursements = parseFloat(reimbursementsResult.rows[0].total_pending) || 0;
    const totalCharges = parseFloat(chargesResult.rows[0].total_charges) || 0;
    const netAmount = totalReimbursements - totalCharges;

    res.json({
      totalReimbursements,
      totalCharges,
      netAmount,
      pendingCount: parseInt(reimbursementsResult.rows[0].pending_count) || 0,
      approvedCount: parseInt(reimbursementsResult.rows[0].approved_count) || 0
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'Failed to get summary' });
  }
}
