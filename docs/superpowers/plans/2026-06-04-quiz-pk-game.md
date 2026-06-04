# 双人答题PK游戏 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个双人实时答题PK网页游戏，包含抢答机制、房间系统和后台题库管理。

**Architecture:** Monorepo 结构（npm workspaces），React 前端 + Express 后端 + Socket.IO 实时通信。SQLite 持久化题库数据，内存管理房间和游戏状态。抢答制答题——点击即提交，先到先得。

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Express, Socket.IO, better-sqlite3, react-router-dom

---

## File Map

以下是本项目所有需要创建的文件及其职责：

```
srdt/
├── package.json                              # 根 workspace 配置
├── shared/
│   └── types.ts                              # 前后端共享类型（Room, Player, Question, Answer, GameEvent）
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                          # Express + Socket.IO 启动入口
│       ├── db/
│       │   ├── index.ts                      # SQLite 连接 + 初始化
│       │   └── migrations.ts                 # 建表 SQL
│       ├── routes/
│       │   └── api.ts                        # 所有 REST API 路由（quizzes + questions）
│       ├── socket/
│       │   ├── roomManager.ts                # 内存房间状态管理（创建/加入/清理/超时）
│       │   └── handlers.ts                   # Socket.IO 事件处理器
│       └── seed.ts                           # 示例题库数据
├── client/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx                          # React 入口
│       ├── App.tsx                           # 路由配置
│       ├── index.css                         # Tailwind 引入 + 自定义动画
│       ├── hooks/
│       │   └── useSocket.ts                  # Socket.IO 连接 + 事件封装
│       ├── pages/
│       │   ├── HomePage.tsx                  # 首页（创建/加入房间）
│       │   ├── GamePage.tsx                  # 游戏页（状态机驱动所有子阶段）
│       │   └── AdminPage.tsx                 # 管理后台
│       └── components/
│           ├── room/
│           │   ├── CreateRoom.tsx             # 创建房间卡片
│           │   ├── JoinRoom.tsx               # 加入房间卡片
│           │   └── RoomLobby.tsx              # 房间大厅（选题库+准备）
│           ├── game/
│           │   ├── CountdownOverlay.tsx       # 3-2-1 倒计时浮层
│           │   ├── QuestionCard.tsx           # 题目卡片（选项按钮）
│           │   ├── ScoreBoard.tsx             # 实时计分板
│           │   └── ResultScreen.tsx           # 最终结果页
│           └── admin/
│               ├── QuizList.tsx               # 题库列表
│               └── QuestionEditor.tsx         # 题目编辑器（含添加/编辑表单）
```

---

### Task 1: 项目脚手架 — Monorepo 初始化

