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
              WHERE fund_id = f.id AND status IN ('pending', 'under_review', 'approved', 'paid')) as spent_amount,
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
      allocated_amount: Number(fund.allocated_amount || 0),
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
               WHERE fund_id = f.id AND status IN ('pending', 'under_review', 'approved', 'paid')) as spent_amount,
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
    fund.allocated_amount = Number(fund.allocated_amount || 0);
    fund.spent_amount = Number(fund.spent_amount || 0);
    fund.planned_amount = Number(fund.planned_amount || 0);
    fund.available_amount = fund.allocated_amount - fund.spent_amount - fund.planned_amount;

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
         WHERE fund_id = f.id AND status IN ('pending', 'under_review', 'approved', 'paid')) as spent_amount,
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
        fund.allocated_amount = Number(fund.allocated_amount || 0);
        fund.spent_amount = Number(fund.spent_amount || 0);
        fund.planned_amount = Number(fund.planned_amount || 0);
        fund.available_amount = fund.allocated_amount - fund.spent_amount - fund.planned_amount;
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

export async function getMonthlyStatus(req: Request, res: Response) {
  try {
    const { fundId, year, month } = req.params;
    const user = req.user!;

    // Check if user has access to this fund
    const hasAccess = await canAccessFund(user.userId, parseInt(fundId));

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this fund' });
    }

    // Get fund details
    const fundResult = await pool.query(
      'SELECT id, name FROM funds WHERE id = $1',
      [fundId]
    );

    if (fundResult.rows.length === 0) {
      return res.status(404).json({ error: 'Fund not found' });
    }

    const fund = fundResult.rows[0];

    // Get monthly allocation
    const allocationResult = await pool.query(
      `SELECT allocated_amount, allocation_type
       FROM fund_monthly_allocations
       WHERE fund_id = $1 AND year = $2 AND month = $3`,
      [fundId, year, month]
    );

    const allocatedAmount = allocationResult.rows.length > 0 
      ? Number(allocationResult.rows[0].allocated_amount) 
      : 0;
    const allocationType = allocationResult.rows.length > 0 
      ? allocationResult.rows[0].allocation_type 
      : undefined;

    // Calculate spent amount (pending, under_review, approved and paid reimbursements + direct expenses)
    const spentResult = await pool.query(
      `SELECT 
         (SELECT COALESCE(SUM(amount), 0) FROM reimbursements
          WHERE fund_id = $1
            AND EXTRACT(YEAR FROM expense_date) = $2
            AND EXTRACT(MONTH FROM expense_date) = $3
            AND status IN ('pending', 'under_review', 'approved', 'paid')) +
         (SELECT COALESCE(SUM(amount), 0) FROM direct_expenses
          WHERE fund_id = $1
            AND EXTRACT(YEAR FROM expense_date) = $2
            AND EXTRACT(MONTH FROM expense_date) = $3) as spent_amount`,
      [fundId, year, month]
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
      [fundId, year, month]
    );

    const plannedAmount = Number(plannedResult.rows[0].planned_amount);

    // Calculate remaining amount (actual execution)
    const remainingAmount = allocatedAmount - spentAmount;

    // Calculate unplanned amount (planning perspective)
    const unplannedAmount = allocatedAmount - plannedAmount;

    // Calculate variance (planning vs actual)
    const varianceDifference = spentAmount - plannedAmount;
    const variancePercentage = plannedAmount > 0 ? (spentAmount / plannedAmount) * 100 : 0;

    res.json({
      fund_id: parseInt(fundId),
      fund_name: fund.name,
      year: parseInt(year),
      month: parseInt(month),
      allocated: allocatedAmount,
      actual: {
        spent: spentAmount,
        remaining: remainingAmount
      },
      planning: {
        planned: plannedAmount,
        unplanned: unplannedAmount
      },
      variance: {
        planned: plannedAmount,
        actual: spentAmount,
        difference: varianceDifference,
        percentage: variancePercentage
      },
      allocation_type: allocationType
    });
  } catch (error) {
    console.error('Get monthly status error:', error);
    res.status(500).json({ error: 'Failed to get monthly status' });
  }
}

