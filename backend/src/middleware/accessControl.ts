import pool from '../config/database';

/**
 * Check if a user is a Circle Treasurer (has full access to all data)
 */
export async function isCircleTreasurer(userId: number): Promise<boolean> {
  const result = await pool.query(
    'SELECT is_circle_treasurer FROM users WHERE id = $1',
    [userId]
  );
  
  if (result.rows.length === 0) {
    return false;
  }
  
  return result.rows[0].is_circle_treasurer;
}

/**
 * Get all group IDs that a user has access to
 * Returns all group IDs for Circle Treasurers, or assigned groups for others
 */
export async function getUserAccessibleGroupIds(userId: number): Promise<number[]> {
  // Check if user is Circle Treasurer (has access to all groups)
  const isCircleTreas = await isCircleTreasurer(userId);
  
  if (isCircleTreas) {
    // Circle Treasurers can access all groups
    const result = await pool.query('SELECT id FROM groups');
    return result.rows.map(row => row.id);
  }
  
  // For non-Circle Treasurers, get their assigned groups from user_groups table
  const result = await pool.query(
    'SELECT group_id FROM user_groups WHERE user_id = $1',
    [userId]
  );
  
  return result.rows.map(row => row.group_id);
}

/**
 * Get the IDs of budgets a user must NOT see.
 *
 * These are circle-level budgets that look public (group_id IS NULL) but are
 * restricted to a specific audience:
 *   - 'personal'   -> only the members the budget is assigned to
 *   - 'treasurers' -> only circle treasurers
 *
 * This is the single source of truth for restricted-budget filtering. Every list
 * query that returns budgets, funds or expenses should exclude these IDs, e.g.:
 *   AND b.id <> ALL($n::int[])
 * An empty array is safe: `x <> ALL('{}')` evaluates to TRUE.
 */
export async function getHiddenBudgetIds(userId: number): Promise<number[]> {
  const isCircleTreas = await isCircleTreasurer(userId);

  if (isCircleTreas) {
    return []; // Circle treasurers see everything
  }

  const result = await pool.query(
    `SELECT b.id
     FROM budgets b
     WHERE b.budget_type = 'treasurers'
        OR (
          b.budget_type = 'personal'
          AND NOT EXISTS (
            SELECT 1 FROM budget_owners bo
            WHERE bo.budget_id = b.id AND bo.user_id = $1
          )
        )`,
    [userId]
  );

  return result.rows.map(row => row.id);
}

/**
 * Check whether a restricted circle-level budget is accessible to a non-circle-treasurer.
 * Returns null when the budget carries no restriction, so the caller keeps its own logic.
 */
async function checkRestrictedBudgetAccess(
  userId: number,
  budgetType: string,
  budgetId: number
): Promise<boolean | null> {
  if (budgetType === 'treasurers') {
    return false; // Circle treasurers only - they are short-circuited before this point
  }

  if (budgetType === 'personal') {
    const ownerResult = await pool.query(
      'SELECT 1 FROM budget_owners WHERE budget_id = $1 AND user_id = $2',
      [budgetId, userId]
    );
    return ownerResult.rows.length > 0;
  }

  return null;
}

/**
 * Check if a user can access a specific budget
 * Circle Treasurers can access all budgets
 * Group Treasurers can access budgets from their assigned groups
 * Other users can access circle-level budgets (group_id IS NULL) and budgets from their assigned groups
 */