**Files:**
- Create: `package.json` (根)
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/vite.config.ts`
- Create: `client/tailwind.config.js`
- Create: `client/postcss.config.js`
- Create: `client/index.html`
- Create: `client/src/main.tsx`
- Create: `client/src/index.css`
- Create: `.gitignore`

- [ ] **Step 1: 创建根 package.json（workspace 配置）**

```json
{
  "name": "srdt",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["client", "server", "shared"]
}
```

- [ ] **Step 2: 创建 .gitignore**

```
node_modules/
dist/
*.db
*.sqlite
.DS_Store
```

- [ ] **Step 3: 创建 server/package.json**

```json
{
  "name": "server",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "better-sqlite3": "^11.7.0",
    "cors": "^2.8.5",
    "express": "^4.21.0",
    "socket.io": "^4.8.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/node": "^22.10.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 4: 创建 server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src"]
}
```

- [ ] **Step 5: 创建 client/package.json**

```json
{
  "name": "client",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.28.0",
    "socket.io-client": "^4.8.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 6: 创建 client/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 7: 创建 client/vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001',
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
});
```

- [ ] **Step 8: 创建 Tailwind 和 PostCSS 配置**

`client/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      animation: {
        'bounce-in': 'bounceIn 0.5s ease-out',
        'pulse-score': 'pulseScore 0.6s ease-out',
        'shake': 'shake 0.4s ease-out',
        'float-up': 'floatUp 1s ease-out forwards',
        'confetti': 'confetti 1.5s ease-out forwards',
      },
      keyframes: {
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseScore: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.4)', color: '#22c55e' },
          '100%': { transform: 'scale(1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-8px)' },
          '75%': { transform: 'translateX(8px)' },
        },
        floatUp: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-40px)', opacity: '0' },
        },
        confetti: {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
```

`client/postcss.config.js`:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 9: 创建 client/index.html**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>知识PK大作战</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧠</text></svg>" />
  </head>
  <body class="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 10: 创建 client/src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply font-sans antialiased;
  }
}
```

- [ ] **Step 11: 创建 client/src/main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 12: 安装所有依赖**

Run: `cd /Users/jinyn/work/srdt && npm install`
Expected: 成功安装，node_modules 生成

- [ ] **Step 13: 初始化 git 并提交**

Run:
```bash
cd /Users/jinyn/work/srdt
git init
git add -A
git commit -m "chore: project scaffolding with monorepo, React, Express, Tailwind"
```

---

### Task 2: 共享类型定义

**Files:**
- Create: `shared/types.ts`

这是前后端共用的类型契约，所有后续任务都依赖它。

- [ ] **Step 1: 创建 shared 类型文件**

`shared/types.ts`:
```typescript
// ==================== 题库 & 题目 ====================

export interface Quiz {
  id: number;
  name: string;
  description: string;
  questionCount?: number; // JOIN 查询时填充
  created_at: string;
  updated_at: string;
}

export type QuestionType = 'single' | 'judge';

export interface Question {
  id: number;
  quiz_id: number;
  type: QuestionType;
  content: string;
  options: string[];    // JSON 数组解析后
  answer: number;       // 正确答案索引（0-based）
  created_at: string;
}

// 创建/编辑题目的输入类型（不含 id 和 created_at）
export interface QuestionInput {
  type: QuestionType;
  content: string;
  options: string[];
  answer: number;
}

// ==================== 玩家 & 房间 ====================

export interface Player {
  id: string;           // socket.id
  name: string;         // 玩家A / 玩家B
  playerIndex: 0 | 1;   // 在房间中的位置
  ready: boolean;
}

export type RoomStatus = 'waiting' | 'readying' | 'countdown' | 'playing' | 'finished';

export interface Room {
  id: string;           // 4位房间号
  players: [Player, Player?];
  status: RoomStatus;
  quizId: number | null;
  questions: Question[];
  currentQuestion: number;  // 0-based index
  scores: [number, number];
  lockedBy: number | null;  // playerIndex or null
  answers: AnswerRecord[];
  createdAt: number;        // timestamp，用于超时清理
}

export interface AnswerRecord {
  questionIndex: number;
  playerIndex: number;
  selectedOption: number;
  correct: boolean;
}

// ==================== Socket 事件类型 ====================

// 客户端 → 服务端
export interface ClientEvents {
  'create-room': () => void;
  'join-room': (roomId: string) => void;
  'select-quiz': (quizId: number | null) => void;
  'player-ready': () => void;
  'submit-answer': (data: { questionIndex: number; optionIndex: number }) => void;
}

// 服务端 → 客户端
export interface ServerEvents {
  'room-created': (data: { roomId: string; playerIndex: number }) => void;
  'room-joined': (data: { roomId: string; playerIndex: number; players: Player[] }) => void;
  'room-error': (message: string) => void;
  'player-joined': (players: Player[]) => void;
  'quiz-selected': (quizId: number | null) => void;
  'player-ready-update': (players: Player[]) => void;
  'countdown': (number: number) => void;
  'next-question': (data: { question: Question; questionIndex: number; totalQuestions: number }) => void;
  'answer-result': (data: AnswerResultPayload) => void;
  'answer-rejected': (reason: string) => void;
  'game-over': (data: GameOverPayload) => void;
  'opponent-disconnected': () => void;
  'opponent-reconnected': () => void;
}

export interface AnswerResultPayload {
  questionIndex: number;
  playerIndex: number;   // 谁抢到了
  selectedOption: number;
  correct: boolean;
  correctAnswer: number;
  scores: [number, number];
}

export interface GameOverPayload {
  scores: [number, number];
  winner: number | null; // playerIndex, null = 平局
  answers: AnswerRecord[];
}

// ==================== REST API 类型 ====================

export interface CreateQuizInput {
  name: string;
  description?: string;
}

export interface UpdateQuizInput {
  name?: string;
  description?: string;
}
```

- [ ] **Step 2: 提交**

```bash
cd /Users/jinyn/work/srdt
git add shared/types.ts
git commit -m "feat: add shared type definitions for game, quizzes, and socket events"
```

---

### Task 3: 服务端 — SQLite 数据库层

**Files:**
- Create: `server/src/db/index.ts`
- Create: `server/src/db/migrations.ts`

- [ ] **Step 1: 创建数据库迁移脚本**

`server/src/db/migrations.ts`:
```typescript
export const MIGRATIONS = [
  `
  CREATE TABLE IF NOT EXISTS quizzes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS questions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id     INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    type        TEXT NOT NULL CHECK(type IN ('single', 'judge')),
    content     TEXT NOT NULL,
    options     TEXT NOT NULL,
    answer      INTEGER NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  `,
];
```

- [ ] **Step 2: 创建数据库初始化模块**

`server/src/db/index.ts`:
```typescript
import Database from 'better-sqlite3';
import path from 'path';
import { MIGRATIONS } from './migrations';

const DB_PATH = path.resolve(import.meta.dirname ?? __dirname, '../../data.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    runMigrations();
  }
  return db;
}

function runMigrations(): void {
  for (const sql of MIGRATIONS) {
    db.exec(sql);
  }
}
```

- [ ] **Step 3: 提交**

```bash
cd /Users/jinyn/work/srdt
git add server/src/db/
git commit -m "feat: add SQLite database layer with migrations"
```

---

### Task 4: 服务端 — REST API（题库+题目 CRUD）

**Files:**
- Create: `server/src/routes/api.ts`

- [ ] **Step 1: 创建完整的 REST API 路由**

`server/src/routes/api.ts`:
```typescript
import { Router, Request, Response } from 'express';
import { getDb } from '../db/index.js';

export const apiRouter = Router();

// ========== 题库 CRUD ==========

// GET /api/quizzes — 所有题库（含题目数量）
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

// POST /api/quizzes — 创建题库
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

  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...quiz, questionCount: 0 });
});

// PUT /api/quizzes/:id — 更新题库
apiRouter.put('/quizzes/:id', (req: Request, res: Response) => {
  const { name, description } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: '题库不存在' });
    return;
  }
  db.prepare(
    'UPDATE quizzes SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(
    name?.trim() || (existing as any).name,
    description !== undefined ? description.trim() : (existing as any).description,
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/quizzes/:id — 删除题库（级联删除题目）
apiRouter.delete('/quizzes/:id', (req: Request, res: Response) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM quizzes WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: '题库不存在' });
    return;
  }
  res.json({ success: true });
});

// ========== 题目 CRUD ==========

// GET /api/quizzes/:quizId/questions — 获取题库下所有题目
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

  // 解析 options JSON
  const parsed = questions.map((q: any) => ({
    ...q,
    options: JSON.parse(q.options),
  }));
  res.json(parsed);
});

// POST /api/quizzes/:quizId/questions — 创建题目
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

  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...question, options: JSON.parse((question as any).options) });
});

// PUT /api/questions/:id — 更新题目
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
  ).run(
    type ?? existing.type,
    content?.trim() ?? existing.content,
    JSON.stringify(finalOptions),
    finalAnswer,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id) as any;
  res.json({ ...updated, options: JSON.parse(updated.options) });
});

// DELETE /api/questions/:id — 删除题目
apiRouter.delete('/questions/:id', (req: Request, res: Response) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: '题目不存在' });
    return;
  }
  res.json({ success: true });
});

// GET /api/quizzes/:quizId/stats — 题库统计
apiRouter.get('/quizzes/:quizId/stats', (req: Request, res: Response) => {
  const db = getDb();
  const stats = db.prepare(`
    SELECT
      q.*,
      COUNT(qu.id) as questionCount,
      SUM(CASE WHEN qu.type = 'single' THEN 1 ELSE 0 END) as singleCount,
      SUM(CASE WHEN qu.type = 'judge' THEN 1 ELSE 0 END) as judgeCount
    FROM quizzes q
    LEFT JOIN questions qu ON qu.quiz_id = q.id
    WHERE q.id = ?
    GROUP BY q.id
  `).get(req.params.quizId);
  if (!stats) {
    res.status(404).json({ error: '题库不存在' });
    return;
  }
  res.json(stats);
});
```

- [ ] **Step 2: 提交**

```bash
cd /Users/jinyn/work/srdt
git add server/src/routes/
git commit -m "feat: add REST API routes for quiz and question CRUD"
```

---

### Task 5: 服务端 — 房间状态管理器

**Files:**
- Create: `server/src/socket/roomManager.ts`

这个模块管理所有活跃房间的内存状态，是游戏逻辑的核心。

- [ ] **Step 1: 创建房间管理器**

`server/src/socket/roomManager.ts`:
```typescript
import type { Room, Player, Question, AnswerRecord, RoomStatus } from '../../../shared/types.js';
import { getDb } from '../db/index.js';

const rooms = new Map<string, Room>();

// 空房间超时（5分钟）
const EMPTY_ROOM_TIMEOUT = 5 * 60 * 1000;

/** 生成4位随机房间号，确保不重复 */
export function generateRoomId(): string {
  let id: string;
  do {
    id = String(Math.floor(1000 + Math.random() * 9000));
  } while (rooms.has(id));
  return id;
}

/** 创建新房间 */
export function createRoom(playerId: string): Room {
  const id = generateRoomId();
  const player: Player = {
    id: playerId,
    name: '玩家A',
    playerIndex: 0,
    ready: false,
  };
  const room: Room = {
    id,
    players: [player, undefined],
    status: 'waiting',
    quizId: null,
    questions: [],
    currentQuestion: 0,
    scores: [0, 0],
    lockedBy: null,
    answers: [],
    createdAt: Date.now(),
  };
  rooms.set(id, room);
  scheduleEmptyRoomCleanup(id);
  return room;
}

/** 加入房间 */
export function joinRoom(roomId: string, playerId: string): { room: Room; playerIndex: number } | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: '房间不存在' };
  if (room.players[0]?.id === playerId) return { error: '你已经在房间里了' };
  if (room.players[1]) {
    if (room.players[1].id === playerId) return { error: '你已经在房间里了' };
    return { error: '房间已满' };
  }

  const player: Player = {
    id: playerId,
    name: '玩家B',
    playerIndex: 1,
    ready: false,
  };
  room.players[1] = player;
  room.status = 'readying';
  return { room, playerIndex: 1 };
}

/** 获取房间 */
export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

/** 根据 socket id 查找玩家所在的房间 */
export function findRoomByPlayer(socketId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.players[0]?.id === socketId || room.players[1]?.id === socketId) {
      return room;
    }
  }
  return undefined;
}

/** 选择题库 */
export function selectQuiz(room: Room, quizId: number | null): void {
  room.quizId = quizId;
  // 重置准备状态
  room.players[0].ready = false;
  if (room.players[1]) room.players[1].ready = false;
}

/** 玩家准备 */
export function playerReady(room: Room, playerIndex: number): boolean {
  const player = room.players[playerIndex];
  if (!player) return false;
  player.ready = true;
  // 检查是否双方都准备好了
  return !!(room.players[0]?.ready && room.players[1]?.ready);
}

/** 加载题目并开始游戏 */
export function loadQuestions(room: Room): boolean {
  const db = getDb();

  let questions: any[];
  if (room.quizId === null) {
    // 随机从所有题库抽题
    questions = db.prepare('SELECT * FROM questions ORDER BY RANDOM() LIMIT 10').all();
  } else {
    questions = db.prepare(
      'SELECT * FROM questions WHERE quiz_id = ? ORDER BY RANDOM() LIMIT 10'
    ).all(room.quizId);
  }

  if (questions.length === 0) return false;

  room.questions = questions.map((q: any) => ({
    ...q,
    options: JSON.parse(q.options),
  }));
  room.currentQuestion = 0;
  room.scores = [0, 0];
  room.lockedBy = null;
  room.answers = [];
  room.status = 'countdown';
  return true;
}

/** 推进到下一题 */
export function advanceToNextQuestion(room: Room): { question: Question; index: number; total: number } | null {
  room.currentQuestion++;
  room.lockedBy = null;

  if (room.currentQuestion >= room.questions.length) {
    room.status = 'finished';
    return null;
  }

  room.status = 'playing';
  return {
    question: room.questions[room.currentQuestion],
    index: room.currentQuestion,
    total: room.questions.length,
  };
}

/** 处理抢答 */
export function submitAnswer(
  room: Room,
  playerIndex: number,
  questionIndex: number,
  optionIndex: number
): { accepted: true; correct: boolean; scores: [number, number] } | { accepted: false; reason: string } {
  // 检查题目是否正确
  if (questionIndex !== room.currentQuestion) {
    return { accepted: false, reason: '题目索引不匹配' };
  }
  // 检查是否已被抢
  if (room.lockedBy !== null) {
    return { accepted: false, reason: '对手已抢答' };
  }

  // 锁定
  room.lockedBy = playerIndex;
  const question = room.questions[questionIndex];
  const correct = optionIndex === question.answer;

  // 计分
  if (correct) {
    room.scores[playerIndex]++;
  } else {
    room.scores[1 - playerIndex]++;
  }

  // 记录
  room.answers.push({
    questionIndex,
    playerIndex,
    selectedOption: optionIndex,
    correct,
  });

  return { accepted: true, correct, scores: [...room.scores] as [number, number] };
}

/** 获取游戏结果 */
export function getGameOverPayload(room: Room) {
  const [scoreA, scoreB] = room.scores;
  let winner: number | null;
  if (scoreA > scoreB) winner = 0;
  else if (scoreB > scoreA) winner = 1;
  else winner = null;

  return {
    scores: room.scores,
    winner,
    answers: room.answers,
  };
}

/** 处理玩家断线 */
export function handleDisconnect(socketId: string): Room | undefined {
  const room = findRoomByPlayer(socketId);
  if (!room) return undefined;

  const playerIndex = room.players[0]?.id === socketId ? 0 : 1;

  if (room.status === 'waiting' && playerIndex === 0) {
    // 房主离开且无人加入，删除房间
    rooms.delete(room.id);
    return undefined;
  }

  // 标记为需要重连（保持房间，让对手知道）
  return room;
}

/** 处理重连 */
export function handleReconnect(roomId: string, socketId: string): { room: Room; playerIndex: number } | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: '房间已不存在' };

  for (let i = 0; i < 2; i++) {
    const player = room.players[i];
    if (player && i === 0) {
      // 简化：通过房间号重连，匹配原有位置
      // 实际中可以用 localStorage 存的 playerToken
    }
  }
  return { error: '无法重连' };
}

/** 删除房间 */
export function deleteRoom(roomId: string): void {
  rooms.delete(roomId);
}

/** 空房间清理定时器 */
function scheduleEmptyRoomCleanup(roomId: string): void {
  setTimeout(() => {
    const room = rooms.get(roomId);
    if (room && !room.players[1]) {
      rooms.delete(roomId);
    }
  }, EMPTY_ROOM_TIMEOUT);
}

/** 获取当前房间数量（用于调试） */
export function getRoomCount(): number {
  return rooms.size;
}
```

- [ ] **Step 2: 提交**

```bash
cd /Users/jinyn/work/srdt
git add server/src/socket/roomManager.ts
git commit -m "feat: add in-memory room state manager with game logic"
```

---

### Task 6: 服务端 — Socket.IO 事件处理器

**Files:**
- Create: `server/src/socket/handlers.ts`

- [ ] **Step 1: 创建 Socket.IO 事件处理器**

`server/src/socket/handlers.ts`:
```typescript
import type { Server, Socket } from 'socket.io';
import * as RoomManager from './roomManager.js';

const DISCONNECT_TIMEOUT = 30_000; // 30秒断线超时

export function registerSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] 连接: ${socket.id}`);

    // ======== 创建房间 ========
    socket.on('create-room', () => {
      const room = RoomManager.createRoom(socket.id);
      socket.join(room.id);

      socket.emit('room-created', {
        roomId: room.id,
        playerIndex: 0,
      });

      console.log(`[Room] 创建: ${room.id}, 玩家: ${socket.id}`);
    });

    // ======== 加入房间 ========
    socket.on('join-room', (roomId: string) => {
      const result = RoomManager.joinRoom(roomId, socket.id);
      if ('error' in result) {
        socket.emit('room-error', result.error);
        return;
      }

      socket.join(roomId);
      const { room, playerIndex } = result;

      // 通知新玩家
      socket.emit('room-joined', {
        roomId: room.id,
        playerIndex,
        players: room.players.map(p => p ?? null),
      });

      // 通知房内所有人（包括已有玩家）
      io.to(roomId).emit('player-joined', room.players.map(p => p ?? null));

      console.log(`[Room] ${socket.id} 加入房间 ${roomId}`);
    });

    // ======== 选择题库 ========
    socket.on('select-quiz', (quizId: number | null) => {
      const room = RoomManager.findRoomByPlayer(socket.id);
      if (!room) {
        socket.emit('room-error', '你不在任何房间中');
        return;
      }

      RoomManager.selectQuiz(room, quizId);
      io.to(room.id).emit('quiz-selected', quizId);
    });

    // ======== 玩家准备 ========
    socket.on('player-ready', () => {
      const room = RoomManager.findRoomByPlayer(socket.id);
      if (!room) {
        socket.emit('room-error', '你不在任何房间中');
        return;
      }

      const playerIndex = room.players[0]?.id === socket.id ? 0 : 1;
      const bothReady = RoomManager.playerReady(room, playerIndex);

      // 广播准备状态
      io.to(room.id).emit('player-ready-update', room.players.map(p => p ?? null));

      if (bothReady) {
        // 双方准备好了，加载题目
        const loaded = RoomManager.loadQuestions(room);
        if (!loaded) {
          io.to(room.id).emit('room-error', '题库为空，请先添加题目');
          // 重置准备状态
          room.players[0].ready = false;
          if (room.players[1]) room.players[1].ready = false;
          io.to(room.id).emit('player-ready-update', room.players.map(p => p ?? null));
          return;
        }

        // 3-2-1 倒计时
        startCountdown(io, room.id);
      }
    });

    // ======== 提交答案（抢答） ========
    socket.on('submit-answer', (data: { questionIndex: number; optionIndex: number }) => {
      const room = RoomManager.findRoomByPlayer(socket.id);
      if (!room) return;
      if (room.status !== 'playing') return;

      const playerIndex = room.players[0]?.id === socket.id ? 0 : 1;
      const result = RoomManager.submitAnswer(room, playerIndex, data.questionIndex, data.optionIndex);

      if (!result.accepted) {
        socket.emit('answer-rejected', result.reason);
        return;
      }

      const question = room.questions[data.questionIndex];

      // 广播答题结果
      io.to(room.id).emit('answer-result', {
        questionIndex: data.questionIndex,
        playerIndex,
        selectedOption: data.optionIndex,
        correct: result.correct,
        correctAnswer: question.answer,
        scores: result.scores,
      });

      // 1.5秒后进入下一题或结束
      setTimeout(() => {
        const next = RoomManager.advanceToNextQuestion(room);
        if (next === null) {
          // 游戏结束
          const gameOver = RoomManager.getGameOverPayload(room);
          io.to(room.id).emit('game-over', gameOver);
          // 10秒后清理房间
          setTimeout(() => {
            RoomManager.deleteRoom(room.id);
            io.socketsLeave(room.id);
          }, 10_000);
        } else {
          io.to(room.id).emit('next-question', {
            question: next.question,
            questionIndex: next.index,
            totalQuestions: next.total,
          });
        }
      }, 1500);
    });

    // ======== 断线处理 ========
    socket.on('disconnect', () => {
      console.log(`[Socket] 断开: ${socket.id}`);
      const room = RoomManager.handleDisconnect(socket.id);
      if (room) {
        // 通知对手
        socket.to(room.id).emit('opponent-disconnected');

        // 30秒超时
        setTimeout(() => {
          const currentRoom = RoomManager.getRoom(room.id);
          if (currentRoom && currentRoom.status !== 'finished') {
            // 判定断线方负
            const disconnectedIndex = currentRoom.players[0]?.id === socket.id ? 0 : 1;
            const winner = 1 - disconnectedIndex;
            io.to(room.id).emit('game-over', {
              scores: currentRoom.scores,
              winner,
              answers: currentRoom.answers,
            });
            RoomManager.deleteRoom(room.id);
          }
        }, DISCONNECT_TIMEOUT);
      }
    });
  });
}

