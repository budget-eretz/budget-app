import { Request, Response } from 'express';
import pool from '../config/database';
import { UserWithGroups, Group } from '../types';
import bcrypt from 'bcrypt';

/**
 * Create a new user
 * Requirements: Circle Treasurer only
 */
export async function createUser(req: Request, res: Response) {
  const { email, password, fullName, phone, role, groupIds } = req.body;

  try {
    // Validate required fields
    if (!email || !password || !fullName) {
      return res.status(400).json({
        error: 'Email, password, and full name are required'
      });
    }

    // Validate role
    const validRoles = ['member', 'group_treasurer', 'circle_treasurer'];
    const userRole = role || 'member';
    if (!validRoles.includes(userRole)) {
      return res.status(400).json({
        error: 'Invalid role. Must be one of: member, group_treasurer, circle_treasurer'
      });
    }

    // If Group Treasurer, validate they have at least one group
    if (userRole === 'group_treasurer' && (!groupIds || groupIds.length === 0)) {
      return res.status(400).json({
        error: 'Group Treasurer must be assigned to at least one group'
      });
    }

    // Check if email already exists
    const emailCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Set role flags
    let isCircleTreasurer = false;
    let isGroupTreasurer = false;

    if (userRole === 'circle_treasurer') {
      isCircleTreasurer = true;
    } else if (userRole === 'group_treasurer') {
      isGroupTreasurer = true;
    }

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, phone, is_circle_treasurer, is_group_treasurer)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, phone, is_circle_treasurer, is_group_treasurer, created_at`,
      [email, hashedPassword, fullName, phone || null, isCircleTreasurer, isGroupTreasurer]
    );

    const newUser = result.rows[0];

    // Assign to groups if provided
    if (groupIds && groupIds.length > 0) {
      for (const groupId of groupIds) {
        // Verify group exists
        const groupCheck = await pool.query(
          'SELECT id FROM groups WHERE id = $1',
          [groupId]
        );

        if (groupCheck.rows.length > 0) {
          await pool.query(
            'INSERT INTO user_groups (user_id, group_id) VALUES ($1, $2)',
            [newUser.id, groupId]
          );
        }
      }
    }

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.full_name,
        phone: newUser.phone,
        isCircleTreasurer: newUser.is_circle_treasurer,
        isGroupTreasurer: newUser.is_group_treasurer,
        createdAt: newUser.created_at
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
}

/**
 * Get current user profile
 * Available to all authenticated users
 */
export async function getCurrentUser(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;

    const result = await pool.query(
      `SELECT 
        u.id, 
        u.email, 
        u.full_name, 
        u.phone, 
        u.is_circle_treasurer, 
        u.is_group_treasurer,
        u.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', g.id,
              'name', g.name,
              'description', g.description
            )
          ) FILTER (WHERE g.id IS NOT NULL),
          '[]'
        ) as groups
      FROM users u
      LEFT JOIN user_groups ug ON u.id = ug.user_id
      LEFT JOIN groups g ON ug.group_id = g.id
      WHERE u.id = $1
      GROUP BY u.id`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      isCircleTreasurer: user.is_circle_treasurer,
      isGroupTreasurer: user.is_group_treasurer,
      createdAt: user.created_at,
      groups: user.groups
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
}

/**
 * Update own profile (fullName, phone)
 * Available to all authenticated users
 */
export async function updateOwnProfile(req: Request, res: Response) {
  const userId = req.user?.userId;
  const { fullName, phone } = req.body;

  try {
    // Validate input
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    const result = await pool.query(
      `UPDATE users 
       SET full_name = $1, 
           phone = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, full_name, phone, is_circle_treasurer, is_group_treasurer, updated_at`,
      [fullName.trim(), phone?.trim() || null, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = result.rows[0];
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.full_name,
        phone: updatedUser.phone,
        isCircleTreasurer: updatedUser.is_circle_treasurer,
        isGroupTreasurer: updatedUser.is_group_treasurer,
        updatedAt: updatedUser.updated_at
      }
    });
  } catch (error) {
    console.error('Update own profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

/**
 * Change own password
 * Available to all authenticated users
 */
export async function changeOwnPassword(req: Request, res: Response) {
  const userId = req.user?.userId;
  const { currentPassword, newPassword } = req.body;

  try {
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Get current password hash
    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      `UPDATE users 
       SET password_hash = $1, 
           updated_at = NOW()
       WHERE id = $2`,
      [hashedPassword, userId]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change own password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
}

/**
 * Reset user password (Circle Treasurer only)
 */
export async function resetUserPassword(req: Request, res: Response) {
  const { id } = req.params;
  const { newPassword } = req.body;

  try {
    // Validate input
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Check if user exists
    const userCheck = await pool.query('SELECT id, full_name FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      `UPDATE users 
       SET password_hash = $1, 
           updated_at = NOW()
       WHERE id = $2`,
      [hashedPassword, id]
    );

    res.json({
      message: 'Password reset successfully',
      userName: userCheck.rows[0].full_name
    });
  } catch (error) {
    console.error('Reset user password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
}

/**
 * Get basic user list (id, fullName only) for reimbursement recipient selection
 * Available to all authenticated users
 */
export async function getBasicUsers(req: Request, res: Response) {
  try {
    const result = await pool.query(
      `SELECT id, full_name
       FROM users
       ORDER BY full_name`
    );

    const users = result.rows.map(row => ({
      id: row.id,
      fullName: row.full_name
    }));

    res.json(users);
  } catch (error) {
    console.error('Get basic users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

/**
 * Get all users with their groups
 * Requirements: 1.1, 1.2, 1.3
 */
export async function getAllUsers(req: Request, res: Response) {
  try {
    // Fetch all users with their groups using LEFT JOIN to include users without groups
    const result = await pool.query(
      `SELECT 
        u.id, 
        u.email, 
        u.full_name, 
        u.phone, 
        u.is_circle_treasurer, 
        u.is_group_treasurer,
        u.created_at,
        u.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', g.id,
              'name', g.name,
              'description', g.description,
              'created_at', g.created_at
            )
          ) FILTER (WHERE g.id IS NOT NULL),
          '[]'
        ) as groups
      FROM users u
      LEFT JOIN user_groups ug ON u.id = ug.user_id
      LEFT JOIN groups g ON ug.group_id = g.id
      GROUP BY u.id
      ORDER BY u.full_name`
    );

    const users = result.rows.map(row => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      phone: row.phone,
      isCircleTreasurer: row.is_circle_treasurer,
      isGroupTreasurer: row.is_group_treasurer,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      groups: row.groups
    }));

    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

/**
 * Get single user by ID with their groups
 * Requirements: 1.2
 */
export async function getUserById(req: Request, res: Response) {
  const { id } = req.params;

  try {
    // Fetch user
    const userResult = await pool.query(
      `SELECT id, email, full_name, phone, is_circle_treasurer, is_group_treasurer, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Fetch user's groups
    const groupsResult = await pool.query(
      `SELECT g.id, g.name, g.description, g.created_at
       FROM groups g
       INNER JOIN user_groups ug ON g.id = ug.group_id
       WHERE ug.user_id = $1
       ORDER BY g.name`,
      [id]
    );

    const userWithGroups = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      isCircleTreasurer: user.is_circle_treasurer,
      isGroupTreasurer: user.is_group_treasurer,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      groups: groupsResult.rows
    };

    res.json(userWithGroups);
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}

