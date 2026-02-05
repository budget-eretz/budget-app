import { Request, Response } from 'express';
import pool from '../config/database';
import { Apartment, ApartmentWithResidents, ApartmentExpenseSummary } from '../types';

/**
 * Get all apartments with resident counts
 * Access: Circle Treasurer (full access), Group Treasurer (read-only), Regular members (their apartments only)
 */
export const getAllApartments = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const isCircleTreasurer = req.user!.isCircleTreasurer;
  const isGroupTreasurer = req.user!.isGroupTreasurer;

  try {
    let query = `
      SELECT
        a.id,
        a.name,
        a.description,
        a.created_by,
        a.created_at,
        a.updated_at,
        u.full_name as created_by_name,
        COUNT(ua.user_id) as resident_count
      FROM apartments a
      LEFT JOIN user_apartments ua ON a.id = ua.apartment_id
      LEFT JOIN users u ON a.created_by = u.id
    `;

    const values: any[] = [];

    // Regular members see only their apartments
    if (!isCircleTreasurer && !isGroupTreasurer) {
      query += `
        WHERE a.id IN (
          SELECT apartment_id FROM user_apartments WHERE user_id = $1
        )
      `;
      values.push(userId);
    }
    // Treasurers see all apartments (no filter needed)

    query += `
      GROUP BY a.id, u.full_name
      ORDER BY a.name
    `;

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching apartments:', error);
    res.status(500).json({ error: 'Failed to fetch apartments' });
  }
};

/**
 * Get apartment by ID with residents list
 * Access: Circle Treasurer (full), Group Treasurer (read-only), Regular members (only their apartments)
 */
export const getApartmentById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const isCircleTreasurer = req.user!.isCircleTreasurer;
  const isGroupTreasurer = req.user!.isGroupTreasurer;

  try {
    // Fetch apartment
    const apartmentResult = await pool.query(
      `SELECT a.*, u.full_name as created_by_name
       FROM apartments a
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.id = $1`,
      [id]
    );

    if (apartmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Apartment not found' });
    }

    const apartment = apartmentResult.rows[0];

    // Check access: regular members can only access their apartments
    if (!isCircleTreasurer && !isGroupTreasurer) {
      const accessResult = await pool.query(
        'SELECT 1 FROM user_apartments WHERE apartment_id = $1 AND user_id = $2',
        [id, userId]
      );
      if (accessResult.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied to this apartment' });
      }
    }

    // Fetch residents
    const residentsResult = await pool.query(
      `SELECT
        u.id,
        u.email,
        u.full_name,
        u.phone,
        u.is_circle_treasurer,
        u.is_group_treasurer,
        ua.assigned_at
       FROM users u
       INNER JOIN user_apartments ua ON u.id = ua.user_id
       WHERE ua.apartment_id = $1
       ORDER BY u.full_name`,
      [id]
    );

    const apartmentWithResidents: ApartmentWithResidents = {
      ...apartment,
      residents: residentsResult.rows
    };

    res.json(apartmentWithResidents);
  } catch (error) {
    console.error('Error fetching apartment:', error);
    res.status(500).json({ error: 'Failed to fetch apartment' });
  }
};

/**
 * Create apartment
 * Access: Circle Treasurer only
 */
export const createApartment = async (req: Request, res: Response) => {
  const { name, description } = req.body;
  const userId = req.user!.userId;

  // Validation
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Apartment name is required' });
  }

  if (name.trim().length > 255) {
    return res.status(400).json({ error: 'Apartment name cannot exceed 255 characters' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO apartments (name, description, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name.trim(), description?.trim() || null, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating apartment:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Apartment with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create apartment' });
  }
};

/**
 * Update apartment
 * Access: Circle Treasurer only
 */
export const updateApartment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;

  // Validation
  if (name !== undefined) {
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Apartment name is required' });
    }
    if (name.trim().length > 255) {
      return res.status(400).json({ error: 'Apartment name cannot exceed 255 characters' });
    }
  }

  try {
    // Check if apartment exists
    const checkResult = await pool.query('SELECT id FROM apartments WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Apartment not found' });
    }

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      values.push(name.trim());
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      values.push(description?.trim() || null);
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE apartments
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating apartment:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Apartment with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to update apartment' });
  }
};