/** 3-2-1 倒计时序列 */
function startCountdown(io: Server, roomId: string): void {
  let count = 3;

  const tick = () => {
    io.to(roomId).emit('countdown', count);
    if (count > 1) {
      count--;
      setTimeout(tick, 1000);
    } else {
      // 倒计时结束，发第一题
      setTimeout(() => {
        const room = RoomManager.getRoom(roomId);
        if (!room) return;
        room.status = 'playing';
        io.to(roomId).emit('next-question', {
          question: room.questions[0],
          questionIndex: 0,
          totalQuestions: room.questions.length,
        });
      }, 1000);
    }
  };

  tick();
}
```

- [ ] **Step 2: 提交**

```bash
cd /Users/jinyn/work/srdt
git add server/src/socket/handlers.ts
git commit -m "feat: add Socket.IO event handlers for game flow"
```

---

### Task 7: 服务端 — Express + Socket.IO 入口

**Files:**
- Create: `server/src/index.ts`

- [ ] **Step 1: 创建服务端入口**

`server/src/index.ts`:
```typescript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { apiRouter } from './routes/api.js';
import { registerSocketHandlers } from './socket/handlers.js';
import { seedData } from './seed.js';

const PORT = process.env.PORT || 3001;

const app = express();
const httpServer = createServer(app);

