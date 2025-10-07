import pool from '../config/database';
import { JWTPayload } from '../types';

/**
 * Helper function to determine if a fund is from circle or group budget
 * @param fundId - The fund ID to check
 * @returns Object with budgetType ('circle' or 'group') and groupId (null for circle budgets)
 */
export async function getBudgetTypeForFund(fundId: number): Promise<{ budgetType: 'circle' | 'group'; groupId: number | null }> {
  const result = await pool.query(
    `SELECT 
      CASE WHEN b.group_id IS NULL THEN 'circle' ELSE 'group' END as budget_type,
      b.group_id
    FROM funds f
    JOIN budgets b ON f.budget_id = b.id
    WHERE f.id = $1`,
    [fundId]
  );

  if (result.rows.length === 0) {
    throw new Error('Fund not found');
  }

  return {
    budgetType: result.rows[0].budget_type,
    groupId: result.rows[0].group_id
  };
}

/**
 * Helper function to check if a treasurer has access to a specific budget type
 * @param user - JWT payload with user information
 * @param budgetType - 'circle' or 'group'
 * @param groupId - Group ID (required for group budgets, null for circle budgets)
 * @returns true if user has access, false otherwise
 */
export async function canAccessBudgetType(
  user: JWTPayload,
  budgetType: 'circle' | 'group',
  groupId: number | null
): Promise<boolean> {
  // Circle treasurer can only access circle budgets
  if (user.isCircleTreasurer && !user.isGroupTreasurer) {
    return budgetType === 'circle';
  }

  // Group treasurer can access their group budgets
  if (user.isGroupTreasurer) {
    if (budgetType === 'circle') {
      return false;
    }

    // Check if user is treasurer of this group
    if (groupId === null) {
      return false;
    }

    return user.groupIds.includes(groupId);
  }

  return false;
}

/**
 * Helper function to find or create an open payment transfer for a recipient and budget type
 * @param recipientUserId - The user who will receive the payment
 * @param budgetType - 'circle' or 'group'
 * @param groupId - Group ID (required for group budgets, null for circle budgets)
 * @returns The payment transfer ID
 */
export async function getOrCreateOpenTransfer(
  recipientUserId: number,
  budgetType: 'circle' | 'group',
  groupId: number | null
): Promise<number> {
  // Try to find an existing open transfer
  const findResult = await pool.query(
    `SELECT id FROM payment_transfers
    WHERE recipient_user_id = $1
      AND budget_type = $2
      AND ($3::INTEGER IS NULL AND group_id IS NULL OR group_id = $3)
      AND status = 'pending'
    LIMIT 1`,
    [recipientUserId, budgetType, groupId]
  );

  if (findResult.rows.length > 0) {
    return findResult.rows[0].id;
  }

  // Create a new transfer if none exists
  const createResult = await pool.query(
    `INSERT INTO payment_transfers (
      recipient_user_id,
      budget_type,
      group_id,
      status,
      total_amount,
      reimbursement_count
    ) VALUES ($1, $2, $3, 'pending', 0, 0)
    RETURNING id`,
    [recipientUserId, budgetType, groupId]
  );

  return createResult.rows[0].id;
}

/**
 * Helper function to recalculate and update payment transfer totals
 * @param transferId - The payment transfer ID to update
 */
export async function updateTransferTotals(transferId: number): Promise<void> {
  await pool.query(
    `UPDATE payment_transfers
    SET 
      total_amount = (
        SELECT COALESCE(SUM(amount), 0)
        FROM reimbursements
        WHERE payment_transfer_id = $1 AND status = 'approved'
      ),
      reimbursement_count = (
        SELECT COUNT(*)
        FROM reimbursements
        WHERE payment_transfer_id = $1 AND status = 'approved'
      )
    WHERE id = $1`,
    [transferId]
  );
}

/**
 * Helper function to associate a reimbursement with a payment transfer
 * @param reimbursementId - The reimbursement ID to associate
 * @param recipientUserId - The user who will receive the payment
 * @param fundId - The fund ID to determine budget type
 */
export async function associateReimbursementWithTransfer(
  reimbursementId: number,
  recipientUserId: number,
  fundId: number
): Promise<void> {
  // Get budget type for the fund
  const { budgetType, groupId } = await getBudgetTypeForFund(fundId);

  // Get or create open transfer
  const transferId = await getOrCreateOpenTransfer(recipientUserId, budgetType, groupId);

  // Associate reimbursement with transfer
  await pool.query(
    `UPDATE reimbursements
    SET payment_transfer_id = $1
    WHERE id = $2`,
    [transferId, reimbursementId]
  );

  // Update transfer totals
  await updateTransferTotals(transferId);
}
