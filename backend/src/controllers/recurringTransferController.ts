import { Request, Response } from 'express';
import pool from '../config/database';
import { RecurringTransfer } from '../types';
import { updatePaymentTransfersForRecurringChange } from '../utils/paymentTransferHelpers';

// Helper function to convert snake_case to camelCase
const toCamelCase = (row: any) => ({
  id: row.id,
  recipientUserId: row.recipient_user_id,
  recipientName: row.recipient_name,
  recipientEmail: row.recipient_email,
  fundId: row.fund_id,
  fundName: row.fund_name,
  budgetId: row.budget_id,
  budgetName: row.budget_name,
  budgetType: row.budget_type,
  groupName: row.group_name,
  amount: row.amount,
  description: row.description,
  startDate: row.start_date,
  endDate: row.end_date,
  frequency: row.frequency,
  status: row.status,
  createdBy: row.created_by,
  createdByName: row.created_by_name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Get all recurring transfers (treasurer only, filtered by access control)
export const getRecurringTransfers = async (req: Request, res: Response) => {
  try {
    const { isCircleTreasurer, isGroupTreasurer, groupIds } = req.user!;

    let query = `
      SELECT 
        rt.*,
        u.full_name as recipient_name,
        u.email as recipient_email,
        f.name as fund_name,
        b.id as budget_id,
        b.name as budget_name,
        CASE WHEN b.group_id IS NULL THEN 'circle' ELSE 'group' END as budget_type,
        g.name as group_name,
        creator.full_name as created_by_name
      FROM recurring_transfers rt
      JOIN users u ON rt.recipient_user_id = u.id
      JOIN funds f ON rt.fund_id = f.id
      JOIN budgets b ON f.budget_id = b.id
      LEFT JOIN groups g ON b.group_id = g.id
      JOIN users creator ON rt.created_by = creator.id
      WHERE 1=1
    `;

    const params: any[] = [];

    // Access control
    if (!isCircleTreasurer) {
      if (isGroupTreasurer && groupIds.length > 0) {
        query += ` AND b.group_id = ANY($1)`;
        params.push(groupIds);
      } else {
        return res.status(403).json({ error: 'אין הרשאה לצפות בהעברות קבועות' });
      }
    }

    query += ` ORDER BY rt.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows.map(toCamelCase));
  } catch (error) {
    console.error('Error fetching recurring transfers:', error);
    res.status(500).json({ error: 'שגיאה בטעינת העברות קבועות' });
  }
};

// Get user's recurring transfers
export const getMyRecurringTransfers = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const query = `
      SELECT 
        rt.*,
        u.full_name as recipient_name,
        u.email as recipient_email,
        f.name as fund_name,
        b.id as budget_id,
        b.name as budget_name,
        CASE WHEN b.group_id IS NULL THEN 'circle' ELSE 'group' END as budget_type,
        g.name as group_name,
        creator.full_name as created_by_name
      FROM recurring_transfers rt
      JOIN users u ON rt.recipient_user_id = u.id
      JOIN funds f ON rt.fund_id = f.id
      JOIN budgets b ON f.budget_id = b.id
      LEFT JOIN groups g ON b.group_id = g.id
      JOIN users creator ON rt.created_by = creator.id
      WHERE rt.recipient_user_id = $1
      ORDER BY rt.created_at DESC
    `;

    const result = await pool.query(query, [userId]);
    res.json(result.rows.map(toCamelCase));
  } catch (error) {
    console.error('Error fetching my recurring transfers:', error);
    res.status(500).json({ error: 'שגיאה בטעינת ההעברות הקבועות שלך' });
  }
};

// Get single recurring transfer by ID
export const getRecurringTransferById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, isCircleTreasurer, isGroupTreasurer, groupIds } = req.user!;

    const query = `
      SELECT 
        rt.*,
        u.full_name as recipient_name,
        u.email as recipient_email,
        f.name as fund_name,
        b.id as budget_id,
        b.name as budget_name,
        CASE WHEN b.group_id IS NULL THEN 'circle' ELSE 'group' END as budget_type,
        g.name as group_name,
        creator.full_name as created_by_name
      FROM recurring_transfers rt
      JOIN users u ON rt.recipient_user_id = u.id
      JOIN funds f ON rt.fund_id = f.id
      JOIN budgets b ON f.budget_id = b.id
      LEFT JOIN groups g ON b.group_id = g.id
      JOIN users creator ON rt.created_by = creator.id
      WHERE rt.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'העברה קבועה לא נמצאה' });
    }

    const transfer = result.rows[0];

    // Access control
    const isRecipient = transfer.recipient_user_id === userId;
    const hasAccess = isRecipient || isCircleTreasurer || 
      (isGroupTreasurer && transfer.budget_type === 'group' && groupIds.includes(transfer.budget_id));

    if (!hasAccess) {
      return res.status(403).json({ error: 'אין הרשאה לצפות בהעברה זו' });
    }

    res.json(toCamelCase(transfer));
  } catch (error) {
    console.error('Error fetching recurring transfer:', error);
    res.status(500).json({ error: 'שגיאה בטעינת העברה קבועה' });
  }
};