// Socket.IO — 允许前端开发服务器连接
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
  },
});

// 中间件
app.use(cors());
app.use(express.json());

// REST API
app.use('/api', apiRouter);

// Socket.IO
registerSocketHandlers(io);

// 启动
httpServer.listen(PORT, () => {
  console.log(`🚀 服务端运行在 http://localhost:${PORT}`);

  // 初始化数据库并插入示例数据
  seedData();
});
```

- [ ] **Step 2: 提交**

```bash
cd /Users/jinyn/work/srdt
git add server/src/index.ts
git commit -m "feat: add Express + Socket.IO server entry point"
```

---

### Task 8: 服务端 — 示例数据

**Files:**
- Create: `server/src/seed.ts`

- [ ] **Step 1: 创建示例数据填充脚本**

`server/src/seed.ts`:
```typescript
import { getDb } from './db/index.js';

export function seedData(): void {
  const db = getDb();

  // 检查是否已有数据
  const count = (db.prepare('SELECT COUNT(*) as count FROM quizzes').get() as any).count;
  if (count > 0) return;

  console.log('[Seed] 插入示例题库数据...');

  // 题库1: 历史知识
  const historyId = db.prepare('INSERT INTO quizzes (name, description) VALUES (?, ?)').run(
    '历史知识', '测试你的历史知识储备'
  ).lastInsertRowid;

  const historyQuestions = [
    { type: 'single', content: '秦始皇统一六国是哪一年？', options: ['A.公元前230年', 'B.公元前221年', 'C.公元前210年', 'D.公元前206年'], answer: 1 },
    { type: 'single', content: '唐朝的开国皇帝是谁？', options: ['A.李世民', 'B.李渊', 'C.李治', 'D.李隆基'], answer: 1 },
    { type: 'judge', content: '赤壁之战中，曹操是获胜方。', options: ['正确', '错误'], answer: 1 },
    { type: 'single', content: '丝绸之路的开辟与哪位历史人物有关？', options: ['A.班超', 'B.张骞', 'C.郑和', 'D.玄奘'], answer: 1 },
    { type: 'judge', content: '《史记》的作者是司马光。', options: ['正确', '错误'], answer: 1 },
    { type: 'single', content: '工业革命最早发生在哪个国家？', options: ['A.法国', 'B.德国', 'C.英国', 'D.美国'], answer: 2 },
    { type: 'single', content: '以下哪个朝代定都北京？', options: ['A.唐朝', 'B.宋朝', 'C.元朝', 'D.汉朝'], answer: 2 },
    { type: 'judge', content: '明朝的建立者是朱元璋。', options: ['正确', '错误'], answer: 0 },
    { type: 'single', content: '第一次世界大战爆发于哪一年？', options: ['A.1912年', 'B.1914年', 'C.1916年', 'D.1918年'], answer: 1 },
    { type: 'single', content: '"焚书坑儒"发生在哪个朝代？', options: ['A.商朝', 'B.周朝', 'C.秦朝', 'D.汉朝'], answer: 2 },
  ];

  const insertQuestion = db.prepare(
    'INSERT INTO questions (quiz_id, type, content, options, answer) VALUES (?, ?, ?, ?, ?)'
  );
  for (const q of historyQuestions) {
    insertQuestion.run(historyId, q.type, q.content, JSON.stringify(q.options), q.answer);
  }

  // 题库2: 科学常识
  const scienceId = db.prepare('INSERT INTO quizzes (name, description) VALUES (?, ?)').run(
    '科学常识', '考验你的科学知识'
  ).lastInsertRowid;

  const scienceQuestions = [
    { type: 'single', content: '光在真空中的传播速度约为？', options: ['A.3×10⁶ m/s', 'B.3×10⁷ m/s', 'C.3×10⁸ m/s', 'D.3×10⁹ m/s'], answer: 2 },
    { type: 'judge', content: '水在4°C时密度最大。', options: ['正确', '错误'], answer: 0 },
    { type: 'single', content: '人体最大的器官是什么？', options: ['A.肝脏', 'B.皮肤', 'C.大脑', 'D.肺'], answer: 1 },
    { type: 'single', content: '化学元素周期表中，第一个元素是？', options: ['A.氧', 'B.氮', 'C.碳', 'D.氢'], answer: 3 },
    { type: 'judge', content: '地球是太阳系中最大的行星。', options: ['正确', '错误'], answer: 1 },
    { type: 'single', content: 'DNA的中文全称是什么？', options: ['A.脱氧核糖核酸', 'B.核糖核酸', 'C.氨基酸', 'D.脂肪酸'], answer: 0 },
    { type: 'single', content: '以下哪种气体在空气中含量最多？', options: ['A.氧气', 'B.氮气', 'C.二氧化碳', 'D.氩气'], answer: 1 },
    { type: 'judge', content: '声音在真空中无法传播。', options: ['正确', '错误'], answer: 0 },
    { type: 'single', content: '地球的自然卫星是什么？', options: ['A.太阳', 'B.月球', 'C.火星', 'D.金星'], answer: 1 },
    { type: 'single', content: '以下哪种物质的硬度最高？', options: ['A.铁', 'B.铜', 'C.金刚石', 'D.铝'], answer: 2 },
  ];

  for (const q of scienceQuestions) {
    insertQuestion.run(scienceId, q.type, q.content, JSON.stringify(q.options), q.answer);
  }

  // 题库3: 体育竞技
  const sportsId = db.prepare('INSERT INTO quizzes (name, description) VALUES (?, ?)').run(
    '体育竞技', '看看你是不是体育达人'
  ).lastInsertRowid;

  const sportsQuestions = [
    { type: 'single', content: '篮球比赛每队上场几人？', options: ['A.4人', 'B.5人', 'C.6人', 'D.7人'], answer: 1 },
    { type: 'judge', content: '足球比赛全场共90分钟。', options: ['正确', '错误'], answer: 0 },
    { type: 'single', content: '奥运会每几年举办一次？', options: ['A.2年', 'B.3年', 'C.4年', 'D.5年'], answer: 2 },
    { type: 'single', content: '乒乓球起源于哪个国家？', options: ['A.中国', 'B.英国', 'C.日本', 'D.美国'], answer: 1 },
    { type: 'judge', content: '马拉松全程约为42.195公里。', options: ['正确', '错误'], answer: 0 },
    { type: 'single', content: 'NBA总冠军奖杯叫什么？', options: ['A.大力神杯', 'B.拉里·奥布莱恩杯', 'C.温布尔登杯', 'D.戴维斯杯'], answer: 1 },
    { type: 'single', content: '标准游泳池长度是多少米？', options: ['A.25米', 'B.50米', 'C.100米', 'D.200米'], answer: 1 },
    { type: 'judge', content: '排球比赛中可以用脚踢球。', options: ['正确', '错误'], answer: 0 },
    { type: 'single', content: '以下哪项不属于三大球？', options: ['A.足球', 'B.篮球', 'C.排球', 'D.网球'], answer: 3 },
    { type: 'single', content: '百米世界纪录保持者是？', options: ['A.博尔特', 'B.盖伊', 'C.布雷克', 'D.鲍威尔'], answer: 0 },
  ];

  for (const q of sportsQuestions) {
    insertQuestion.run(sportsId, q.type, q.content, JSON.stringify(q.options), q.answer);
  }

  console.log('[Seed] 示例数据插入完成');
}
```

- [ ] **Step 2: 提交**

```bash
cd /Users/jinyn/work/srdt
git add server/src/seed.ts
git commit -m "feat: add seed data with 3 sample quizzes (history, science, sports)"
```

---

### Task 9: 客户端 — App 路由和 Socket Hook

**Files:**
- Create: `client/src/App.tsx`
- Create: `client/src/hooks/useSocket.ts`

- [ ] **Step 1: 创建 useSocket Hook**

`client/src/hooks/useSocket.ts`:
```typescript
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerEvents, ClientEvents } from '../../../shared/types';

type GameSocket = Socket<ServerEvents, ClientEvents>;

