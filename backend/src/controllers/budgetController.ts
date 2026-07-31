import { Request, Response } from 'express';
import pool from '../config/database';
import { getUserAccessibleGroupIds, canAccessBudget, isCircleTreasurer, getHiddenBudgetIds } from '../middleware/accessControl';

/**
 * SQL fragment that attaches the members a personal budget is assigned to.
 * Always returns an array (empty for non-personal budgets).
 */
const BUDGET_OWNERS_SELECT = `
  COALESCE((
    SELECT json_agg(json_build_object('id', u.id, 'full_name', u.full_name) ORDER BY u.full_name)
    FROM budget_owners bo
    JOIN users u ON bo.user_id = u.id
    WHERE bo.budget_id = b.id
  ), '[]'::json) as owners`;

/**
 * Replace the owners of a personal budget. Clears owners for any other budget type.
 */
async function setBudgetOwners(
  client: { query: (text: string, params?: any[]) => Promise<any> },
  budgetId: number,
  budgetType: string,
  ownerIds: number[] | undefined
): Promise<void> {
  if (budgetType !== 'personal') {
    await client.query('DELETE FROM budget_owners WHERE budget_id = $1', [budgetId]);
    return;
  }

  if (ownerIds === undefined) {
    return; // Owners not part of this update
  }

  const uniqueIds = [...new Set(ownerIds.map(Number).filter(id => Number.isInteger(id) && id > 0))];

  await client.query('DELETE FROM budget_owners WHERE budget_id = $1', [budgetId]);

  if (uniqueIds.length > 0) {
    await client.query(
      `INSERT INTO budget_owners (budget_id, user_id)
       SELECT $1, unnest($2::int[])
       ON CONFLICT DO NOTHING`,
      [budgetId, uniqueIds]
    );
  }
}
import { removeRecurringApplicationsForInactiveBudget } from '../utils/paymentTransferHelpers';

export async function getBudgets(req: Request, res: Response) {
  try {
    const user = req.user!;

    const isTreasurer = !!(user.isCircleTreasurer || user.isGroupTreasurer);
    const activeOnlyClause = isTreasurer ? '' : ' AND b.is_active = true';

    // Check if user is Circle Treasurer (can see all budgets)
    const isCircleTreas = await isCircleTreasurer(user.userId);

    if (isCircleTreas) {
      // Circle treasurer can see all budgets (including inactive)
      const result = await pool.query(
        `SELECT b.*, g.name as group_name,${BUDGET_OWNERS_SELECT}
         FROM budgets b
         LEFT JOIN groups g ON b.group_id = g.id
         ORDER BY b.created_at DESC`
      );
      return res.json(result.rows);
    }

    // For non-Circle Treasurers, get their accessible group IDs
    const accessibleGroupIds = await getUserAccessibleGroupIds(user.userId);

    // Restricted budgets (personal budgets of other members, treasurers budget)
    const hiddenBudgetIds = await getHiddenBudgetIds(user.userId);

    // Build query to show circle-level budgets and budgets from accessible groups
    let query = '';
    let params: any[] = [];

    if (accessibleGroupIds.length > 0) {
      // User has group assignments - show circle budgets + their group budgets
      query = `
        SELECT b.*, g.name as group_name,${BUDGET_OWNERS_SELECT}
        FROM budgets b
        LEFT JOIN groups g ON b.group_id = g.id
        WHERE (b.group_id IS NULL OR b.group_id = ANY($1))${activeOnlyClause}
          AND b.id <> ALL($2::int[])
        ORDER BY b.created_at DESC
      `;
      params = [accessibleGroupIds, hiddenBudgetIds];
    } else {
      // User has no group assignments - show only circle-level budgets
      query = `
        SELECT b.*, g.name as group_name,${BUDGET_OWNERS_SELECT}
        FROM budgets b
        LEFT JOIN groups g ON b.group_id = g.id
        WHERE b.group_id IS NULL${activeOnlyClause}
          AND b.id <> ALL($1::int[])
        ORDER BY b.created_at DESC
      `;
      params = [hiddenBudgetIds];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({ error: 'Failed to get budgets' });
  }
}

export async function getBudgetById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user!;

    console.log(`[getBudgetById] Request for budget ID: ${id} by user: ${user.userId}`);

    // Validate budget ID
    const budgetId = parseInt(id);
    if (isNaN(budgetId) || budgetId <= 0) {
      console.log(`[getBudgetById] Invalid budget ID: ${id}`);
      return res.status(400).json({ error: 'Invalid budget ID' });
    }

    // Check if user has access to this budget
    const hasAccess = await canAccessBudget(user.userId, budgetId);
    console.log(`[getBudgetById] User ${user.userId} access to budget ${budgetId}: ${hasAccess}`);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this budget' });
    }

    const result = await pool.query(
      `SELECT b.*, g.name as group_name,${BUDGET_OWNERS_SELECT},
              (SELECT COALESCE(SUM(amount), 0) FROM incomes WHERE budget_id = b.id) as total_income
       FROM budgets b
       LEFT JOIN groups g ON b.group_id = g.id
       WHERE b.id = $1`,
      [budgetId]
    );

    console.log(`[getBudgetById] Query result rows: ${result.rows.length}`);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    const budget = result.rows[0];
    budget.total_income = Number(budget.total_income || 0);

    console.log(`[getBudgetById] Successfully retrieved budget: ${budget.name}`);
    res.json(budget);
  } catch (error) {
    console.error('Get budget error:', error);
    res.status(500).json({ error: 'Failed to get budget' });
  }
}

