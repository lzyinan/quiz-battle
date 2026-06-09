# 简易用户登录 + 题目批量导入 + 用户战绩历史 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Quiz Battle Arena 添加纯昵称用户登录、CSV 题目批量导入、双人 PK 战绩历史三个功能。

**Architecture:** 用户登录基于 token（localStorage 存储，Authorization header 传递），不使用 cookie。前端用 AuthContext 管理全局登录态。Socket.IO 通过 auth middleware 验证 token 并关联 userId。战绩在 game-over 时写入 SQLite，通过 REST API 查询。

**Tech Stack:** Express Auth Middleware · Socket.IO Auth · PapaParse (CSV 解析) · React Context · better-sqlite3 事务

---

## File Structure

### 新建文件
| 文件 | 职责 |
|------|------|
| `server/src/routes/auth.ts` | 登录 API：POST /login, GET /me, POST /logout |
| `server/src/middleware/auth.ts` | Express API 鉴权中间件 + 类型声明 |
| `client/src/contexts/AuthContext.tsx` | 全局 auth state（user, login, logout, loading） |
| `client/src/pages/LoginPage.tsx` | 登录页面：昵称输入 + 登录按钮 |
| `client/src/pages/HistoryPage.tsx` | 战绩历史页面：统计卡片 + 列表 + 加载更多 |
| `client/src/components/admin/ImportPreviewModal.tsx` | CSV 导入预览弹窗：解析 + 校验 + 确认导入 |

### 修改文件
| 文件 | 改动内容 |
|------|----------|
| `shared/types.ts` | 新增 AuthUser、GameRecordItem、UserStats 类型；Player 加 userId；Room 加 gameStartedAt；ClientEvents 去掉 playerName |
| `server/src/db/migrations.ts` | 新增 users 表、game_records 表迁移 |
| `server/src/index.ts` | 注册 auth 路由 + Socket.IO auth middleware |
| `server/src/socket/handlers.ts` | 用 socket.data 取代 data.playerName；game-over 时写 game_records |
| `server/src/socket/roomManager.ts` | createRoom/joinRoom 接收 userId；新增 gameStartedAt 字段 |
| `server/src/routes/api.ts` | 新增 POST /quizzes/:quizId/import、GET /me/history、GET /me/stats |
| `client/src/App.tsx` | 包裹 AuthProvider，加 /login 和 /history 路由，未登录守卫 |
| `client/src/hooks/useSocket.ts` | 连接时传递 auth token，登录态变化时重连 |
| `client/src/pages/HomePage.tsx` | 移除昵称输入框，用 auth context；新增"我的战绩"入口 |
| `client/src/pages/GamePage.tsx` | 移除 playerName 相关逻辑 |
| `client/src/pages/AdminPage.tsx` | 题目管理区新增"批量导入"按钮 + ImportPreviewModal |
| `client/package.json` | 添加 papaparse 和 @types/papaparse 依赖 |

---

## Phase 1: 用户登录

### Task 1: 更新 shared/types.ts — 添加所有新类型

**Files:**
- Modify: `shared/types.ts`

- [ ] **Step 1: 在文件末尾添加新类型定义，修改 Player、Room、ClientEvents**

在 `shared/types.ts` 中做以下修改：

**1a. Player 接口添加 userId 字段：**

```typescript
export interface Player {
  id: string;
  userId: number;
  name: string;
  playerIndex: 0 | 1;
  ready: boolean;
}
```

**1b. Room 接口添加 gameStartedAt 字段：**

```typescript
export interface Room {
  id: string;
  players: [Player, Player?];
  status: RoomStatus;
  quizId: number | null;
  questionCount: QuestionCount;
  questions: Question[];
  currentQuestion: number;
  scores: [number, number];
  answeredBy: [boolean, boolean];
  answers: AnswerRecord[];
  createdAt: number;
  gameStartedAt: number | null;
}
```

**1c. ClientEvents 去掉 playerName 参数：**

```typescript
export interface ClientEvents {
  'create-room': () => void;
  'join-room': (data: { roomId: string }) => void;
  'reconnect-room': (data: { roomId: string; playerIndex: number }) => void;
  'sync-room': (data: { roomId: string }) => void;
  'select-quiz': (quizId: number | null) => void;
  'select-question-count': (count: QuestionCount) => void;
  'player-ready': () => void;
  'submit-answer': (data: { questionIndex: number; optionIndex: number }) => void;
  'play-again': () => void;
}
```

**1d. 在文件末尾添加新类型：**

```typescript
// ==================== 用户认证 ====================

export interface AuthUser {
  id: number;
  nickname: string;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
}

// ==================== 战绩历史 ====================

export interface GameRecordItem {
  id: number;
  opponentName: string;
  myScore: number;
  opponentScore: number;
  result: 'win' | 'lose' | 'draw';
  questionCount: number;
  durationSeconds: number;
  createdAt: string;
}

export interface UserStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  totalScore: number;
  avgScore: number;
}
```

- [ ] **Step 2: 提交**

```bash
git add shared/types.ts
git commit -m "feat: add auth, game record, and updated player/room types"
```

---

### Task 2: 添加数据库迁移 — users 和 game_records 表

**Files:**
- Modify: `server/src/db/migrations.ts`

- [ ] **Step 1: 在 MIGRATIONS 数组末尾添加两个新迁移**

在 `server/src/db/migrations.ts` 的 `MIGRATIONS` 数组中追加两个元素：

