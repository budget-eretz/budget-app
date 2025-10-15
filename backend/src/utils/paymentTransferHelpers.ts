import pool from '../config/database';
import { JWTPayload } from '../types';
import { PoolClient } from 'pg';

/**
 * Helper function to determine if a fund is from circle or group budget
 * @param fundId - The fund ID to check
 * @param client - Optional database client (for use within transactions)
 * @returns Object with budgetType ('circle' or 'group') and groupId (null for circle budgets)
 */
export async function getBudgetTypeForFund(fundId: number, client?: PoolClient): Promise<{ budgetType: 'circle' | 'group'; groupId: number | null }> {
  const db = client || pool;
  const result = await db.query(
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
 * @param client - Optional database client (for use within transactions)
 * @returns The payment transfer ID
 */
export async function getOrCreateOpenTransfer(
  recipientUserId: number,
  budgetType: 'circle' | 'group',
  groupId: number | null,
  client?: PoolClient
): Promise<number> {
  const db = client || pool;
  
  // Try to find an existing open transfer
  const findResult = await db.query(
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
  const createResult = await db.query(
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
 * Includes both reimbursements (positive) and charges (negative)
 * @param transferId - The payment transfer ID to update
 * @param client - Optional database client (for use within transactions)
 */
export async function updateTransferTotals(transferId: number, client?: PoolClient): Promise<void> {
  const db = client || pool;
  await db.query(
    `UPDATE payment_transfers
    SET 
      total_amount = (
        SELECT COALESCE(SUM(amount), 0)
        FROM reimbursements
        WHERE payment_transfer_id = $1 AND status = 'approved'
      ) - (
        SELECT COALESCE(SUM(amount), 0)
        FROM charges
        WHERE payment_transfer_id = $1 AND status = 'approved'
      ),
      reimbursement_count = (
        SELECT COUNT(*)
        FROM reimbursements
        WHERE payment_transfer_id = $1 AND status = 'approved'
      ) + (
        SELECT COUNT(*)
        FROM charges
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
 * @param client - Optional database client (for use within transactions)
 */
export async function associateReimbursementWithTransfer(
  reimbursementId: number,
  recipientUserId: number,
  fundId: number,
  client?: PoolClient
): Promise<void> {
  const db = client || pool;
  
  // Get budget type for the fund
  const { budgetType, groupId } = await getBudgetTypeForFund(fundId, client);

  // Get or create open transfer
  const transferId = await getOrCreateOpenTransfer(recipientUserId, budgetType, groupId, client);

  // Associate reimbursement with transfer
  await db.query(
    `UPDATE reimbursements
    SET payment_transfer_id = $1
    WHERE id = $2`,
    [transferId, reimbursementId]
  );

  // Update transfer totals
  await updateTransferTotals(transferId, client);
}

/**
 * Helper function to associate a charge with a payment transfer
 * Charges are negative amounts that offset reimbursements
 * @param chargeId - The charge ID to associate
 * @param chargedUserId - The user who owes the money (charge is deducted from their payments)
 * @param fundId - The fund ID to determine budget type
 * @param client - Optional database client (for use within transactions)
 */
export async function associateChargeWithTransfer(
  chargeId: number,
  chargedUserId: number,
  fundId: number,
  client?: PoolClient
): Promise<void> {
  const db = client || pool;
  
  // Get budget type for the fund
  const { budgetType, groupId } = await getBudgetTypeForFund(fundId, client);

  // Get or create open transfer for the charged user
  // Charges reduce the amount owed to the user
  const transferId = await getOrCreateOpenTransfer(chargedUserId, budgetType, groupId, client);

  // Associate charge with transfer
  await db.query(
    `UPDATE charges
    SET payment_transfer_id = $1
    WHERE id = $2`,
    [transferId, chargeId]
  );

  // Update transfer totals (charges reduce the total)
  await updateTransferTotals(transferId, client);
}
