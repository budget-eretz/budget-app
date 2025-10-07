import { Request, Response } from 'express';
import pool from '../config/database';
import { canAccessFund } from '../middleware/accessControl';
import { FundMonthlyAllocation, FundAllocationSummary } from '../types';

// Helper function to record allocation history
async function recordAllocationHistory(
  client: any,
  fundId: number,
  year: number,
  month: number,
  allocatedAmount: number,
  allocationType: 'fixed' | 'variable',
  changedBy: number,
  changeType: 'created' | 'updated' | 'deleted'
): Promise<void> {
  await client.query(
    `INSERT INTO fund_allocation_history 
     (fund_id, year, month, allocated_amount, allocation_type, changed_by, change_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [fundId, year, month, allocatedAmount, allocationType, changedBy, changeType]
  );
}

// Helper function to check if user is treasurer for the fund's budget
async function isTreasurerForFund(userId: number, fundId: number): Promise<boolean> {
  const result = await pool.query(
    `SELECT b.group_id, u.is_circle_treasurer, u.is_group_treasurer
     FROM funds f
     JOIN budgets b ON f.budget_id = b.id
     CROSS JOIN users u
     WHERE f.id = $1 AND u.id = $2`,
    [fundId, userId]
  );

  if (result.rows.length === 0) {
    return false;
  }

  const { group_id, is_circle_treasurer, is_group_treasurer } = result.rows[0];

  // Circle treasurer can manage all funds
  if (is_circle_treasurer) {
    return true;
  }

  // Group treasurer can only manage their group's funds
  if (is_group_treasurer && group_id !== null) {
    const groupCheck = await pool.query(
      'SELECT 1 FROM user_groups WHERE user_id = $1 AND group_id = $2',
      [userId, group_id]
    );
    return groupCheck.rows.length > 0;
  }

  return false;
}

// Helper function to validate total allocations don't exceed fund's allocated amount
async function validateTotalAllocations(
  fundId: number,
  newAllocations: { year: number; month: number; amount: number }[],
  excludeMonths?: { year: number; month: number }[]
): Promise<{ valid: boolean; error?: string; details?: any }> {
  // Get fund's total allocation
  const fundResult = await pool.query(
    'SELECT allocated_amount FROM funds WHERE id = $1',
    [fundId]
  );

  if (fundResult.rows.length === 0) {
    return { valid: false, error: 'Fund not found' };
  }

  const totalFundAllocation = Number(fundResult.rows[0].allocated_amount);

  // Get existing allocations (excluding the ones we're updating)
  let existingQuery = 'SELECT COALESCE(SUM(allocated_amount), 0) as total FROM fund_monthly_allocations WHERE fund_id = $1';
  const params: any[] = [fundId];

  if (excludeMonths && excludeMonths.length > 0) {
    const excludeConditions = excludeMonths.map((_, idx) => {
      const yearParam = params.length + 1;
      const monthParam = params.length + 2;
      params.push(excludeMonths[idx].year, excludeMonths[idx].month);
      return `(year = $${yearParam} AND month = $${monthParam})`;
    });
    existingQuery += ` AND NOT (${excludeConditions.join(' OR ')})`;
  }

  const existingResult = await pool.query(existingQuery, params);
  const existingTotal = Number(existingResult.rows[0].total);

  // Calculate new total
  const newTotal = newAllocations.reduce((sum, alloc) => sum + alloc.amount, 0);
  const grandTotal = existingTotal + newTotal;

  if (grandTotal > totalFundAllocation) {
    return {
      valid: false,
      error: `Total monthly allocations (${grandTotal}) exceed fund's total allocation (${totalFundAllocation}). Remaining available: ${totalFundAllocation - existingTotal}`,
      details: {
        totalFundAllocation,
        existingAllocations: existingTotal,
        newAllocations: newTotal,
        totalAfterUpdate: grandTotal,
        remainingAvailable: totalFundAllocation - existingTotal
      }
    };
  }

  return { valid: true };
}