```typescript
export const MIGRATIONS = [
  // ... 现有的 quizzes 和 questions 迁移保持不变 ...

  `
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname   TEXT NOT NULL UNIQUE,
    token      TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_token ON users(token);
  `,
  `
  CREATE TABLE IF NOT EXISTS game_records (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id          TEXT NOT NULL,
    player1_id       INTEGER NOT NULL REFERENCES users(id),
    player2_id       INTEGER NOT NULL REFERENCES users(id),
    player1_name     TEXT NOT NULL,
    player2_name     TEXT NOT NULL,
    player1_score    INTEGER NOT NULL DEFAULT 0,
    player2_score    INTEGER NOT NULL DEFAULT 0,
    winner           INTEGER,
    question_count   INTEGER NOT NULL,
    quiz_id          INTEGER,
    answers          TEXT NOT NULL,
    duration_seconds INTEGER,
    created_at       TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_game_records_player1 ON game_records(player1_id);
  CREATE INDEX IF NOT EXISTS idx_game_records_player2 ON game_records(player2_id);
  `,
];
```

- [ ] **Step 2: 删除旧数据库并重启验证**

```bash
rm -f data.db
npm run dev:server
```

预期输出：`🚀 服务端运行在 http://localhost:3001`，无报错。

- [ ] **Step 3: 提交**

```bash
git add server/src/db/migrations.ts
git commit -m "feat: add users and game_records table migrations"
```

---

### Task 3: 创建 Auth API 路由

**Files:**
- Create: `server/src/routes/auth.ts`

- [ ] **Step 1: 创建 auth.ts**

```typescript
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
```

- [ ] **Step 2: 提交**

```bash
git add server/src/routes/auth.ts
git commit -m "feat: add auth API routes (login, me, logout)"
```

---

### Task 4: 创建 Auth 中间件 + 注册路由 + Socket.IO 认证

**Files:**
- Create: `server/src/middleware/auth.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: 创建 auth 中间件**

```typescript
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
```

- [ ] **Step 2: 更新 server/src/index.ts — 注册 auth 路由 + Socket.IO auth 中间件**

将 `server/src/index.ts` 替换为：

```typescript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { apiRouter } from './routes/api.js';
import { authRouter } from './routes/auth.js';
import { registerSocketHandlers } from './socket/handlers.js';
import { seedData } from './seed.js';
import { getDb } from './db/index.js';

const PORT = process.env.PORT || 3001;

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], methods: ['GET', 'POST'] },
});

// Socket.IO auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  const db = getDb();
  const user = db.prepare('SELECT id, nickname FROM users WHERE token = ?').get(token) as { id: number; nickname: string } | undefined;
  if (!user) {
    return next(new Error('Invalid token'));
  }
  socket.data.userId = user.id;
  socket.data.nickname = user.nickname;
  next();
});

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api', apiRouter);

registerSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`🚀 服务端运行在 http://localhost:${PORT}`);
  seedData();
});
```

- [ ] **Step 3: 重启验证**

```bash
# 终止之前的 server 进程后重新启动
npm run dev:server
```

预期：无报错。

- [ ] **Step 4: 提交**

```bash
git add server/src/middleware/auth.ts server/src/index.ts
git commit -m "feat: add auth middleware and Socket.IO auth, register auth routes"
```

---

### Task 5: 创建前端 AuthContext + LoginPage

**Files:**
- Create: `client/src/contexts/AuthContext.tsx`
- Create: `client/src/pages/LoginPage.tsx`

- [ ] **Step 1: 创建 AuthContext**

```typescript
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AuthUser } from '../../../shared/types';

