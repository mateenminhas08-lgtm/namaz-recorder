import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { db, UserEntity } from '../db/db.js';

export interface AuthenticatedRequest extends Request {
  user?: UserEntity;
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Access token required. Please sign in.'
    });
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    const user = await db.findUserById(payload.userId);

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User account no longer exists or session has expired.'
      });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(403).json({
      success: false,
      error: 'Invalid or expired authentication token.'
    });
  }
}