// Create recurring transfer (treasurer only)
export const createRecurringTransfer = async (req: Request, res: Response) => {
  try {
    const { userId, isCircleTreasurer, isGroupTreasurer, groupIds } = req.user!;
    const { 
      recipientUserId, 
      fundId, 
      amount, 
      description, 
      startDate, 
      endDate, 
      frequency 
    } = req.body;

    // Validate treasurer permission
    if (!isCircleTreasurer && !isGroupTreasurer) {
      return res.status(403).json({ error: 'רק גזברים יכולים ליצור העברות קבועות' });
    }

    // Validate required fields
    if (!recipientUserId || !fundId || !amount || !description || !startDate || !frequency) {
      return res.status(400).json({ error: 'חסרים שדות חובה' });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({ error: 'הסכום חייב להיות חיובי' });
    }

    // Validate frequency
    if (!['monthly', 'quarterly', 'annual'].includes(frequency)) {
      return res.status(400).json({ error: 'תדירות לא תקינה' });
    }

    // Check fund access
    const fundCheck = await pool.query(`
      SELECT f.id, b.id as budget_id, b.group_id
      FROM funds f
      JOIN budgets b ON f.budget_id = b.id
      WHERE f.id = $1
    `, [fundId]);

    if (fundCheck.rows.length === 0) {
      return res.status(404).json({ error: 'קופה לא נמצאה' });
    }

    const fund = fundCheck.rows[0];

    // Access control for fund
    if (!isCircleTreasurer) {
      if (fund.group_id && !groupIds.includes(fund.group_id)) {
        return res.status(403).json({ error: 'אין הרשאה ליצור העברה קבועה בקופה זו' });
      }
    }

    // Check recipient exists
    const recipientCheck = await pool.query('SELECT id FROM users WHERE id = $1', [recipientUserId]);
    if (recipientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'מקבל התשלום לא נמצא' });
    }

    // Create recurring transfer
    const insertQuery = `
      INSERT INTO recurring_transfers (
        recipient_user_id, fund_id, amount, description, 
        start_date, end_date, frequency, status, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      recipientUserId,
      fundId,
      amount,
      description,
      startDate,
      endDate || null,
      frequency,
      userId
    ]);

    // Fetch full details
    const detailsQuery = `
      SELECT 
        rt.*,
        u.full_name as recipient_name,
        u.email as recipient_email,
        f.name as fund_name,
        b.id as budget_id,
        b.name as budget_name,
        CASE WHEN b.group_id IS NULL THEN 'circle' ELSE 'group' END as budget_type,
        g.name as group_name,
        creator.full_name as created_by_name
      FROM recurring_transfers rt
      JOIN users u ON rt.recipient_user_id = u.id
      JOIN funds f ON rt.fund_id = f.id
      JOIN budgets b ON f.budget_id = b.id
      LEFT JOIN groups g ON b.group_id = g.id
      JOIN users creator ON rt.created_by = creator.id
      WHERE rt.id = $1
    `;

    const detailsResult = await pool.query(detailsQuery, [result.rows[0].id]);

    // Update any existing pending payment transfers for this recipient
    try {
      await updatePaymentTransfersForRecurringChange(recipientUserId, fundId);
    } catch (error) {
      console.error('Warning: Failed to update payment transfers after creating recurring transfer:', error);
    }

    res.status(201).json(toCamelCase(detailsResult.rows[0]));
  } catch (error) {
    console.error('Error creating recurring transfer:', error);
    res.status(500).json({ error: 'שגיאה ביצירת העברה קבועה' });
  }
};

// Update recurring transfer (treasurer only)
export const updateRecurringTransfer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, isCircleTreasurer, isGroupTreasurer, groupIds } = req.user!;
    const { amount, description, endDate, frequency, status } = req.body;

    // Validate treasurer permission
    if (!isCircleTreasurer && !isGroupTreasurer) {
      return res.status(403).json({ error: 'רק גזברים יכולים לעדכן העברות קבועות' });
    }

    // Check transfer exists and access
    const checkQuery = `
      SELECT rt.*, b.group_id
      FROM recurring_transfers rt
      JOIN funds f ON rt.fund_id = f.id
      JOIN budgets b ON f.budget_id = b.id
      WHERE rt.id = $1
    `;

    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'העברה קבועה לא נמצאה' });
    }

    const transfer = checkResult.rows[0];

    // Access control
    if (!isCircleTreasurer) {
      if (transfer.group_id && !groupIds.includes(transfer.group_id)) {
        return res.status(403).json({ error: 'אין הרשאה לעדכן העברה זו' });
      }
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (amount !== undefined) {
      if (amount <= 0) {
        return res.status(400).json({ error: 'הסכום חייב להיות חיובי' });
      }
      updates.push(`amount = $${paramCount++}`);
      values.push(amount);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }

    if (endDate !== undefined) {
      updates.push(`end_date = $${paramCount++}`);
      values.push(endDate || null);
    }

    if (frequency !== undefined) {
      if (!['monthly', 'quarterly', 'annual'].includes(frequency)) {
        return res.status(400).json({ error: 'תדירות לא תקינה' });
      }
      updates.push(`frequency = $${paramCount++}`);
      values.push(frequency);
    }

    if (status !== undefined) {
      if (!['active', 'paused', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'סטטוס לא תקין' });
      }
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'לא סופקו שדות לעדכון' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const updateQuery = `
      UPDATE recurring_transfers
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    await pool.query(updateQuery, values);

    // Fetch full details
    const detailsQuery = `
      SELECT 
        rt.*,
        u.full_name as recipient_name,
        u.email as recipient_email,
        f.name as fund_name,
        b.id as budget_id,
        b.name as budget_name,
        CASE WHEN b.group_id IS NULL THEN 'circle' ELSE 'group' END as budget_type,
        g.name as group_name,
        creator.full_name as created_by_name
      FROM recurring_transfers rt
      JOIN users u ON rt.recipient_user_id = u.id
      JOIN funds f ON rt.fund_id = f.id
      JOIN budgets b ON f.budget_id = b.id
      LEFT JOIN groups g ON b.group_id = g.id
      JOIN users creator ON rt.created_by = creator.id
      WHERE rt.id = $1
    `;

    const detailsResult = await pool.query(detailsQuery, [id]);

    // If amount or status changed, update pending payment transfers
    if (amount !== undefined || status !== undefined) {
      try {
        await updatePaymentTransfersForRecurringChange(
          transfer.recipient_user_id,
          transfer.fund_id
        );
      } catch (error) {
        console.error('Warning: Failed to update payment transfers after updating recurring transfer:', error);
      }
    }

    res.json(toCamelCase(detailsResult.rows[0]));
  } catch (error) {
    console.error('Error updating recurring transfer:', error);
    res.status(500).json({ error: 'שגיאה בעדכון העברה קבועה' });
  }
};

