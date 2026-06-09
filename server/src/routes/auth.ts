import { Router, Request, Response } from 'express';
import { getDb } from '../db/index.js';
import { randomUUID } from 'crypto';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', (req: Request, res: Response) => {
  const { nickname } = req.body;
  if (!nickname || typeof nickname !== 'string' || nickname.trim().length === 0) {
    res.status(400).json({ error: '昵称不能为空' });
    return;
  }
  const name = nickname.trim().slice(0, 10);
  const db = getDb();
  const token = randomUUID();

  let user: any;
  const existing = db.prepare('SELECT id, nickname FROM users WHERE nickname = ?').get(name);
  if (existing) {
    db.prepare('UPDATE users SET token = ? WHERE id = ?').run(token, (existing as any).id);
    user = { id: (existing as any).id, nickname: (existing as any).nickname };
  } else {
    const result = db.prepare('INSERT INTO users (nickname, token) VALUES (?, ?)').run(name, token);
    user = { id: result.lastInsertRowid, nickname: name };
  }
  res.json({ user, token });
});

// GET /api/auth/me
authRouter.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: '请先登录' });
    return;
  }
  const token = authHeader.slice(7);
  const db = getDb();
  const user = db.prepare('SELECT id, nickname FROM users WHERE token = ?').get(token);
  if (!user) {
    res.status(401).json({ error: '登录已过期' });
    return;
  }
  res.json({ user });
});

// POST /api/auth/logout
authRouter.post('/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const db = getDb();
    db.prepare('UPDATE users SET token = NULL WHERE token = ?').run(token);
  }
  res.json({ success: true });
});
