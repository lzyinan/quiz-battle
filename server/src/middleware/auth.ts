import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db/index.js';

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; nickname: string };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: '请先登录' });
    return;
  }
  const token = authHeader.slice(7);
  const db = getDb();
  const user = db.prepare('SELECT id, nickname FROM users WHERE token = ?').get(token) as { id: number; nickname: string } | undefined;
  if (!user) {
    res.status(401).json({ error: '登录已过期' });
    return;
  }
  req.user = user;
  next();
}