export async function canAccessBudget(userId: number, budgetId: number): Promise<boolean> {
  // Check if user is Circle Treasurer (full access)
  const isCircleTreas = await isCircleTreasurer(userId);
  
  if (isCircleTreas) {
    return true;
  }
  
  // Get the budget's group_id
  const budgetResult = await pool.query(
    'SELECT group_id, budget_type FROM budgets WHERE id = $1',
    [budgetId]
  );
  
  if (budgetResult.rows.length === 0) {
    return false; // Budget doesn't exist
  }
  
  const budgetGroupId = budgetResult.rows[0].group_id;
  
  // Restricted circle-level budgets (personal / treasurers) have their own rules
  const restrictedAccess = await checkRestrictedBudgetAccess(
    userId,
    budgetResult.rows[0].budget_type,
    budgetId
  );

  if (restrictedAccess !== null) {
    return restrictedAccess;
  }

  // If budget is circle-level (group_id IS NULL), all users can access it
  if (budgetGroupId === null) {
    return true;
  }
  
  // Check if user is a Group Treasurer and is assigned to the budget's group
  const userResult = await pool.query(
    'SELECT is_group_treasurer FROM users WHERE id = $1',
    [userId]
  );
  
  if (userResult.rows.length > 0 && userResult.rows[0].is_group_treasurer) {
    // Group Treasurer - check if they're assigned to this budget's group
    const groupMemberResult = await pool.query(
      'SELECT 1 FROM user_groups WHERE user_id = $1 AND group_id = $2',
      [userId, budgetGroupId]
    );
    
    if (groupMemberResult.rows.length > 0) {
      return true; // Group Treasurer has access to their group's budget
    }
  }
  
  // Check if user is assigned to the budget's group (for regular members)
  const accessibleGroupIds = await getUserAccessibleGroupIds(userId);
  return accessibleGroupIds.includes(budgetGroupId);
}

/**
 * Check if a user can access a specific fund
 * Circle Treasurers can access all funds
 * Group Treasurers can access funds from their assigned groups
 * Other users can access funds from budgets they have access to
 */
export async function canAccessFund(userId: number, fundId: number): Promise<boolean> {
  // Check if user is Circle Treasurer (full access)
  const isCircleTreas = await isCircleTreasurer(userId);
  
  if (isCircleTreas) {
    return true;
  }
  
  // Get the fund's budget_id
  const fundResult = await pool.query(
    'SELECT budget_id FROM funds WHERE id = $1',
    [fundId]
  );
  
  if (fundResult.rows.length === 0) {
    return false; // Fund doesn't exist
  }
  
  const budgetId = fundResult.rows[0].budget_id;
  
  // Check if user can access the fund's budget (includes Group Treasurer check)
  return canAccessBudget(userId, budgetId);
}

/**
 * Validate if a user has access to a specific fund
 * Checks if fund belongs to circle budget (accessible to all) or user's group budgets
 * Returns boolean indicating access permission
 */
export async function validateFundAccess(userId: number, fundId: number): Promise<boolean> {
  // Get the fund's budget information
  const result = await pool.query(`
    SELECT b.id AS budget_id, b.group_id, b.budget_type
    FROM funds f
    JOIN budgets b ON f.budget_id = b.id
    WHERE f.id = $1
  `, [fundId]);
  
  if (result.rows.length === 0) {
    return false; // Fund doesn't exist
  }
  
  const groupId = result.rows[0].group_id;

  // Restricted circle-level budgets (personal / treasurers) - circle treasurers or assigned members only
  if (result.rows[0].budget_type === 'personal' || result.rows[0].budget_type === 'treasurers') {
    if (await isCircleTreasurer(userId)) {
      return true;
    }

    const restrictedAccess = await checkRestrictedBudgetAccess(
      userId,
      result.rows[0].budget_type,
      result.rows[0].budget_id
    );

    return restrictedAccess === true;
  }

  // Circle budget (group_id IS NULL) - accessible to all users
  if (!groupId) {
    return true;
  }
  
  // Group budget - check if user is a member of that group
  const memberCheck = await pool.query(`
    SELECT 1 FROM user_groups 
    WHERE user_id = $1 AND group_id = $2
  `, [userId, groupId]);
  
  return memberCheck.rows.length > 0;
}

/**
 * Validate if a user owns a specific reimbursement
 * Checks if the reimbursement's user_id matches the authenticated user
 * Returns boolean for ownership validation
 */
export async function validateReimbursementOwnership(userId: number, reimbursementId: number): Promise<boolean> {
  const result = await pool.query(
    'SELECT user_id FROM reimbursements WHERE id = $1',
    [reimbursementId]
  );
  
  if (result.rows.length === 0) {
    return false; // Reimbursement doesn't exist
  }
  
  return result.rows[0].user_id === userId;
}
