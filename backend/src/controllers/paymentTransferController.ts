import { Request, Response } from 'express';
import pool from '../config/database';
import { canAccessBudgetType, updateTransferTotals, formatPeriodDisplay } from '../utils/paymentTransferHelpers';
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

    // Get recurring transfer applications for this payment transfer
    const recurringResult = await pool.query(
      `SELECT
        rta.id as application_id,
        rt.id,
        rt.fund_id,
        rt.recipient_user_id,
        rt.recipient_user_id as user_id,
        rta.applied_amount as amount,
        rt.description,
        rt.start_date as expense_date,
        NULL as receipt_url,
        'active' as status,
        rt.created_by as reviewed_by,
        rt.created_at as reviewed_at,
        NULL as notes,
        rt.created_at,
        rt.updated_at,
        f.name as fund_name,
        f.budget_id,
        u.full_name as user_name,
        u.full_name as recipient_name,
        creator.full_name as reviewer_name,
        'recurring_transfer' as item_type,
        rt.frequency,
        rt.start_date,
        rt.end_date,
        rta.period_year,
        rta.period_month
      FROM recurring_transfer_applications rta
      JOIN recurring_transfers rt ON rta.recurring_transfer_id = rt.id
      JOIN funds f ON rt.fund_id = f.id
      JOIN users u ON rt.recipient_user_id = u.id
      LEFT JOIN users creator ON rt.created_by = creator.id
      WHERE rta.payment_transfer_id = $1
      ORDER BY rta.period_year DESC, rta.period_month DESC`,
      [id]
    );

    // Add period display to recurring transfer items
    const recurringWithPeriod = recurringResult.rows.map(item => ({
      ...item,
      period_display: formatPeriodDisplay(item.frequency, item.period_year, item.period_month)
    }));

    // Combine reimbursements, charges, and recurring transfers
    const allItems = [...reimbursementsResult.rows, ...chargesResult.rows, ...recurringWithPeriod]
      .sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());

    const transferDetails: PaymentTransferDetails = {
      ...transfer,
      reimbursements: allItems,
      recurringTransfers: recurringWithPeriod
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

    // Get transfer details including total amount
    const transferResult = await client.query(
      `SELECT 
        pt.id,
        pt.recipient_user_id,
        pt.budget_type,
        pt.group_id,
        pt.status,
        pt.total_amount,
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

    // Check if transfer has items OR recurring transfers (total_amount > 0 means recurring transfers exist)
    if (transfer.reimbursement_count === 0 && parseFloat(transfer.total_amount) === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'אין פריטים או העברות קבועות בהעברה זו' });
    }

    // Check access control
    const hasAccess = await canAccessBudgetType(user, transfer.budget_type, transfer.group_id);
    if (!hasAccess) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'אין לך הרשאה לבצע העברה זו' });
    }

    // Check if transfer has negative amount (more charges than reimbursements)
    const totalAmount = parseFloat(transfer.total_amount);
    
    if (totalAmount < 0) {
      // Negative transfer: Delete transfer and create carry-forward charge
      
      // Get the fund_id from one of the charges (they should all be from the same budget type)
      const fundResult = await client.query(
        `SELECT c.fund_id
        FROM charges c
        WHERE c.payment_transfer_id = $1
        LIMIT 1`,
        [id]
      );
      
      if (fundResult.rows.length === 0) {
        // If no charges, get from reimbursements
        const reimbFundResult = await client.query(
          `SELECT r.fund_id
          FROM reimbursements r
          WHERE r.payment_transfer_id = $1
          LIMIT 1`,
          [id]
        );
        
        if (reimbFundResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'לא נמצא סעיף להעברה זו' });
        }
        
        fundResult.rows[0] = reimbFundResult.rows[0];
      }
      
      const fundId = fundResult.rows[0].fund_id;
      const debtAmount = Math.abs(totalAmount);
      
      // Create a new approved charge for the debt amount
      await client.query(
        `INSERT INTO charges (
          fund_id,
          user_id,
          amount,
          description,
          charge_date,
          status,
          reviewed_by,
          reviewed_at,
          notes
        ) VALUES ($1, $2, $3, $4, NOW(), 'approved', $5, NOW(), $6)`,
        [
          fundId,
          transfer.recipient_user_id,
          debtAmount,
          'יתרת חוב מהעברה קודמת',
          user.userId,
          `יתרת חוב בסך ${debtAmount} ש"ח שתקוזז מההחזר הבא`
        ]
      );
      
      // Mark all reimbursements and charges as paid (they cancel each other out)
      await client.query(
        `UPDATE reimbursements
        SET 
          status = 'paid',
          updated_at = NOW()
        WHERE payment_transfer_id = $1 AND status = 'approved'`,
        [id]
      );
      
      await client.query(
        `UPDATE charges
        SET 
          status = 'paid',
          updated_at = NOW()
        WHERE payment_transfer_id = $1 AND status = 'approved'`,
        [id]
      );
      
      // Delete the transfer
      await client.query(
        `DELETE FROM payment_transfers WHERE id = $1`,
        [id]
      );
      
      await client.query('COMMIT');
      return res.json({ 
        success: true, 
        message: 'העברה נמחקה ויתרת החוב נשמרה להעברה הבאה',
        carryForwardDebt: debtAmount
      });
    }

    // Normal positive transfer: Execute as usual
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