export async function getMonthlyExpenses(req: Request, res: Response) {
  try {
    const { fundId, year, month } = req.params;
    const user = req.user!;

    // Check if user has access to this fund
    const hasAccess = await canAccessFund(user.userId, parseInt(fundId));

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this fund' });
    }

    // Get fund and budget info for permission checking
    const fundResult = await pool.query(
      `SELECT f.id, f.budget_id, b.group_id 
       FROM funds f 
       JOIN budgets b ON f.budget_id = b.id 
       WHERE f.id = $1`,
      [fundId]
    );

    if (fundResult.rows.length === 0) {
      return res.status(404).json({ error: 'Fund not found' });
    }

    const fund = fundResult.rows[0];
    const isCircleBudget = fund.group_id === null;

    // Check if user can edit/delete direct expenses
    let canManageDirectExpenses = false;
    if (isCircleBudget) {
      canManageDirectExpenses = user.isCircleTreasurer;
    } else {
      canManageDirectExpenses = user.isCircleTreasurer || 
        (user.isGroupTreasurer && user.groupIds.includes(fund.group_id));
    }

    // Get all reimbursements for the fund in the specified month
    const reimbursementsResult = await pool.query(
      `SELECT 
         'reimbursement' as type,
         'r-' || r.id as id,
         r.user_id as submitter_id,
         u_submitter.full_name as submitter_name,
         r.recipient_user_id,
         u_recipient.full_name as recipient_name,
         r.amount,
         r.description,
         r.expense_date as date,
         r.status,
         r.receipt_url
       FROM reimbursements r
       JOIN users u_submitter ON r.user_id = u_submitter.id
       LEFT JOIN users u_recipient ON r.recipient_user_id = u_recipient.id
       WHERE r.fund_id = $1
         AND EXTRACT(YEAR FROM r.expense_date) = $2
         AND EXTRACT(MONTH FROM r.expense_date) = $3
       ORDER BY r.expense_date DESC, r.created_at DESC`,
      [fundId, year, month]
    );

    // Get all direct expenses for the fund in the specified month
    const directExpensesResult = await pool.query(
      `SELECT 
         'direct_expense' as type,
         'de-' || de.id as id,
         de.created_by as submitter_id,
         de.payee,
         de.amount,
         de.description,
         de.expense_date as date,
         de.receipt_url
       FROM direct_expenses de
       WHERE de.fund_id = $1
         AND EXTRACT(YEAR FROM de.expense_date) = $2
         AND EXTRACT(MONTH FROM de.expense_date) = $3
       ORDER BY de.expense_date DESC, de.created_at DESC`,
      [fundId, year, month]
    );

    // Combine and format expenses
    const expenses = [
      ...reimbursementsResult.rows.map(row => ({
        id: row.id,
        type: 'reimbursement',
        submitter: row.submitter_name,
        recipient: row.recipient_name || row.submitter_name,
        amount: Number(row.amount),
        description: row.description,
        date: row.date,
        status: row.status,
        receiptUrl: row.receipt_url,
        canEdit: false,
        canDelete: false
      })),
      ...directExpensesResult.rows.map(row => ({
        id: row.id,
        type: 'direct_expense',
        submitter: 'הוצאה ישירה',
        recipient: row.payee,
        amount: Number(row.amount),
        description: row.description,
        date: row.date,
        status: null,
        receiptUrl: row.receipt_url,
        canEdit: canManageDirectExpenses,
        canDelete: canManageDirectExpenses
      }))
    ];

    // Sort by date descending
    expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({ expenses });
  } catch (error) {
    console.error('Get monthly expenses error:', error);
    res.status(500).json({ error: 'Failed to get monthly expenses' });
  }
}

export async function getMonthlyPlannedExpenses(req: Request, res: Response) {
  try {
    const { fundId, year, month } = req.params;
    const user = req.user!;

    // Check if user has access to this fund
    const hasAccess = await canAccessFund(user.userId, parseInt(fundId));

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this fund' });
    }

    // Get all planned expenses for the fund in the specified month
    const result = await pool.query(
      `SELECT 
         pe.id,
         pe.fund_id,
         pe.user_id,
         u.full_name as user_name,
         pe.amount,
         pe.description,
         pe.planned_date,
         pe.status
       FROM planned_expenses pe
       JOIN users u ON pe.user_id = u.id
       WHERE pe.fund_id = $1
         AND EXTRACT(YEAR FROM pe.planned_date) = $2
         AND EXTRACT(MONTH FROM pe.planned_date) = $3
       ORDER BY pe.planned_date DESC, pe.created_at DESC`,
      [fundId, year, month]
    );

    const plannedExpenses = result.rows.map(row => ({
      id: row.id,
      fund_id: row.fund_id,
      user_id: row.user_id,
      user_name: row.user_name,
      amount: Number(row.amount),
      description: row.description,
      planned_date: row.planned_date,
      status: row.status
    }));

    res.json(plannedExpenses);
  } catch (error) {
    console.error('Get monthly planned expenses error:', error);
    res.status(500).json({ error: 'Failed to get monthly planned expenses' });
  }
}

