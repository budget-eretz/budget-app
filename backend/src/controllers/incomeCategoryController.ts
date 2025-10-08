import { Request, Response } from 'express';
import pool from '../config/database';

/**
 * Get all income categories with income count
 */
export async function getCategories(req: Request, res: Response) {
  try {
    const query = `
      SELECT 
        ic.*,
        COUNT(ica.income_id) as income_count
      FROM income_categories ic
      LEFT JOIN income_category_assignments ica ON ic.id = ica.category_id
      GROUP BY ic.id
      ORDER BY ic.name ASC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Get income categories error:', error);
    res.status(500).json({ error: 'שגיאה בשליפת קטגוריות הכנסות' });
  }
}

/**
 * Create a new income category (treasurer only)
 */
export async function createCategory(req: Request, res: Response) {
  try {
    const { name, description, color } = req.body;
    const user = req.user!;

    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'שם הקטגוריה הוא שדה חובה' });
    }

    // Check for duplicate name
    const existingCategory = await pool.query(
      'SELECT id FROM income_categories WHERE name = $1',
      [name.trim()]
    );

    if (existingCategory.rows.length > 0) {
      return res.status(400).json({ 
        error: 'קטגוריה עם שם זה כבר קיימת',
        code: 'DUPLICATE_CATEGORY'
      });
    }

    // Insert new category
    const result = await pool.query(
      `INSERT INTO income_categories (name, description, color, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name.trim(), description || null, color || null, user.userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create income category error:', error);
    res.status(500).json({ error: 'שגיאה ביצירת קטגוריה' });
  }
}

/**
 * Update an existing income category (treasurer only)
 */
export async function updateCategory(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, description, color } = req.body;

    // Check if category exists
    const existing = await pool.query(
      'SELECT id FROM income_categories WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'קטגוריה לא נמצאה' });
    }

    // Validate name if provided
    if (name !== undefined) {
      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'שם הקטגוריה הוא שדה חובה' });
      }

      // Check for duplicate name (excluding current category)
      const duplicateCheck = await pool.query(
        'SELECT id FROM income_categories WHERE name = $1 AND id != $2',
        [name.trim(), id]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({ 
          error: 'קטגוריה עם שם זה כבר קיימת',
          code: 'DUPLICATE_CATEGORY'
        });
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name.trim());
      paramCount++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description || null);
      paramCount++;
    }

    if (color !== undefined) {
      updates.push(`color = $${paramCount}`);
      values.push(color || null);
      paramCount++;
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE income_categories 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update income category error:', error);
    res.status(500).json({ error: 'שגיאה בעדכון קטגוריה' });
  }
}

/**
 * Delete an income category (treasurer only)
 * Checks if category is assigned to any incomes before deletion
 */
export async function deleteCategory(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Check if category exists
    const existing = await pool.query(
      'SELECT id FROM income_categories WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'קטגוריה לא נמצאה' });
    }

    // Check if category is assigned to any incomes
    const assignmentCheck = await pool.query(
      'SELECT COUNT(*) as count FROM income_category_assignments WHERE category_id = $1',
      [id]
    );

    const incomeCount = parseInt(assignmentCheck.rows[0].count);

    if (incomeCount > 0) {
      return res.status(400).json({ 
        error: `לא ניתן למחוק קטגוריה המשויכת ל-${incomeCount} הכנסות`,
        code: 'CATEGORY_IN_USE',
        details: { incomeCount }
      });
    }

    // Delete category (cascade will remove assignments if any)
    await pool.query('DELETE FROM income_categories WHERE id = $1', [id]);

    res.json({ message: 'קטגוריה נמחקה בהצלחה' });
  } catch (error) {
    console.error('Delete income category error:', error);
    res.status(500).json({ error: 'שגיאה במחיקת קטגוריה' });
  }
}
