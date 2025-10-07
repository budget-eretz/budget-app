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

export async function markForReview(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const user = req.user!;

    // Check treasurer permissions
    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      return res.status(403).json({ error: 'נדרשת הרשאת גזבר' });
    }

    // Check reimbursement exists and is pending
    const existing = await pool.query(
      'SELECT status FROM reimbursements WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'בקשת החזר לא נמצאה' });
    }

    if (existing.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'ניתן לסמן לבדיקה רק בקשות ממתינות' });
    }

    // Update status to under_review
    const result = await pool.query(
      `UPDATE reimbursements
       SET status = 'under_review',
           under_review_by = $1,
           under_review_at = NOW(),
           review_notes = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [user.userId, notes || null, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Mark for review error:', error);
    res.status(500).json({ error: 'שגיאה בסימון לבדיקה' });
  }
}

export async function returnToPending(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user!;

    // Check treasurer permissions
    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      return res.status(403).json({ error: 'נדרשת הרשאת גזבר' });
    }

    // Check reimbursement exists and is under_review
    const existing = await pool.query(
      'SELECT status FROM reimbursements WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'בקשת החזר לא נמצאה' });
    }

    if (existing.rows[0].status !== 'under_review') {
      return res.status(400).json({ error: 'ניתן להחזיר לממתין רק בקשות שבבדיקה' });
    }

    // Update status back to pending and clear under_review fields
    const result = await pool.query(
      `UPDATE reimbursements
       SET status = 'pending',
           under_review_by = NULL,
           under_review_at = NULL,
           review_notes = NULL,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Return to pending error:', error);
    res.status(500).json({ error: 'שגיאה בהחזרה לממתין' });
  }
}