const TOKEN_KEY = 'quizpk_token';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (nickname: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }
    fetch('/pk/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setUser(data.user))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (nickname: string) => {
    const res = await fetch('/pk/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || '登录失败');
    }
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      fetch('/pk/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Step 2: 创建 LoginPage**

```typescript
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!nickname.trim()) { setError('请输入昵称'); return; }
    setError('');
    setSubmitting(true);
    try {
      await login(nickname);
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 bg-clip-text text-transparent mb-4">
          🧠 知识PK大作战
        </h1>
        <p className="text-base text-gray-500">输入昵称，开始答题之旅</p>
      </div>

      <div className="w-full max-w-xs">
        <input
          type="text"
          value={nickname}
          onChange={(e) => { setNickname(e.target.value.slice(0, 10)); setError(''); }}
          onKeyDown={handleKeyDown}
          placeholder="你的昵称"
          maxLength={10}
          autoFocus
          className="w-full px-4 py-3 text-center text-lg border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100 mb-4"
        />
        {error && <p className="text-sm text-red-500 text-center mb-3">{error}</p>}
        <button
          onClick={handleLogin}
          disabled={submitting || !nickname.trim()}
          className="w-full px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '⏳ 进入中...' : '🚀 进入游戏'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add client/src/contexts/AuthContext.tsx client/src/pages/LoginPage.tsx
git commit -m "feat: add AuthContext and LoginPage"
```

---

### Task 6: 更新 App.tsx — Auth 守卫 + 新路由

**Files:**
- Modify: `client/src/App.tsx`

- [ ] **Step 1: 替换 App.tsx 内容**

```typescript
import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const GamePage = lazy(() => import('./pages/GamePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const MistakePracticePage = lazy(() => import('./pages/MistakePracticePage'));
const SoloGamePage = lazy(() => import('./pages/SoloGamePage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-2xl text-purple-600 animate-bounce">加载中...</div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/game/:roomId" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
        <Route path="/mistakes" element={<ProtectedRoute><MistakePracticePage /></ProtectedRoute>} />
        <Route path="/solo" element={<ProtectedRoute><SoloGamePage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add client/src/App.tsx
git commit -m "feat: add AuthProvider, ProtectedRoute, login and history routes"
```

---

### Task 7: 更新 useSocket.ts — 传递 auth token

**Files:**
- Modify: `client/src/hooks/useSocket.ts`

- [ ] **Step 1: 替换 useSocket.ts 内容**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerEvents, ClientEvents } from '../../../shared/types';

type GameSocket = Socket<ServerEvents, ClientEvents>;

const TOKEN_KEY = 'quizpk_token';

let globalSocket: GameSocket | null = null;

function createSocket(): GameSocket {
  const token = localStorage.getItem(TOKEN_KEY);
  return io({
    autoConnect: !!token,
    path: '/pk/socket.io',
    auth: { token },
  });
}

export function getSocket(): GameSocket {
  if (!globalSocket) {
    globalSocket = createSocket();
  }
  return globalSocket;
}

/** Disconnect and recreate socket (e.g. after login) */
export function reconnectSocket(): GameSocket {
  if (globalSocket) {
    globalSocket.disconnect();
  }
  globalSocket = createSocket();
  globalSocket.connect();
  return globalSocket;
}

export function useSocket() {
  const [connected, setConnected] = useState(() => globalSocket?.connected ?? false);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => { setConnected(true); };
    const onDisconnect = () => { setConnected(false); };

    if (socket.connected) setConnected(true);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const on = useCallback(<E extends keyof ServerEvents>(event: E, handler: ServerEvents[E]) => {
    const socket = getSocket();
    socket.on(event, handler as any);
    return () => { socket.off(event, handler as any); };
  }, []);

  const emit = useCallback(<E extends keyof ClientEvents>(event: E, ...args: Parameters<ClientEvents[E]>) => {
    const socket = getSocket();
    socket.emit(event, ...args);
  }, []);

  return { connected, on, emit };
}
```

- [ ] **Step 2: 在 AuthContext 中登录成功后重连 socket**

在 `client/src/contexts/AuthContext.tsx` 中，更新 `login` 函数，在 `setUser(data.user)` 后调用 `reconnectSocket()`：

在文件顶部添加导入：
```typescript
import { reconnectSocket } from '../hooks/useSocket';
```

将 `login` 函数中 `setUser(data.user)` 那行之后添加：
```typescript
    setUser(data.user);
    reconnectSocket();
```

- [ ] **Step 3: 提交**

```bash
git add client/src/hooks/useSocket.ts client/src/contexts/AuthContext.tsx
git commit -m "feat: socket auth token + reconnect on login"
```

---

### Task 8: 更新 Socket handlers + roomManager — 使用 auth 数据

**Files:**
- Modify: `server/src/socket/roomManager.ts`
- Modify: `server/src/socket/handlers.ts`

- [ ] **Step 1: 更新 roomManager.ts — 函数签名加 userId，初始化 gameStartedAt，更新 resetRoom**

**1a.** 将 `createRoom` 函数替换为：

```typescript
export function createRoom(playerId: string, userId: number, playerName: string): Room {
  const id = generateRoomId();
  const player: Player = { id: playerId, userId, name: playerName, playerIndex: 0, ready: false };
  const room: Room = {
    id, players: [player, undefined], status: 'waiting', quizId: null, questionCount: 10,
    questions: [], currentQuestion: 0, scores: [0, 0], answeredBy: [false, false],
    answers: [], createdAt: Date.now(), gameStartedAt: null,
  };
  rooms.set(id, room);
  scheduleEmptyRoomCleanup(id);
  return room;
}
```

**1b.** 将 `joinRoom` 函数替换为：

```typescript
export function joinRoom(roomId: string, playerId: string, userId: number, playerName: string): { room: Room; playerIndex: number } | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: '房间不存在' };
  if (room.players[0]?.id === playerId) return { error: '你已经在房间里了' };
  if (room.players[1]) {
    if (room.players[1].id === playerId) return { error: '你已经在房间里了' };
    return { error: '房间已满' };
  }
  const player: Player = { id: playerId, userId, name: playerName, playerIndex: 1, ready: false };
  room.players[1] = player;
  room.status = 'readying';
  return { room, playerIndex: 1 };
}
```

**1c.** 将 `reconnectPlayer` 函数替换为：

```typescript
export function reconnectPlayer(roomId: string, playerIndex: number, newSocketId: string, userId: number): { room: Room; playerIndex: number } | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: '房间不存在' };
  if (playerIndex !== 0 && playerIndex !== 1) return { error: '玩家不存在' };
  const player = room.players[playerIndex];
  if (!player) return { error: '玩家不存在' };

  player.id = newSocketId;
  player.userId = userId;
  return { room, playerIndex };
}
```

**1d.** 在 `loadQuestions` 函数中，`room.status = 'countdown';` 之前添加：
```typescript
  room.gameStartedAt = Date.now();
```

**1e.** 在 `resetRoom` 函数中，`room.answers = [];` 之后添加：
```typescript
  room.gameStartedAt = null;