export async function setFixedAllocation(req: Request, res: Response) {
  try {
    const { fundId } = req.params;
    const { amount, startYear, startMonth } = req.body;
    const user = req.user!;

    // Validate input
    if (!amount || amount < 0) {
      return res.status(400).json({ error: 'Invalid allocation amount' });
    }

    if (!startYear || !startMonth || startMonth < 1 || startMonth > 12) {
      return res.status(400).json({ error: 'Invalid year or month' });
    }

    // Check treasurer permission
    const isTreasurer = await isTreasurerForFund(user.userId, parseInt(fundId));
    if (!isTreasurer) {
      return res.status(403).json({ error: 'Only treasurers can manage monthly allocations' });
    }

    // Generate 12 months of allocations starting from startMonth
    const allocations: { year: number; month: number; amount: number }[] = [];
    let currentYear = startYear;
    let currentMonth = startMonth;

    for (let i = 0; i < 12; i++) {
      allocations.push({
        year: currentYear,
        month: currentMonth,
        amount: Number(amount)
      });

      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }

    // Validate total allocations
    const validation = await validateTotalAllocations(
      parseInt(fundId),
      allocations,
      allocations.map(a => ({ year: a.year, month: a.month }))
    );

    if (!validation.valid) {
      return res.status(400).json({ error: validation.error, details: validation.details });
    }

    // Insert or update allocations
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const alloc of allocations) {
        // Check if allocation already exists
        const existingResult = await client.query(
          'SELECT id FROM fund_monthly_allocations WHERE fund_id = $1 AND year = $2 AND month = $3',
          [fundId, alloc.year, alloc.month]
        );
        
        const changeType = existingResult.rows.length > 0 ? 'updated' : 'created';
        
        await client.query(
          `INSERT INTO fund_monthly_allocations (fund_id, year, month, allocated_amount, allocation_type, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (fund_id, year, month)
           DO UPDATE SET allocated_amount = $4, allocation_type = $5, updated_at = NOW()`,
          [fundId, alloc.year, alloc.month, alloc.amount, 'fixed', user.userId]
        );
        
        // Record history
        await recordAllocationHistory(
          client,
          parseInt(fundId),
          alloc.year,
          alloc.month,
          alloc.amount,
          'fixed',
          user.userId,
          changeType
        );
      }

      await client.query('COMMIT');

      // Return updated allocation summary
      const summary = await getAllocationSummary(parseInt(fundId));
      res.json(summary);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Set fixed allocation error:', error);
    res.status(500).json({ error: 'Failed to set fixed allocation' });
  }
}

export async function setVariableAllocations(req: Request, res: Response) {
  try {
    const { fundId } = req.params;
    const { allocations } = req.body;
    const user = req.user!;

    // Validate input
    if (!Array.isArray(allocations) || allocations.length === 0) {
      return res.status(400).json({ error: 'Invalid allocations array' });
    }

    for (const alloc of allocations) {
      if (!alloc.year || !alloc.month || alloc.month < 1 || alloc.month > 12) {
        return res.status(400).json({ error: 'Invalid year or month in allocations' });
      }
      if (alloc.amount === undefined || alloc.amount < 0) {
        return res.status(400).json({ error: 'Invalid allocation amount' });
      }
    }

    // Check treasurer permission
    const isTreasurer = await isTreasurerForFund(user.userId, parseInt(fundId));
    if (!isTreasurer) {
      return res.status(403).json({ error: 'Only treasurers can manage monthly allocations' });
    }

    // Validate total allocations
    const validation = await validateTotalAllocations(
      parseInt(fundId),
      allocations.map(a => ({ year: a.year, month: a.month, amount: Number(a.amount) })),
      allocations.map(a => ({ year: a.year, month: a.month }))
    );

    if (!validation.valid) {
      return res.status(400).json({ error: validation.error, details: validation.details });
    }

    // Insert or update allocations
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const alloc of allocations) {
        // Check if allocation already exists
        const existingResult = await client.query(
          'SELECT id FROM fund_monthly_allocations WHERE fund_id = $1 AND year = $2 AND month = $3',
          [fundId, alloc.year, alloc.month]
        );
        
        const changeType = existingResult.rows.length > 0 ? 'updated' : 'created';
        
        await client.query(
          `INSERT INTO fund_monthly_allocations (fund_id, year, month, allocated_amount, allocation_type, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (fund_id, year, month)
           DO UPDATE SET allocated_amount = $4, allocation_type = $5, updated_at = NOW()`,
          [fundId, alloc.year, alloc.month, Number(alloc.amount), 'variable', user.userId]
        );
        
        // Record history
        await recordAllocationHistory(
          client,
          parseInt(fundId),
          alloc.year,
          alloc.month,
          Number(alloc.amount),
          'variable',
          user.userId,
          changeType
        );
      }

      await client.query('COMMIT');

      // Return updated allocation summary
      const summary = await getAllocationSummary(parseInt(fundId));
      res.json(summary);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Set variable allocations error:', error);
    res.status(500).json({ error: 'Failed to set variable allocations' });
  }
}

