import { Request, Response } from 'express';
import pool from '../config/database';
import { getUserAccessibleGroupIds, isCircleTreasurer, canAccessFund, validateFundAccess } from '../middleware/accessControl';

export async function getFunds(req: Request, res: Response) {
  try {
    const { budgetId } = req.query;
    const user = req.user!;

    // Check if user is Circle Treasurer (can see all funds)
    const isCircleTreas = await isCircleTreasurer(user.userId);

    let query = `
      SELECT f.*,
             (SELECT COALESCE(SUM(amount), 0) FROM reimbursements
              WHERE fund_id = f.id AND status IN ('approved', 'paid')) as spent_amount,
             (SELECT COALESCE(SUM(amount), 0) FROM planned_expenses
              WHERE fund_id = f.id AND status = 'planned') as planned_amount
      FROM funds f
      JOIN budgets b ON f.budget_id = b.id
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    // Apply access control filter for non-Circle Treasurers
    if (!isCircleTreas) {
      const accessibleGroupIds = await getUserAccessibleGroupIds(user.userId);

      if (accessibleGroupIds.length === 0) {
        // User has no group assignments, can only see circle-level budgets
        conditions.push('b.group_id IS NULL');
      } else {
        // User can see circle-level budgets and budgets from their assigned groups
        const groupIdPlaceholders = accessibleGroupIds.map((_, idx) => `$${params.length + idx + 1}`).join(', ');
        conditions.push(`(b.group_id IS NULL OR b.group_id IN (${groupIdPlaceholders}))`);
        params.push(...accessibleGroupIds);
      }
    }

    if (budgetId) {
      conditions.push(`f.budget_id = $${params.length + 1}`);
      params.push(budgetId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY f.created_at DESC';

    const result = await pool.query(query, params);

    // Calculate available amount for each fund
    const funds = result.rows.map(fund => ({
      ...fund,
      spent_amount: Number(fund.spent_amount || 0),
      planned_amount: Number(fund.planned_amount || 0),
      available_amount: Number(fund.allocated_amount || 0) - Number(fund.spent_amount || 0) - Number(fund.planned_amount || 0)
    }));

    res.json(funds);
  } catch (error) {
    console.error('Get funds error:', error);
    res.status(500).json({ error: 'Failed to get funds' });
  }
}

export async function getFundById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user!;

    // Check if user has access to this fund
    const hasAccess = await canAccessFund(user.userId, parseInt(id));

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this fund' });
    }

    const result = await pool.query(
      `SELECT f.*,
              (SELECT COALESCE(SUM(amount), 0) FROM reimbursements
               WHERE fund_id = f.id AND status IN ('approved', 'paid')) as spent_amount,
              (SELECT COALESCE(SUM(amount), 0) FROM planned_expenses
               WHERE fund_id = f.id AND status = 'planned') as planned_amount
       FROM funds f
       WHERE f.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Fund not found' });
    }

    const fund = result.rows[0];
    fund.spent_amount = Number(fund.spent_amount || 0);
    fund.planned_amount = Number(fund.planned_amount || 0);
    fund.available_amount = Number(fund.allocated_amount || 0) - fund.spent_amount - fund.planned_amount;

    res.json(fund);
  } catch (error) {
    console.error('Get fund error:', error);
    res.status(500).json({ error: 'Failed to get fund' });
  }
}

