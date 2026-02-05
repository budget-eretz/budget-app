import { Request, Response } from 'express';
import pool from '../config/database';
import { DirectExpense } from '../types';

// Create direct expense
export const createDirectExpense = async (req: Request, res: Response) => {
  const { fundId, amount, description, expenseDate, payee, receiptUrl, apartmentId } = req.body;
  const userId = req.user!.userId;

  try {
    // Get fund and budget info
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

    // Check permissions
    if (isCircleBudget) {
      if (!req.user!.isCircleTreasurer) {
        return res.status(403).json({ error: 'Only circle treasurer can create direct expenses for circle funds' });
      }
    } else {
      if (!req.user!.isGroupTreasurer || !req.user!.groupIds.includes(fund.group_id)) {
        return res.status(403).json({ error: 'Only group treasurer can create direct expenses for their group funds' });
      }
    }

    // Create direct expense
    const result = await pool.query(
      `INSERT INTO direct_expenses
       (fund_id, amount, description, expense_date, payee, receipt_url, created_by, apartment_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [fundId, amount, description, expenseDate, payee, receiptUrl || null, userId, apartmentId || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating direct expense:', error);
    res.status(500).json({ error: 'Failed to create direct expense' });
  }
};

// Update direct expense
export const updateDirectExpense = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount, description, expenseDate, payee, receiptUrl, apartmentId } = req.body;
  const userId = req.user!.userId;

  try {
    // Get existing expense with fund and budget info
    const expenseResult = await pool.query(
      `SELECT de.*, f.budget_id, b.group_id 
       FROM direct_expenses de
       JOIN funds f ON de.fund_id = f.id
       JOIN budgets b ON f.budget_id = b.id
       WHERE de.id = $1`,
      [id]
    );

    if (expenseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Direct expense not found' });
    }

    const expense = expenseResult.rows[0];
    const isCircleBudget = expense.group_id === null;

    // Check permissions
    if (isCircleBudget) {
      if (!req.user!.isCircleTreasurer) {
        return res.status(403).json({ error: 'Only circle treasurer can update direct expenses for circle funds' });
      }
    } else {
      if (!req.user!.isGroupTreasurer || !req.user!.groupIds.includes(expense.group_id)) {
        return res.status(403).json({ error: 'Only group treasurer can update direct expenses for their group funds' });
      }
    }

    // Update expense
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (amount !== undefined) {
      updateFields.push(`amount = $${paramCount++}`);
      values.push(amount);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (expenseDate !== undefined) {
      updateFields.push(`expense_date = $${paramCount++}`);
      values.push(expenseDate);
    }
    if (payee !== undefined) {
      updateFields.push(`payee = $${paramCount++}`);
      values.push(payee);
    }
    if (receiptUrl !== undefined) {
      updateFields.push(`receipt_url = $${paramCount++}`);
      values.push(receiptUrl || null);
    }
    if (apartmentId !== undefined) {
      updateFields.push(`apartment_id = $${paramCount++}`);
      values.push(apartmentId || null);
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE direct_expenses 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating direct expense:', error);
    res.status(500).json({ error: 'Failed to update direct expense' });
  }
};

// Delete direct expense
export const deleteDirectExpense = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  try {
    // Get existing expense with fund and budget info
    const expenseResult = await pool.query(
      `SELECT de.*, f.budget_id, b.group_id 
       FROM direct_expenses de
       JOIN funds f ON de.fund_id = f.id
       JOIN budgets b ON f.budget_id = b.id
       WHERE de.id = $1`,
      [id]
    );

    if (expenseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Direct expense not found' });
    }

    const expense = expenseResult.rows[0];
    const isCircleBudget = expense.group_id === null;

    // Check permissions
    if (isCircleBudget) {
      if (!req.user!.isCircleTreasurer) {
        return res.status(403).json({ error: 'Only circle treasurer can delete direct expenses for circle funds' });
      }
    } else {
      if (!req.user!.isGroupTreasurer || !req.user!.groupIds.includes(expense.group_id)) {
        return res.status(403).json({ error: 'Only group treasurer can delete direct expenses for their group funds' });
      }
    }

    // Delete expense
    await pool.query('DELETE FROM direct_expenses WHERE id = $1', [id]);

    res.json({ message: 'Direct expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting direct expense:', error);
    res.status(500).json({ error: 'Failed to delete direct expense' });
  }
};

// Get all direct expenses (with access control)
export const getAllDirectExpenses = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const isCircleTreasurer = req.user!.isCircleTreasurer;
  const isGroupTreasurer = req.user!.isGroupTreasurer;
  const groupIds = req.user!.groupIds;

  try {
    let query = `
      SELECT de.*,
             f.name as fund_name,
             f.budget_id,
             b.name as budget_name,
             CASE WHEN b.group_id IS NULL THEN 'circle' ELSE 'group' END as budget_type,
             b.group_id,
             u.full_name as created_by_name,
             de.apartment_id,
             apt.name as apartment_name
      FROM direct_expenses de
      JOIN funds f ON de.fund_id = f.id
      JOIN budgets b ON f.budget_id = b.id
      JOIN users u ON de.created_by = u.id
      LEFT JOIN apartments apt ON de.apartment_id = apt.id
    `;

    const conditions = [];
    const values = [];

    // Apply access control
    if (!isCircleTreasurer) {
      if (isGroupTreasurer && groupIds.length > 0) {
        // Group treasurers see only their group expenses
        conditions.push(`b.group_id = ANY($${values.length + 1})`);
        values.push(groupIds);
      } else {
        // Regular members see no direct expenses
        return res.json([]);
      }
    }
    // Circle treasurers see all expenses (no filter needed)

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY de.expense_date DESC, de.created_at DESC';

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching direct expenses:', error);
    res.status(500).json({ error: 'Failed to fetch direct expenses' });
  }
};

// Get direct expense by ID
export const getDirectExpenseById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT de.*,
              f.name as fund_name,
              f.budget_id,
              u.full_name as created_by_name,
              de.apartment_id,
              apt.name as apartment_name
       FROM direct_expenses de
       JOIN funds f ON de.fund_id = f.id
       JOIN users u ON de.created_by = u.id
       LEFT JOIN apartments apt ON de.apartment_id = apt.id
       WHERE de.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Direct expense not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching direct expense:', error);
    res.status(500).json({ error: 'Failed to fetch direct expense' });
  }
};
