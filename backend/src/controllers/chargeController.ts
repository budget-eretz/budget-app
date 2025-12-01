import { Request, Response } from 'express';
import pool from '../config/database';
import { associateChargeWithTransfer } from '../utils/paymentTransferHelpers';

export async function getMyCharges(req: Request, res: Response) {
  try {
    const { status } = req.query;
    const user = req.user!;

    let query = `
      SELECT c.*, f.name as fund_name, f.budget_id,
             u.full_name as user_name, u.email as user_email,
             reviewer.full_name as reviewer_name
      FROM charges c
      JOIN funds f ON c.fund_id = f.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN users reviewer ON c.reviewed_by = reviewer.id
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

export async function getCharges(req: Request, res: Response) {
  try {
    const { fundId, status } = req.query;
    const user = req.user!;

    let query = `
      SELECT c.*, f.name as fund_name, f.budget_id,
             u.full_name as user_name, u.email as user_email,
             reviewer.full_name as reviewer_name
      FROM charges c
      JOIN funds f ON c.fund_id = f.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN users reviewer ON c.reviewed_by = reviewer.id
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    if (fundId) {
      conditions.push(`c.fund_id = $${params.length + 1}`);
      params.push(fundId);
    }

    if (status) {
      conditions.push(`c.status = $${params.length + 1}`);
      params.push(status);
    }

    // Regular users can only see their own charges
    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      conditions.push(`c.user_id = $${params.length + 1}`);
      params.push(user.userId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY c.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get charges error:', error);
    res.status(500).json({ error: 'Failed to get charges' });
  }
}

export async function getChargeById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT c.*, f.name as fund_name, f.budget_id,
              u.full_name as user_name, u.email as user_email,
              reviewer.full_name as reviewer_name
       FROM charges c
       JOIN funds f ON c.fund_id = f.id
       JOIN users u ON c.user_id = u.id
       LEFT JOIN users reviewer ON c.reviewed_by = reviewer.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Charge not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get charge error:', error);
    res.status(500).json({ error: 'Failed to get charge' });
  }
}

export async function createCharge(req: Request, res: Response) {
  try {
    const { fundId, amount, description, chargeDate } = req.body;
    const user = req.user!;

    // Validate fund access
    const { validateFundAccess } = await import('../middleware/accessControl');
    const hasAccess = await validateFundAccess(user.userId, fundId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'אין לך הרשאה לגשת לסעיף זה' });
    }

    const result = await pool.query(
      `INSERT INTO charges (fund_id, user_id, amount, description, charge_date, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
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
      return res.status(404).json({ error: 'חיוב לא נמצא' });
    }

    if (existing.rows[0].user_id !== user.userId) {
      return res.status(403).json({ error: 'אין לך הרשאה לערוך חיוב זה' });
    }

    // Allow editing only for pending and under_review statuses
    if (existing.rows[0].status !== 'pending' && existing.rows[0].status !== 'under_review') {
      return res.status(400).json({ error: 'לא ניתן לערוך חיוב שכבר אושר או נדחה' });
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
      return res.status(404).json({ error: 'חיוב לא נמצא' });
    }

    if (existing.rows[0].user_id !== user.userId) {
      return res.status(403).json({ error: 'אין לך הרשאה למחוק חיוב זה' });
    }

    // Allow deleting only for pending and under_review statuses
    if (existing.rows[0].status !== 'pending' && existing.rows[0].status !== 'under_review') {
      return res.status(400).json({ error: 'לא ניתן למחוק חיוב שכבר אושר או נדחה' });
    }

    await pool.query('DELETE FROM charges WHERE id = $1', [id]);

    res.json({ message: 'Charge deleted successfully' });
  } catch (error) {
    console.error('Delete charge error:', error);
    res.status(500).json({ error: 'Failed to delete charge' });
  }
}

export async function markForReview(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const user = req.user!;

    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      return res.status(403).json({ error: 'נדרשת הרשאת גזבר' });
    }

    const existing = await pool.query(
      'SELECT status FROM charges WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'חיוב לא נמצא' });
    }

    if (existing.rows[0].status === 'paid') {
      return res.status(400).json({ error: 'לא ניתן לשנות סטטוס של חיוב ששולם' });
    }

    if (existing.rows[0].status === 'under_review') {
      return res.status(400).json({ error: 'החיוב כבר בבדיקה' });
    }

    const result = await pool.query(
      `UPDATE charges
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
    console.error('Mark charge for review error:', error);
    res.status(500).json({ error: 'שגיאה בסימון לבדיקה' });
  }
}

