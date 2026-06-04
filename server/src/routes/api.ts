import { Router, Request, Response } from 'express';
import { getDb } from '../db/index.js';
import { getRoomsInfo, getRoomCount } from '../socket/roomManager.js';

export const apiRouter = Router();

// GET /api/rooms
apiRouter.get('/rooms', (_req: Request, res: Response) => {
  const rooms = getRoomsInfo();
  res.json({ count: getRoomCount(), rooms });
});

// GET /api/quizzes
apiRouter.get('/quizzes', (_req: Request, res: Response) => {
  const db = getDb();
  const quizzes = db.prepare(`
    SELECT q.*, COUNT(qu.id) as questionCount
    FROM quizzes q
    LEFT JOIN questions qu ON qu.quiz_id = q.id
    GROUP BY q.id
    ORDER BY q.created_at DESC
  `).all();
  res.json(quizzes);
});

// POST /api/quizzes
apiRouter.post('/quizzes', (req: Request, res: Response) => {
  const { name, description } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: '题库名称不能为空' });
    return;
  }
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO quizzes (name, description) VALUES (?, ?)'
  ).run(name.trim(), description?.trim() || '');
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(result.lastInsertRowid) as any;
  res.status(201).json({ ...quiz, questionCount: 0 });
});

// PUT /api/quizzes/:id
apiRouter.put('/quizzes/:id', (req: Request, res: Response) => {
  const { name, description } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id) as any;
  if (!existing) {
    res.status(404).json({ error: '题库不存在' });
    return;
  }
  db.prepare(
    'UPDATE quizzes SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(
    name?.trim() || existing.name,
    description !== undefined ? description.trim() : existing.description,
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/quizzes/:id
apiRouter.delete('/quizzes/:id', (req: Request, res: Response) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM quizzes WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: '题库不存在' });
    return;
  }
  res.json({ success: true });
});

// GET /api/quizzes/:quizId/questions
apiRouter.get('/quizzes/:quizId/questions', (req: Request, res: Response) => {
  const db = getDb();
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.quizId);
  if (!quiz) {
    res.status(404).json({ error: '题库不存在' });
    return;
  }
  const questions = db.prepare(
    'SELECT * FROM questions WHERE quiz_id = ? ORDER BY created_at'
  ).all(req.params.quizId);
  const parsed = questions.map((q: any) => ({
    ...q,
    options: JSON.parse(q.options),
  }));
  res.json(parsed);
});

// POST /api/quizzes/:quizId/questions
apiRouter.post('/quizzes/:quizId/questions', (req: Request, res: Response) => {
  const { type, content, options, answer } = req.body;
  if (!content || !options || !Array.isArray(options) || options.length < 2) {
    res.status(400).json({ error: '题目内容和选项不能为空，至少需要2个选项' });
    return;
  }
  if (typeof answer !== 'number' || answer < 0 || answer >= options.length) {
    res.status(400).json({ error: '答案索引无效' });
    return;
  }
  const db = getDb();
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.quizId);
  if (!quiz) {
    res.status(404).json({ error: '题库不存在' });
    return;
  }
  const result = db.prepare(
    'INSERT INTO questions (quiz_id, type, content, options, answer) VALUES (?, ?, ?, ?, ?)'
  ).run(req.params.quizId, type || 'single', content.trim(), JSON.stringify(options), answer);
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(result.lastInsertRowid) as any;
  res.status(201).json({ ...question, options: JSON.parse(question.options) });
});

// PUT /api/questions/:id
apiRouter.put('/questions/:id', (req: Request, res: Response) => {
  const { type, content, options, answer } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id) as any;
  if (!existing) {
    res.status(404).json({ error: '题目不存在' });
    return;
  }
  const finalOptions = options ?? JSON.parse(existing.options);
  const finalAnswer = answer ?? existing.answer;
  if (finalAnswer < 0 || finalAnswer >= finalOptions.length) {
    res.status(400).json({ error: '答案索引无效' });
    return;
  }
  db.prepare(
    'UPDATE questions SET type = ?, content = ?, options = ?, answer = ? WHERE id = ?'
  ).run(type ?? existing.type, content?.trim() ?? existing.content, JSON.stringify(finalOptions), finalAnswer, req.params.id);
  const updated = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id) as any;
  res.json({ ...updated, options: JSON.parse(updated.options) });
});

// DELETE /api/questions/:id
apiRouter.delete('/questions/:id', (req: Request, res: Response) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: '题目不存在' });
    return;
  }
  res.json({ success: true });
});

// GET /api/quizzes/:quizId/stats
apiRouter.get('/quizzes/:quizId/stats', (req: Request, res: Response) => {
  const db = getDb();
  const stats = db.prepare(`
    SELECT q.*, COUNT(qu.id) as questionCount,
      SUM(CASE WHEN qu.type = 'single' THEN 1 ELSE 0 END) as singleCount,
      SUM(CASE WHEN qu.type = 'judge' THEN 1 ELSE 0 END) as judgeCount
    FROM quizzes q LEFT JOIN questions qu ON qu.quiz_id = q.id
    WHERE q.id = ? GROUP BY q.id
  `).get(req.params.quizId);
  if (!stats) {
    res.status(404).json({ error: '题库不存在' });
    return;
  }
  res.json(stats);
});