export async function createBudget(req: Request, res: Response) {
  try {
    const { name, totalAmount, groupId, fiscalYear, isActive, budgetType, ownerIds } = req.body;
    const user = req.user!;

    // Validate permissions
    if (groupId && !user.isCircleTreasurer) {
      return res.status(403).json({ error: 'Only circle treasurer can create group budgets' });
    }

    if (!groupId && !user.isCircleTreasurer) {
      return res.status(403).json({ error: 'Only circle treasurer can create circle budgets' });
    }

    // TREASURERS BUDGET VALIDATION
    if (budgetType === 'treasurers') {
      if (!user.isCircleTreasurer) {
        return res.status(403).json({
          error: 'רק גזבר מעגלי יכול ליצור תקציב גזברים'
        });
      }
      if (groupId) {
        return res.status(400).json({
          error: 'תקציב גזברים חייב להיות תקציב מעגלי (ללא קבוצה)'
        });
      }
    }

    // PERSONAL BUDGET VALIDATION
    if (budgetType === 'personal') {
      if (!user.isCircleTreasurer) {
        return res.status(403).json({
          error: 'רק גזבר מעגלי יכול ליצור תקציב אישי'
        });
      }
      if (groupId) {
        return res.status(400).json({
          error: 'תקציב אישי חייב להיות תקציב מעגלי (ללא קבוצה)'
        });
      }
      if (!Array.isArray(ownerIds) || ownerIds.length === 0) {
        return res.status(400).json({
          error: 'יש לשייך את התקציב האישי לחבר אחד לפחות'
        });
      }
    }

    const finalBudgetType = budgetType || 'general';  // Default to 'general'

    const client = await pool.connect();
    let createdBudget;

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO budgets (name, total_amount, group_id, fiscal_year, created_by, is_active, budget_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [name, totalAmount, groupId || null, fiscalYear || null, user.userId, isActive !== undefined ? isActive : true, finalBudgetType]
      );

      createdBudget = result.rows[0];

      await setBudgetOwners(client, createdBudget.id, finalBudgetType, ownerIds);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.status(201).json(createdBudget);
  } catch (error) {
    console.error('Create budget error:', error);
    res.status(500).json({ error: 'Failed to create budget' });
  }
}