export async function getDashboardMonthlyStatus(req: Request, res: Response) {
  try {
    const user = req.user!;
    
    // Get current year and month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed

    // Check if user is Circle Treasurer (can see all funds)
    const isCircleTreas = await isCircleTreasurer(user.userId);

    // Build query to get all accessible funds
    let fundQuery = `
      SELECT f.id, f.name
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
        const groupIdPlaceholders = accessibleGroupIds.map((_, idx) => `$${idx + 1}`).join(', ');
        conditions.push(`(b.group_id IS NULL OR b.group_id IN (${groupIdPlaceholders}))`);
        params.push(...accessibleGroupIds);
      }
    }

    if (conditions.length > 0) {
      fundQuery += ' WHERE ' + conditions.join(' AND ');
    }

    fundQuery += ' ORDER BY f.name';

    const fundsResult = await pool.query(fundQuery, params);

    // For each fund, get monthly status
    const monthlyStatuses = await Promise.all(
      fundsResult.rows.map(async (fund) => {
        // Get monthly allocation
        const allocationResult = await pool.query(
          `SELECT allocated_amount, allocation_type
           FROM fund_monthly_allocations
           WHERE fund_id = $1 AND year = $2 AND month = $3`,
          [fund.id, currentYear, currentMonth]
        );

        const allocatedAmount = allocationResult.rows.length > 0 
          ? Number(allocationResult.rows[0].allocated_amount) 
          : 0;
        const allocationType = allocationResult.rows.length > 0 
          ? allocationResult.rows[0].allocation_type 
          : undefined;

        // Calculate spent amount (pending, under_review, approved and paid reimbursements + direct expenses)
        const spentResult = await pool.query(
          `SELECT 
             (SELECT COALESCE(SUM(amount), 0) FROM reimbursements
              WHERE fund_id = $1
                AND EXTRACT(YEAR FROM expense_date) = $2
                AND EXTRACT(MONTH FROM expense_date) = $3
                AND status IN ('pending', 'under_review', 'approved', 'paid')) +
             (SELECT COALESCE(SUM(amount), 0) FROM direct_expenses
              WHERE fund_id = $1
                AND EXTRACT(YEAR FROM expense_date) = $2
                AND EXTRACT(MONTH FROM expense_date) = $3) as spent_amount`,
          [fund.id, currentYear, currentMonth]
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
          [fund.id, currentYear, currentMonth]
        );

        const plannedAmount = Number(plannedResult.rows[0].planned_amount);

        // Calculate remaining amount (actual execution)
        const remainingAmount = allocatedAmount - spentAmount;

        // Calculate unplanned amount (planning perspective)
        const unplannedAmount = allocatedAmount - plannedAmount;

        // Calculate variance (planning vs actual)
        const varianceDifference = spentAmount - plannedAmount;
        const variancePercentage = plannedAmount > 0 ? (spentAmount / plannedAmount) * 100 : 0;

        return {
          fund_id: fund.id,
          fund_name: fund.name,
          year: currentYear,
          month: currentMonth,
          allocated: allocatedAmount,
          actual: {
            spent: spentAmount,
            remaining: remainingAmount
          },
          planning: {
            planned: plannedAmount,
            unplanned: unplannedAmount
          },
          variance: {
            planned: plannedAmount,
            actual: spentAmount,
            difference: varianceDifference,
            percentage: variancePercentage
          },
          allocation_type: allocationType
        };
      })
    );

    res.json(monthlyStatuses);
  } catch (error) {
    console.error('Get dashboard monthly status error:', error);
    res.status(500).json({ error: 'Failed to get dashboard monthly status' });
  }
}

export async function getAllocationHistory(req: Request, res: Response) {
  try {
    const { fundId } = req.params;
    const user = req.user!;

    // Check if user has access to this fund
    const hasAccess = await canAccessFund(user.userId, parseInt(fundId));

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this fund' });
    }

    // Get allocation history with user names
    const result = await pool.query(
      `SELECT 
        fah.id,
        fah.fund_id,
        fah.year,
        fah.month,
        fah.allocated_amount,
        fah.allocation_type,
        fah.changed_by,
        fah.changed_at,
        fah.change_type,
        u.full_name as changed_by_name
       FROM fund_allocation_history fah
       LEFT JOIN users u ON fah.changed_by = u.id
       WHERE fah.fund_id = $1
       ORDER BY fah.changed_at DESC`,
      [fundId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get allocation history error:', error);
    res.status(500).json({ error: 'Failed to get allocation history' });
  }
}