/**
 * Update user role (Circle Treasurer or Group Treasurer flags)
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */
export async function updateUserRole(req: Request, res: Response) {
  const { id } = req.params;
  const { role } = req.body;

  try {
    // Validate role
    const validRoles = ['member', 'group_treasurer', 'circle_treasurer'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid role. Must be one of: member, group_treasurer, circle_treasurer'
      });
    }

    // Check if user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If setting to Group Treasurer, validate they have at least one group assignment
    if (role === 'group_treasurer') {
      const groupCount = await pool.query(
        'SELECT COUNT(*) as count FROM user_groups WHERE user_id = $1',
        [id]
      );

      if (parseInt(groupCount.rows[0].count) === 0) {
        return res.status(400).json({
          error: 'Group Treasurer must be assigned to at least one group'
        });
      }
    }

    // Update role flags based on role
    let isCircleTreasurer = false;
    let isGroupTreasurer = false;

    if (role === 'circle_treasurer') {
      isCircleTreasurer = true;
      isGroupTreasurer = false;
    } else if (role === 'group_treasurer') {
      isCircleTreasurer = false;
      isGroupTreasurer = true;
    }

    const result = await pool.query(
      `UPDATE users 
       SET is_circle_treasurer = $1, 
           is_group_treasurer = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, full_name, phone, is_circle_treasurer, is_group_treasurer, updated_at`,
      [isCircleTreasurer, isGroupTreasurer, id]
    );

    const updatedUser = result.rows[0];

    res.json({
      message: 'User role updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.full_name,
        phone: updatedUser.phone,
        isCircleTreasurer: updatedUser.is_circle_treasurer,
        isGroupTreasurer: updatedUser.is_group_treasurer,
        updatedAt: updatedUser.updated_at
      }
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
}

