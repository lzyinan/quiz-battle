# 题目批量导入 + 简易用户登录 + 用户战绩历史 — 功能设计

> 日期：2026-06-09
> 状态：已批准

---

## 概览

为 Quiz Battle Arena 新增三个功能，按依赖关系排序实施：

1. **简易用户登录**（基础层，其他功能依赖）
2. **题目批量导入**（管理后台增强）
3. **用户战绩历史**（依赖用户系统）

---

## 功能一：简易用户登录（纯昵称）

### 数据层

新增 `users` 表：

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_users_token ON users(token);
```

### 登录流程

```
用户打开网站 → 检查 cookie 有无 token
  ├── 有 token → GET /api/me → 验证通过 → 直接进入首页
  └── 无 token → 显示登录页 → 输入昵称 → POST /api/auth/login
                    ├── 昵称已存在 → 返回该用户 + 新 token
                    └── 昵称不存在 → 创建用户 → 返回 token
                  → 写入 cookie (HttpOnly, 7天) → 跳转首页
```

**设计决策**：同一昵称可重复登录（每次返回新 token），不防冒充，适合内部小游戏。

### API

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/auth/login` | `{ nickname }` → `{ user, token }` |
| `GET` | `/api/me` | 通过 cookie token 获取当前用户信息 |
| `POST` | `/api/auth/logout` | 清除 cookie |

### 前端改动

- 新增 `LoginPage.tsx`：昵称输入框 + 登录按钮
- `App.tsx` 路由加登录守卫：未登录跳转 `/login`
- 新增 `AuthContext`：登录后 user 存入 Context，全局可用
- Socket 事件增加 `userId` 字段

### 不做

- 密码、手机号、头像、个人资料编辑、JWT、注册/登录分离

---

## 功能二：题目批量导入（CSV）

### CSV 格式

```csv
题目内容,选项A,选项B,选项C,选项D,正确答案,类型
中国的首都是哪里？,北京,上海,广州,深圳,0,single
太阳从西边升起,对,错,,1,judge
```

| 字段 | 必填 | 说明 |
|------|------|------|
| 题目内容 | 是 | 题干文本 |
| 选项A ~ 选项D | 至少2个 | 判断题只填 A、B |
| 正确答案 | 是 | 0-indexed：0=A, 1=B, 2=C, 3=D |
| 类型 | 是 | `single` 或 `judge` |

### 流程

```
AdminPage 题库详情 → "批量导入"按钮 → 选择 CSV → 前端 PapaParse 解析预览
→ 校验：错误行标红 → "确认导入" → POST /api/quizzes/:id/import → 刷新列表
```

CSV 在前端解析为 JSON 数组后提交，服务端接口接收 JSON（未来可复用）。

### API

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/quizzes/:id/import` | `{ questions: QuestionInput[] }` → `{ success, failed, errors[] }` |

### 数据库

复用 `questions` 表，用 `better-sqlite3` 事务批量 INSERT：

```typescript
const insertMany = db.transaction((questions: QuestionInput[]) => {
  const stmt = db.prepare('INSERT INTO questions (...) VALUES (?, ?, ?, ?, ?)');
  for (const q of questions) stmt.run(...);
});
```

### 前端改动

- `AdminPage.tsx` 题库详情新增"批量导入"按钮
- 新增 `ImportPreviewModal` 组件：文件选择 → 表格预览 → 确认导入

### 不做

- 服务端文件上传、Excel 支持、模板下载、导入去重

---

## 功能三：用户战绩历史

### 数据层

新增 `game_records` 表：

```sql
CREATE TABLE game_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL,
  player1_id INTEGER NOT NULL REFERENCES users(id),
  player2_id INTEGER NOT NULL REFERENCES users(id),
  player1_name TEXT NOT NULL,
  player2_name TEXT NOT NULL,
  player1_score INTEGER NOT NULL DEFAULT 0,
  player2_score INTEGER NOT NULL DEFAULT 0,
  winner INTEGER,
  question_count INTEGER NOT NULL,
  quiz_id INTEGER,
  answers TEXT NOT NULL,
  duration_seconds INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_game_records_player1 ON game_records(player1_id);
CREATE INDEX idx_game_records_player2 ON game_records(player2_id);
```

冗余存 `player_name`：用户改名后历史仍显示当时名字。

### 记录时机

游戏结束（game-over）→ 服务端 `handlers.ts` 从 room 提取双方信息 → 从 socket 取 userId → INSERT → 删除房间（现有逻辑不变）。

### API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/me/history?page=1` | 当前用户战绩列表（分页，每页20条） |
| `GET` | `/api/me/stats` | 统计概览 |

**history 响应**：

```json
{
  "records": [{
    "id": 1,
    "opponentName": "小明",
    "myScore": 7,
    "opponentScore": 5,
    "result": "win",
    "questionCount": 10,
    "durationSeconds": 180,
    "createdAt": "2026-06-09T14:30:00"
  }],
  "total": 42,
  "page": 1
}
```

**stats 响应**：

```json
{
  "totalGames": 42,
  "wins": 25,
  "losses": 15,
  "draws": 2,
  "winRate": 59.5,
  "totalScore": 280,
  "avgScore": 6.7
}
```

### 前端改动

- 新增 `HistoryPage.tsx`（`/history` 路由）：
  - 顶部统计卡片：总场次、胜率、平均得分
  - 战绩列表：对手名、比分、胜负标签、日期
  - "加载更多"按钮分页
- 首页加"📊 我的战绩"入口链接

### Socket 层改动

登录后 emit `auth` 事件关联 userId：

```
客户端 emit('auth', { userId }) → 服务端 socket.userId = userId
游戏结束 → 取双方 socket.userId → 写入 game_records
```

### 不做

- 对局回放详情页（answers 字段为未来预留）、全局排行榜、单人练习战绩、战绩分享图片
