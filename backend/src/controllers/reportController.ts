import { Request, Response } from 'express';
import pool from '../config/database';

export async function getDashboard(req: Request, res: Response) {
  try {
    const user = req.user!;

    const dashboard: any = {
      user: {
        id: user.userId,
        email: user.email,
        isCircleTreasurer: user.isCircleTreasurer,
        isGroupTreasurer: user.isGroupTreasurer,
        groupIds: user.groupIds || []
      }
    };

    // Get budgets overview
    let budgetQuery = '';
    const budgetParams: any[] = [];

    if (user.isCircleTreasurer) {
      budgetQuery = `
        SELECT b.id, b.name, b.total_amount, b.group_id,
               (SELECT COALESCE(SUM(amount), 0) FROM incomes WHERE budget_id = b.id) as total_income,
               (SELECT COALESCE(SUM(allocated_amount), 0) FROM funds WHERE budget_id = b.id) as allocated_to_funds
        FROM budgets b
        ORDER BY b.created_at DESC
      `;
    } else if (user.groupIds && user.groupIds.length > 0) {
      budgetQuery = `
        SELECT b.id, b.name, b.total_amount, b.group_id,
               (SELECT COALESCE(SUM(amount), 0) FROM incomes WHERE budget_id = b.id) as total_income,
               (SELECT COALESCE(SUM(allocated_amount), 0) FROM funds WHERE budget_id = b.id) as allocated_to_funds
        FROM budgets b
        WHERE b.group_id = ANY($1) OR b.group_id IS NULL
        ORDER BY b.created_at DESC
      `;
      budgetParams.push(user.groupIds);
    }

    const budgets = await pool.query(budgetQuery, budgetParams);
    dashboard.budgets = budgets.rows;

    // Get funds with spending info
    let fundsQuery = `
      SELECT f.*,
             (SELECT COALESCE(SUM(amount), 0) FROM reimbursements
              WHERE fund_id = f.id AND status IN ('pending', 'under_review', 'approved', 'paid')) as spent_amount,
             (SELECT COALESCE(SUM(amount), 0) FROM planned_expenses
              WHERE fund_id = f.id AND status = 'planned') as planned_amount
      FROM funds f
    `;

    if (!user.isCircleTreasurer && user.groupIds && user.groupIds.length > 0) {
      fundsQuery += `
        JOIN budgets b ON f.budget_id = b.id
        WHERE b.group_id = ANY($1) OR b.group_id IS NULL
      `;
    }

    const funds = await pool.query(
      fundsQuery + ' ORDER BY f.created_at DESC',
      !user.isCircleTreasurer && user.groupIds && user.groupIds.length > 0 ? [user.groupIds] : []
    );

    dashboard.funds = funds.rows.map(fund => ({
      ...fund,
      available_amount: fund.allocated_amount - fund.spent_amount - fund.planned_amount
    }));

    // Get pending reimbursements (for treasurers)
    if (user.isCircleTreasurer || user.isGroupTreasurer) {
      let pendingQuery = `
        SELECT r.*, f.name as fund_name, u.full_name as user_name, b.group_id
        FROM reimbursements r
        JOIN funds f ON r.fund_id = f.id
        JOIN budgets b ON f.budget_id = b.id
        JOIN users u ON r.user_id = u.id
        WHERE r.status = 'pending'
      `;
      const pendingParams: any[] = [];

      // Filter by access control
      if (!user.isCircleTreasurer && user.groupIds && user.groupIds.length > 0) {
        // Group treasurer: only see reimbursements from their groups
        pendingQuery += ` AND (b.group_id = ANY($1) OR b.group_id IS NULL)`;
        pendingParams.push(user.groupIds);
      }

      pendingQuery += ` ORDER BY r.created_at ASC`;

      const pending = await pool.query(pendingQuery, pendingParams);
      dashboard.pendingReimbursements = pending.rows;
    }

    // Get user's reimbursements
    const userReimbursements = await pool.query(
      `SELECT r.*, f.name as fund_name
       FROM reimbursements r
       JOIN funds f ON r.fund_id = f.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [user.userId]
    );

    dashboard.myReimbursements = userReimbursements.rows;

    // Get user's planned expenses
    const userPlanned = await pool.query(
      `SELECT pe.*, f.name as fund_name
       FROM planned_expenses pe
       JOIN funds f ON pe.fund_id = f.id
       WHERE pe.user_id = $1 AND pe.status = 'planned'
       ORDER BY pe.planned_date ASC`,
      [user.userId]
    );

    dashboard.myPlannedExpenses = userPlanned.rows;

    res.json(dashboard);
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
}

export async function getPaymentsList(req: Request, res: Response) {
  try {
    const user = req.user!;

    if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
      return res.status(403).json({ error: 'Treasurer access required' });
    }

    const result = await pool.query(
      `SELECT r.*, f.name as fund_name, f.budget_id,
              u.full_name as user_name, u.email, u.phone
       FROM reimbursements r
       JOIN funds f ON r.fund_id = f.id
       JOIN users u ON r.user_id = u.id
       WHERE r.status = 'approved'
       ORDER BY r.reviewed_at ASC`,
      []
    );

    const totalAmount = result.rows.reduce((sum, r) => sum + parseFloat(r.amount), 0);

    res.json({
      reimbursements: result.rows,
      totalAmount,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get payments list error:', error);
    res.status(500).json({ error: 'Failed to get payments list' });
  }
}

export async function getBudgetReport(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const budget = await pool.query(
      `SELECT b.*, g.name as group_name,
              (SELECT COALESCE(SUM(amount), 0) FROM incomes WHERE budget_id = b.id) as total_income
       FROM budgets b
       LEFT JOIN groups g ON b.group_id = g.id
       WHERE b.id = $1`,
      [id]
    );

    if (budget.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    const funds = await pool.query(
      `SELECT f.*,
              (SELECT COALESCE(SUM(amount), 0) FROM reimbursements
               WHERE fund_id = f.id AND status IN ('pending', 'under_review', 'approved', 'paid')) as spent_amount,
              (SELECT COALESCE(SUM(amount), 0) FROM planned_expenses
               WHERE fund_id = f.id AND status = 'planned') as planned_amount
       FROM funds f
       WHERE f.budget_id = $1`,
      [id]
    );

    const transfers = await pool.query(
      `SELECT bt.*,
              from_b.name as from_budget_name,
              to_b.name as to_budget_name,
              u.full_name as transferred_by_name
       FROM budget_transfers bt
       JOIN budgets from_b ON bt.from_budget_id = from_b.id
       JOIN budgets to_b ON bt.to_budget_id = to_b.id
       JOIN users u ON bt.transferred_by = u.id
       WHERE bt.from_budget_id = $1 OR bt.to_budget_id = $1
       ORDER BY bt.created_at DESC`,
      [id]
    );

    const totalAllocated = funds.rows.reduce((sum, f) => sum + parseFloat(f.allocated_amount), 0);
    const totalSpent = funds.rows.reduce((sum, f) => sum + parseFloat(f.spent_amount), 0);
    const totalPlanned = funds.rows.reduce((sum, f) => sum + parseFloat(f.planned_amount), 0);

    res.json({
      budget: budget.rows[0],
      funds: funds.rows.map(fund => ({
        ...fund,
        available_amount: fund.allocated_amount - fund.spent_amount - fund.planned_amount
      })),
      transfers: transfers.rows,
      summary: {
        totalAllocated,
        totalSpent,
        totalPlanned,
        totalAvailable: budget.rows[0].total_amount + budget.rows[0].total_income - totalAllocated
      }
    });
  } catch (error) {
    console.error('Get budget report error:', error);
    res.status(500).json({ error: 'Failed to get budget report' });
  }
}
