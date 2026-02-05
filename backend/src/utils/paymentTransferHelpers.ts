import pool from '../config/database';
import { JWTPayload } from '../types';
import { PoolClient } from 'pg';

/**
 * Calculate the current applicable period for a recurring transfer based on frequency
 * @param frequency - The frequency of the recurring transfer
 * @returns Object with year and month for the current period
 */
export function getCurrentPeriod(frequency: 'monthly' | 'quarterly' | 'annual'): { year: number; month: number } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-based

  switch (frequency) {
    case 'monthly':
      return { year, month };
    case 'quarterly':
      // Return the starting month of the current quarter (1, 4, 7, 10)
      const quarterStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
      return { year, month: quarterStartMonth };
    case 'annual':
      // Return January of current year
      return { year, month: 1 };
    default:
      return { year, month };
  }
}

/**
 * Format period for display in Hebrew
 * @param frequency - The frequency of the recurring transfer
 * @param year - The period year
 * @param month - The period month
 * @returns Formatted string like "דצמבר 2025", "רבעון 4 2025", "שנת 2025"
 */
export function formatPeriodDisplay(
  frequency: 'monthly' | 'quarterly' | 'annual',
  year: number,
  month: number
): string {
  const hebrewMonths = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];

  switch (frequency) {
    case 'monthly':
      return `${hebrewMonths[month - 1]} ${year}`;
    case 'quarterly':
      const quarter = Math.floor((month - 1) / 3) + 1;
      return `רבעון ${quarter} ${year}`;
    case 'annual':
      return `שנת ${year}`;
    default:
      return `${hebrewMonths[month - 1]} ${year}`;
  }
}

/**
 * Release recurring transfer applications when a payment transfer is deleted
 * This allows the recurring transfers to be applied to a new payment transfer
 * @param paymentTransferId - The payment transfer ID being deleted
 * @param client - Optional database client (for use within transactions)
 */
export async function releaseRecurringApplications(
  paymentTransferId: number,
  client?: PoolClient
): Promise<void> {
  const db = client || pool;

  await db.query(
    `DELETE FROM recurring_transfer_applications WHERE payment_transfer_id = $1`,
    [paymentTransferId]
  );

  console.log(`[releaseRecurringApplications] Released applications for transfer #${paymentTransferId}`);
}

/**
 * Remove recurring transfer applications from pending payment transfers when a budget becomes inactive
 * This ensures that recurring transfers from inactive budgets don't count in payment calculations
 * @param budgetId - The budget ID that became inactive
 * @param client - Optional database client (for use within transactions)
 */
export async function removeRecurringApplicationsForInactiveBudget(
  budgetId: number,
  client?: PoolClient
): Promise<void> {
  const db = client || pool;

  // Find all applications from recurring transfers in this budget that are in pending payment transfers
  const applicationsResult = await db.query(
    `SELECT rta.id, rta.payment_transfer_id, rta.applied_amount
     FROM recurring_transfer_applications rta
     JOIN recurring_transfers rt ON rta.recurring_transfer_id = rt.id
     JOIN funds f ON rt.fund_id = f.id
     JOIN payment_transfers pt ON rta.payment_transfer_id = pt.id
     WHERE f.budget_id = $1
       AND pt.status = 'pending'`,
    [budgetId]
  );

  if (applicationsResult.rows.length === 0) {
    console.log(`[removeRecurringApplicationsForInactiveBudget] No applications to remove for budget #${budgetId}`);
    return;
  }

  // Group by payment_transfer_id to update totals
  const transferAmounts = new Map<number, number>();
  const applicationIds: number[] = [];

  for (const app of applicationsResult.rows) {
    applicationIds.push(app.id);
    const currentAmount = transferAmounts.get(app.payment_transfer_id) || 0;
    transferAmounts.set(app.payment_transfer_id, currentAmount + parseFloat(app.applied_amount));
  }

  // Delete all applications
  await db.query(
    `DELETE FROM recurring_transfer_applications WHERE id = ANY($1)`,
    [applicationIds]
  );

  // Update payment transfer totals
  for (const [transferId, amount] of transferAmounts.entries()) {
    await db.query(
      `UPDATE payment_transfers
       SET total_amount = total_amount - $1
       WHERE id = $2`,
      [amount, transferId]
    );
  }

  console.log(`[removeRecurringApplicationsForInactiveBudget] Removed ${applicationIds.length} applications from ${transferAmounts.size} transfers for budget #${budgetId}`);
}

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
 * Includes reimbursements (positive), charges (negative), and recurring transfers (positive)
 * Now tracks which periods recurring transfers have been applied to prevent duplicates
 * @param transferId - The payment transfer ID to update
 * @param client - Optional database client (for use within transactions)
 */
