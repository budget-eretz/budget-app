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

    // Check if user has access to this budget
    const hasAccess = await canAccessBudget(user.userId, parseInt(id));
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this budget' });
    }

    const result = await pool.query(
      `SELECT b.*, g.name as group_name,
              (SELECT COALESCE(SUM(amount), 0) FROM incomes WHERE budget_id = b.id) as total_income
       FROM budgets b
       LEFT JOIN groups g ON b.group_id = g.id
       WHERE b.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    const budget = result.rows[0];
    budget.total_income = Number(budget.total_income || 0);

    res.json(budget);
  } catch (error) {
    console.error('Get budget error:', error);
    res.status(500).json({ error: 'Failed to get budget' });
  }
}

export async function createBudget(req: Request, res: Response) {
  try {
    const { name, totalAmount, groupId, fiscalYear } = req.body;
    const user = req.user!;

    // Validate permissions
    if (groupId && !user.isCircleTreasurer) {
      return res.status(403).json({ error: 'Only circle treasurer can create group budgets' });
    }

    if (!groupId && !user.isCircleTreasurer) {
      return res.status(403).json({ error: 'Only circle treasurer can create circle budgets' });
    }

    const result = await pool.query(
      `INSERT INTO budgets (name, total_amount, group_id, fiscal_year, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, totalAmount, groupId || null, fiscalYear || null, user.userId]
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
    const { name, totalAmount, fiscalYear } = req.body;
    const user = req.user!;

    // Check if user has access to this budget
    const hasAccess = await canAccessBudget(user.userId, parseInt(id));
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this budget' });
    }

    const result = await pool.query(
      `UPDATE budgets
       SET name = COALESCE($1, name),
           total_amount = COALESCE($2, total_amount),
           fiscal_year = COALESCE($3, fiscal_year),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name, totalAmount, fiscalYear, id]
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

    if (!user.isCircleTreasurer) {
      return res.status(403).json({ error: 'Only circle treasurer can transfer budgets' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check from budget has enough funds
      const fromBudget = await client.query(
        'SELECT total_amount FROM budgets WHERE id = $1',
        [fromBudgetId]
      );

      if (fromBudget.rows.length === 0) {
        throw new Error('Source budget not found');
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
    res.status(500).json({ error: 'Failed to transfer budget' });
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

        // Calculate spent amount (approved and paid reimbursements)
        const spentResult = await pool.query(
          `SELECT COALESCE(SUM(amount), 0) as spent_amount
           FROM reimbursements
           WHERE fund_id = $1
             AND EXTRACT(YEAR FROM expense_date) = $2
             AND EXTRACT(MONTH FROM expense_date) = $3
             AND status IN ('approved', 'paid')`,
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
