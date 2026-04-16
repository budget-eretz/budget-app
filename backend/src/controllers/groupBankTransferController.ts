import { Request, Response } from 'express';
import pool from '../config/database';

/**
 * Get all group bank transfers with access control filtering
 * Circle treasurer sees all, group treasurer sees only their groups
 */
export async function getGroupBankTransfers(req: Request, res: Response) {
  try {
    const user = req.user!;
    const { status, groupId } = req.query;

    let query = `
      SELECT
        gbt.id,
        gbt.group_id as "groupId",
        g.name as "groupName",
        gbt.amount,
        gbt.description,
        gbt.budget_id as "budgetId",
        b.name as "budgetName",
        gbt.status,
        gbt.created_by as "createdBy",
        creator.full_name as "createdByName",
        gbt.executed_at as "executedAt",
        gbt.executed_by as "executedBy",
        executor.full_name as "executedByName",
        gbt.created_at as "createdAt"
      FROM group_bank_transfers gbt
      JOIN groups g ON gbt.group_id = g.id
      LEFT JOIN budgets b ON gbt.budget_id = b.id
      JOIN users creator ON gbt.created_by = creator.id
      LEFT JOIN users executor ON gbt.executed_by = executor.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    // Access control
    if (!user.isCircleTreasurer) {
      // Group treasurer: only their groups
      query += ` AND gbt.group_id = ANY($${++paramCount})`;
      params.push(user.groupIds);
    }

    // Filter by groupId if provided
    if (groupId) {
      query += ` AND gbt.group_id = $${++paramCount}`;
      params.push(groupId);
    }

    // Filter by status if provided
    if (status) {
      query += ` AND gbt.status = $${++paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY gbt.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching group bank transfers:', error);
    res.status(500).json({ error: 'שגיאה בטעינת העברות בנקאיות' });
  }
}

/**
 * Get aggregate stats for group bank transfers
 * Circle treasurer sees all, group treasurer sees only their groups
 */
export async function getGroupBankTransferStats(req: Request, res: Response) {
  try {
    const user = req.user!;

    let query = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as "pendingCount",
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as "pendingTotalAmount",
        COUNT(*) FILTER (WHERE status = 'executed') as "executedCount",
        COALESCE(SUM(amount) FILTER (WHERE status = 'executed'), 0) as "executedTotalAmount"
      FROM group_bank_transfers
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (!user.isCircleTreasurer) {
      query += ` AND group_id = ANY($${++paramCount})`;
      params.push(user.groupIds);
    }

    const result = await pool.query(query, params);
    const row = result.rows[0];

    res.json({
      pendingCount: parseInt(row.pendingCount, 10),
      pendingTotalAmount: parseFloat(row.pendingTotalAmount),
      executedCount: parseInt(row.executedCount, 10),
      executedTotalAmount: parseFloat(row.executedTotalAmount),
    });
  } catch (error) {
    console.error('Error fetching group bank transfer stats:', error);
    res.status(500).json({ error: 'שגיאה בטעינת סטטיסטיקות העברות בנקאיות' });
  }
}

/**
 * Create a new group bank transfer (circle treasurer only)
 */
export async function createGroupBankTransfer(req: Request, res: Response) {
  try {
    const user = req.user!;

    if (!user.isCircleTreasurer) {
      return res.status(403).json({ error: 'רק גזבר מעגלי יכול ליצור העברות בנקאיות לקבוצות' });
    }

    const { groupId, amount, description, budgetId } = req.body;

    // Validate required fields
    if (!groupId) {
      return res.status(400).json({ error: 'נדרש מזהה קבוצה' });
    }
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'סכום חייב להיות גדול מ-0' });
    }

    // Validate group exists
    const groupResult = await pool.query('SELECT id FROM groups WHERE id = $1', [groupId]);
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'קבוצה לא נמצאה' });
    }

    // Validate budget exists if provided
    if (budgetId) {
      const budgetResult = await pool.query('SELECT id FROM budgets WHERE id = $1', [budgetId]);
      if (budgetResult.rows.length === 0) {
        return res.status(404).json({ error: 'תקציב לא נמצא' });
      }
    }

    // Insert new transfer
    const insertResult = await pool.query(
      `INSERT INTO group_bank_transfers (group_id, amount, description, budget_id, status, created_by)
       VALUES ($1, $2, $3, $4, 'pending', $5)
       RETURNING id`,
      [groupId, amount, description || null, budgetId || null, user.userId]
    );

    const newId = insertResult.rows[0].id;

    // Return full record with JOINs
    const fullResult = await pool.query(
      `SELECT
        gbt.id,
        gbt.group_id as "groupId",
        g.name as "groupName",
        gbt.amount,
        gbt.description,
        gbt.budget_id as "budgetId",
        b.name as "budgetName",
        gbt.status,
        gbt.created_by as "createdBy",
        creator.full_name as "createdByName",
        gbt.executed_at as "executedAt",
        gbt.executed_by as "executedBy",
        executor.full_name as "executedByName",
        gbt.created_at as "createdAt"
      FROM group_bank_transfers gbt
      JOIN groups g ON gbt.group_id = g.id
      LEFT JOIN budgets b ON gbt.budget_id = b.id
      JOIN users creator ON gbt.created_by = creator.id
      LEFT JOIN users executor ON gbt.executed_by = executor.id
      WHERE gbt.id = $1`,
      [newId]
    );

    res.status(201).json(fullResult.rows[0]);
  } catch (error) {
    console.error('Error creating group bank transfer:', error);
    res.status(500).json({ error: 'שגיאה ביצירת העברה בנקאית' });
  }
}

