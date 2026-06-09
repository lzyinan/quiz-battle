# 🏆 知识PK大作战 — Quiz Battle Arena

一款实时多人对战答题游戏。创建房间，邀请好友，用知识一决高下！

> **在线体验**：支持双人对战、单人练习、错题回顾等多种模式

---

## ✨ 功能亮点

### 🎮 双人实时对战
- 输入 **4 位房间码** 即可快速匹配
- 实时 WebSocket 通信，抢答机制 — 先选先答
- 答对 +1 分，答错对手 +1 分
- 支持 10 / 20 / 30 题对战
- 断线自动重连，不怕网络波动

### 📖 单人练习模式
- 自选题库或随机出题
- 15 秒限时作答
- 速度奖励：5 秒内 +5 分，10 秒内 +2 分
- **自动记录错题**，支持错题回顾练习

### 🔧 管理后台
- 题库 CRUD 管理（增删改查）
- 支持单选题 & 判断题
- 移动端友好的管理界面
- 题目数据统计

### 💻 技术特性
- 🔄 Socket.IO 实时双向通信
- 📱 响应式设计，适配桌面端 & 移动端
- 💾 SQLite 轻量持久化，零配置启动
- 🛡️ 完善的断线重连 & 房间状态恢复
- 📦 Monorepo 架构，前后端类型共享

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 18 · TypeScript · Vite · Tailwind CSS |
| **后端** | Express · TypeScript · Socket.IO |
| **数据库** | SQLite (better-sqlite3) |
| **架构** | npm Workspaces Monorepo · 共享类型包 |

---

## 📂 项目结构

```
quiz-battle/
├── client/                     # React 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── game/           # 对战游戏组件 (QuestionCard, ScoreBoard...)
│   │   │   ├── room/           # 房间管理组件 (RoomLobby)
│   │   │   └── solo/           # 单人模式组件 (SoloLobby, SoloScoreBar...)
│   │   ├── pages/              # 页面组件 (HomePage, GamePage, SoloGamePage...)
│   │   ├── hooks/              # 自定义 Hooks (useSocket)
│   │   └── utils/              # 工具函数 (api, mistakes)
│   └── vite.config.ts
├── server/                     # Express 后端
│   ├── src/
│   │   ├── index.ts            # 服务入口
│   │   ├── socket/             # Socket.IO 处理器
│   │   │   ├── handlers.ts     # 事件处理
│   │   │   └── roomManager.ts  # 房间状态管理
│   │   ├── routes/api.ts       # REST API
│   │   ├── db/                 # 数据库 & 迁移
│   │   └── seed.ts             # 示例数据种子
│   └── package.json
├── shared/                     # 前后端共享类型
│   └── types.ts
└── package.json                # Workspace 根配置
```

---

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18
- **npm** >= 9

### 安装 & 运行

```bash
# 1. 克隆项目
git clone https://github.com/lzyinan/quiz-battle.git
cd quiz-battle

# 2. 安装依赖（npm workspaces 自动安装所有子包）
npm install

# 3. 启动开发服务器
# 终端 1 — 启动后端 (http://localhost:3001)
npm run dev:server

# 终端 2 — 启动前端 (http://localhost:5173)
npm run dev:client
```

打开浏览器访问 `http://localhost:5173` 即可开始使用。

### 生产构建

```bash
# 构建前端
npm run build

# 构建后端
npm run build:server

# 启动生产服务
npm start
```

---

## 📡 API 与通信

### REST API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/quizzes` | 获取所有题库 |
| `POST` | `/api/quizzes` | 创建题库 |
| `PUT` | `/api/quizzes/:id` | 更新题库 |
| `DELETE` | `/api/quizzes/:id` | 删除题库 |
| `GET` | `/api/quizzes/:id/questions` | 获取题库下所有题目 |
| `POST` | `/api/quizzes/:id/questions` | 添加题目 |
| `POST` | `/api/solo/questions` | 获取单人练习题目 |

### WebSocket 事件 (Socket.IO)

**客户端 → 服务端**

| 事件 | 说明 |
|------|------|
| `create-room` | 创建对战房间 |
| `join-room` | 加入房间 |
| `reconnect-room` | 断线重连 |
| `select-quiz` | 选择题库 |
| `select-question-count` | 选择题目数量 |
| `player-ready` | 玩家准备 |
| `submit-answer` | 提交答案 |

**服务端 → 客户端**

| 事件 | 说明 |
|------|------|
| `room-state` | 房间状态同步 |
| `countdown` | 3-2-1 倒计时 |
| `next-question` | 下一题 |
| `answer-result` | 答题结果 |
| `game-over` | 游戏结束 & 最终得分 |
| `opponent-disconnected` | 对手断线通知 |

---

## 🎯 游戏流程

```
创建/加入房间 → 选择题库 → 选择题数 → 双方准备
        ↓
   3-2-1 倒计时 → 出题 → 抢答 → 显示结果 → 下一题
        ↓
   全部答完 → 显示最终得分 & 胜负 → 再来一局
```

---

## 🤝 参与贡献

欢迎各种形式的贡献！

1. **Fork** 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 发起 **Pull Request**

### 开发约定

- 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范
- 前后端共享类型定义在 `shared/types.ts` 中
- 新增页面放在 `client/src/pages/`，可复用组件放在 `client/src/components/`

---

## 📄 许可证

[MIT License](LICENSE)

---

## 🙏 致谢

- [React](https://react.dev/) — UI 框架
- [Socket.IO](https://socket.io/) — 实时通信
- [Tailwind CSS](https://tailwindcss.com/) — 样式框架
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — SQLite 驱动