// Delete recurring transfer (treasurer only)
export const deleteRecurringTransfer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isCircleTreasurer, isGroupTreasurer, groupIds } = req.user!;

    // Validate treasurer permission
    if (!isCircleTreasurer && !isGroupTreasurer) {
      return res.status(403).json({ error: 'רק גזברים יכולים למחוק העברות קבועות' });
    }

    // Check transfer exists and access
    const checkQuery = `
      SELECT rt.*, b.group_id
      FROM recurring_transfers rt
      JOIN funds f ON rt.fund_id = f.id
      JOIN budgets b ON f.budget_id = b.id
      WHERE rt.id = $1
    `;

    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'העברה קבועה לא נמצאה' });
    }

    const transfer = checkResult.rows[0];

    // Access control
    if (!isCircleTreasurer) {
      if (transfer.group_id && !groupIds.includes(transfer.group_id)) {
        return res.status(403).json({ error: 'אין הרשאה למחוק העברה זו' });
      }
    }

    await pool.query('DELETE FROM recurring_transfers WHERE id = $1', [id]);

    // Update any pending payment transfers for this recipient
    try {
      await updatePaymentTransfersForRecurringChange(
        transfer.recipient_user_id,
        transfer.fund_id
      );
    } catch (error) {
      console.error('Warning: Failed to update payment transfers after deleting recurring transfer:', error);
    }

    res.json({ message: 'העברה קבועה נמחקה בהצלחה' });
  } catch (error) {
    console.error('Error deleting recurring transfer:', error);
    res.status(500).json({ error: 'שגיאה במחיקת העברה קבועה' });
  }
};
