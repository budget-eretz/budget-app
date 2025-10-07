import { Request, Response } from 'express';
import pool from '../config/database';

/**
 * Get all groups with member counts
 * Requirements: 4.1, 8.3
 */
export async function getAllGroups(req: Request, res: Response) {
  try {
    const result = await pool.query(
      `SELECT 
        g.id, 
        g.name, 
        g.description, 
        g.created_at,
        COUNT(ug.user_id) as member_count
      FROM groups g
      LEFT JOIN user_groups ug ON g.id = ug.group_id
      GROUP BY g.id
      ORDER BY g.name`
    );

    const groups = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.created_at,
      memberCount: parseInt(row.member_count)
    }));

    res.json(groups);
  } catch (error) {
    console.error('Get all groups error:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
}

/**
 * Get single group by ID with member list
 * Requirements: 4.1, 6.4, 8.3
 */
export async function getGroupById(req: Request, res: Response) {
  const { id } = req.params;

  try {
    // Fetch group
    const groupResult = await pool.query(
      `SELECT id, name, description, created_at
       FROM groups WHERE id = $1`,
      [id]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const group = groupResult.rows[0];

    // Fetch group members
    const membersResult = await pool.query(
      `SELECT 
        u.id, 
        u.email, 
        u.full_name, 
        u.phone, 
        u.is_circle_treasurer, 
        u.is_group_treasurer,
        ug.assigned_at
       FROM users u
       INNER JOIN user_groups ug ON u.id = ug.user_id
       WHERE ug.group_id = $1
       ORDER BY u.full_name`,
      [id]
    );

    const groupWithMembers = {
      id: group.id,
      name: group.name,
      description: group.description,
      createdAt: group.created_at,
      memberCount: membersResult.rows.length,
      members: membersResult.rows.map(row => ({
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        phone: row.phone,
        isCircleTreasurer: row.is_circle_treasurer,
        isGroupTreasurer: row.is_group_treasurer,
        assignedAt: row.assigned_at
      }))
    };

    res.json(groupWithMembers);
  } catch (error) {
    console.error('Get group by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
}

/**
 * Create a new group
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export async function createGroup(req: Request, res: Response) {
  const { name, description } = req.body;

  try {
    // Validate input
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // Check for duplicate name
    const duplicateCheck = await pool.query(
      'SELECT id FROM groups WHERE LOWER(name) = LOWER($1)',
      [name.trim()]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Group with this name already exists' });
    }

    // Create group
    const result = await pool.query(
      `INSERT INTO groups (name, description)
       VALUES ($1, $2)
       RETURNING id, name, description, created_at`,
      [name.trim(), description || null]
    );

    const newGroup = result.rows[0];

    res.status(201).json({
      message: 'Group created successfully',
      group: {
        id: newGroup.id,
        name: newGroup.name,
        description: newGroup.description,
        createdAt: newGroup.created_at
      }
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
}

/**
 * Update an existing group
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export async function updateGroup(req: Request, res: Response) {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    // Check if group exists
    const groupCheck = await pool.query('SELECT id FROM groups WHERE id = $1', [id]);
    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Validate input
    if (name !== undefined && name.trim().length === 0) {
      return res.status(400).json({ error: 'Group name cannot be empty' });
    }

    // If name is being updated, check for duplicates
    if (name !== undefined) {
      const duplicateCheck = await pool.query(
        'SELECT id FROM groups WHERE LOWER(name) = LOWER($1) AND id != $2',
        [name.trim(), id]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Group with this name already exists' });
      }
    }

    // Build update query dynamically based on provided fields
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

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE groups 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, name, description, created_at`,
      values
    );

    const updatedGroup = result.rows[0];

    res.json({
      message: 'Group updated successfully',
      group: {
        id: updatedGroup.id,
        name: updatedGroup.name,
        description: updatedGroup.description,
        createdAt: updatedGroup.created_at
      }
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
}

/**
 * Delete a group
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
export async function deleteGroup(req: Request, res: Response) {
  const { id } = req.params;

  try {
    // Check if group exists
    const groupCheck = await pool.query('SELECT id, name FROM groups WHERE id = $1', [id]);
    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check for associated budgets
    const budgetCheck = await pool.query(
      'SELECT COUNT(*) as count FROM budgets WHERE group_id = $1',
      [id]
    );

    if (parseInt(budgetCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete group with associated budgets or funds. Please reassign or delete the budgets first.' 
      });
    }

    // Delete group (CASCADE will handle user_groups entries)
    await pool.query('DELETE FROM groups WHERE id = $1', [id]);

    res.json({
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
}

/**
 * Get all members of a specific group
 * Requirements: 6.4, 8.4
 */
export async function getGroupMembers(req: Request, res: Response) {
  const { id } = req.params;

  try {
    // Check if group exists
    const groupCheck = await pool.query('SELECT id FROM groups WHERE id = $1', [id]);
    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Fetch group members
    const result = await pool.query(
      `SELECT 
        u.id, 
        u.email, 
        u.full_name, 
        u.phone, 
        u.is_circle_treasurer, 
        u.is_group_treasurer,
        ug.assigned_at
       FROM users u
       INNER JOIN user_groups ug ON u.id = ug.user_id
       WHERE ug.group_id = $1
       ORDER BY u.full_name`,
      [id]
    );

    const members = result.rows.map(row => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      phone: row.phone,
      isCircleTreasurer: row.is_circle_treasurer,
      isGroupTreasurer: row.is_group_treasurer,
      assignedAt: row.assigned_at
    }));

    res.json(members);
  } catch (error) {
    console.error('Get group members error:', error);
    res.status(500).json({ error: 'Failed to fetch group members' });
  }
}
