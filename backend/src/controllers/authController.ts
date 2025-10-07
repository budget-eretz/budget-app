import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { JWTPayload, User } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export async function register(req: Request, res: Response) {
  const { email, password, fullName, phone, groupIds } = req.body;

  try {
    // Validate input
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, phone)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, phone, is_circle_treasurer, is_group_treasurer`,
      [email, passwordHash, fullName, phone || null]
    );

    const user = result.rows[0];

    // Handle initial group assignments if provided
    if (groupIds && Array.isArray(groupIds) && groupIds.length > 0) {
      const groupAssignments = groupIds.map((groupId: number) => 
        `(${user.id}, ${groupId})`
      ).join(', ');
      
      await pool.query(
        `INSERT INTO user_groups (user_id, group_id) VALUES ${groupAssignments}`
      );
    }

    // Fetch user's groups
    const groupsResult = await pool.query(
      `SELECT g.id, g.name, g.description, g.created_at
       FROM groups g
       INNER JOIN user_groups ug ON g.id = ug.group_id
       WHERE ug.user_id = $1`,
      [user.id]
    );

    const userGroupIds = groupsResult.rows.map(g => g.id);

    // Generate token
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      isCircleTreasurer: user.is_circle_treasurer,
      isGroupTreasurer: user.is_group_treasurer,
      groupIds: userGroupIds
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        groups: groupsResult.rows,
        isCircleTreasurer: user.is_circle_treasurer,
        isGroupTreasurer: user.is_group_treasurer
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user: User = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Fetch all user groups from user_groups table
    const groupsResult = await pool.query(
      `SELECT g.id, g.name, g.description, g.created_at
       FROM groups g
       INNER JOIN user_groups ug ON g.id = ug.group_id
       WHERE ug.user_id = $1`,
      [user.id]
    );

    const userGroupIds = groupsResult.rows.map(g => g.id);

    // Generate token with groupIds array
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      isCircleTreasurer: user.is_circle_treasurer,
      isGroupTreasurer: user.is_group_treasurer,
      groupIds: userGroupIds
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        groups: groupsResult.rows,
        isCircleTreasurer: user.is_circle_treasurer,
        isGroupTreasurer: user.is_group_treasurer
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
}

export async function getMe(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;

    const result = await pool.query(
      `SELECT id, email, full_name, phone, is_circle_treasurer, is_group_treasurer
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Fetch user's groups
    const groupsResult = await pool.query(
      `SELECT g.id, g.name, g.description, g.created_at
       FROM groups g
       INNER JOIN user_groups ug ON g.id = ug.group_id
       WHERE ug.user_id = $1`,
      [userId]
    );

    res.json({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      groups: groupsResult.rows,
      isCircleTreasurer: user.is_circle_treasurer,
      isGroupTreasurer: user.is_group_treasurer
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
}