export async function updateTransferTotals(transferId: number, client?: PoolClient): Promise<void> {
  const db = client || pool;

  // Get transfer details to find recipient and budget type
  const transferResult = await db.query(
    `SELECT recipient_user_id, budget_type, group_id
    FROM payment_transfers
    WHERE id = $1`,
    [transferId]
  );

  if (transferResult.rows.length === 0) {
    throw new Error('Payment transfer not found');
  }

  const { recipient_user_id, budget_type, group_id } = transferResult.rows[0];

  // Get active recurring transfers for this recipient and budget type
  // Only include transfers from active budgets
  const recurringResult = await db.query(
    `SELECT rt.id, rt.amount, rt.frequency, rt.start_date, rt.end_date, rt.description, f.name as fund_name
    FROM recurring_transfers rt
    JOIN funds f ON rt.fund_id = f.id
    JOIN budgets b ON f.budget_id = b.id
    WHERE rt.recipient_user_id = $1
      AND rt.status = 'active'
      AND b.is_active = true
      AND (rt.end_date IS NULL OR rt.end_date >= CURRENT_DATE)
      AND (
        ($2 = 'circle' AND b.group_id IS NULL) OR
        ($2 = 'group' AND b.group_id = $3)
      )`,
    [recipient_user_id, budget_type, group_id]
  );

  let recurringTotal = 0;
  const newApplications: Array<{
    recurringTransferId: number;
    amount: number;
    periodYear: number;
    periodMonth: number;
    description: string;
    fundName: string;
    frequency: string;
  }> = [];

  for (const recurring of recurringResult.rows) {
    const { year: periodYear, month: periodMonth } = getCurrentPeriod(recurring.frequency);

    // Check if this recurring transfer's start date is before or in the current period
    const startDate = new Date(recurring.start_date);
    const periodStart = new Date(periodYear, periodMonth - 1, 1);
    if (periodStart < new Date(startDate.getFullYear(), startDate.getMonth(), 1)) {
      // Period is before start date, skip
      continue;
    }

    // Check if already applied for this period (to ANY payment transfer)
    const existingApplication = await db.query(
      `SELECT id, payment_transfer_id
       FROM recurring_transfer_applications
       WHERE recurring_transfer_id = $1 AND period_year = $2 AND period_month = $3`,
      [recurring.id, periodYear, periodMonth]
    );

    if (existingApplication.rows.length > 0) {
      // If already applied to THIS transfer, include in total
      if (existingApplication.rows[0].payment_transfer_id === transferId) {
        recurringTotal += parseFloat(recurring.amount);
      }
      // If applied to a different transfer, skip (already paid/reserved for this period)
      continue;
    }

    // Not yet applied for this period - add to pending applications
    recurringTotal += parseFloat(recurring.amount);
    newApplications.push({
      recurringTransferId: recurring.id,
      amount: recurring.amount,
      periodYear,
      periodMonth,
      description: recurring.description,
      fundName: recurring.fund_name,
      frequency: recurring.frequency
    });
  }

  // Create application records for new recurring transfers (with snapshot data for historical records)
  for (const app of newApplications) {
    await db.query(
      `INSERT INTO recurring_transfer_applications
       (recurring_transfer_id, payment_transfer_id, period_year, period_month, applied_amount, description, fund_name, frequency)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (recurring_transfer_id, period_year, period_month) DO NOTHING`,
      [app.recurringTransferId, transferId, app.periodYear, app.periodMonth, app.amount, app.description, app.fundName, app.frequency]
    );
  }

  console.log(`[updateTransferTotals] Transfer #${transferId}: recipient=${recipient_user_id}, budget_type=${budget_type}, group_id=${group_id}, recurring_total=${recurringTotal}, new_applications=${newApplications.length}`);

  // Update transfer totals including recurring transfers
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
      ) + $2,
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
    [transferId, recurringTotal]
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

/**
 * Updates all pending payment transfers for a recipient when their recurring transfers change.
 * Call this after creating, updating, or deleting a recurring transfer.
 * @param recipientUserId - The user who receives the recurring transfer
 * @param fundId - The fund ID of the recurring transfer (used to determine budget type)
 * @param client - Optional database client (for use within transactions)
 */
export async function updatePaymentTransfersForRecurringChange(
  recipientUserId: number,
  fundId: number,
  client?: PoolClient
): Promise<void> {
  const db = client || pool;

  // Get budget type for the fund
  const { budgetType, groupId } = await getBudgetTypeForFund(fundId, client);

  // Find all pending payment transfers for this recipient and budget type
  const pendingTransfers = await db.query(
    `SELECT id FROM payment_transfers
     WHERE recipient_user_id = $1
       AND budget_type = $2
       AND ($3::INTEGER IS NULL AND group_id IS NULL OR group_id = $3)
       AND status = 'pending'`,
    [recipientUserId, budgetType, groupId]
  );

  // Update totals for each pending transfer
  for (const transfer of pendingTransfers.rows) {
    await updateTransferTotals(transfer.id, client);
  }

  console.log(`[updatePaymentTransfersForRecurringChange] Updated ${pendingTransfers.rows.length} payment transfers for recipient=${recipientUserId}, budgetType=${budgetType}, groupId=${groupId}`);
}