/**
 * Mark a group bank transfer as executed (circle treasurer only)
 */
export async function executeGroupBankTransfer(req: Request, res: Response) {
  try {
    const user = req.user!;

    if (!user.isCircleTreasurer) {
      return res.status(403).json({ error: 'רק גזבר מעגלי יכול לבצע העברות בנקאיות' });
    }

    const { id } = req.params;

    // Check transfer exists and is pending
    const existing = await pool.query(
      'SELECT id, status FROM group_bank_transfers WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'העברה בנקאית לא נמצאה' });
    }

    if (existing.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'ניתן לבצע רק העברות בסטטוס ממתין' });
    }

    const updateResult = await pool.query(
      `UPDATE group_bank_transfers
       SET status = 'executed', executed_at = NOW(), executed_by = $1
       WHERE id = $2
       RETURNING id`,
      [user.userId, id]
    );

    // Return full record with JOINs
    const fullResult = await pool.query(
      `SELECT
        gbt.id,
        gbt.group_id as "groupId",
        g.name as "groupName",
        gbt.amount,
        gbt.description,
        gbt.budget_id as "budgetId",
        b.name as "budgetName",
        gbt.status,
        gbt.created_by as "createdBy",
        creator.full_name as "createdByName",
        gbt.executed_at as "executedAt",
        gbt.executed_by as "executedBy",
        executor.full_name as "executedByName",
        gbt.created_at as "createdAt"
      FROM group_bank_transfers gbt
      JOIN groups g ON gbt.group_id = g.id
      LEFT JOIN budgets b ON gbt.budget_id = b.id
      JOIN users creator ON gbt.created_by = creator.id
      LEFT JOIN users executor ON gbt.executed_by = executor.id
      WHERE gbt.id = $1`,
      [id]
    );

    res.json(fullResult.rows[0]);
  } catch (error) {
    console.error('Error executing group bank transfer:', error);
    res.status(500).json({ error: 'שגיאה בביצוע ההעברה הבנקאית' });
  }
}

/**
 * Delete a group bank transfer (circle treasurer only, must be pending)
 */
export async function deleteGroupBankTransfer(req: Request, res: Response) {
  try {
    const user = req.user!;

    if (!user.isCircleTreasurer) {
      return res.status(403).json({ error: 'רק גזבר מעגלי יכול למחוק העברות בנקאיות' });
    }

    const { id } = req.params;

    // Check transfer exists and is pending
    const existing = await pool.query(
      'SELECT id, status FROM group_bank_transfers WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'העברה בנקאית לא נמצאה' });
    }

    if (existing.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'ניתן למחוק רק העברות בסטטוס ממתין' });
    }

    await pool.query('DELETE FROM group_bank_transfers WHERE id = $1', [id]);

    res.json({ message: 'ההעברה הבנקאית נמחקה בהצלחה' });
  } catch (error) {
    console.error('Error deleting group bank transfer:', error);
    res.status(500).json({ error: 'שגיאה במחיקת ההעברה הבנקאית' });
  }
}
