import { Request, Response } from 'express';
import pool from '../config/database';
import { getUserAccessibleGroupIds, canAccessBudget, isCircleTreasurer } from '../middleware/accessControl';

export async function getBudgets(req: Request, res: Response) {
  try {
    const user = req.user!;
    
    // Check if user is Circle Treasurer (can see all budgets)
    const isCircleTreas = await isCircleTreasurer(user.userId);
    
    if (isCircleTreas) {
      // Circle treasurer can see all budgets
      const result = await pool.query(
        `SELECT b.*, g.name as group_name
         FROM budgets b
         LEFT JOIN groups g ON b.group_id = g.id
         ORDER BY b.created_at DESC`
      );
      return res.json(result.rows);
    }
    
    // For non-Circle Treasurers, get their accessible group IDs
    const accessibleGroupIds = await getUserAccessibleGroupIds(user.userId);
    
    // Build query to show circle-level budgets and budgets from accessible groups
    let query = '';
    let params: any[] = [];
    
    if (accessibleGroupIds.length > 0) {
      // User has group assignments - show circle budgets + their group budgets
      query = `
        SELECT b.*, g.name as group_name
        FROM budgets b
        LEFT JOIN groups g ON b.group_id = g.id
        WHERE b.group_id IS NULL OR b.group_id = ANY($1)
        ORDER BY b.created_at DESC
      `;
      params = [accessibleGroupIds];
    } else {
      // User has no group assignments - show only circle-level budgets
      query = `
        SELECT b.*, g.name as group_name
        FROM budgets b
        LEFT JOIN groups g ON b.group_id = g.id
        WHERE b.group_id IS NULL
        ORDER BY b.created_at DESC
      `;
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
      `SELECT b.*, g.name as group_name,
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
    const { name, totalAmount, groupId, fiscalYear, isActive } = req.body;
    const user = req.user!;

    // Validate permissions
    if (groupId && !user.isCircleTreasurer) {
      return res.status(403).json({ error: 'Only circle treasurer can create group budgets' });
    }

    if (!groupId && !user.isCircleTreasurer) {
      return res.status(403).json({ error: 'Only circle treasurer can create circle budgets' });
    }

    const result = await pool.query(
      `INSERT INTO budgets (name, total_amount, group_id, fiscal_year, created_by, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, totalAmount, groupId || null, fiscalYear || null, user.userId, isActive !== undefined ? isActive : true]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create budget error:', error);
    res.status(500).json({ error: 'Failed to create budget' });
  }
}

export async function updateBudget(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, totalAmount, fiscalYear, isActive } = req.body;
    const user = req.user!;

    // Check if user has access to this budget
    const hasAccess = await canAccessBudget(user.userId, parseInt(id));
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this budget' });
    }

    // Get budget details to check if it's a group budget
    const budgetCheck = await pool.query(
      'SELECT group_id FROM budgets WHERE id = $1',
      [id]
    );

    if (budgetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    const budgetGroupId = budgetCheck.rows[0].group_id;
    const isCircleTreas = await isCircleTreasurer(user.userId);

    // Check permissions for updating specific fields
    // Only circle treasurer can update circle budgets' name, totalAmount, fiscalYear
    // Group treasurers can only update is_active for their group budgets
    if (budgetGroupId === null && !isCircleTreas) {
      // Circle budget - only circle treasurer can update
      return res.status(403).json({ error: 'Only circle treasurer can update circle budgets' });
    }

    // For group budgets, group treasurers can update is_active only
    if (budgetGroupId !== null && !isCircleTreas) {
      // Group treasurer updating group budget
      if (name !== undefined || totalAmount !== undefined || fiscalYear !== undefined) {
        return res.status(403).json({ error: 'Group treasurers can only update is_active status' });
      }
    }

    const result = await pool.query(
      `UPDATE budgets
       SET name = COALESCE($1, name),
           total_amount = COALESCE($2, total_amount),
           fiscal_year = COALESCE($3, fiscal_year),
           is_active = COALESCE($4, is_active),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [name, totalAmount, fiscalYear, isActive, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json(result.rows[0]);
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