export async function updateBudget(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, totalAmount, fiscalYear, isActive, budgetType, ownerIds } = req.body;
    const user = req.user!;

    // Check if user has access to this budget
    const hasAccess = await canAccessBudget(user.userId, parseInt(id));

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this budget' });
    }

    // Get budget details to check if it's a group budget
    const budgetCheck = await pool.query(
      'SELECT group_id, budget_type FROM budgets WHERE id = $1',
      [id]
    );

    if (budgetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    const budgetGroupId = budgetCheck.rows[0].group_id;
    const currentBudgetType = budgetCheck.rows[0].budget_type;
    const isCircleTreas = await isCircleTreasurer(user.userId);

    // Check permissions for updating specific fields
    // Only circle treasurer can update circle budgets' name, totalAmount, fiscalYear, budgetType
    // Group treasurers can only update is_active for their group budgets
    if (budgetGroupId === null && !isCircleTreas) {
      // Circle budget - only circle treasurer can update
      return res.status(403).json({ error: 'Only circle treasurer can update circle budgets' });
    }

    // For group budgets, group treasurers can update is_active only
    if (budgetGroupId !== null && !isCircleTreas) {
      // Group treasurer updating group budget
      if (name !== undefined || totalAmount !== undefined || fiscalYear !== undefined || budgetType !== undefined) {
        return res.status(403).json({ error: 'Group treasurers can only update is_active status' });
      }
    }

    // TREASURERS BUDGET VALIDATION: Can't change to treasurers if it's a group budget
    if (budgetType === 'treasurers' && budgetGroupId !== null) {
      return res.status(400).json({
        error: 'תקציב גזברים חייב להיות תקציב מעגלי (ללא קבוצה)'
      });
    }

    // PERSONAL BUDGET VALIDATION: Can't turn a group budget into a personal budget
    if (budgetType === 'personal' && budgetGroupId !== null) {
      return res.status(400).json({
        error: 'תקציב אישי חייב להיות תקציב מעגלי (ללא קבוצה)'
      });
    }

    // Only circle treasurer can change budget_type
    if (budgetType !== undefined && !isCircleTreas) {
      return res.status(403).json({
        error: 'רק גזבר מעגלי יכול לשנות סוג תקציב'
      });
    }

    // Only circle treasurer can change who a personal budget is assigned to
    if (ownerIds !== undefined && !isCircleTreas) {
      return res.status(403).json({
        error: 'רק גזבר מעגלי יכול לשנות את שיוך התקציב האישי'
      });
    }

    const finalBudgetType = budgetType || currentBudgetType;

    // A personal budget must stay assigned to at least one member
    if (finalBudgetType === 'personal' && ownerIds !== undefined) {
      if (!Array.isArray(ownerIds) || ownerIds.length === 0) {
        return res.status(400).json({
          error: 'יש לשייך את התקציב האישי לחבר אחד לפחות'
        });
      }
    }

    if (budgetType === 'personal' && currentBudgetType !== 'personal' && ownerIds === undefined) {
      return res.status(400).json({
        error: 'יש לשייך את התקציב האישי לחבר אחד לפחות'
      });
    }

    const client = await pool.connect();
    let updatedBudget;

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE budgets
         SET name = COALESCE($1, name),
             total_amount = COALESCE($2, total_amount),
             fiscal_year = COALESCE($3, fiscal_year),
             is_active = COALESCE($4, is_active),
             budget_type = COALESCE($5, budget_type),
             updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
        [name, totalAmount, fiscalYear, isActive, budgetType, id]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Budget not found' });
      }

      updatedBudget = result.rows[0];

      // Keep owners in sync - also clears them when the budget stops being personal
      await setBudgetOwners(client, updatedBudget.id, updatedBudget.budget_type, ownerIds);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }


    // If budget was deactivated, remove recurring transfer applications from pending payment transfers
    if (isActive === false) {
      try {
        await removeRecurringApplicationsForInactiveBudget(parseInt(id));
        console.log(`[updateBudget] Removed recurring applications for inactive budget #${id}`);
      } catch (error) {
        console.error('Warning: Failed to remove recurring applications for inactive budget:', error);
      }
    }

    res.json(updatedBudget);
  } catch (error) {
    console.error('Update budget error:', error);
    res.status(500).json({ error: 'Failed to update budget' });
  }
}