// Helper function to get allocation summary
async function getAllocationSummary(fundId: number): Promise<FundAllocationSummary> {
  const fundResult = await pool.query(
    'SELECT allocated_amount FROM funds WHERE id = $1',
    [fundId]
  );

  const totalFundAllocation = fundResult.rows.length > 0 ? Number(fundResult.rows[0].allocated_amount) : 0;

  const allocationsResult = await pool.query(
    `SELECT * FROM fund_monthly_allocations
     WHERE fund_id = $1
     ORDER BY year, month`,
    [fundId]
  );

  const monthlyAllocations: FundMonthlyAllocation[] = allocationsResult.rows.map(row => ({
    ...row,
    allocated_amount: Number(row.allocated_amount)
  }));

  const totalMonthlyAllocations = monthlyAllocations.reduce((sum, alloc) => sum + alloc.allocated_amount, 0);

  return {
    fund_id: fundId,
    total_fund_allocation: totalFundAllocation,
    total_monthly_allocations: totalMonthlyAllocations,
    remaining_unallocated: totalFundAllocation - totalMonthlyAllocations,
    monthly_allocations: monthlyAllocations
  };
}

export async function getAllocations(req: Request, res: Response) {
  try {
    const { fundId } = req.params;
    const user = req.user!;

    // Check if user has access to this fund
    const hasAccess = await canAccessFund(user.userId, parseInt(fundId));
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this fund' });
    }

    const summary = await getAllocationSummary(parseInt(fundId));
    res.json(summary);
  } catch (error) {
    console.error('Get allocations error:', error);
    res.status(500).json({ error: 'Failed to get allocations' });
  }
}

export async function getMonthAllocation(req: Request, res: Response) {
  try {
    const { fundId, year, month } = req.params;
    const user = req.user!;

    // Validate month
    const monthNum = parseInt(month);
    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: 'Invalid month. Must be between 1 and 12' });
    }

    // Check if user has access to this fund
    const hasAccess = await canAccessFund(user.userId, parseInt(fundId));
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this fund' });
    }

    const result = await pool.query(
      `SELECT * FROM fund_monthly_allocations
       WHERE fund_id = $1 AND year = $2 AND month = $3`,
      [fundId, year, month]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No allocation found for this month' });
    }

    const allocation = {
      ...result.rows[0],
      allocated_amount: Number(result.rows[0].allocated_amount)
    };

    res.json(allocation);
  } catch (error) {
    console.error('Get month allocation error:', error);
    res.status(500).json({ error: 'Failed to get month allocation' });
  }
}

export async function deleteMonthAllocation(req: Request, res: Response) {
  try {
    const { fundId, year, month } = req.params;
    const user = req.user!;

    // Validate month
    const monthNum = parseInt(month);
    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: 'Invalid month. Must be between 1 and 12' });
    }

    // Check treasurer permission
    const isTreasurer = await isTreasurerForFund(user.userId, parseInt(fundId));
    if (!isTreasurer) {
      return res.status(403).json({ error: 'Only treasurers can manage monthly allocations' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get allocation details before deleting
      const allocationResult = await client.query(
        'SELECT allocated_amount, allocation_type FROM fund_monthly_allocations WHERE fund_id = $1 AND year = $2 AND month = $3',
        [fundId, year, month]
      );

      if (allocationResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'No allocation found for this month' });
      }

      const { allocated_amount, allocation_type } = allocationResult.rows[0];

      // Record history before deleting
      await recordAllocationHistory(
        client,
        parseInt(fundId),
        parseInt(year),
        monthNum,
        Number(allocated_amount),
        allocation_type,
        user.userId,
        'deleted'
      );

      // Delete the allocation
      await client.query(
        'DELETE FROM fund_monthly_allocations WHERE fund_id = $1 AND year = $2 AND month = $3',
        [fundId, year, month]
      );

      await client.query('COMMIT');
      res.json({ message: 'Allocation deleted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Delete month allocation error:', error);
    res.status(500).json({ error: 'Failed to delete allocation' });
  }
}