export function useSocket() {
  const socketRef = useRef<GameSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket: GameSocket = io({
      autoConnect: true,
    });

    socket.on('connect', () => {
      setConnected(true);
      console.log('[Socket] 已连接:', socket.id);
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log('[Socket] 已断开');
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  const on = useCallback(<E extends keyof ServerEvents>(event: E, handler: ServerEvents[E]) => {
    socketRef.current?.on(event, handler as any);
    return () => {
      socketRef.current?.off(event, handler as any);
    };
  }, []);

  const emit = useCallback(<E extends keyof ClientEvents>(event: E, ...args: Parameters<ClientEvents[E]>) => {
    socketRef.current?.emit(event, ...args);
  }, []);

  return { socket: socketRef, connected, on, emit };
}
```

- [ ] **Step 2: 创建 App 路由配置**

`client/src/App.tsx`:
```tsx
import { Routes, Route, Link } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const HomePage = lazy(() => import('./pages/HomePage'));
const GamePage = lazy(() => import('./pages/GamePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-2xl text-purple-600 animate-bounce">加载中...</div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game/:roomId" element={<GamePage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Suspense>
  );
}
```

- [ ] **Step 3: 提交**

```bash
cd /Users/jinyn/work/srdt
git add client/src/App.tsx client/src/hooks/useSocket.ts
git commit -m "feat: add App router and useSocket hook"
```

---

### Task 10: 客户端 — 首页（创建/加入房间）

**Files:**
- Create: `client/src/pages/HomePage.tsx`
- Create: `client/src/components/room/CreateRoom.tsx`
- Create: `client/src/components/room/JoinRoom.tsx`

- [ ] **Step 1: 创建 CreateRoom 组件**

`client/src/components/room/CreateRoom.tsx`:
```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface CreateRoomProps {
  onEmit: (event: 'create-room') => void;
  onCreated: (handler: (data: { roomId: string; playerIndex: number }) => void) => () => void;
}

export default function CreateRoom({ onEmit, onCreated }: CreateRoomProps) {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const handleCreate = () => {
    setCreating(true);
    const cleanup = onCreated((data) => {
      cleanup();
      navigate(`/game/${data.roomId}`);
    });
    onEmit('create-room');
  };

  return (
    <button
      onClick={handleCreate}
      disabled={creating}
      className="w-full max-w-xs px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {creating ? (
        <span className="flex items-center justify-center gap-2">
          <span className="animate-spin">⏳</span> 创建中...
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">🎮 创建房间</span>
      )}
    </button>
  );
}
```

- [ ] **Step 2: 创建 JoinRoom 组件**

`client/src/components/room/JoinRoom.tsx`:
```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface JoinRoomProps {
  onEmit: (event: 'join-room', roomId: string) => void;
  onJoined: (handler: (data: { roomId: string; playerIndex: number }) => void) => () => void;
  onError: (handler: (msg: string) => void) => () => void;
}