```

- [ ] **Step 2: 更新 handlers.ts — 用 socket.data 替代 data.playerName**

将 `handlers.ts` 的 `registerSocketHandlers` 函数体替换为：

```typescript
export function registerSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] 连接: ${socket.id} (${socket.data.nickname})`);

    socket.on('create-room', () => {
      const room = RoomManager.createRoom(socket.id, socket.data.userId, socket.data.nickname);
      socket.join(room.id);
      const players = RoomManager.getPlayersSnapshot(room);
      const state = RoomManager.getRoomStatePayload(room);
      socket.emit('room-created', { roomId: room.id, playerIndex: 0, players, state });
      emitRoomStateTo(socket, room);
      console.log(`[Room] 创建: ${room.id}`);
    });

    socket.on('join-room', (data: { roomId: string }) => {
      const result = RoomManager.joinRoom(data.roomId, socket.id, socket.data.userId, socket.data.nickname);
      if ('error' in result) { socket.emit('room-error', result.error); return; }
      socket.join(data.roomId);
      const { room, playerIndex } = result;
      const players = RoomManager.getPlayersSnapshot(room);
      const state = RoomManager.getRoomStatePayload(room);
      socket.emit('room-joined', { roomId: room.id, playerIndex, players, state });
      io.to(data.roomId).emit('player-joined', players);
      emitRoomState(io, room);
      console.log(`[Room] ${socket.id} 加入房间 ${data.roomId}`);
    });

    socket.on('reconnect-room', (data: { roomId: string; playerIndex: number }) => {
      const result = RoomManager.reconnectPlayer(data.roomId, data.playerIndex, socket.id, socket.data.userId);
      if ('error' in result) {
        socket.emit('room-error', result.error);
        return;
      }
      socket.join(data.roomId);
      const { room } = result;
      const players = RoomManager.getPlayersSnapshot(room);
      const state = RoomManager.getRoomStatePayload(room);

      socket.emit('reconnected', {
        roomId: data.roomId,
        playerIndex: data.playerIndex,
        players,
        phase: room.status,
        state,
      });
      emitRoomStateTo(socket, room);

      socket.to(data.roomId).emit('opponent-reconnected');
      emitRoomState(io, room);
      console.log(`[Room] ${socket.id} 重连房间 ${data.roomId}`);
    });

    socket.on('sync-room', (data: { roomId: string }) => {
      const room = RoomManager.findRoomByPlayer(socket.id);
      if (!room || room.id !== data.roomId) return;
      emitRoomStateTo(socket, room);
    });

    socket.on('play-again', () => {
      const room = RoomManager.findRoomByPlayer(socket.id);
      if (!room || room.status !== 'finished') return;

      RoomManager.resetRoom(room);
      io.to(room.id).emit('room-reset', RoomManager.getPlayersSnapshot(room));
      emitRoomState(io, room);
      console.log(`[Room] 房间 ${room.id} 再来一局`);
    });

    socket.on('select-quiz', (quizId: number | null) => {
      const room = RoomManager.findRoomByPlayer(socket.id);
      if (!room) { socket.emit('room-error', '你不在任何房间中'); return; }
      if (room.status !== 'readying') {
        emitRoomStateTo(socket, room);
        return;
      }
      RoomManager.selectQuiz(room, quizId);
      io.to(room.id).emit('quiz-selected', quizId);
      io.to(room.id).emit('player-ready-update', RoomManager.getPlayersSnapshot(room));
      emitRoomState(io, room);
    });

    socket.on('select-question-count', (count: QuestionCount) => {
      const room = RoomManager.findRoomByPlayer(socket.id);
      if (!room) { socket.emit('room-error', '你不在任何房间中'); return; }
      if (room.status !== 'readying') {
        emitRoomStateTo(socket, room);
        return;
      }
      if (!RoomManager.selectQuestionCount(room, count)) {
        socket.emit('room-error', '题目数量只能选择10、20或30题');
        return;
      }
      io.to(room.id).emit('question-count-selected', count);
      io.to(room.id).emit('player-ready-update', RoomManager.getPlayersSnapshot(room));
      emitRoomState(io, room);
    });

    socket.on('player-ready', () => {
      const room = RoomManager.findRoomByPlayer(socket.id);
      if (!room) { socket.emit('room-error', '你不在任何房间中'); return; }
      if (room.status !== 'readying' || !room.players[1]) {
        emitRoomStateTo(socket, room);
        return;
      }
      const playerIndex = room.players[0]?.id === socket.id ? 0 : 1;
      const bothReady = RoomManager.playerReady(room, playerIndex);
      io.to(room.id).emit('player-ready-update', RoomManager.getPlayersSnapshot(room));
      emitRoomState(io, room);
      if (bothReady) {
        const loaded = RoomManager.loadQuestions(room);
        if (!loaded) {
          io.to(room.id).emit('room-error', '题库为空，请先添加题目');
          room.players[0].ready = false;
          if (room.players[1]) room.players[1].ready = false;
          io.to(room.id).emit('player-ready-update', RoomManager.getPlayersSnapshot(room));
          emitRoomState(io, room);
          return;
        }
        emitRoomState(io, room);
        startCountdown(io, room.id);
      }
    });

    socket.on('submit-answer', (data: { questionIndex: number; optionIndex: number }) => {
      const room = RoomManager.findRoomByPlayer(socket.id);
      if (!room || room.status !== 'playing') return;
      const playerIndex = room.players[0]?.id === socket.id ? 0 : 1;
      const result = RoomManager.submitAnswer(room, playerIndex, data.questionIndex, data.optionIndex);
      if (!result.accepted) { socket.emit('answer-rejected', result.reason); return; }
      emitRoomState(io, room);
      if (!result.allAnswered) return;
      const answerResult = RoomManager.calculateQuestionResult(room, data.questionIndex);
      io.to(room.id).emit('answer-result', answerResult);
      emitRoomState(io, room);
      setTimeout(() => {
        const currentRoom = RoomManager.getRoom(room.id);
        if (!currentRoom || currentRoom.status !== 'playing' || currentRoom.currentQuestion !== data.questionIndex) return;
        const next = RoomManager.advanceToNextQuestion(currentRoom);
        if (next === null) {
          const gameOver = RoomManager.getGameOverPayload(currentRoom);
          io.to(currentRoom.id).emit('game-over', gameOver);
          emitRoomState(io, currentRoom);
          setTimeout(() => {
            const latestRoom = RoomManager.getRoom(currentRoom.id);
            if (latestRoom && latestRoom.status === 'finished') {
              RoomManager.deleteRoom(currentRoom.id);
              io.socketsLeave(currentRoom.id);
            }
          }, 5 * 60_000);
        } else {
          io.to(currentRoom.id).emit('next-question', { question: next.question, questionIndex: next.index, totalQuestions: next.total });
          emitRoomState(io, currentRoom);
        }
      }, 1500);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] 断开: ${socket.id}`);
      const room = RoomManager.handleDisconnect(socket.id);
      if (room) {
        const disconnectedIndex = room.players[0]?.id === socket.id ? 0 : 1;
        socket.to(room.id).emit('opponent-disconnected');
        setTimeout(() => {
          const currentRoom = RoomManager.getRoom(room.id);
          if (currentRoom && currentRoom.status !== 'finished') {
            if (currentRoom.players[disconnectedIndex]?.id !== socket.id) return;
            const winner = 1 - disconnectedIndex;
            io.to(room.id).emit('game-over', { ...RoomManager.getGameOverPayload(currentRoom), winner });
            RoomManager.deleteRoom(room.id);
          }
        }, DISCONNECT_TIMEOUT);
      }
    });
  });
}
```

注意：`startCountdown` 辅助函数和 `emitRoomState` / `emitRoomStateTo` 保持不变，在文件底部保留。

- [ ] **Step 3: 重启 server 验证编译通过**

```bash
npm run dev:server
```

预期：无 TypeScript 错误。

- [ ] **Step 4: 提交**

```bash
git add server/src/socket/handlers.ts server/src/socket/roomManager.ts
git commit -m "feat: socket handlers use auth data, roomManager tracks userId and gameStartedAt"
```

---

### Task 9: 更新 HomePage — 使用 auth context

**Files:**
- Modify: `client/src/pages/HomePage.tsx`

- [ ] **Step 1: 替换 HomePage.tsx**

主要改动：
- 移除 `NAME_KEY`、`playerName` state 和 name input
- 用 `useAuth()` 获取用户名
- `emit('create-room')` 不再传 playerName
- `emit('join-room')` 只传 roomId
- 新增"我的战绩"入口链接
- 新增"退出登录"按钮

```typescript
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../contexts/AuthContext';
import { getMistakes } from '../utils/mistakes';