export async function batchApprove(req: Request, res: Response) {
  const client = await pool.connect();
  
  try {
    const { reimbursementIds, notes } = req.body;
    const user = req.user!;

    // Check treasurer permissions
    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      return res.status(403).json({ error: 'נדרשת הרשאת גזבר' });
    }

    // Validate input
    if (!Array.isArray(reimbursementIds) || reimbursementIds.length === 0) {
      return res.status(400).json({ error: 'יש לספק מערך של מזהי החזרים' });
    }

    await client.query('BEGIN');

    const successes: number[] = [];
    const errors: Array<{ id: number; error: string }> = [];

    // Process each reimbursement
    for (const id of reimbursementIds) {
      try {
        // Check if reimbursement exists and is in valid status
        const checkResult = await client.query(
          'SELECT id, status FROM reimbursements WHERE id = $1',
          [id]
        );

        if (checkResult.rows.length === 0) {
          errors.push({ id, error: 'בקשת החזר לא נמצאה' });
          continue;
        }

        const status = checkResult.rows[0].status;
        if (status !== 'pending' && status !== 'under_review') {
          errors.push({ id, error: 'ניתן לאשר רק בקשות ממתינות או בבדיקה' });
          continue;
        }

        // Approve the reimbursement
        await client.query(
          `UPDATE reimbursements
           SET status = 'approved',
               reviewed_by = $1,
               reviewed_at = NOW(),
               notes = $2,
               updated_at = NOW()
           WHERE id = $3`,
          [user.userId, notes || null, id]
        );

        successes.push(id);
      } catch (error) {
        console.error(`Error approving reimbursement ${id}:`, error);
        errors.push({ id, error: 'שגיאה באישור בקשה' });
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      updated: successes.length,
      successIds: successes,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Batch approve error:', error);
    res.status(500).json({ error: 'שגיאה באישור מרובה' });
  } finally {
    client.release();
  }
}

export async function batchReject(req: Request, res: Response) {
  const client = await pool.connect();
  
  try {
    const { reimbursementIds, rejectionReason } = req.body;
    const user = req.user!;

    // Check treasurer permissions
    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      return res.status(403).json({ error: 'נדרשת הרשאת גזבר' });
    }

    // Validate input
    if (!Array.isArray(reimbursementIds) || reimbursementIds.length === 0) {
      return res.status(400).json({ error: 'יש לספק מערך של מזהי החזרים' });
    }

    if (!rejectionReason || rejectionReason.trim() === '') {
      return res.status(400).json({ error: 'יש לספק סיבת דחייה' });
    }

    await client.query('BEGIN');

    const successes: number[] = [];
    const errors: Array<{ id: number; error: string }> = [];

    // Process each reimbursement
    for (const id of reimbursementIds) {
      try {
        // Check if reimbursement exists and is in valid status
        const checkResult = await client.query(
          'SELECT id, status FROM reimbursements WHERE id = $1',
          [id]
        );

        if (checkResult.rows.length === 0) {
          errors.push({ id, error: 'בקשת החזר לא נמצאה' });
          continue;
        }

        const status = checkResult.rows[0].status;
        if (status !== 'pending' && status !== 'under_review') {
          errors.push({ id, error: 'ניתן לדחות רק בקשות ממתינות או בבדיקה' });
          continue;
        }

        // Reject the reimbursement
        await client.query(
          `UPDATE reimbursements
           SET status = 'rejected',
               reviewed_by = $1,
               reviewed_at = NOW(),
               notes = $2,
               updated_at = NOW()
           WHERE id = $3`,
          [user.userId, rejectionReason, id]
        );

        successes.push(id);
      } catch (error) {
        console.error(`Error rejecting reimbursement ${id}:`, error);
        errors.push({ id, error: 'שגיאה בדחיית בקשה' });
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      updated: successes.length,
      successIds: successes,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Batch reject error:', error);
    res.status(500).json({ error: 'שגיאה בדחייה מרובה' });
  } finally {
    client.release();
  }
}

export async function batchMarkForReview(req: Request, res: Response) {
  const client = await pool.connect();
  
  try {
    const { reimbursementIds, notes } = req.body;
    const user = req.user!;

    // Check treasurer permissions
    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      return res.status(403).json({ error: 'נדרשת הרשאת גזבר' });
    }

    // Validate input
    if (!Array.isArray(reimbursementIds) || reimbursementIds.length === 0) {
      return res.status(400).json({ error: 'יש לספק מערך של מזהי החזרים' });
    }

    await client.query('BEGIN');

    const successes: number[] = [];
    const errors: Array<{ id: number; error: string }> = [];

    // Process each reimbursement
    for (const id of reimbursementIds) {
      try {
        // Check if reimbursement exists and is pending
        const checkResult = await client.query(
          'SELECT id, status FROM reimbursements WHERE id = $1',
          [id]
        );

        if (checkResult.rows.length === 0) {
          errors.push({ id, error: 'בקשת החזר לא נמצאה' });
          continue;
        }

        const status = checkResult.rows[0].status;
        if (status !== 'pending') {
          errors.push({ id, error: 'ניתן לסמן לבדיקה רק בקשות ממתינות' });
          continue;
        }

        // Mark for review
        await client.query(
          `UPDATE reimbursements
           SET status = 'under_review',
               under_review_by = $1,
               under_review_at = NOW(),
               review_notes = $2,
               updated_at = NOW()
           WHERE id = $3`,
          [user.userId, notes || null, id]
        );

        successes.push(id);
      } catch (error) {
        console.error(`Error marking reimbursement ${id} for review:`, error);
        errors.push({ id, error: 'שגיאה בסימון לבדיקה' });
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      updated: successes.length,
      successIds: successes,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Batch mark for review error:', error);
    res.status(500).json({ error: 'שגיאה בסימון מרובה לבדיקה' });
  } finally {
    client.release();
  }
}

export async function batchMarkAsPaid(req: Request, res: Response) {
  const client = await pool.connect();
  
  try {
    const { reimbursementIds } = req.body;
    const user = req.user!;

    // Check treasurer permissions
    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      return res.status(403).json({ error: 'נדרשת הרשאת גזבר' });
    }

    // Validate input
    if (!Array.isArray(reimbursementIds) || reimbursementIds.length === 0) {
      return res.status(400).json({ error: 'יש לספק מערך של מזהי החזרים' });
    }

    await client.query('BEGIN');

    const successes: number[] = [];
    const errors: Array<{ id: number; error: string }> = [];

    // Process each reimbursement
    for (const id of reimbursementIds) {
      try {
        // Check if reimbursement exists and is approved
        const checkResult = await client.query(
          'SELECT id, status FROM reimbursements WHERE id = $1',
          [id]
        );

        if (checkResult.rows.length === 0) {
          errors.push({ id, error: 'בקשת החזר לא נמצאה' });
          continue;
        }

        const status = checkResult.rows[0].status;
        if (status !== 'approved') {
          errors.push({ id, error: 'ניתן לסמן כשולם רק בקשות מאושרות' });
          continue;
        }

        // Mark as paid
        await client.query(
          `UPDATE reimbursements
           SET status = 'paid',
               updated_at = NOW()
           WHERE id = $1`,
          [id]
        );

        successes.push(id);
      } catch (error) {
        console.error(`Error marking reimbursement ${id} as paid:`, error);
        errors.push({ id, error: 'שגיאה בסימון כשולם' });
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      updated: successes.length,
      successIds: successes,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Batch mark as paid error:', error);
    res.status(500).json({ error: 'שגיאה בסימון מרובה כשולם' });
  } finally {
    client.release();
  }
}

export async function getTreasurerReimbursements(req: Request, res: Response) {
  try {
    const { groupBy } = req.query;
    const user = req.user!;

    // Check treasurer permissions
    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      return res.status(403).json({ error: 'נדרשת הרשאת גזבר' });
    }

    // Base query with all necessary joins
    let baseQuery = `
      SELECT r.*, 
             f.name as fund_name, 
             f.budget_id,
             b.name as budget_name,
             CASE WHEN b.group_id IS NULL THEN 'circle' ELSE 'group' END as budget_type,
             submitter.full_name as user_name, 
             submitter.email as user_email,
             recipient.full_name as recipient_name, 
             recipient.email as recipient_email,
             reviewer.full_name as reviewer_name,
             under_reviewer.full_name as under_review_by_name
      FROM reimbursements r
      JOIN funds f ON r.fund_id = f.id
      JOIN budgets b ON f.budget_id = b.id
      JOIN users submitter ON r.user_id = submitter.id
      LEFT JOIN users recipient ON r.recipient_user_id = recipient.id
      LEFT JOIN users reviewer ON r.reviewed_by = reviewer.id
      LEFT JOIN users under_reviewer ON r.under_review_by = under_reviewer.id
    `;

    // Apply access control for group treasurers
    if (!user.isCircleTreasurer && user.isGroupTreasurer) {
      // Group treasurer: only see reimbursements from their groups' budgets
      baseQuery += `
        WHERE b.id IN (
          SELECT id 
          FROM budgets 
          WHERE group_id IS NULL
          UNION
          SELECT id 
          FROM budgets 
          WHERE group_id IN (
            SELECT group_id 
            FROM user_groups 
            WHERE user_id = ${user.userId}
          )
        )
      `;
    }

    baseQuery += ' ORDER BY r.created_at DESC';

    // Fetch all reimbursements
    const result = await pool.query(baseQuery);
    const allReimbursements = result.rows;

    // Group by status
    const pending = allReimbursements.filter(r => r.status === 'pending');
    const under_review = allReimbursements.filter(r => r.status === 'under_review');
    const approved = allReimbursements.filter(r => r.status === 'approved');
    const rejected = allReimbursements.filter(r => r.status === 'rejected');
    const paid = allReimbursements.filter(r => r.status === 'paid');

    // Calculate summary
    const summary = {
      pendingCount: pending.length,
      underReviewCount: under_review.length,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      paidCount: paid.length,
      totalPendingAmount: pending.reduce((sum, r) => sum + parseFloat(r.amount), 0),
      totalApprovedAmount: approved.reduce((sum, r) => sum + parseFloat(r.amount), 0)
    };

    res.json({
      pending,
      under_review,
      approved,
      rejected,
      paid,
      summary
    });
  } catch (error) {
    console.error('Get treasurer reimbursements error:', error);
    res.status(500).json({ error: 'שגיאה בטעינת החזרים' });
  }
}