/**
 * Assign user to a group
 * Requirements: 2.1, 2.2, 2.3
 */
export async function assignUserToGroup(req: Request, res: Response) {
  const { id: userId } = req.params;
  const { groupId } = req.body;

  try {
    // Validate input
    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required' });
    }

    // Check if user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if group exists
    const groupCheck = await pool.query('SELECT id FROM groups WHERE id = $1', [groupId]);
    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if assignment already exists
    const existingAssignment = await pool.query(
      'SELECT * FROM user_groups WHERE user_id = $1 AND group_id = $2',
      [userId, groupId]
    );

    if (existingAssignment.rows.length > 0) {
      return res.status(409).json({ error: 'User is already assigned to this group' });
    }

    // Create assignment
    await pool.query(
      'INSERT INTO user_groups (user_id, group_id) VALUES ($1, $2)',
      [userId, groupId]
    );

    res.status(201).json({
      message: 'User assigned to group successfully',
      assignment: {
        userId: parseInt(userId),
        groupId: groupId
      }
    });
  } catch (error) {
    console.error('Assign user to group error:', error);
    res.status(500).json({ error: 'Failed to assign user to group' });
  }
}

/**
 * Remove user from a group
 * Requirements: 2.2, 2.4
 */
export async function removeUserFromGroup(req: Request, res: Response) {
  const { id: userId, groupId } = req.params;

  try {
    // Check if user exists
    const userCheck = await pool.query(
      'SELECT id, is_group_treasurer FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userCheck.rows[0];

    // Check if assignment exists
    const assignmentCheck = await pool.query(
      'SELECT * FROM user_groups WHERE user_id = $1 AND group_id = $2',
      [userId, groupId]
    );

    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User is not assigned to this group' });
    }

    // If user is a Group Treasurer, check they will still have at least one group after removal
    if (user.is_group_treasurer) {
      const groupCount = await pool.query(
        'SELECT COUNT(*) as count FROM user_groups WHERE user_id = $1',
        [userId]
      );

      if (parseInt(groupCount.rows[0].count) <= 1) {
        return res.status(400).json({
          error: 'Cannot remove Group Treasurer from their last group. Change their role first or assign them to another group.'
        });
      }
    }

    // Remove assignment
    await pool.query(
      'DELETE FROM user_groups WHERE user_id = $1 AND group_id = $2',
      [userId, groupId]
    );

    res.json({
      message: 'User removed from group successfully'
    });
  } catch (error) {
    console.error('Remove user from group error:', error);
    res.status(500).json({ error: 'Failed to remove user from group' });
  }
}

/**
 * Get all groups for a specific user
 * Requirements: 2.6
 */
export async function getUserGroups(req: Request, res: Response) {
  const { id: userId } = req.params;

  try {
    // Check if user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch user's groups
    const result = await pool.query(
      `SELECT g.id, g.name, g.description, g.created_at, ug.assigned_at
       FROM groups g
       INNER JOIN user_groups ug ON g.id = ug.group_id
       WHERE ug.user_id = $1
       ORDER BY g.name`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get user groups error:', error);
    res.status(500).json({ error: 'Failed to fetch user groups' });
  }
}