export async function returnToPending(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user!;

    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      return res.status(403).json({ error: 'נדרשת הרשאת גזבר' });
    }

    const existing = await pool.query(
      'SELECT status FROM charges WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'חיוב לא נמצא' });
    }

    if (existing.rows[0].status === 'paid') {
      return res.status(400).json({ error: 'לא ניתן לשנות סטטוס של חיוב ששולם' });
    }

    if (existing.rows[0].status === 'pending') {
      return res.status(400).json({ error: 'החיוב כבר בסטטוס ממתין' });
    }

    const result = await pool.query(
      `UPDATE charges
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
    console.error('Return charge to pending error:', error);
    res.status(500).json({ error: 'שגיאה בהחזרה לממתין' });
  }
}

export async function batchApprove(req: Request, res: Response) {
  let client;

  try {
    const { chargeIds, notes } = req.body;
    const user = req.user!;

    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      return res.status(403).json({ error: 'נדרשת הרשאת גזבר' });
    }

    if (!Array.isArray(chargeIds) || chargeIds.length === 0) {
      return res.status(400).json({ error: 'יש לספק מערך של מזהי חיובים' });
    }

    try {
      client = await pool.connect();
    } catch (connError) {
      console.error('Failed to get database connection:', connError);
      return res.status(503).json({ error: 'שגיאת חיבור למסד נתונים. נסה שוב.' });
    }

    await client.query('BEGIN');

    const successes: number[] = [];
    const errors: Array<{ id: number; error: string }> = [];

    for (const id of chargeIds) {
      try {
        const checkResult = await client.query(
          'SELECT id, status, user_id, fund_id FROM charges WHERE id = $1',
          [id]
        );

        if (checkResult.rows.length === 0) {
          errors.push({ id, error: 'חיוב לא נמצא' });
          continue;
        }

        const status = checkResult.rows[0].status;
        if (status === 'paid') {
          errors.push({ id, error: 'לא ניתן לשנות סטטוס של חיוב ששולם' });
          continue;
        }
        if (status === 'approved') {
          errors.push({ id, error: 'החיוב כבר מאושר' });
          continue;
        }

        await client.query(
          `UPDATE charges
           SET status = 'approved',
               reviewed_by = $1,
               reviewed_at = NOW(),
               notes = $2,
               updated_at = NOW()
           WHERE id = $3`,
          [user.userId, notes || null, id]
        );

        // Associate with payment transfer
        await associateChargeWithTransfer(
          id,
          checkResult.rows[0].user_id,
          checkResult.rows[0].fund_id,
          client
        );

        successes.push(id);
      } catch (error) {
        console.error(`Error approving charge ${id}:`, error);
        errors.push({ id, error: 'שגיאה באישור חיוב' });
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      updated: successes.length,
      successIds: successes,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }
    }

    console.error('Batch approve charges error:', error);

    if (error.code === '57P01' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({ error: 'שגיאת חיבור למסד נתונים. נסה שוב.' });
    }

    res.status(500).json({ error: 'שגיאה באישור מרובה' });
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('Error releasing client:', releaseError);
      }
    }
  }
}

export async function batchReject(req: Request, res: Response) {
  let client;

  try {
    const { chargeIds, rejectionReason } = req.body;
    const user = req.user!;

    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      return res.status(403).json({ error: 'נדרשת הרשאת גזבר' });
    }

    if (!Array.isArray(chargeIds) || chargeIds.length === 0) {
      return res.status(400).json({ error: 'יש לספק מערך של מזהי חיובים' });
    }

    if (!rejectionReason || rejectionReason.trim() === '') {
      return res.status(400).json({ error: 'יש לספק סיבת דחייה' });
    }

    try {
      client = await pool.connect();
    } catch (connError) {
      console.error('Failed to get database connection:', connError);
      return res.status(503).json({ error: 'שגיאת חיבור למסד נתונים. נסה שוב.' });
    }

    await client.query('BEGIN');

    const successes: number[] = [];
    const errors: Array<{ id: number; error: string }> = [];

    for (const id of chargeIds) {
      try {
        const checkResult = await client.query(
          'SELECT id, status FROM charges WHERE id = $1',
          [id]
        );

        if (checkResult.rows.length === 0) {
          errors.push({ id, error: 'חיוב לא נמצא' });
          continue;
        }

        const status = checkResult.rows[0].status;
        if (status === 'paid') {
          errors.push({ id, error: 'לא ניתן לשנות סטטוס של חיוב ששולם' });
          continue;
        }
        if (status === 'rejected') {
          errors.push({ id, error: 'החיוב כבר נדחה' });
          continue;
        }

        await client.query(
          `UPDATE charges
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
        console.error(`Error rejecting charge ${id}:`, error);
        errors.push({ id, error: 'שגיאה בדחיית חיוב' });
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      updated: successes.length,
      successIds: successes,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }
    }

    console.error('Batch reject charges error:', error);

    if (error.code === '57P01' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({ error: 'שגיאת חיבור למסד נתונים. נסה שוב.' });
    }

    res.status(500).json({ error: 'שגיאה בדחייה מרובה' });
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('Error releasing client:', releaseError);
      }
    }
  }
}