export async function createFund(req: Request, res: Response) {
  try {
    const { budgetId, name, allocatedAmount, description } = req.body;
    const user = req.user!;

    // Check if user has permission for this budget
    const budget = await pool.query(
      'SELECT group_id FROM budgets WHERE id = $1',
      [budgetId]
    );

    if (budget.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    const budgetGroupId = budget.rows[0].group_id;

    // Permission check
    if (budgetGroupId === null && !user.isCircleTreasurer) {
      return res.status(403).json({ error: 'Only circle treasurer can manage circle funds' });
    }

    if (budgetGroupId !== null && !user.isCircleTreasurer && !user.isGroupTreasurer) {
      return res.status(403).json({ error: 'Treasurer access required' });
    }

    if (budgetGroupId !== null && user.isGroupTreasurer && !user.groupIds.includes(budgetGroupId)) {
      return res.status(403).json({ error: 'Cannot manage funds for other groups' });
    }

    const result = await pool.query(
      `INSERT INTO funds (budget_id, name, allocated_amount, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [budgetId, name, allocatedAmount, description || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create fund error:', error);
    res.status(500).json({ error: 'Failed to create fund' });
  }
}

export async function updateFund(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, allocatedAmount, description } = req.body;
    const user = req.user!;

    // Check if user has access to this fund
    const hasAccess = await canAccessFund(user.userId, parseInt(id));

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this fund' });
    }

    const result = await pool.query(
      `UPDATE funds
       SET name = COALESCE($1, name),
           allocated_amount = COALESCE($2, allocated_amount),
           description = COALESCE($3, description)
       WHERE id = $4
       RETURNING *`,
      [name, allocatedAmount, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Fund not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update fund error:', error);
    res.status(500).json({ error: 'Failed to update fund' });
  }
}

export async function deleteFund(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user!;

    // Check if user has access to this fund
    const hasAccess = await canAccessFund(user.userId, parseInt(id));

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this fund' });
    }

    const result = await pool.query(
      'DELETE FROM funds WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Fund not found' });
    }

    res.json({ message: 'Fund deleted successfully' });
  } catch (error) {
    console.error('Delete fund error:', error);
    res.status(500).json({ error: 'Failed to delete fund' });
  }
}

export async function getAccessibleFunds(req: Request, res: Response) {
  try {
    const user = req.user!;

    // Query all funds with their budget information
    const fundsResult = await pool.query(`
      SELECT 
        f.id,
        f.budget_id,
        f.name,
        f.allocated_amount,
        f.description,
        f.created_at,
        b.id as budget_id,
        b.name as budget_name,
        b.group_id,
        g.name as group_name,
        (SELECT COALESCE(SUM(amount), 0) FROM reimbursements
         WHERE fund_id = f.id AND status IN ('approved', 'paid')) as spent_amount,
        (SELECT COALESCE(SUM(amount), 0) FROM planned_expenses
         WHERE fund_id = f.id AND status = 'planned') as planned_amount
      FROM funds f
      JOIN budgets b ON f.budget_id = b.id
      LEFT JOIN groups g ON b.group_id = g.id
      ORDER BY b.group_id NULLS FIRST, b.name, f.name
    `);

    // Filter funds based on user's access using validateFundAccess
    const accessibleFunds = [];
    for (const fund of fundsResult.rows) {
      const hasAccess = await validateFundAccess(user.userId, fund.id);
      if (hasAccess) {
        // Calculate available amount
        fund.spent_amount = Number(fund.spent_amount || 0);
        fund.planned_amount = Number(fund.planned_amount || 0);
        fund.available_amount = Number(fund.allocated_amount || 0) - fund.spent_amount - fund.planned_amount;
        accessibleFunds.push(fund);
      }
    }

    // Group results by budget
    const budgetsMap = new Map();

    for (const fund of accessibleFunds) {
      const budgetKey = fund.budget_id;
      
      if (!budgetsMap.has(budgetKey)) {
        budgetsMap.set(budgetKey, {
          id: fund.budget_id,
          name: fund.budget_name,
          type: fund.group_id ? 'group' : 'circle',
          groupName: fund.group_name || undefined,
          funds: []
        });
      }

      budgetsMap.get(budgetKey).funds.push({
        id: fund.id,
        name: fund.name,
        allocated_amount: Number(fund.allocated_amount || 0),
        available_amount: Number(fund.available_amount || 0),
        description: fund.description,
        created_at: fund.created_at
      });
    }

    // Convert map to array and return structured response
    const budgets = Array.from(budgetsMap.values());

    res.json({ budgets });
  } catch (error) {
    console.error('Get accessible funds error:', error);
    res.status(500).json({ error: 'Failed to get accessible funds' });
  }
}