export async function transferBudget(req: Request, res: Response) {
  try {
    const { fromBudgetId, toBudgetId, amount, description } = req.body;
    const user = req.user!;

    const isCircleTreas = await isCircleTreasurer(user.userId);

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get both budgets to check permissions and group_id
      const budgetsResult = await client.query(
        'SELECT id, group_id, total_amount FROM budgets WHERE id = ANY($1)',
        [[fromBudgetId, toBudgetId]]
      );

      if (budgetsResult.rows.length !== 2) {
        throw new Error('One or both budgets not found');
      }

      const fromBudget = budgetsResult.rows.find(b => b.id === fromBudgetId);
      const toBudget = budgetsResult.rows.find(b => b.id === toBudgetId);

      if (!fromBudget || !toBudget) {
        throw new Error('Budget not found');
      }

      // Check if from budget has enough funds
      if (Number(fromBudget.total_amount) < amount) {
        throw new Error('Insufficient funds in source budget');
      }

      // Permission checks
      if (isCircleTreas) {
        // Circle treasurer can transfer between any budgets
      } else {
        // Group treasurer can only transfer between budgets of their groups
        const accessibleGroupIds = await getUserAccessibleGroupIds(user.userId);
        
        // Check if user is a group treasurer
        const userResult = await client.query(
          'SELECT is_group_treasurer FROM users WHERE id = $1',
          [user.userId]
        );

        if (!userResult.rows[0]?.is_group_treasurer) {
          throw new Error('Only treasurers can transfer budgets');
        }

        // Both budgets must be group budgets (not circle budgets)
        if (fromBudget.group_id === null || toBudget.group_id === null) {
          throw new Error('Group treasurers can only transfer between group budgets');
        }

        // Both budgets must belong to groups the user has access to
        if (!accessibleGroupIds.includes(fromBudget.group_id) || 
            !accessibleGroupIds.includes(toBudget.group_id)) {
          throw new Error('Access denied to one or both budgets');
        }
      }

      // Update budgets
      await client.query(
        'UPDATE budgets SET total_amount = total_amount - $1, updated_at = NOW() WHERE id = $2',
        [amount, fromBudgetId]
      );

      await client.query(
        'UPDATE budgets SET total_amount = total_amount + $1, updated_at = NOW() WHERE id = $2',
        [amount, toBudgetId]
      );

      // Record transfer
      const transfer = await client.query(
        `INSERT INTO budget_transfers (from_budget_id, to_budget_id, amount, transferred_by, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [fromBudgetId, toBudgetId, amount, user.userId, description || null]
      );

      await client.query('COMMIT');

      res.status(201).json(transfer.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Transfer budget error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to transfer budget';
    res.status(500).json({ error: errorMessage });
  }
}

export async function deleteBudget(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user!;

    // Check if user has access to this budget
    const hasAccess = await canAccessBudget(user.userId, parseInt(id));
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this budget' });
    }

    // Check if budget exists
    const budgetResult = await pool.query(
      'SELECT * FROM budgets WHERE id = $1',
      [id]
    );

    if (budgetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    // Check if budget has associated funds
    const fundsResult = await pool.query(
      'SELECT COUNT(*) as count FROM funds WHERE budget_id = $1',
      [id]
    );

    const fundsCount = parseInt(fundsResult.rows[0].count);
    if (fundsCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete budget with existing funds',
        fundsCount 
      });
    }

    // Delete the budget
    await pool.query('DELETE FROM budgets WHERE id = $1', [id]);

    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error('Delete budget error:', error);
    res.status(500).json({ error: 'Failed to delete budget' });
  }
}

export async function getBudgetMonthlyStatus(req: Request, res: Response) {
  try {
    const { budgetId, year, month } = req.params;
    const user = req.user!;

    // Check if user has access to this budget
    const hasAccess = await canAccessBudget(user.userId, parseInt(budgetId));
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this budget' });
    }

    // Check if budget exists
    const budgetResult = await pool.query(
      'SELECT id FROM budgets WHERE id = $1',
      [budgetId]
    );

    if (budgetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    // Get all funds in this budget
    const fundsResult = await pool.query(
      'SELECT id, name FROM funds WHERE budget_id = $1 ORDER BY name',
      [budgetId]
    );

    // For each fund, get monthly status
    const monthlyStatuses = await Promise.all(
      fundsResult.rows.map(async (fund) => {
        // Get monthly allocation
        const allocationResult = await pool.query(
          `SELECT allocated_amount, allocation_type
           FROM fund_monthly_allocations
           WHERE fund_id = $1 AND year = $2 AND month = $3`,
          [fund.id, year, month]
        );

        const allocatedAmount = allocationResult.rows.length > 0 
          ? Number(allocationResult.rows[0].allocated_amount) 
          : 0;
        const allocationType = allocationResult.rows.length > 0 
          ? allocationResult.rows[0].allocation_type 
          : undefined;

        // Calculate spent amount (reimbursements + direct expenses)
        const spentResult = await pool.query(
          `SELECT 
             COALESCE(
               (SELECT SUM(amount) FROM reimbursements 
                WHERE fund_id = $1 
                  AND EXTRACT(YEAR FROM expense_date) = $2
                  AND EXTRACT(MONTH FROM expense_date) = $3
                  AND status IN ('pending', 'under_review', 'approved', 'paid')),
               0
             ) +
             COALESCE(
               (SELECT SUM(amount) FROM direct_expenses 
                WHERE fund_id = $1 
                  AND EXTRACT(YEAR FROM expense_date) = $2
                  AND EXTRACT(MONTH FROM expense_date) = $3),
               0
             ) as spent_amount`,
          [fund.id, year, month]
        );

        const spentAmount = Number(spentResult.rows[0].spent_amount);

        // Calculate planned amount
        const plannedResult = await pool.query(
          `SELECT COALESCE(SUM(amount), 0) as planned_amount
           FROM planned_expenses
           WHERE fund_id = $1
             AND EXTRACT(YEAR FROM planned_date) = $2
             AND EXTRACT(MONTH FROM planned_date) = $3
             AND status = 'planned'`,
          [fund.id, year, month]
        );

        const plannedAmount = Number(plannedResult.rows[0].planned_amount);

        // Calculate remaining amount
        const remainingAmount = allocatedAmount - spentAmount;

        return {
          fund_id: fund.id,
          fund_name: fund.name,
          year: parseInt(year),
          month: parseInt(month),
          allocated_amount: allocatedAmount,
          spent_amount: spentAmount,
          planned_amount: plannedAmount,
          remaining_amount: remainingAmount,
          allocation_type: allocationType
        };
      })
    );

    res.json(monthlyStatuses);
  } catch (error) {
    console.error('Get budget monthly status error:', error);
    res.status(500).json({ error: 'Failed to get budget monthly status' });
  }
}
