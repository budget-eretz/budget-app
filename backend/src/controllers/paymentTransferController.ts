import { Request, Response } from 'express';
import pool from '../config/database';
import { canAccessBudgetType } from '../utils/paymentTransferHelpers';
import { PaymentTransfer, PaymentTransferDetails, PaymentTransferStats } from '../types';

/**
 * Get all payment transfers with access control filtering by budget type
 * Circle treasurers see only circle budget transfers
 * Group treasurers see only their group budget transfers
 */
export async function getPaymentTransfers(req: Request, res: Response) {
  try {
    const user = req.user!;
    const { status } = req.query;

    let query = `
      SELECT 
        pt.id,
        pt.recipient_user_id as "recipientUserId",
        u.full_name as "recipientName",
        u.email as "recipientEmail",
        pt.budget_type as "budgetType",
        pt.group_id as "groupId",
        g.name as "groupName",
        pt.status,
        pt.total_amount as "totalAmount",
        pt.reimbursement_count as "reimbursementCount",
        pt.created_at as "createdAt",
        pt.executed_at as "executedAt",
        pt.executed_by as "executedBy",
        executor.full_name as "executedByName"
      FROM payment_transfers pt
      JOIN users u ON pt.recipient_user_id = u.id
      LEFT JOIN groups g ON pt.group_id = g.id
      LEFT JOIN users executor ON pt.executed_by = executor.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    // Apply access control filtering
    if (user.isCircleTreasurer && !user.isGroupTreasurer) {
      // Circle treasurer: only circle budgets
      query += ` AND pt.budget_type = 'circle'`;
    } else if (user.isGroupTreasurer) {
      // Group treasurer: only their group budgets
      query += ` AND pt.budget_type = 'group' AND pt.group_id = ANY($${++paramCount})`;
      params.push(user.groupIds);
    }

    // Filter by status if provided
    if (status && (status === 'pending' || status === 'executed')) {
      query += ` AND pt.status = $${++paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY pt.created_at DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payment transfers:', error);
    res.status(500).json({ error: 'שגיאה בטעינת העברות' });
  }
}

/**
 * Get single payment transfer with all associated reimbursements
 */
export async function getPaymentTransferById(req: Request, res: Response) {
  try {
    const user = req.user!;
    const { id } = req.params;

    // Get transfer details
    const transferResult = await pool.query(
      `SELECT 
        pt.id,
        pt.recipient_user_id as "recipientUserId",
        u.full_name as "recipientName",
        u.email as "recipientEmail",
        pt.budget_type as "budgetType",
        pt.group_id as "groupId",
        g.name as "groupName",
        pt.status,
        pt.total_amount as "totalAmount",
        pt.reimbursement_count as "reimbursementCount",
        pt.created_at as "createdAt",
        pt.executed_at as "executedAt",
        pt.executed_by as "executedBy",
        executor.full_name as "executedByName"
      FROM payment_transfers pt
      JOIN users u ON pt.recipient_user_id = u.id
      LEFT JOIN groups g ON pt.group_id = g.id
      LEFT JOIN users executor ON pt.executed_by = executor.id
      WHERE pt.id = $1`,
      [id]
    );

    if (transferResult.rows.length === 0) {
      return res.status(404).json({ error: 'העברה לא נמצאה' });
    }

    const transfer = transferResult.rows[0];

    // Check access control
    const hasAccess = await canAccessBudgetType(user, transfer.budgetType, transfer.groupId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'אין לך הרשאה לצפות בהעברה זו' });
    }

    // Get associated reimbursements
    const reimbursementsResult = await pool.query(
      `SELECT 
        r.id,
        r.fund_id,
        r.user_id,
        r.recipient_user_id,
        r.amount,
        r.description,
        r.expense_date,
        r.receipt_url,
        r.status,
        r.reviewed_by,
        r.reviewed_at,
        r.notes,
        r.created_at,
        r.updated_at,
        f.name as fund_name,
        f.budget_id,
        submitter.full_name as user_name,
        recipient.full_name as recipient_name,
        reviewer.full_name as reviewer_name,
        'reimbursement' as item_type
      FROM reimbursements r
      JOIN funds f ON r.fund_id = f.id
      JOIN users submitter ON r.user_id = submitter.id
      LEFT JOIN users recipient ON r.recipient_user_id = recipient.id
      LEFT JOIN users reviewer ON r.reviewed_by = reviewer.id
      WHERE r.payment_transfer_id = $1
      ORDER BY r.expense_date DESC`,
      [id]
    );

    // Get associated charges
    const chargesResult = await pool.query(
      `SELECT 
        c.id,
        c.fund_id,
        c.user_id,
        c.user_id as recipient_user_id,
        -c.amount as amount,
        c.description,
        c.charge_date as expense_date,
        NULL as receipt_url,
        c.status,
        c.reviewed_by,
        c.reviewed_at,
        c.notes,
        c.created_at,
        c.updated_at,
        f.name as fund_name,
        f.budget_id,
        u.full_name as user_name,
        u.full_name as recipient_name,
        reviewer.full_name as reviewer_name,
        'charge' as item_type
      FROM charges c
      JOIN funds f ON c.fund_id = f.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN users reviewer ON c.reviewed_by = reviewer.id
      WHERE c.payment_transfer_id = $1
      ORDER BY c.charge_date DESC`,
      [id]
    );

    // Combine reimbursements and charges
    const allItems = [...reimbursementsResult.rows, ...chargesResult.rows]
      .sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());

    const transferDetails: PaymentTransferDetails = {
      ...transfer,
      reimbursements: allItems
    };

    res.json(transferDetails);
  } catch (error) {
    console.error('Error fetching payment transfer details:', error);
    res.status(500).json({ error: 'שגיאה בטעינת פרטי העברה' });
  }
}