const STORAGE_KEY = 'quizpk_room';

interface SavedRoom {
  roomId: string;
  playerIndex: number;
}

function getSavedRoom(): SavedRoom | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearSavedRoom() {
  localStorage.removeItem(STORAGE_KEY);
}

export default function HomePage() {
  const { user, logout } = useAuth();
  const { connected, on, emit } = useSocket();
  const navigate = useNavigate();
  const [joining, setJoining] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const [savedRoom, setSavedRoom] = useState<SavedRoom | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [mistakeCount, setMistakeCount] = useState(() => getMistakes().length);

  useEffect(() => {
    const saved = getSavedRoom();
    if (saved) setSavedRoom(saved);
  }, []);

  useEffect(() => {
    const refreshMistakeCount = () => setMistakeCount(getMistakes().length);
    refreshMistakeCount();
    window.addEventListener('focus', refreshMistakeCount);
    return () => window.removeEventListener('focus', refreshMistakeCount);
  }, []);

  const handleCreate = () => {
    const cleanup = on('room-created', (data) => {
      cleanup();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ roomId: data.roomId, playerIndex: data.playerIndex }));
      navigate(`/game/${data.roomId}`, {
        state: {
          creator: true,
          playerIndex: data.playerIndex,
          players: data.players,
          roomState: data.state,
        },
      });
    });
    emit('create-room');
  };

  const handleJoin = () => {
    const trimmed = roomId.trim();
    if (trimmed.length !== 4 || !/^\d{4}$/.test(trimmed)) {
      setError('请输入4位数字房间号');
      return;
    }
    setError('');
    setJoining(true);

    const cleanupJoined = on('room-joined', (data) => {
      cleanupJoined();
      cleanupError();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ roomId: data.roomId, playerIndex: data.playerIndex }));
      navigate(`/game/${data.roomId}`, {
        state: {
          joined: true,
          playerIndex: data.playerIndex,
          players: data.players,
          roomState: data.state,
        },
      });
    });

    const cleanupError = on('room-error', (msg) => {
      cleanupError();
      cleanupJoined();
      setError(msg);
      setJoining(false);
    });

    emit('join-room', { roomId: trimmed });
  };

  const handleReconnect = () => {
    if (!savedRoom) return;
    setReconnecting(true);
    setError('');

    const cleanupReconnected = on('reconnected', (data) => {
      cleanupReconnected();
      cleanupError();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ roomId: data.roomId, playerIndex: data.playerIndex }));
      navigate(`/game/${data.roomId}`, {
        state: {
          reconnected: true,
          playerIndex: data.playerIndex,
          players: data.players,
          roomState: data.state,
          phase: data.phase,
        },
      });
    });

    const cleanupError = on('room-error', (msg) => {
      cleanupError();
      cleanupReconnected();
      clearSavedRoom();
      setSavedRoom(null);
      setError(msg);
      setReconnecting(false);
    });

    emit('reconnect-room', { roomId: savedRoom.roomId, playerIndex: savedRoom.playerIndex });
  };

  const handleDismissSaved = () => {
    clearSavedRoom();
    setSavedRoom(null);
  };

  const handleMistakePractice = () => {
    if (mistakeCount === 0) return;
    navigate('/mistakes', { state: { start: true } });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 bg-clip-text text-transparent mb-3">
          🧠 知识PK大作战
        </h1>
        <p className="text-base sm:text-lg text-gray-500">两人对战，抢答PK，谁才是知识之王？</p>
        <p className="text-sm text-purple-400 mt-1">👋 {user?.nickname}</p>
      </div>

      {!connected && (
        <div className="mb-8 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-sm">
          正在连接服务器...
        </div>
      )}

      {savedRoom && (
        <div className="mb-6 w-full max-w-xs bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 text-center">
          <p className="text-sm text-purple-700 mb-3">你有一局未完成的游戏</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={handleReconnect}
              disabled={!connected || reconnecting}
              className="px-5 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {reconnecting ? '⏳ 重连中...' : '🔄 回到房间'}
            </button>
            <button
              onClick={handleDismissSaved}
              className="px-5 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm"
            >
              放弃
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-5">
        <div className="w-full max-w-xs bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
          <div className="flex items-center justify-between gap-2">
            <Link
              to="/mistakes"
              className="flex-1 min-w-0 px-4 py-2.5 bg-gray-50 text-gray-700 font-bold rounded-xl hover:bg-purple-50 hover:text-purple-600 transition-colors"
            >
              错题回顾
              <span className="ml-2 text-xs text-gray-400">{mistakeCount}题</span>
            </Link>
            <button
              onClick={handleMistakePractice}
              disabled={mistakeCount === 0}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              错题考试
            </button>
          </div>
        </div>

        <div className="w-full max-w-xs flex gap-3">
          <Link
            to="/solo"
            className="flex-1 px-6 py-3.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 block text-center"
          >
            📝 单人答题
          </Link>
          <Link
            to="/history"
            className="flex-1 px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 block text-center"
          >
            📊 战绩
          </Link>
        </div>

        <button
          onClick={handleCreate}
          disabled={!connected}
          className="w-full max-w-xs px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🎮 创建房间
        </button>

        <div className="text-gray-400 text-sm">— 或者 —</div>

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
              className="flex-1 min-w-0 px-3 sm:px-4 py-3 text-center text-xl sm:text-2xl font-mono tracking-[0.3em] sm:tracking-[0.5em] border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
            <button
              onClick={handleJoin}
              disabled={joining || roomId.length !== 4}
              className="px-4 sm:px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-base sm:text-lg font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {joining ? '⏳' : '🚪 加入'}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-500 text-center">{error}</p>}
        </div>
      </div>

      <div className="mt-10 flex items-center gap-4">
        <Link
          to="/admin"
          className="text-gray-400 hover:text-purple-500 transition-colors text-sm flex items-center gap-1"
        >
          ⚙️ 题库管理
        </Link>
        <button
          onClick={logout}
          className="text-gray-400 hover:text-red-500 transition-colors text-sm flex items-center gap-1"
        >
          🚪 退出
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add client/src/pages/HomePage.tsx
git commit -m "feat: HomePage uses auth context, removes name input, adds history link"
```

---

### Task 10: 更新 GamePage — 移除 playerName 依赖

**Files:**
- Modify: `client/src/pages/GamePage.tsx`

- [ ] **Step 1: 更新 GamePage 中 join-room 事件调用**

在 `GamePage.tsx` 中，找到 `emit('join-room', { roomId, playerName: '玩家B' });` 这行（约第 152 行），替换为：

```typescript
emit('join-room', { roomId });
```

- [ ] **Step 2: 移除 playerName 相关的 localStorage 操作**

在 `GamePage.tsx` 中，`STORAGE_KEY` 的 localStorage 操作中移除 `playerName` 字段。当前文件中 `STORAGE_KEY` 只用于清除（`clearSavedRoom` 函数），不需要改动——它已经在 HomePage 中处理了。

确认 `GamePage.tsx` 不再有 `playerName` 相关逻辑。如果 `GamePage` 中没有其他 `playerName` 引用（因为 `SavedRoom` 类型已在 HomePage 中更新为不含 playerName），则无需额外改动。

- [ ] **Step 3: 提交**

```bash
git add client/src/pages/GamePage.tsx
git commit -m "fix: GamePage join-room event matches updated ClientEvents type"
```

---

## Phase 2: 题目批量导入

### Task 11: 安装 papaparse + 创建导入 API

**Files:**
- Modify: `client/package.json` (npm install)
- Modify: `server/src/routes/api.ts`

- [ ] **Step 1: 安装 papaparse**

```bash
cd /Users/jinyn/work/srdt/client && npm install papaparse && npm install -D @types/papaparse
```

- [ ] **Step 2: 在 api.ts 中添加批量导入端点**

在 `server/src/routes/api.ts` 末尾（`POST /api/solo/questions` 路由之后）添加：

```typescript
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
```

- [ ] **Step 3: 提交**

```bash
git add client/package.json client/package-lock.json server/src/routes/api.ts
git commit -m "feat: add papaparse dependency and batch import API endpoint"
```

---

### Task 12: 创建 ImportPreviewModal 组件

**Files:**
- Create: `client/src/components/admin/ImportPreviewModal.tsx`

- [ ] **Step 1: 创建 ImportPreviewModal**

```typescript
import { useState, useRef } from 'react';
import Papa from 'papaparse';

interface ParsedQuestion {
  type: string;
  content: string;
  options: string[];
  answer: number;
}

interface ParsedRow {
  index: number;
  question: ParsedQuestion | null;
  error: string | null;
}

interface ImportPreviewModalProps {
  onImport: (questions: ParsedQuestion[]) => Promise<void>;
  onClose: () => void;
}

export default function ImportPreviewModal({ onImport, onClose }: ImportPreviewModalProps) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const validRows = rows.filter(r => r.question);
  const invalidRows = rows.filter(r => r.error);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete(results) {
        const parsed: ParsedRow[] = (results.data as Record<string, string>[]).map((row, i) => {
          const content = row['题目内容']?.trim();
          const optA = row['选项A']?.trim();
          const optB = row['选项B']?.trim();
          const optC = row['选项C']?.trim();
          const optD = row['选项D']?.trim();
          const answerStr = row['正确答案']?.trim();
          const type = row['类型']?.trim();

          if (!content) return { index: i + 1, question: null, error: '题目内容为空' };
          if (!optA || !optB) return { index: i + 1, question: null, error: '至少需要选项A和选项B' };

          const options = [optA, optB];
          if (optC) options.push(optC);
          if (optD) options.push(optD);

          const answer = parseInt(answerStr, 10);
          if (isNaN(answer) || answer < 0 || answer >= options.length) return { index: i + 1, question: null, error: `正确答案必须是 0-${options.length - 1}` };
          if (type !== 'single' && type !== 'judge') return { index: i + 1, question: null, error: '类型必须是 single 或 judge' };

          return { index: i + 1, question: { type, content, options, answer }, error: null };
        });
        setRows(parsed);
        setResult(null);
      },
    });
  };

  const handleImport = async () => {
    const questions = validRows.map(r => r.question!);
    setImporting(true);
    try {
      await onImport(questions);
      setResult({ success: questions.length, failed: invalidRows.length });
    } catch {
      setResult({ success: 0, failed: questions.length });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-lg">📥 批量导入题目</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {rows.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 mb-4">请选择 CSV 文件（UTF-8 编码）</p>
              <p className="text-xs text-gray-400 mb-4">格式：题目内容,选项A,选项B,选项C,选项D,正确答案,类型</p>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
              <button onClick={() => fileRef.current?.click()} className="px-6 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600">
                选择文件
              </button>
            </div>
          ) : result ? (
            <div className="text-center py-10">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-lg font-medium">导入完成</p>
              <p className="text-gray-500">成功 {result.success} 题{result.failed > 0 ? `，失败 ${result.failed} 题` : ''}</p>
              <button onClick={onClose} className="mt-4 px-6 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600">
                关闭
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-4 mb-3 text-sm">
                <span className="text-green-600">✅ 有效 {validRows.length} 题</span>
                {invalidRows.length > 0 && <span className="text-red-500">❌ 无效 {invalidRows.length} 题</span>}
              </div>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">题目</th>
                      <th className="px-3 py-2 text-left">选项数</th>
                      <th className="px-3 py-2 text-left">类型</th>
                      <th className="px-3 py-2 text-left">状态</th>
                    </tr>
                  </thead>
                  <tbody className="max-h-64 overflow-y-auto">
                    {rows.map(row => (
                      <tr key={row.index} className={row.error ? 'bg-red-50' : 'bg-green-50/50'}>
                        <td className="px-3 py-2 text-gray-400">{row.index}</td>
                        <td className="px-3 py-2 max-w-[200px] truncate">{row.question?.content || '-'}</td>
                        <td className="px-3 py-2">{row.question?.options.length ?? '-'}</td>
                        <td className="px-3 py-2">{row.question?.type ?? '-'}</td>
                        <td className="px-3 py-2">
                          {row.error ? <span className="text-red-500 text-xs">{row.error}</span> : <span className="text-green-600">✓</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {rows.length > 0 && !result && (
          <div className="p-4 border-t flex justify-end gap-2">
            <button onClick={() => { setRows([]); }} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200">
              重新选择
            </button>
            <button
              onClick={handleImport}
              disabled={importing || validRows.length === 0}
              className="px-6 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 disabled:opacity-50"
            >
              {importing ? '⏳ 导入中...' : `确认导入 ${validRows.length} 题`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add client/src/components/admin/ImportPreviewModal.tsx
git commit -m "feat: add ImportPreviewModal component for CSV import"
```

---

### Task 13: 更新 AdminPage — 集成导入按钮

**Files:**
- Modify: `client/src/pages/AdminPage.tsx`

- [ ] **Step 1: 添加 import modal state 和 ImportPreviewModal**

在 `AdminPage.tsx` 顶部添加 import：

```typescript
import ImportPreviewModal from '../components/admin/ImportPreviewModal';
```

在 `AdminPage` 组件内，找到 `const [mobileTab, setMobileTab]` 那行之后，添加 state：

```typescript
const [showImport, setShowImport] = useState(false);
```

添加导入处理函数（在 `handleDeleteQuestion` 之后）：

```typescript
const handleImport = async (questions: { type: string; content: string; options: string[]; answer: number }[]) => {
  const res = await fetch(`${API_BASE}/quizzes/${selectedQuiz}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questions }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || '导入失败');
  }
  if (selectedQuiz) loadQuestions(selectedQuiz);
  loadQuizzes();
};
```

在 `questionPanel` 的 `+ 添加题目` 按钮之前（`{!showForm ? (` 之前），添加导入按钮：

```tsx
{!showForm && (
  <button
    onClick={() => setShowImport(true)}
    className="w-full py-3 border-2 border-dashed border-teal-200 text-teal-500 rounded-xl hover:border-teal-400 hover:text-teal-600 transition-colors text-sm sm:text-base mb-3"
  >
    📥 批量导入（CSV）
  </button>
)}
```

在组件 return 的最末尾（`</div>` 关闭标签之前），添加 modal：

```tsx
{showImport && selectedQuiz && (
  <ImportPreviewModal
    onImport={handleImport}
    onClose={() => setShowImport(false)}
  />
)}
```

- [ ] **Step 2: 提交**

```bash
git add client/src/pages/AdminPage.tsx
git commit -m "feat: integrate CSV import button into AdminPage"
```

---

## Phase 3: 用户战绩历史

### Task 14: 记录游戏结果 — game-over 时写入 game_records

**Files:**
- Modify: `server/src/socket/handlers.ts`
- Modify: `server/src/socket/roomManager.ts`

- [ ] **Step 1: 在 roomManager.ts 添加 recordGameResult 函数**

在 `roomManager.ts` 文件末尾（`getRoomsInfo` 函数之后）添加：

```typescript
export function recordGameResult(room: Room): void {
  if (!room.gameStartedAt) return;
  const p1 = room.players[0];
  const p2 = room.players[1];
  if (!p1 || !p2) return;

  const [s1, s2] = room.scores;
  let winner: number | null;
  if (s1 > s2) winner = 0; else if (s2 > s1) winner = 1; else winner = null;

  const db = getDb();
  db.prepare(`
    INSERT INTO game_records (room_id, player1_id, player2_id, player1_name, player2_name, player1_score, player2_score, winner, question_count, quiz_id, answers, duration_seconds)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    room.id,
    p1.userId, p2.userId,
    p1.name, p2.name,
    s1, s2,
    winner,
    room.questions.length,
    room.quizId,
    JSON.stringify(room.answers),
    Math.round((Date.now() - room.gameStartedAt) / 1000),
  );
}
```

- [ ] **Step 2: 在 handlers.ts 的 game-over 逻辑中调用 recordGameResult**

在 `handlers.ts` 的 `submit-answer` 事件处理器中，找到 `const gameOver = RoomManager.getGameOverPayload(currentRoom);` 这行（约第 155 行），在其之前添加：

```typescript
          RoomManager.recordGameResult(currentRoom);
```

同样，在 `disconnect` 事件处理器中，找到 `io.to(room.id).emit('game-over', { ...RoomManager.getGameOverPayload(currentRoom), winner });` 这行（约第 184 行），在其之前添加：

```typescript
            RoomManager.recordGameResult(currentRoom);
```

- [ ] **Step 3: 提交**

```bash
git add server/src/socket/handlers.ts server/src/socket/roomManager.ts
git commit -m "feat: record game results to game_records table on game-over"
```

---

### Task 15: 添加战绩历史和统计 API

**Files:**
- Modify: `server/src/routes/api.ts`
- Modify: `server/src/middleware/auth.ts` (确保 requireAuth 已导出)

- [ ] **Step 1: 在 api.ts 顶部导入 requireAuth**

在 `server/src/routes/api.ts` 顶部添加：

```typescript
import { requireAuth } from '../middleware/auth.js';
```

- [ ] **Step 2: 在 api.ts 末尾添加战绩端点**

```typescript
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
```

- [ ] **Step 3: 提交**

```bash
git add server/src/routes/api.ts
git commit -m "feat: add GET /me/history and GET /me/stats API endpoints"
```

---

### Task 16: 创建 HistoryPage 战绩页面

**Files:**
- Create: `client/src/pages/HistoryPage.tsx`

- [ ] **Step 1: 创建 HistoryPage**

```typescript
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { GameRecordItem, UserStats } from '../../../shared/types';

const TOKEN_KEY = 'quizpk_token';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function HistoryPage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [records, setRecords] = useState<GameRecordItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/pk/api/me/stats', { headers: authHeaders() })
      .then(res => res.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/pk/api/me/history?page=${page}`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => {
        setRecords(prev => page === 1 ? data.records : [...prev, ...data.records]);
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  const hasMore = records.length < total;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-gray-800">📊 我的战绩</h1>
          <Link to="/" className="text-purple-500 hover:text-purple-700 text-sm font-medium">← 返回首页</Link>
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-xl p-3 shadow-sm text-center">
              <div className="text-2xl font-black text-purple-600">{stats.totalGames}</div>
              <div className="text-xs text-gray-400">总场次</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm text-center">
              <div className="text-2xl font-black text-green-600">{stats.winRate}%</div>
              <div className="text-xs text-gray-400">胜率</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm text-center">
              <div className="text-2xl font-black text-blue-600">{stats.avgScore}</div>
              <div className="text-xs text-gray-400">场均得分</div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {records.map(r => (
            <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    r.result === 'win' ? 'bg-green-100 text-green-600' :
                    r.result === 'lose' ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {r.result === 'win' ? '胜利' : r.result === 'lose' ? '失败' : '平局'}
                  </span>
                  <span className="text-sm text-gray-500">VS {r.opponentName}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(r.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-lg font-black">
                  <span className={r.myScore > r.opponentScore ? 'text-green-600' : 'text-gray-700'}>{r.myScore}</span>
                  <span className="text-gray-300 mx-2">:</span>
                  <span className={r.opponentScore > r.myScore ? 'text-red-500' : 'text-gray-700'}>{r.opponentScore}</span>
                </div>
                <div className="text-xs text-gray-400">
                  {r.questionCount} 题 · {Math.floor(r.durationSeconds / 60)}分{r.durationSeconds % 60}秒
                </div>
              </div>
            </div>
          ))}

          {records.length === 0 && !loading && (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🎮</div>
              <p className="text-gray-400">还没有对战记录</p>
              <Link to="/" className="text-purple-500 hover:text-purple-700 text-sm mt-2 inline-block">去对战一局 →</Link>
            </div>
          )}
        </div>

        {hasMore && (
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={loading}
            className="w-full mt-4 py-3 bg-white text-gray-600 rounded-xl shadow-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? '加载中...' : '加载更多'}
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add client/src/pages/HistoryPage.tsx
git commit -m "feat: add HistoryPage with stats cards and battle record list"
```

---

### Task 17: 端到端验证

**Files:** 无新文件

- [ ] **Step 1: 启动后端和前端**

```bash
# 终端 1: 后端
cd /Users/jinyn/work/srdt && npm run dev:server

# 终端 2: 前端
cd /Users/jinyn/work/srdt && npm run dev:client
```

- [ ] **Step 2: 验证登录流程**

1. 打开 http://localhost:3000/pk/ → 应自动跳转到 /login
2. 输入昵称 → 点击"进入游戏" → 跳转到首页，显示昵称
3. 刷新页面 → 应保持登录状态（不跳转到 /login）
4. 点击"退出" → 跳转到登录页

- [ ] **Step 3: 验证双人 PK**

1. 浏览器 A 创建房间 → 浏览器 B（不同用户名）输入房间号加入
2. 完成一局对战 → 结束后返回首页
3. 点击"战绩" → 看到刚才的对战记录

- [ ] **Step 4: 验证批量导入**

1. 准备一个 CSV 文件，内容如下：

```csv
题目内容,选项A,选项B,选项C,选项D,正确答案,类型
测试导入题1,A,B,C,D,0,single
测试导入题2,对,错,,,1,judge
```

2. 进入题库管理 → 选择一个题库 → 点击"批量导入（CSV）"
3. 选择 CSV 文件 → 预览显示 2 条有效记录 → 点击"确认导入"
4. 导入成功后，题目列表刷新显示新题目

- [ ] **Step 5: 最终提交**

```bash
git add -A
git commit -m "feat: complete user login, batch import, and battle history"
```