/**
 * Generate payment transfers for all users with active recurring transfers
 * who don't have a pending payment transfer for the current period yet
 */
export async function generateRecurringTransfers(req: Request, res: Response) {
  const client = await pool.connect();

  try {
    const user = req.user!;

    // Only treasurers can generate
    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      return res.status(403).json({ error: 'רק גזברים יכולים לייצר העברות' });
    }

    await client.query('BEGIN');

    // STEP 1: Remove applications from inactive budgets
    // Find all applications from recurring transfers in inactive budgets that are in pending payment transfers
    let cleanupQuery = `
      SELECT rta.id, rta.payment_transfer_id, rta.applied_amount, b.id as budget_id
      FROM recurring_transfer_applications rta
      JOIN recurring_transfers rt ON rta.recurring_transfer_id = rt.id
      JOIN funds f ON rt.fund_id = f.id
      JOIN budgets b ON f.budget_id = b.id
      JOIN payment_transfers pt ON rta.payment_transfer_id = pt.id
      WHERE b.is_active = false
        AND pt.status = 'pending'
    `;

    // Apply access control for cleanup too
    if (!user.isCircleTreasurer) {
      cleanupQuery += ` AND b.group_id = ANY($1)`;
    } else if (user.isCircleTreasurer && !user.isGroupTreasurer) {
      cleanupQuery += ` AND b.group_id IS NULL`;
    }

    const cleanupParams = !user.isCircleTreasurer ? [user.groupIds] : [];
    const inactiveApplications = await client.query(cleanupQuery, cleanupParams);

    let removedCount = 0;
    if (inactiveApplications.rows.length > 0) {
      // Group by payment_transfer_id to update totals
      const transferAmounts = new Map<number, number>();
      const applicationIds: number[] = [];

      for (const app of inactiveApplications.rows) {
        applicationIds.push(app.id);
        const currentAmount = transferAmounts.get(app.payment_transfer_id) || 0;
        transferAmounts.set(app.payment_transfer_id, currentAmount + parseFloat(app.applied_amount));
      }

      // Delete all applications from inactive budgets
      await client.query(
        `DELETE FROM recurring_transfer_applications WHERE id = ANY($1)`,
        [applicationIds]
      );

      // Update payment transfer totals
      for (const [transferId, amount] of transferAmounts.entries()) {
        await client.query(
          `UPDATE payment_transfers
           SET total_amount = total_amount - $1
           WHERE id = $2`,
          [amount, transferId]
        );
      }

      removedCount = applicationIds.length;
      console.log(`[generateRecurringTransfers] Removed ${removedCount} applications from inactive budgets`);
    }

    // STEP 2: Find all users with active recurring transfers that haven't been applied for the current period
    let query = `
      SELECT DISTINCT
        rt.recipient_user_id,
        rt.frequency,
        CASE WHEN b.group_id IS NULL THEN 'circle' ELSE 'group' END as budget_type,
        b.group_id
      FROM recurring_transfers rt
      JOIN funds f ON rt.fund_id = f.id
      JOIN budgets b ON f.budget_id = b.id
      WHERE rt.status = 'active'
        AND b.is_active = true
        AND (rt.end_date IS NULL OR rt.end_date >= CURRENT_DATE)
        AND NOT EXISTS (
          SELECT 1 FROM recurring_transfer_applications rta
          WHERE rta.recurring_transfer_id = rt.id
            AND rta.period_year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
            AND rta.period_month = CASE
              WHEN rt.frequency = 'monthly' THEN EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
              WHEN rt.frequency = 'quarterly' THEN (FLOOR((EXTRACT(MONTH FROM CURRENT_DATE) - 1) / 3) * 3 + 1)::INTEGER
              WHEN rt.frequency = 'annual' THEN 1
            END
        )
    `;

    const params: any[] = [];

    // Apply access control
    if (!user.isCircleTreasurer) {
      query += ` AND b.group_id = ANY($1)`;
      params.push(user.groupIds);
    } else if (user.isCircleTreasurer && !user.isGroupTreasurer) {
      query += ` AND b.group_id IS NULL`;
    }

    const usersResult = await client.query(query, params);

    const created: number[] = [];

    // Group by recipient + budget_type + group_id to avoid duplicates
    const userGroups = new Map<string, typeof usersResult.rows[0]>();
    for (const row of usersResult.rows) {
      const key = `${row.recipient_user_id}-${row.budget_type}-${row.group_id}`;
      if (!userGroups.has(key)) {
        userGroups.set(key, row);
      }
    }

    for (const row of userGroups.values()) {
      // Check if there's already a pending transfer for this user
      const existingTransfer = await client.query(
        `SELECT id FROM payment_transfers
         WHERE recipient_user_id = $1
           AND budget_type = $2
           AND ($3::INTEGER IS NULL AND group_id IS NULL OR group_id = $3)
           AND status = 'pending'`,
        [row.recipient_user_id, row.budget_type, row.group_id]
      );

      let transferId: number;

      if (existingTransfer.rows.length > 0) {
        transferId = existingTransfer.rows[0].id;
      } else {
        // Create new payment transfer
        const createResult = await client.query(
          `INSERT INTO payment_transfers (
            recipient_user_id, budget_type, group_id, status, total_amount, reimbursement_count
          ) VALUES ($1, $2, $3, 'pending', 0, 0)
          RETURNING id`,
          [row.recipient_user_id, row.budget_type, row.group_id]
        );
        transferId = createResult.rows[0].id;
      }

      // Update totals (will include recurring transfers and create application records)
      await updateTransferTotals(transferId, client);
      created.push(transferId);
    }

    await client.query('COMMIT');

    // Build response message
    let message = '';
    if (removedCount > 0 && created.length > 0) {
      message = `הוסרו ${removedCount} העברות מתקציבים לא פעילים, נוצרו/עודכנו ${created.length} העברות`;
    } else if (removedCount > 0) {
      message = `הוסרו ${removedCount} העברות מתקציבים לא פעילים`;
    } else if (created.length > 0) {
      message = `נוצרו/עודכנו ${created.length} העברות`;
    } else {
      message = 'אין שינויים';
    }

    res.json({
      message,
      count: created.length,
      removedCount,
      transferIds: created
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error generating recurring transfers:', error);
    res.status(500).json({ error: 'שגיאה ביצירת העברות קבועות' });
  } finally {
    client.release();
  }
}

/**
 * Delete a specific recurring transfer application from a payment transfer
 * This allows treasurers to skip a recurring transfer for a specific period
 */
export async function deleteRecurringApplication(req: Request, res: Response) {
  const client = await pool.connect();

  try {
    const user = req.user!;
    const { transferId, applicationId } = req.params;

    // Only treasurers can delete applications
    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      return res.status(403).json({ error: 'רק גזברים יכולים למחוק העברות קבועות' });
    }

    await client.query('BEGIN');

    // Get the application details
    const applicationResult = await client.query(
      `SELECT rta.*, pt.status as transfer_status, pt.budget_type, pt.group_id
       FROM recurring_transfer_applications rta
       JOIN payment_transfers pt ON rta.payment_transfer_id = pt.id
       WHERE rta.id = $1 AND rta.payment_transfer_id = $2`,
      [applicationId, transferId]
    );

    if (applicationResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'רשומת העברה קבועה לא נמצאה' });
    }

    const application = applicationResult.rows[0];

    // Check if transfer is still pending
    if (application.transfer_status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'לא ניתן למחוק העברה קבועה מהעברה שכבר בוצעה' });
    }

    // Check access control
    const hasAccess = await canAccessBudgetType(user, application.budget_type, application.group_id);
    if (!hasAccess) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'אין לך הרשאה למחוק העברה קבועה זו' });
    }

    // Get the application amount before deleting
    const appliedAmount = parseFloat(application.applied_amount);

    // Delete the application
    await client.query(
      'DELETE FROM recurring_transfer_applications WHERE id = $1',
      [applicationId]
    );

    // Update the payment transfer total by subtracting the deleted amount
    // Don't use updateTransferTotals because it would re-create the application
    await client.query(
      `UPDATE payment_transfers
       SET total_amount = total_amount - $1
       WHERE id = $2`,
      [appliedAmount, transferId]
    );

    await client.query('COMMIT');

    res.json({ message: 'העברה קבועה נמחקה מההעברה בהצלחה' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting recurring application:', error);
    res.status(500).json({ error: 'שגיאה במחיקת העברה קבועה' });
  } finally {
    client.release();
  }
}