/**
 * Execute a payment transfer - mark as executed and update all reimbursements to paid
 */
export async function executePaymentTransfer(req: Request, res: Response) {
  const client = await pool.connect();
  
  try {
    const user = req.user!;
    const { id } = req.params;

    await client.query('BEGIN');

    // Get transfer details
    const transferResult = await client.query(
      `SELECT 
        pt.id,
        pt.recipient_user_id,
        pt.budget_type,
        pt.group_id,
        pt.status,
        pt.reimbursement_count
      FROM payment_transfers pt
      WHERE pt.id = $1
      FOR UPDATE`,
      [id]
    );

    if (transferResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'העברה לא נמצאה' });
    }

    const transfer = transferResult.rows[0];

    // Check if already executed
    if (transfer.status === 'executed') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'העברה כבר בוצעה' });
    }

    // Check if transfer has reimbursements
    if (transfer.reimbursement_count === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'אין החזרים בהעברה זו' });
    }

    // Check access control
    const hasAccess = await canAccessBudgetType(user, transfer.budget_type, transfer.group_id);
    if (!hasAccess) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'אין לך הרשאה לבצע העברה זו' });
    }

    // Update transfer status to executed
    await client.query(
      `UPDATE payment_transfers
      SET 
        status = 'executed',
        executed_at = NOW(),
        executed_by = $1
      WHERE id = $2`,
      [user.userId, id]
    );

    // Update all associated reimbursements to paid
    await client.query(
      `UPDATE reimbursements
      SET 
        status = 'paid',
        updated_at = NOW()
      WHERE payment_transfer_id = $1 AND status = 'approved'`,
      [id]
    );

    // Update all associated charges to paid
    await client.query(
      `UPDATE charges
      SET 
        status = 'paid',
        updated_at = NOW()
      WHERE payment_transfer_id = $1 AND status = 'approved'`,
      [id]
    );

    await client.query('COMMIT');

    res.json({ 
      message: 'העברה בוצעה בהצלחה',
      transferId: id
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error executing payment transfer:', error);
    res.status(500).json({ error: 'שגיאה בביצוע העברה' });
  } finally {
    client.release();
  }
}

/**
 * Get payment transfer statistics
 * Returns counts and totals for pending and executed transfers
 */
export async function getPaymentTransferStats(req: Request, res: Response) {
  try {
    const user = req.user!;

    let whereClause = '';
    const params: any[] = [];

    // Apply access control filtering
    if (user.isCircleTreasurer && !user.isGroupTreasurer) {
      whereClause = `WHERE pt.budget_type = 'circle'`;
    } else if (user.isGroupTreasurer) {
      whereClause = `WHERE pt.budget_type = 'group' AND pt.group_id = ANY($1)`;
      params.push(user.groupIds);
    }

    // Get pending statistics
    const pendingQuery = `
      SELECT 
        COUNT(*) as pending_count,
        COALESCE(SUM(pt.total_amount), 0) as pending_total_amount
      FROM payment_transfers pt
      ${whereClause}
      ${whereClause ? 'AND' : 'WHERE'} pt.status = 'pending'
    `;

    const pendingResult = await pool.query(pendingQuery, params);

    // Get executed statistics
    const executedQuery = `
      SELECT 
        COUNT(*) as executed_count,
        COALESCE(SUM(pt.total_amount), 0) as executed_total_amount
      FROM payment_transfers pt
      ${whereClause}
      ${whereClause ? 'AND' : 'WHERE'} pt.status = 'executed'
    `;

    const executedResult = await pool.query(executedQuery, params);

    // Get recent executions (last 5)
    const recentQuery = `
      SELECT 
        pt.id,
        pt.recipient_user_id as "recipientUserId",
        u.full_name as "recipientName",
        u.email as "recipientEmail",
        pt.budget_type as "budgetType",
        pt.group_id as "groupId",
        g.name as "groupName",
        pt.status,
        pt.total_amount as "totalAmount",
        pt.reimbursement_count as "reimbursementCount",
        pt.created_at as "createdAt",
        pt.executed_at as "executedAt",
        pt.executed_by as "executedBy",
        executor.full_name as "executedByName"
      FROM payment_transfers pt
      JOIN users u ON pt.recipient_user_id = u.id
      LEFT JOIN groups g ON pt.group_id = g.id
      LEFT JOIN users executor ON pt.executed_by = executor.id
      ${whereClause}
      ${whereClause ? 'AND' : 'WHERE'} pt.status = 'executed'
      ORDER BY pt.executed_at DESC
      LIMIT 5
    `;

    const recentResult = await pool.query(recentQuery, params);

    const stats: PaymentTransferStats = {
      pendingCount: parseInt(pendingResult.rows[0].pending_count),
      pendingTotalAmount: parseFloat(pendingResult.rows[0].pending_total_amount),
      executedCount: parseInt(executedResult.rows[0].executed_count),
      executedTotalAmount: parseFloat(executedResult.rows[0].executed_total_amount),
      recentExecutions: recentResult.rows
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching payment transfer stats:', error);
    res.status(500).json({ error: 'שגיאה בטעינת סטטיסטיקות העברות' });
  }
}
