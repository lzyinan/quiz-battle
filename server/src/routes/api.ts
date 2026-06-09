import { Router, Request, Response } from 'express';
import { getDb } from '../db/index.js';
import { getRoomsInfo, getRoomCount } from '../socket/roomManager.js';
import { requireAuth } from '../middleware/auth.js';

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

// POST /api/solo/questions
apiRouter.post('/solo/questions', (req: Request, res: Response) => {
  const { quizId, count } = req.body as { quizId?: number | null; count: number };
  const validCount = [10, 20, 30].includes(count) ? count : 10;
  const db = getDb();

  // Fetch ALL questions then filter — many records have malformed options data
  // so a fixed multiplier is unreliable. The table is small (~1600 rows).
  let questions: any[];
  let totalInQuiz: number | null = null;

  if (quizId) {
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quizId);
    if (!quiz) {
      res.status(404).json({ error: '题库不存在' });
      return;
    }
    totalInQuiz = db.prepare('SELECT COUNT(*) as c FROM questions WHERE quiz_id = ?').get(quizId) as any;
    questions = db.prepare(
      'SELECT * FROM questions WHERE quiz_id = ? ORDER BY RANDOM()'
    ).all(quizId);
  } else {
    questions = db.prepare(
      'SELECT * FROM questions ORDER BY RANDOM()'
    ).all();
  }

  const parsed = questions
    .map((q: any) => {
      try {
        const options = JSON.parse(q.options);
        if (!Array.isArray(options)) return null;
        return { ...q, options };
      } catch {
        return null;
      }
    })
    .filter((q: any): q is NonNullable<typeof q> => q !== null)
    .slice(0, validCount);

  // Distinguish: quiz has questions but all malformed vs truly empty
  if (parsed.length === 0 && totalInQuiz !== null && (totalInQuiz as any).c > 0) {
    res.status(422).json({ error: '该题库数据格式异常，暂时无法使用' });
    return;
  }

  res.json({ questions: parsed, totalQuestions: parsed.length });
});

// POST /api/quizzes/:quizId/import
apiRouter.post('/quizzes/:quizId/import', (req: Request, res: Response) => {
  const { questions } = req.body as { questions: { type: string; content: string; options: string[]; answer: number }[] };
  if (!Array.isArray(questions) || questions.length === 0) {
    res.status(400).json({ error: '题目列表不能为空' });
    return;
  }
  const db = getDb();
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.quizId);
  if (!quiz) {
    res.status(404).json({ error: '题库不存在' });
    return;
  }

  const errors: string[] = [];
  const valid: { type: string; content: string; options: string[]; answer: number }[] = [];

  questions.forEach((q, i) => {
    if (!q.content?.trim()) { errors.push(`第${i + 1}题：题目内容不能为空`); return; }
    if (!Array.isArray(q.options) || q.options.filter((o: string) => o?.trim()).length < 2) { errors.push(`第${i + 1}题：至少需要2个有效选项`); return; }
    if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.options.length) { errors.push(`第${i + 1}题：答案索引无效`); return; }
    if (q.type !== 'single' && q.type !== 'judge') { errors.push(`第${i + 1}题：类型必须是 single 或 judge`); return; }
    valid.push({ type: q.type, content: q.content.trim(), options: q.options.map((o: string) => o.trim()), answer: q.answer });
  });

  if (valid.length === 0) {
    res.status(400).json({ success: 0, failed: questions.length, errors });
    return;
  }

  const insertMany = db.transaction((items: typeof valid) => {
    const stmt = db.prepare('INSERT INTO questions (quiz_id, type, content, options, answer) VALUES (?, ?, ?, ?, ?)');
    for (const q of items) {
      stmt.run(req.params.quizId, q.type, q.content, JSON.stringify(q.options), q.answer);
    }
  });

  try {
    insertMany(valid);
    res.json({ success: valid.length, failed: questions.length - valid.length, errors });
  } catch (err: any) {
    res.status(500).json({ error: '导入失败：' + err.message });
  }
});

// GET /api/me/history
apiRouter.get('/me/history', requireAuth, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;
  const db = getDb();

  const total = (db.prepare(`
    SELECT COUNT(*) as c FROM game_records WHERE player1_id = ? OR player2_id = ?
  `).get(userId, userId) as any).c;

  const records = db.prepare(`
    SELECT * FROM game_records
    WHERE player1_id = ? OR player2_id = ?
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(userId, userId, limit, offset) as any[];

  const items = records.map(r => {
    const isP1 = r.player1_id === userId;
    const myScore = isP1 ? r.player1_score : r.player2_score;
    const opponentScore = isP1 ? r.player2_score : r.player1_score;
    const opponentName = isP1 ? r.player2_name : r.player1_name;
    let result: 'win' | 'lose' | 'draw';
    if (r.winner === null) result = 'draw';
    else if ((isP1 && r.winner === 0) || (!isP1 && r.winner === 1)) result = 'win';
    else result = 'lose';
    return {
      id: r.id,
      opponentName,
      myScore,
      opponentScore,
      result,
      questionCount: r.question_count,
      durationSeconds: r.duration_seconds,
      createdAt: r.created_at,
    };
  });

  res.json({ records: items, total, page });
});

// GET /api/me/stats
apiRouter.get('/me/stats', requireAuth, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const db = getDb();

  const stats = db.prepare(`
    SELECT
      COUNT(*) as totalGames,
      SUM(CASE
        WHEN (player1_id = ? AND winner = 0) OR (player2_id = ? AND winner = 1) THEN 1
        ELSE 0
      END) as wins,
      SUM(CASE
        WHEN winner IS NULL THEN 1
        ELSE 0
      END) as draws,
      SUM(CASE
        WHEN (player1_id = ? AND winner = 1) OR (player2_id = ? AND winner = 0) THEN 1
        ELSE 0
      END) as losses,
      SUM(CASE WHEN player1_id = ? THEN player1_score ELSE player2_score END) as totalScore
    FROM game_records WHERE player1_id = ? OR player2_id = ?
  `).get(userId, userId, userId, userId, userId, userId, userId) as any;

  const totalGames = stats.totalGames || 0;
  const wins = stats.wins || 0;
  const losses = stats.losses || 0;
  const draws = stats.draws || 0;
  const totalScore = stats.totalScore || 0;

  res.json({
    totalGames,
    wins,
    losses,
    draws,
    winRate: totalGames > 0 ? Math.round((wins / totalGames) * 1000) / 10 : 0,
    totalScore,
    avgScore: totalGames > 0 ? Math.round((totalScore / totalGames) * 10) / 10 : 0,
  });
});