export async function batchMarkForReview(req: Request, res: Response) {
  let client;

  try {
    const { chargeIds, notes } = req.body;
    const user = req.user!;

    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      return res.status(403).json({ error: 'נדרשת הרשאת גזבר' });
    }

    if (!Array.isArray(chargeIds) || chargeIds.length === 0) {
      return res.status(400).json({ error: 'יש לספק מערך של מזהי חיובים' });
    }

    try {
      client = await pool.connect();
    } catch (connError) {
      console.error('Failed to get database connection:', connError);
      return res.status(503).json({ error: 'שגיאת חיבור למסד נתונים. נסה שוב.' });
    }

    await client.query('BEGIN');

    const successes: number[] = [];
    const errors: Array<{ id: number; error: string }> = [];

    for (const id of chargeIds) {
      try {
        const checkResult = await client.query(
          'SELECT id, status FROM charges WHERE id = $1',
          [id]
        );

        if (checkResult.rows.length === 0) {
          errors.push({ id, error: 'חיוב לא נמצא' });
          continue;
        }

        const status = checkResult.rows[0].status;
        if (status === 'paid') {
          errors.push({ id, error: 'לא ניתן לשנות סטטוס של חיוב ששולם' });
          continue;
        }
        if (status === 'under_review') {
          errors.push({ id, error: 'החיוב כבר בבדיקה' });
          continue;
        }

        await client.query(
          `UPDATE charges
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
        console.error(`Error marking charge ${id} for review:`, error);
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
  } catch (error: any) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }
    }

    console.error('Batch mark charges for review error:', error);

    if (error.code === '57P01' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({ error: 'שגיאת חיבור למסד נתונים. נסה שוב.' });
    }

    res.status(500).json({ error: 'שגיאה בסימון מרובה לבדיקה' });
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('Error releasing client:', releaseError);
      }
    }
  }
}

export async function getTreasurerCharges(req: Request, res: Response) {
  try {
    const user = req.user!;

    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      return res.status(403).json({ error: 'נדרשת הרשאת גזבר' });
    }

    let baseQuery = `
      SELECT c.*, 
             f.name as fund_name, 
             f.budget_id,
             b.name as budget_name,
             CASE WHEN b.group_id IS NULL THEN 'circle' ELSE 'group' END as budget_type,
             u.full_name as user_name, 
             u.email as user_email,
             reviewer.full_name as reviewer_name,
             under_reviewer.full_name as under_review_by_name
      FROM charges c
      JOIN funds f ON c.fund_id = f.id
      JOIN budgets b ON f.budget_id = b.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN users reviewer ON c.reviewed_by = reviewer.id
      LEFT JOIN users under_reviewer ON c.under_review_by = under_reviewer.id
      WHERE 1=1
    `;

    // Apply budget type filtering based on treasurer role
    if (user.isCircleTreasurer && !user.isGroupTreasurer) {
      baseQuery += ' AND b.group_id IS NULL';
    } else if (!user.isCircleTreasurer && user.isGroupTreasurer) {
      baseQuery += `
        AND b.group_id IN (
          SELECT group_id 
          FROM user_groups 
          WHERE user_id = ${user.userId}
        )
      `;
    }

    baseQuery += ' ORDER BY c.created_at DESC';

    const result = await pool.query(baseQuery);
    const allCharges = result.rows;

    // Group by status
    const pending = allCharges.filter(c => c.status === 'pending');
    const under_review = allCharges.filter(c => c.status === 'under_review');
    const approved = allCharges.filter(c => c.status === 'approved');
    const rejected = allCharges.filter(c => c.status === 'rejected');
    const paid = allCharges.filter(c => c.status === 'paid');

    // Calculate summary
    const summary = {
      pendingCount: pending.length,
      underReviewCount: under_review.length,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      paidCount: paid.length,
      totalPendingAmount: pending.reduce((sum, c) => sum + parseFloat(c.amount), 0),
      totalApprovedAmount: approved.reduce((sum, c) => sum + parseFloat(c.amount), 0)
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
    console.error('Get treasurer charges error:', error);
    res.status(500).json({ error: 'שגיאה בטעינת חיובים' });
  }
}
