import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function requireCircleTreasurer(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.isCircleTreasurer) {
    return res.status(403).json({ error: 'Circle treasurer access required' });
  }
  next();
}

export function requireGroupTreasurer(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.isGroupTreasurer && !req.user?.isCircleTreasurer) {
    return res.status(403).json({ error: 'Group treasurer access required' });
  }
  next();
}

export function requireTreasurer(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.isCircleTreasurer && !req.user?.isGroupTreasurer) {
    return res.status(403).json({ error: 'Treasurer access required' });
  }
  next();
}