/**
 * Delete apartment
 * Access: Circle Treasurer only
 */
export const deleteApartment = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Check if apartment exists
    const checkResult = await pool.query('SELECT id FROM apartments WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Apartment not found' });
    }

    // Check if apartment has associated expenses
    const expensesResult = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM reimbursements WHERE apartment_id = $1) +
        (SELECT COUNT(*) FROM planned_expenses WHERE apartment_id = $1) +
        (SELECT COUNT(*) FROM direct_expenses WHERE apartment_id = $1) as total_count`,
      [id]
    );

    if (parseInt(expensesResult.rows[0].total_count) > 0) {
      return res.status(400).json({
        error: 'Cannot delete apartment with associated expenses. Please remove apartment associations first.'
      });
    }

    await pool.query('DELETE FROM apartments WHERE id = $1', [id]);
    res.json({ message: 'Apartment deleted successfully' });
  } catch (error) {
    console.error('Error deleting apartment:', error);
    res.status(500).json({ error: 'Failed to delete apartment' });
  }
};

/**
 * Assign residents to apartment
 * Access: Circle Treasurer only
 */
export const assignResidents = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userIds } = req.body;

  if (!Array.isArray(userIds)) {
    return res.status(400).json({ error: 'userIds must be an array' });
  }

  try {
    // Check if apartment exists
    const apartmentResult = await pool.query('SELECT id FROM apartments WHERE id = $1', [id]);
    if (apartmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Apartment not found' });
    }

    // Start transaction
    await pool.query('BEGIN');

    // Remove all existing residents
    await pool.query('DELETE FROM user_apartments WHERE apartment_id = $1', [id]);

    // Add new residents (if any)
    if (userIds.length > 0) {
      // Validate that all users exist
      const usersResult = await pool.query(
        'SELECT id FROM users WHERE id = ANY($1)',
        [userIds]
      );

      if (usersResult.rows.length !== userIds.length) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ error: 'Some users do not exist' });
      }

      // Insert new assignments
      const insertValues = userIds.map((userId: number, index: number) =>
        `($${index * 2 + 1}, $${index * 2 + 2})`
      ).join(',');

      const flatValues: any[] = [];
      userIds.forEach((userId: number) => {
        flatValues.push(userId, id);
      });

      await pool.query(
        `INSERT INTO user_apartments (user_id, apartment_id)
         VALUES ${insertValues}
         ON CONFLICT (user_id, apartment_id) DO NOTHING`,
        flatValues
      );
    }

    await pool.query('COMMIT');

    // Fetch updated apartment with residents
    const result = await pool.query(
      `SELECT
        u.id,
        u.email,
        u.full_name,
        u.phone,
        u.is_circle_treasurer,
        u.is_group_treasurer,
        ua.assigned_at
       FROM users u
       INNER JOIN user_apartments ua ON u.id = ua.user_id
       WHERE ua.apartment_id = $1
       ORDER BY u.full_name`,
      [id]
    );

    res.json({
      message: 'Residents updated successfully',
      residents: result.rows
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error assigning residents:', error);
    res.status(500).json({ error: 'Failed to assign residents' });
  }
};

/**
 * Get expense summary by apartments
 * Access: Circle Treasurer (all apartments), Group Treasurer (read-only all), Regular members (their apartments only)
 */
export const getApartmentExpenseSummary = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const isCircleTreasurer = req.user!.isCircleTreasurer;
  const isGroupTreasurer = req.user!.isGroupTreasurer;
  const { startDate, endDate, apartmentId } = req.query;

  try {
    let baseConditions = [];
    const values: any[] = [];
    let paramCount = 1;

    // Date filters
    if (startDate) {
      baseConditions.push(`expense_date >= $${paramCount++}`);
      values.push(startDate);
    }
    if (endDate) {
      baseConditions.push(`expense_date <= $${paramCount++}`);
      values.push(endDate);
    }

    // Apartment filter
    if (apartmentId) {
      baseConditions.push(`apartment_id = $${paramCount++}`);
      values.push(apartmentId);
    }

    // Access control: regular members see only their apartments
    let apartmentFilter = '';
    if (!isCircleTreasurer && !isGroupTreasurer) {
      apartmentFilter = `
        AND apartment_id IN (
          SELECT apartment_id FROM user_apartments WHERE user_id = ${userId}
        )
      `;
    }

    const baseWhere = baseConditions.length > 0
      ? `WHERE ${baseConditions.join(' AND ')}`
      : '';

    const query = `
      WITH apartment_reimbursements AS (
        SELECT
          apartment_id,
          SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as total_pending,
          SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as total_approved,
          SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_paid,
          SUM(CASE WHEN status = 'rejected' THEN amount ELSE 0 END) as total_rejected,
          SUM(amount) as total_reimbursements,
          COUNT(*) as count_reimbursements
        FROM reimbursements
        ${baseWhere}
          AND apartment_id IS NOT NULL
          ${apartmentFilter}
        GROUP BY apartment_id
      ),
      apartment_planned AS (
        SELECT
          apartment_id,
          SUM(CASE WHEN status = 'planned' THEN amount ELSE 0 END) as total_planned,
          SUM(CASE WHEN status = 'executed' THEN amount ELSE 0 END) as total_executed,
          SUM(CASE WHEN status = 'cancelled' THEN amount ELSE 0 END) as total_cancelled,
          SUM(amount) as total_planned_expenses,
          COUNT(*) as count_planned
        FROM planned_expenses
        ${baseWhere}
          AND apartment_id IS NOT NULL
          ${apartmentFilter}
        GROUP BY apartment_id
      ),
      apartment_direct AS (
        SELECT
          apartment_id,
          SUM(amount) as total_direct,
          COUNT(*) as count_direct
        FROM direct_expenses
        ${baseWhere}
          AND apartment_id IS NOT NULL
          ${apartmentFilter}
        GROUP BY apartment_id
      )
      SELECT
        a.id as apartment_id,
        a.name as apartment_name,
        COUNT(DISTINCT ua.user_id) as resident_count,
        COALESCE(ar.total_pending, 0) as total_reimbursements_pending,
        COALESCE(ar.total_approved, 0) as total_reimbursements_approved,
        COALESCE(ar.total_paid, 0) as total_reimbursements_paid,
        COALESCE(ar.total_rejected, 0) as total_reimbursements_rejected,
        COALESCE(ar.total_reimbursements, 0) as total_reimbursements,
        COALESCE(ar.count_reimbursements, 0) as count_reimbursements,
        COALESCE(ap.total_planned, 0) as total_planned_planned,
        COALESCE(ap.total_executed, 0) as total_planned_executed,
        COALESCE(ap.total_cancelled, 0) as total_planned_cancelled,
        COALESCE(ap.total_planned_expenses, 0) as total_planned,
        COALESCE(ap.count_planned, 0) as count_planned,
        COALESCE(ad.total_direct, 0) as total_direct_expenses,
        COALESCE(ad.count_direct, 0) as count_direct_expenses,
        COALESCE(ar.total_reimbursements, 0) + COALESCE(ap.total_planned_expenses, 0) + COALESCE(ad.total_direct, 0) as grand_total,
        COALESCE(ar.count_reimbursements, 0) + COALESCE(ap.count_planned, 0) + COALESCE(ad.count_direct, 0) as grand_count
      FROM apartments a
      LEFT JOIN user_apartments ua ON a.id = ua.apartment_id
      LEFT JOIN apartment_reimbursements ar ON a.id = ar.apartment_id
      LEFT JOIN apartment_planned ap ON a.id = ap.apartment_id
      LEFT JOIN apartment_direct ad ON a.id = ad.apartment_id
      ${!isCircleTreasurer && !isGroupTreasurer ?
        `WHERE a.id IN (SELECT apartment_id FROM user_apartments WHERE user_id = ${userId})` : ''}
      GROUP BY a.id, a.name, ar.total_pending, ar.total_approved, ar.total_paid, ar.total_rejected,
               ar.total_reimbursements, ar.count_reimbursements, ap.total_planned, ap.total_executed,
               ap.total_cancelled, ap.total_planned_expenses, ap.count_planned, ad.total_direct, ad.count_direct
      HAVING COALESCE(ar.count_reimbursements, 0) + COALESCE(ap.count_planned, 0) + COALESCE(ad.count_direct, 0) > 0
      ORDER BY a.name
    `;

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching apartment expense summary:', error);
    res.status(500).json({ error: 'Failed to fetch apartment expense summary' });
  }
};

/**
 * Get monthly expense breakdown by apartment and fund
 * Returns: apartment | budget | fund | monthly totals (reimbursements + direct expenses only)
 * Access: Circle Treasurer (all), Group Treasurer (read-only), Regular members (their apartments only)
 */
export const getApartmentMonthlyExpenses = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const isCircleTreasurer = req.user!.isCircleTreasurer;
  const isGroupTreasurer = req.user!.isGroupTreasurer;
  const { year } = req.query;

  if (!year) {
    return res.status(400).json({ error: 'Year parameter is required' });
  }

  try {
    // Access control for regular members
    let apartmentFilter = '';
    if (!isCircleTreasurer && !isGroupTreasurer) {
      apartmentFilter = `
        AND a.id IN (
          SELECT apartment_id FROM user_apartments WHERE user_id = ${userId}
        )
      `;
    }

    const query = `
      WITH monthly_expenses AS (
        -- Reimbursements
        SELECT
          r.apartment_id,
          a.name as apartment_name,
          f.budget_id,
          b.name as budget_name,
          r.fund_id,
          f.name as fund_name,
          EXTRACT(MONTH FROM r.expense_date) as month,
          SUM(r.amount) as amount
        FROM reimbursements r
        JOIN apartments a ON r.apartment_id = a.id
        JOIN funds f ON r.fund_id = f.id
        JOIN budgets b ON f.budget_id = b.id
        WHERE r.apartment_id IS NOT NULL
          AND EXTRACT(YEAR FROM r.expense_date) = $1
          ${apartmentFilter}
        GROUP BY r.apartment_id, a.name, f.budget_id, b.name, r.fund_id, f.name, EXTRACT(MONTH FROM r.expense_date)

        UNION ALL

        -- Direct Expenses
        SELECT
          de.apartment_id,
          a.name as apartment_name,
          f.budget_id,
          b.name as budget_name,
          de.fund_id,
          f.name as fund_name,
          EXTRACT(MONTH FROM de.expense_date) as month,
          SUM(de.amount) as amount
        FROM direct_expenses de
        JOIN apartments a ON de.apartment_id = a.id
        JOIN funds f ON de.fund_id = f.id
        JOIN budgets b ON f.budget_id = b.id
        WHERE de.apartment_id IS NOT NULL
          AND EXTRACT(YEAR FROM de.expense_date) = $1
          ${apartmentFilter}
        GROUP BY de.apartment_id, a.name, f.budget_id, b.name, de.fund_id, f.name, EXTRACT(MONTH FROM de.expense_date)
      )
      SELECT
        apartment_id,
        apartment_name,
        budget_id,
        budget_name,
        fund_id,
        fund_name,
        month,
        SUM(amount) as total_amount
      FROM monthly_expenses
      GROUP BY apartment_id, apartment_name, budget_id, budget_name, fund_id, fund_name, month
      ORDER BY apartment_name, budget_name, fund_name, month
    `;

    const result = await pool.query(query, [year]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching apartment monthly expenses:', error);
    res.status(500).json({ error: 'Failed to fetch apartment monthly expenses' });
  }
};

/**
 * Get detailed expenses for a specific apartment
 * Access: Circle Treasurer (all), Group Treasurer (read-only), Regular members (their apartments only)
 */
export const getApartmentExpenseDetails = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const isCircleTreasurer = req.user!.isCircleTreasurer;
  const isGroupTreasurer = req.user!.isGroupTreasurer;
  const { startDate, endDate } = req.query;

  try {
    // Check apartment exists
    const apartmentResult = await pool.query('SELECT id, name FROM apartments WHERE id = $1', [id]);
    if (apartmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Apartment not found' });
    }

    // Check access for regular members
    if (!isCircleTreasurer && !isGroupTreasurer) {
      const accessResult = await pool.query(
        'SELECT 1 FROM user_apartments WHERE apartment_id = $1 AND user_id = $2',
        [id, userId]
      );
      if (accessResult.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied to this apartment' });
      }
    }

    let dateConditions = '';
    const values: any[] = [id];
    let paramCount = 2;

    if (startDate) {
      dateConditions += ` AND expense_date >= $${paramCount++}`;
      values.push(startDate);
    }
    if (endDate) {
      dateConditions += ` AND expense_date <= $${paramCount++}`;
      values.push(endDate);
    }

    // Fetch all expense types
    const query = `
      SELECT
        'reimbursement' as type,
        r.id,
        r.apartment_id,
        a.name as apartment_name,
        r.fund_id,
        f.name as fund_name,
        r.user_id,
        u1.full_name as user_name,
        r.recipient_user_id,
        u2.full_name as recipient_name,
        r.amount,
        r.description,
        r.expense_date,
        r.status,
        r.receipt_url,
        r.created_at
      FROM reimbursements r
      JOIN apartments a ON r.apartment_id = a.id
      LEFT JOIN funds f ON r.fund_id = f.id
      LEFT JOIN users u1 ON r.user_id = u1.id
      LEFT JOIN users u2 ON r.recipient_user_id = u2.id
      WHERE r.apartment_id = $1 ${dateConditions}

      UNION ALL

      SELECT
        'planned_expense' as type,
        pe.id,
        pe.apartment_id,
        a.name as apartment_name,
        pe.fund_id,
        f.name as fund_name,
        pe.user_id,
        u.full_name as user_name,
        NULL::INTEGER as recipient_user_id,
        NULL as recipient_name,
        pe.amount,
        pe.description,
        pe.planned_date as expense_date,
        pe.status,
        NULL as receipt_url,
        pe.created_at
      FROM planned_expenses pe
      JOIN apartments a ON pe.apartment_id = a.id
      LEFT JOIN funds f ON pe.fund_id = f.id
      LEFT JOIN users u ON pe.user_id = u.id
      WHERE pe.apartment_id = $1 ${dateConditions}

      UNION ALL

      SELECT
        'direct_expense' as type,
        de.id,
        de.apartment_id,
        a.name as apartment_name,
        de.fund_id,
        f.name as fund_name,
        NULL::INTEGER as user_id,
        de.payee as user_name,
        NULL::INTEGER as recipient_user_id,
        NULL as recipient_name,
        de.amount,
        de.description,
        de.expense_date,
        NULL as status,
        de.receipt_url,
        de.created_at
      FROM direct_expenses de
      JOIN apartments a ON de.apartment_id = a.id
      LEFT JOIN funds f ON de.fund_id = f.id
      WHERE de.apartment_id = $1 ${dateConditions}

      ORDER BY expense_date DESC, created_at DESC
    `;

    const result = await pool.query(query, values);
    res.json({
      apartment: apartmentResult.rows[0],
      expenses: result.rows
    });
  } catch (error) {
    console.error('Error fetching apartment expense details:', error);
    res.status(500).json({ error: 'Failed to fetch apartment expense details' });
  }
};
