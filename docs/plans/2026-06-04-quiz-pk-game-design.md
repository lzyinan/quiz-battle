# 双人答题PK游戏 — 设计文档

> 日期：2026-06-04
> 状态：已批准

## 概述

一个双人实时答题PK网页游戏。两名玩家通过4位房间号加入同一房间，选择题库后进行10道题的抢答对决。先答题者判断对错——答对给自己加1分，答错给对方加1分。10道题结束后判断输赢或平局。

包含独立的后台题库管理系统，支持题库和题目的增删改查。题目类型为单选题和判断题。

## 技术选型

| 层面 | 技术 | 原因 |
|------|------|------|
| 前端框架 | React 18 + TypeScript | 组件化、类型安全 |
| 前端构建 | Vite | 开发体验好，HMR 快 |
| 前端样式 | Tailwind CSS + CSS 动画 | 快速实现活泼竞赛风 UI |
| 后端框架 | Express + TypeScript | 轻量、灵活 |
| 实时通信 | Socket.IO | 房间管理、断线重连、广播 |
| 数据库 | SQLite + better-sqlite3 | 同步 API、零配置 |
| 包管理 | npm workspaces | 单仓库管理 |

## 项目结构

```
srdt/
├── client/                      # React 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── game/            # 游戏组件（CountdownOverlay, QuestionCard, ScoreBoard, ResultScreen, ReadyButton）
│   │   │   ├── room/            # 房间组件（CreateRoom, JoinRoom, RoomLobby）
│   │   │   ├── admin/           # 管理后台组件（QuizManager, QuestionEditor）
│   │   │   └── common/          # 通用组件
│   │   ├── pages/               # 页面（HomePage, GamePage, AdminPage）
│   │   ├── hooks/               # useSocket 等
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── server/                      # Express 后端
│   ├── src/
│   │   ├── index.ts             # 入口
│   │   ├── socket/              # Socket.IO 事件处理
│   │   │   ├── handlers.ts      # 事件处理器
│   │   │   └── roomManager.ts   # 房间状态管理（内存）
│   │   ├── routes/              # REST API 路由
│   │   │   ├── quizzes.ts       # 题库 CRUD
│   │   │   └── questions.ts     # 题目 CRUD
│   │   ├── db/                  # SQLite 初始化和迁移
│   │   │   ├── index.ts
│   │   │   └── migrations.ts
│   │   └── types.ts
│   ├── tsconfig.json
│   └── package.json
├── shared/                      # 共享类型
│   └── types.ts
└── package.json                 # 根级 workspace 配置
```

## 数据模型

```sql
CREATE TABLE quizzes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE questions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id     INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK(type IN ('single', 'judge')),
  content     TEXT NOT NULL,
  options     TEXT NOT NULL,   -- JSON 数组
  answer      INTEGER NOT NULL, -- 正确答案索引（0-based）
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

判断题统一用单选题格式：`type: 'judge'` 时 options 为 `["正确", "错误"]`，answer 为 0 或 1。

## 游戏流程

```
首页 → 创建/加入房间 → 房间大厅(选题库) → 双方准备 → 3-2-1倒计时 → 答题PK → 结果页
```

### 房间状态（服务端内存）

```typescript
interface Room {
  id: string;                    // 4位房间号
  players: [Player, Player?];    // 最多2人
  status: 'waiting' | 'readying' | 'countdown' | 'playing' | 'finished';
  quizId: number | null;         // 选中的题库ID，null=随机
  questions: Question[];         // 本局题目
  currentQuestion: number;       // 当前题号(0-based)
  scores: [number, number];      // 双方分数
  lockedBy: number | null;       // 当前题目被谁抢到
  answers: Answer[];             // 答题记录
}
```

### Socket.IO 事件

| 事件 | 方向 | 描述 |
|------|------|------|
| `create-room` | 客户端→服务端 | 创建房间，返回房间号 |
| `join-room` | 客户端→服务端 | 加入房间 |
| `select-quiz` | 客户端→服务端 | 选择题库 |
| `player-ready` | 客户端→服务端 | 玩家准备 |
| `start-countdown` | 服务端→客户端 | 开始3-2-1倒计时 |
| `next-question` | 服务端→客户端 | 推送下一题 |
| `submit-answer` | 客户端→服务端 | 抢答+提交答案 |
| `answer-result` | 服务端→客户端 | 广播答题结果 |
| `game-over` | 服务端→客户端 | 广播游戏结束 |

### 抢答机制（一步抢答）

1. 双方同时看到题目和选项
2. 任一玩家点击选项 → `submit-answer`
3. 服务端检查 `lockedBy`：
   - 未被抢 → 锁定，判断对错，答对+1分，答错对方+1分
   - 已被抢 → 返回"慢了一步"
4. 广播结果，1.5秒后进入下一题

## 页面路由与 UI

| 路由 | 页面 | 描述 |
|------|------|------|
| `/` | 首页 | 创建/加入房间、管理后台入口 |
| `/game/:roomId` | 游戏页 | 大厅→倒计时→答题→结果 |
| `/admin` | 管理后台 | 题库和题目管理 |

### UI 风格：活泼竞赛风

动画效果：
- 倒计时 3-2-1：大号数字缩放+震动
- 抢答成功：选项闪光+"⚡ 抒住了！"
- 答对：绿色脉冲+"+1"飘字
- 答错：红色抖动+分数飞向对方
- 游戏结束：彩纸动画+胜者皇冠

## REST API

```
GET    /api/quizzes               → 所有题库（含题目数量）
POST   /api/quizzes               → 创建题库
PUT    /api/quizzes/:id           → 更新题库
DELETE /api/quizzes/:id           → 删除题库
GET    /api/quizzes/:id/questions → 题库下所有题目
POST   /api/quizzes/:id/questions → 创建题目
PUT    /api/questions/:id         → 更新题目
DELETE /api/questions/:id         → 删除题目
GET    /api/quizzes/:id/stats     → 题库统计
```

## 错误处理与边界情况

- **断线重连**：等待30秒，超时判负。通过 localStorage 存 roomId + playerToken 恢复身份
- **房间已满**：第3人加入返回错误提示
- **题目不足10道**：用全部可用题目，显示实际题数
- **网络竞态**：服务端 lockedBy 原子判断，仅第一个有效
- **空房间超时**：5分钟无人加入自动清理
- **管理后台**：无认证，通过 URL 路径访问，适合内网/个人使用