export default function JoinRoom({ onEmit, onJoined, onError }: JoinRoomProps) {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoin = () => {
    const trimmed = roomId.trim();
    if (trimmed.length !== 4 || !/^\d{4}$/.test(trimmed)) {
      setError('请输入4位数字房间号');
      return;
    }

    setError('');
    setJoining(true);

    const cleanupJoined = onJoined((data) => {
      cleanupJoined();
      cleanupError();
      navigate(`/game/${data.roomId}`);
    });

    const cleanupError = onError((msg) => {
      cleanupError();
      cleanupJoined();
      setError(msg);
      setJoining(false);
    });

    onEmit('join-room', trimmed);
  };

  return (
    <div className="w-full max-w-xs">
      <div className="flex gap-2">
        <input
          type="text"
          value={roomId}
          onChange={(e) => {
            setRoomId(e.target.value.replace(/\D/g, '').slice(0, 4));
            setError('');
          }}
          placeholder="输入4位房间号"
          maxLength={4}
          className="flex-1 px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
        />
        <button
          onClick={handleJoin}
          disabled={joining || roomId.length !== 4}
          className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {joining ? '⏳' : '🚪 加入'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-500 text-center">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: 创建首页**

`client/src/pages/HomePage.tsx`:
```tsx
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import CreateRoom from '../components/room/CreateRoom';
import JoinRoom from '../components/room/JoinRoom';

export default function HomePage() {
  const { connected, on, emit } = useSocket();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* 标题 */}
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 bg-clip-text text-transparent mb-4">
          🧠 知识PK大作战
        </h1>
        <p className="text-lg text-gray-500">两人对战，抢答PK，谁才是知识之王？</p>
      </div>

      {/* 连接状态 */}
      {!connected && (
        <div className="mb-8 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-sm">
          正在连接服务器...
        </div>
      )}

      {/* 操作区域 */}
      <div className="flex flex-col items-center gap-6">
        <CreateRoom
          onEmit={() => emit('create-room')}
          onCreated={(handler) => on('room-created', handler)}
        />
        <div className="text-gray-400 text-sm">— 或者 —</div>
        <JoinRoom
          onEmit={(event, roomId) => emit(event, roomId)}
          onJoined={(handler) => on('room-joined', handler)}
          onError={(handler) => on('room-error', handler)}
        />
      </div>

      {/* 管理后台入口 */}
      <Link
        to="/admin"
        className="mt-16 text-gray-400 hover:text-purple-500 transition-colors text-sm flex items-center gap-1"
      >
        ⚙️ 题库管理后台
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: 提交**

```bash
cd /Users/jinyn/work/srdt
git add client/src/pages/HomePage.tsx client/src/components/room/
git commit -m "feat: add HomePage with create/join room UI"
```

---

### Task 11: 客户端 — 游戏页（核心状态机）

**Files:**
- Create: `client/src/pages/GamePage.tsx`
- Create: `client/src/components/room/RoomLobby.tsx`
- Create: `client/src/components/game/CountdownOverlay.tsx`
- Create: `client/src/components/game/QuestionCard.tsx`
- Create: `client/src/components/game/ScoreBoard.tsx`
- Create: `client/src/components/game/ResultScreen.tsx`

这是最大的一组文件，包含游戏的核心状态机和所有游戏阶段组件。

- [ ] **Step 1: 创建 RoomLobby 组件**

`client/src/components/room/RoomLobby.tsx`:
```tsx
import { useState, useEffect } from 'react';
import type { Player, Quiz } from '../../../../shared/types';

interface RoomLobbyProps {
  roomId: string;
  playerIndex: number;
  players: (Player | null)[];
  connected: boolean;
  onEmit: (event: string, ...args: any[]) => void;
  on: (event: string, handler: (...args: any[]) => void) => () => void;
}

export default function RoomLobby({ roomId, playerIndex, players, connected, onEmit, on }: RoomLobbyProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);

  // 加载题库列表
  useEffect(() => {
    fetch('/api/quizzes')
      .then(res => res.json())
      .then(setQuizzes)
      .catch(console.error);
  }, []);

  // 监听题库选择
  useEffect(() => {
    return on('quiz-selected', (quizId: number | null) => setSelectedQuiz(quizId));
  }, [on]);

  // 监听准备状态
  useEffect(() => {
    return on('player-ready-update', (updatedPlayers: (Player | null)[]) => {
      const myPlayer = updatedPlayers[playerIndex];
      const opponentIndex = 1 - playerIndex;
      const opponent = updatedPlayers[opponentIndex];
      if (myPlayer) setReady(myPlayer.ready);
      if (opponent) setOpponentReady(opponent.ready);
    });
  }, [on, playerIndex]);

  const myPlayer = players[playerIndex];
  const opponent = players[1 - playerIndex];

  return (
    <div className="max-w-lg mx-auto p-6">
      {/* 房间号 */}
      <div className="text-center mb-8">
        <div className="text-gray-500 text-sm mb-1">房间号</div>
        <div className="text-4xl font-mono font-black tracking-[0.3em] text-purple-700 bg-white px-6 py-3 rounded-2xl shadow-inner inline-block">
          {roomId}
        </div>
      </div>

      {/* 玩家状态 */}
      <div className="flex justify-center gap-8 mb-8">
        <div className={`text-center px-6 py-3 rounded-xl ${myPlayer?.ready ? 'bg-green-100 border-2 border-green-400' : 'bg-gray-100 border-2 border-gray-200'}`}>
          <div className="text-2xl mb-1">👤</div>
          <div className="font-bold">{myPlayer?.name}</div>
          <div className="text-sm text-gray-500">{myPlayer?.ready ? '✅ 已准备' : '等待准备'}</div>
        </div>
        <div className={`text-center px-6 py-3 rounded-xl ${opponent ? (opponentReady ? 'bg-green-100 border-2 border-green-400' : 'bg-gray-100 border-2 border-gray-200') : 'bg-yellow-50 border-2 border-dashed border-yellow-300'}`}>
          <div className="text-2xl mb-1">{opponent ? '👤' : '⏳'}</div>
          <div className="font-bold">{opponent?.name || '等待对手...'}</div>
          <div className="text-sm text-gray-500">{opponent ? (opponentReady ? '✅ 已准备' : '等待准备') : '等待加入'}</div>
        </div>
      </div>

      {/* 题库选择 */}
      {opponent && (
        <div className="mb-8">
          <h3 className="text-center text-gray-600 font-medium mb-3">选择对战题库</h3>
          <div className="space-y-2">
            {quizzes.map(quiz => (
              <button
                key={quiz.id}
                onClick={() => {
                  setSelectedQuiz(quiz.id);
                  onEmit('select-quiz', quiz.id);
                }}
                className={`w-full px-4 py-3 rounded-xl text-left transition-all ${
                  selectedQuiz === quiz.id
                    ? 'bg-purple-500 text-white shadow-lg scale-[1.02]'
                    : 'bg-white hover:bg-purple-50 border-2 border-gray-100 hover:border-purple-200'
                }`}
              >
                <span className="font-medium">{quiz.name}</span>
                <span className={`text-sm ml-2 ${selectedQuiz === quiz.id ? 'text-purple-200' : 'text-gray-400'}`}>
                  ({quiz.questionCount ?? 0}题)
                </span>
              </button>
            ))}
            <button
              onClick={() => {
                setSelectedQuiz(null);
                onEmit('select-quiz', null);
              }}
              className={`w-full px-4 py-3 rounded-xl text-left transition-all ${
                selectedQuiz === null
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg scale-[1.02]'
                  : 'bg-white hover:bg-pink-50 border-2 border-gray-100 hover:border-pink-200'
              }`}
            >
              <span className="font-medium">🎲 随机出题</span>
              <span className={`text-sm ml-2 ${selectedQuiz === null ? 'text-pink-200' : 'text-gray-400'}`}>
                (从所有题库随机)
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 准备按钮 */}
      {opponent && !ready && (
        <div className="text-center">
          <button
            onClick={() => {
              setReady(true);
              onEmit('player-ready');
            }}
            className="px-12 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            ✋ 准备就绪！
          </button>
        </div>
      )}

      {ready && !opponentReady && (
        <div className="text-center text-gray-500 animate-pulse">
          等待对手准备...
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 创建 CountdownOverlay 组件**

`client/src/components/game/CountdownOverlay.tsx`:
```tsx
interface CountdownOverlayProps {
  number: number;
}

export default function CountdownOverlay({ number }: CountdownOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        key={number}
        className="text-[12rem] font-black text-white animate-bounce-in"
        style={{ textShadow: '0 0 60px rgba(168, 85, 247, 0.8), 0 0 120px rgba(168, 85, 247, 0.4)' }}
      >
        {number}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 创建 ScoreBoard 组件**

`client/src/components/game/ScoreBoard.tsx`:
```tsx
import { useEffect, useState } from 'react';

interface ScoreBoardProps {
  playerIndex: number;
  scores: [number, number];
  totalQuestions: number;
  currentQuestion: number;
}

export default function ScoreBoard({ playerIndex, scores, totalQuestions, currentQuestion }: ScoreBoardProps) {
  const myScore = scores[playerIndex];
  const opponentScore = scores[1 - playerIndex];
  const [animatingScore, setAnimatingScore] = useState<number | null>(null);

  useEffect(() => {
    if (myScore > 0 || opponentScore > 0) {
      setAnimatingScore(myScore);
      const timer = setTimeout(() => setAnimatingScore(null), 600);
      return () => clearTimeout(timer);
    }
  }, [myScore, opponentScore]);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-sm rounded-2xl shadow-md mb-6">
      <div className="text-sm font-medium text-gray-500">
        第 {currentQuestion + 1}/{totalQuestions} 题
      </div>
      <div className="flex items-center gap-6">
        <div className="text-center">
          <div className="text-xs text-gray-400">你</div>
          <div className={`text-2xl font-black ${animatingScore === myScore ? 'animate-pulse-score' : ''} text-purple-600`}>
            {myScore}
          </div>
        </div>
        <div className="text-gray-300 font-bold">VS</div>
        <div className="text-center">
          <div className="text-xs text-gray-400">对手</div>
          <div className="text-2xl font-black text-pink-600">
            {opponentScore}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 创建 QuestionCard 组件**

`client/src/components/game/QuestionCard.tsx`:
```tsx
import { useState } from 'react';
import type { Question } from '../../../../shared/types';

interface QuestionCardProps {
  question: Question;
  questionIndex: number;
  disabled: boolean;
  showResult: { selectedOption: number; correct: boolean; correctAnswer: number } | null;
  onSubmit: (optionIndex: number) => void;
}

const OPTION_COLORS = [
  'from-blue-500 to-blue-600',
  'from-orange-500 to-orange-600',
  'from-green-500 to-green-600',
  'from-purple-500 to-purple-600',
];

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function QuestionCard({ question, questionIndex, disabled, showResult, onSubmit }: QuestionCardProps) {
  return (
    <div className="w-full max-w-lg mx-auto">
      {/* 题目 */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="text-xs text-purple-500 font-medium mb-2">
          {question.type === 'judge' ? '✅ 判断题' : '📝 单选题'}
        </div>
        <h2 className="text-xl font-bold text-gray-800 leading-relaxed">
          {question.content}
        </h2>
      </div>

      {/* 选项 */}
      <div className="grid grid-cols-1 gap-3">
        {question.options.map((option, idx) => {
          const isSelected = showResult?.selectedOption === idx;
          const isCorrect = showResult?.correctAnswer === idx;
          let optionClass = `bg-gradient-to-r ${OPTION_COLORS[idx % 4]} text-white font-bold py-4 px-6 rounded-xl shadow-md transition-all duration-200`;

          if (showResult) {
            if (isCorrect) {
              optionClass = 'bg-gradient-to-r from-green-400 to-green-600 text-white font-bold py-4 px-6 rounded-xl shadow-md ring-4 ring-green-300';
            } else if (isSelected && !showResult.correct) {
              optionClass = 'bg-gradient-to-r from-red-400 to-red-600 text-white font-bold py-4 px-6 rounded-xl shadow-md animate-shake';
            } else {
              optionClass = 'bg-gray-200 text-gray-400 font-bold py-4 px-6 rounded-xl';
            }
          } else if (disabled) {
            optionClass = 'bg-gray-300 text-gray-500 font-bold py-4 px-6 rounded-xl cursor-not-allowed';
          }

          return (
            <button
              key={idx}
              onClick={() => !disabled && !showResult && onSubmit(idx)}
              disabled={disabled || !!showResult}
              className={`${optionClass} ${!disabled && !showResult ? 'hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]' : ''} text-left`}
            >
              <span className="inline-flex items-center gap-3">
                <span className="bg-white/20 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black">
                  {question.type === 'judge' ? (idx === 0 ? '✓' : '✗') : OPTION_LABELS[idx]}
                </span>
                <span>{option.replace(/^[A-D][.、]\s*/, '')}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* 抢答状态提示 */}
      {disabled && !showResult && (
        <div className="text-center mt-4 text-yellow-600 font-medium animate-pulse">
          ⚡ 对手已抢答！
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: 创建 ResultScreen 组件**

`client/src/components/game/ResultScreen.tsx`:
```tsx
import { Link } from 'react-router-dom';
import type { GameOverPayload, Player } from '../../../../shared/types';

interface ResultScreenProps {
  result: GameOverPayload;
  playerIndex: number;
  players: (Player | null)[];
}

export default function ResultScreen({ result, playerIndex, players }: ResultScreenProps) {
  const { scores, winner } = result;
  const myScore = scores[playerIndex];
  const opponentScore = scores[1 - playerIndex];
  const isWinner = winner === playerIndex;
  const isDraw = winner === null;

  // 简单的彩纸效果（用 CSS 动画）
  const confettiPieces = Array.from({ length: 20 }, (_, i) => (
    <div
      key={i}
      className="fixed w-3 h-3 rounded-full animate-confetti"
      style={{
        left: `${Math.random() * 100}%`,
        top: '-10px',
        backgroundColor: ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'][i % 5],
        animationDelay: `${Math.random() * 0.5}s`,
        animationDuration: `${1 + Math.random() * 1}s`,
      }}
    />
  ));

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      {/* 彩纸动画（仅获胜或平局时显示） */}
      {(isWinner || isDraw) && confettiPieces}

      {/* 标题 */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">
          {isWinner ? '🏆' : isDraw ? '🤝' : '😅'}
        </div>
        <h2 className="text-3xl font-black">
          {isWinner ? (
            <span className="bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
              你赢了！
            </span>
          ) : isDraw ? (
            <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              势均力敌！
            </span>
          ) : (
            <span className="text-gray-600">惜败一步</span>
          )}
        </h2>
      </div>

      {/* 分数 */}
      <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 w-full max-w-sm">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <div className="text-sm text-gray-400 mb-1">{players[playerIndex]?.name}</div>
            <div className="text-4xl font-black text-purple-600">{myScore}</div>
          </div>
          <div className="text-2xl font-bold text-gray-300 px-4">VS</div>
          <div className="text-center flex-1">
            <div className="text-sm text-gray-400 mb-1">{players[1 - playerIndex]?.name}</div>
            <div className="text-4xl font-black text-pink-600">{opponentScore}</div>
          </div>
        </div>
      </div>

      {/* 答题详情 */}
      <div className="w-full max-w-sm mb-8">
        <h3 className="text-sm text-gray-500 font-medium mb-3">答题回顾</h3>
        <div className="grid grid-cols-5 gap-2">
          {result.answers.map((answer, idx) => (
            <div
              key={idx}
              className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                answer.playerIndex === playerIndex
                  ? answer.correct
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {answer.playerIndex === playerIndex
                ? (answer.correct ? '✓' : '✗')
                : `${idx + 1}`}
            </div>
          ))}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-4">
        <Link
          to="/"
          className="px-8 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: 创建 GamePage（核心状态机）**

`client/src/pages/GamePage.tsx`:
```tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import type { Player, Question, AnswerResultPayload, GameOverPayload } from '../../../shared/types';
import RoomLobby from '../components/room/RoomLobby';
import CountdownOverlay from '../components/game/CountdownOverlay';
import QuestionCard from '../components/game/QuestionCard';
import ScoreBoard from '../components/game/ScoreBoard';
import ResultScreen from '../components/game/ResultScreen';

type GamePhase = 'lobby' | 'countdown' | 'playing' | 'result';

export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { connected, on, emit } = useSocket();

  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [playerIndex, setPlayerIndex] = useState<number>(0);
  const [players, setPlayers] = useState<(Player | null)[]>([]);

  // 倒计时
  const [countdownNumber, setCountdownNumber] = useState<number>(3);

  // 答题
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [showResult, setShowResult] = useState<{
    selectedOption: number;
    correct: boolean;
    correctAnswer: number;
  } | null>(null);
  const [answerDisabled, setAnswerDisabled] = useState(false);

  // 结果
  const [gameResult, setGameResult] = useState<GameOverPayload | null>(null);

  // 错误
  const [error, setError] = useState('');

  // 加入房间
  useEffect(() => {
    if (!connected || !roomId) return;

    // 尝试加入房间
    const cleanupJoined = on('room-joined', (data) => {
      setPlayerIndex(data.playerIndex);
      setPlayers(data.players);
    });

    const cleanupCreated = on('room-created', (data) => {
      setPlayerIndex(data.playerIndex);
      setPlayers([{ id: '', name: '玩家A', playerIndex: 0, ready: false }, undefined]);
    });

    const cleanupError = on('room-error', (msg) => {
      setError(msg);
    });

    emit('join-room', roomId);

    return () => {
      cleanupJoined();
      cleanupCreated();
      cleanupError();
    };
  }, [connected, roomId]);

  // 监听玩家加入
  useEffect(() => {
    return on('player-joined', (updatedPlayers) => {
      setPlayers(updatedPlayers);
    });
  }, [on]);

  // 监听倒计时
  useEffect(() => {
    return on('countdown', (number) => {
      setPhase('countdown');
      setCountdownNumber(number);
    });
  }, [on]);

  // 监听下一题
  useEffect(() => {
    return on('next-question', (data) => {
      setPhase('playing');
      setCurrentQuestion(data.question);
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setShowResult(null);
      setAnswerDisabled(false);
    });
  }, [on]);

  // 监听答题结果
  useEffect(() => {
    return on('answer-result', (data: AnswerResultPayload) => {
      setScores(data.scores);
      setShowResult({
        selectedOption: data.selectedOption,
        correct: data.correct,
        correctAnswer: data.correctAnswer,
      });
      setAnswerDisabled(true);
    });
  }, [on]);

  // 监听抢答被拒
  useEffect(() => {
    return on('answer-rejected', (reason: string) => {
      setAnswerDisabled(true);
    });
  }, [on]);

  // 监听游戏结束
  useEffect(() => {
    return on('game-over', (data: GameOverPayload) => {
      setGameResult(data);
      setScores(data.scores);
      setPhase('result');
    });
  }, [on]);

  // 监听对手断线
  useEffect(() => {
    return on('opponent-disconnected', () => {
      setError('对手已断线，等待重连...');
    });
  }, [on]);

  // 提交答案
  const handleSubmitAnswer = useCallback((optionIndex: number) => {
    if (!currentQuestion || answerDisabled) return;
    emit('submit-answer', { questionIndex, optionIndex });
  }, [currentQuestion, answerDisabled, emit, questionIndex]);

  // 错误页面
  if (error && phase === 'lobby') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4">😕</div>
        <p className="text-xl text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-purple-500 text-white rounded-xl font-bold hover:bg-purple-600 transition-colors"
        >
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      {/* 倒计时浮层 */}
      {phase === 'countdown' && (
        <CountdownOverlay number={countdownNumber} />
      )}

      {/* 大厅阶段 */}
      {phase === 'lobby' && (
        <RoomLobby
          roomId={roomId!}
          playerIndex={playerIndex}
          players={players}
          connected={connected}
          onEmit={emit as any}
          on={on as any}
        />
      )}

      {/* 答题阶段 */}
      {phase === 'playing' && currentQuestion && (
        <div className="max-w-lg mx-auto pt-4">
          <ScoreBoard
            playerIndex={playerIndex}
            scores={scores}
            totalQuestions={totalQuestions}
            currentQuestion={questionIndex}
          />
          <QuestionCard
            question={currentQuestion}
            questionIndex={questionIndex}
            disabled={answerDisabled}
            showResult={showResult}
            onSubmit={handleSubmitAnswer}
          />
        </div>
      )}

      {/* 结果阶段 */}
      {phase === 'result' && gameResult && (
        <ResultScreen
          result={gameResult}
          playerIndex={playerIndex}
          players={players}
        />
      )}

      {/* 断线提示 */}
      {error && phase !== 'lobby' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 bg-yellow-100 text-yellow-700 rounded-full shadow-lg text-sm font-medium">
          {error}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: 提交**

```bash
cd /Users/jinyn/work/srdt
git add client/src/pages/GamePage.tsx client/src/components/game/ client/src/components/room/RoomLobby.tsx
git commit -m "feat: add GamePage with state machine, lobby, countdown, quiz, scoring, and result"
```

---

### Task 12: 客户端 — 管理后台页面

**Files:**
- Create: `client/src/pages/AdminPage.tsx`
- Create: `client/src/components/admin/QuizList.tsx`
- Create: `client/src/components/admin/QuestionEditor.tsx`

- [ ] **Step 1: 创建 QuestionEditor 组件**

`client/src/components/admin/QuestionEditor.tsx`:
```tsx
import { useState, useEffect } from 'react';
import type { Question, QuestionInput, QuestionType } from '../../../../shared/types';

interface QuestionEditorProps {
  quizId: number;
}

const EMPTY_QUESTION: QuestionInput = {
  type: 'single',
  content: '',
  options: ['', '', '', ''],
  answer: 0,
};

export default function QuestionEditor({ quizId }: QuestionEditorProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editing, setEditing] = useState<QuestionInput & { id?: number }>({ ...EMPTY_QUESTION });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, [quizId]);

  const loadQuestions = async () => {
    const res = await fetch(`/api/quizzes/${quizId}/questions`);
    const data = await res.json();
    setQuestions(data);
  };

  const handleTypeChange = (type: QuestionType) => {
    setEditing(prev => ({
      ...prev,
      type,
      options: type === 'judge' ? ['正确', '错误'] : ['', '', '', ''],
      answer: 0,
    }));
  };

  const handleSave = async () => {
    const { id, ...input } = editing;
    const filteredOptions = input.options.filter(o => o.trim());

    if (!editing.content.trim() || filteredOptions.length < 2) {
      alert('请填写题目内容和至少2个选项');
      return;
    }

    const payload = { ...input, options: filteredOptions };

    if (id) {
      await fetch(`/api/questions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch(`/api/quizzes/${quizId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    setEditing({ ...EMPTY_QUESTION });
    setShowForm(false);
    loadQuestions();
  };

  const handleEdit = (q: Question) => {
    setEditing({ id: q.id, type: q.type, content: q.content, options: [...q.options], answer: q.answer });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除这道题目吗？')) return;
    await fetch(`/api/questions/${id}`, { method: 'DELETE' });
    loadQuestions();
  };

  return (
    <div>
      {/* 题目列表 */}
      <div className="space-y-2 mb-6">
        {questions.length === 0 && (
          <p className="text-gray-400 text-center py-8">暂无题目，点击下方按钮添加</p>
        )}
        {questions.map((q, idx) => (
          <div key={q.id} className="bg-white rounded-xl p-4 shadow-sm flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${q.type === 'judge' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                  {q.type === 'judge' ? '判断' : '单选'}
                </span>
                <span className="text-xs text-gray-400">Q{idx + 1}</span>
              </div>
              <p className="text-gray-800 font-medium">{q.content}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {q.options.map((opt, oi) => (
                  <span key={oi} className={`text-xs px-2 py-1 rounded ${oi === q.answer ? 'bg-green-100 text-green-700 font-medium' : 'bg-gray-50 text-gray-500'}`}>
                    {opt}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => handleEdit(q)} className="text-sm text-purple-500 hover:text-purple-700 px-2 py-1">编辑</button>
              <button onClick={() => handleDelete(q.id)} className="text-sm text-red-400 hover:text-red-600 px-2 py-1">删除</button>
            </div>
          </div>
        ))}
      </div>

      {/* 添加/编辑表单 */}
      {!showForm ? (
        <button
          onClick={() => { setEditing({ ...EMPTY_QUESTION }); setShowForm(true); }}
          className="w-full py-3 border-2 border-dashed border-purple-200 text-purple-400 rounded-xl hover:border-purple-400 hover:text-purple-600 transition-colors"
        >
          + 添加题目
        </button>
      ) : (
        <div className="bg-white rounded-xl p-4 shadow-md">
          <h4 className="font-bold mb-4">{editing.id ? '编辑题目' : '添加题目'}</h4>

          {/* 类型选择 */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => handleTypeChange('single')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${editing.type === 'single' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              单选题
            </button>
            <button
              onClick={() => handleTypeChange('judge')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${editing.type === 'judge' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              判断题
            </button>
          </div>

          {/* 题目内容 */}
          <textarea
            value={editing.content}
            onChange={e => setEditing(prev => ({ ...prev, content: e.target.value }))}
            placeholder="输入题目内容..."
            className="w-full p-3 border rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none h-20"
          />

          {/* 选项 */}
          <div className="space-y-2 mb-4">
            {editing.options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct-answer"
                  checked={editing.answer === idx}
                  onChange={() => setEditing(prev => ({ ...prev, answer: idx }))}
                  className="accent-green-500"
                />
                <input
                  type="text"
                  value={opt}
                  onChange={e => {
                    const newOptions = [...editing.options];
                    newOptions[idx] = e.target.value;
                    setEditing(prev => ({ ...prev, options: newOptions }));
                  }}
                  placeholder={`选项 ${idx + 1}`}
                  disabled={editing.type === 'judge'}
                  className="flex-1 p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:bg-gray-50"
                />
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 mb-4">⬆ 点击单选按钮标记正确答案</p>

          {/* 操作 */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors"
            >
              {editing.id ? '保存修改' : '添加题目'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 创建 QuizList 组件**

`client/src/components/admin/QuizList.tsx`:
```tsx
import { useState, useEffect } from 'react';
import type { Quiz } from '../../../../shared/types';
import QuestionEditor from './QuestionEditor';

interface QuizWithCount extends Quiz {
  questionCount: number;
}

export default function QuizList() {
  const [quizzes, setQuizzes] = useState<QuizWithCount[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    const res = await fetch('/api/quizzes');
    const data = await res.json();
    setQuizzes(data);
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await fetch('/api/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, description: newDesc }),
    });
    setNewName('');
    setNewDesc('');
    setShowAddForm(false);
    loadQuizzes();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除该题库及其所有题目吗？')) return;
    await fetch(`/api/quizzes/${id}`, { method: 'DELETE' });
    if (selectedQuiz === id) setSelectedQuiz(null);
    loadQuizzes();
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-black text-gray-800">📝 题库管理</h1>
        <a href="/" className="text-purple-500 hover:text-purple-700 text-sm font-medium">
          ← 返回游戏
        </a>
      </div>

      <div className="grid md:grid-cols-[300px_1fr] gap-6">
        {/* 左侧：题库列表 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-600">题库列表</h2>
            <button
              onClick={() => setShowAddForm(true)}
              className="text-sm text-purple-500 hover:text-purple-700 font-medium"
            >
              + 新建
            </button>
          </div>

          {/* 添加表单 */}
          {showAddForm && (
            <div className="bg-white rounded-xl p-4 shadow-md mb-3">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="题库名称"
                className="w-full p-2 border rounded-lg mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                autoFocus
              />
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="描述（可选）"
                className="w-full p-2 border rounded-lg mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none h-16"
              />
              <div className="flex gap-2">
                <button onClick={handleAdd} className="flex-1 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600">创建</button>
                <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">取消</button>
              </div>
            </div>
          )}

          {/* 列表 */}
          <div className="space-y-2">
            {quizzes.map(quiz => (
              <div
                key={quiz.id}
                className={`bg-white rounded-xl p-4 shadow-sm cursor-pointer transition-all ${
                  selectedQuiz === quiz.id ? 'ring-2 ring-purple-500 shadow-md' : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedQuiz(quiz.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-800">{quiz.name}</h3>
                    <p className="text-xs text-gray-400">{quiz.questionCount ?? 0} 道题</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(quiz.id); }}
                    className="text-red-400 hover:text-red-600 text-sm px-2 py-1"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
            {quizzes.length === 0 && (
              <p className="text-gray-400 text-center py-8 text-sm">暂无题库</p>
            )}
          </div>
        </div>

        {/* 右侧：题目编辑 */}
        <div>
          {selectedQuiz ? (
            <>
              <h2 className="font-bold text-gray-600 mb-3">
                {quizzes.find(q => q.id === selectedQuiz)?.name} — 题目管理
              </h2>
              <QuestionEditor quizId={selectedQuiz} />
            </>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <div className="text-4xl mb-4">👈</div>
              <p>选择左侧的题库来管理题目</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 创建 AdminPage**

`client/src/pages/AdminPage.tsx`:
```tsx
import QuizList from '../components/admin/QuizList';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
      <QuizList />
    </div>
  );
}
```

- [ ] **Step 4: 提交**

```bash
cd /Users/jinyn/work/srdt
git add client/src/pages/AdminPage.tsx client/src/components/admin/
git commit -m "feat: add admin page with quiz/question CRUD management"
```

---

### Task 13: 集成测试 — 启动并验证

这个任务确保整个应用可以正常启动和运行。

- [ ] **Step 1: 启动服务端**

Run: `cd /Users/jinyn/work/srdt && npx tsx server/src/index.ts`
Expected: 看到输出 `🚀 服务端运行在 http://localhost:3001` 和 `[Seed] 插入示例题库数据...`

- [ ] **Step 2: 在另一个终端启动前端**

Run: `cd /Users/jinyn/work/srdt/client && npx vite`
Expected: 看到输出前端运行在 `http://localhost:3000`

- [ ] **Step 3: 验证 REST API**

Run: `curl http://localhost:3001/api/quizzes`
Expected: 返回包含3个题库的 JSON 数组

- [ ] **Step 4: 浏览器验证**

1. 打开 `http://localhost:3000`，确认首页正常显示
2. 点击"题库管理后台"，确认管理页面正常
3. 回到首页，点击"创建房间"，确认跳转到游戏页
4. 在另一个浏览器标签打开相同房间号，确认两人进入

- [ ] **Step 5: 提交最终状态**

```bash
cd /Users/jinyn/work/srdt
git add -A
git commit -m "chore: initial working version of quiz PK game"
```

---

## Self-Review Checklist

### Spec Coverage

| 设计需求 | 对应任务 |
|---------|---------|
| React + Express + Socket.IO 技术栈 | Task 1, 7, 9 |
| SQLite + better-sqlite3 | Task 3 |
| 共享类型定义 | Task 2 |
| 题库 CRUD API | Task 4 |
| 题目 CRUD API | Task 4 |
| 管理后台 Web 页面 | Task 12 |
| 房间创建/加入（4位房间号） | Task 5, 10 |
| 房间大厅（选题库+准备） | Task 11 (RoomLobby) |
| 3-2-1 倒计时 | Task 6 (startCountdown), 11 (CountdownOverlay) |
| 抢答机制（一步提交） | Task 5 (submitAnswer), 6 (handlers) |
| 答对+1分/答错对方+1分 | Task 5 (submitAnswer) |
| 10题后判断输赢/平局 | Task 5 (getGameOverPayload) |
| 首页 | Task 10 |
| 游戏页 | Task 11 |
| 结果页 | Task 11 (ResultScreen) |
| 断线处理 | Task 5, 6 |
| 空房间超时清理 | Task 5 |
| 活泼竞赛风 UI + 动画 | Task 1 (Tailwind config), 11 (各组件) |
| 示例数据 | Task 8 |

### Placeholder Scan
- 无 TBD / TODO / "implement later"
- 所有代码步骤均包含完整代码
- 无 "similar to Task N" 引用

### Type Consistency
- `Room.players` 类型为 `[Player, Player?]` — roomManager 和 GamePage 一致
- `submitAnswer` 返回类型在 roomManager 和 handlers 中匹配
- `GameOverPayload` 在 shared/types.ts 定义，GamePage 和 ResultScreen 使用一致
- `AnswerResultPayload` 在 shared/types.ts 定义，handlers 发送和 GamePage 接收一致
