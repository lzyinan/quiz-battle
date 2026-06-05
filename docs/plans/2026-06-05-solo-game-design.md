# 单人答题功能设计文档

## 概述

为现有的双人答题对战游戏增加独立的单人答题模式。玩家无需对手即可答题，支持选择题库和随机抽题，完成后展示成绩并自动记录错题。

## 技术决策

- **方案选择**: 独立页面 + REST API（方案 A）
- **原因**: 架构清晰，不污染双人模式 Socket.IO 逻辑，前后端职责分明
- **不选择复用 Socket.IO**: 单人模式不需要实时通信，REST API 更简洁

## 页面流程

```
首页 → 点击「单人答题」
  → SoloLobby：选择题库 / 随机抽题
  → SoloLobby：选择题目数量（10/20/30）
  → 倒计时 3 秒
  → 逐题答题（每题 15 秒计时）
  → ResultScreen：展示得分、用时、正确率
  → 答错的题目自动加入错题本
```

## 服务端 API

### POST `/api/solo/questions`

获取单人模式题目。

**请求体：**
```typescript
{
  quizId?: string;    // 指定题库 ID（可选）
  count: number;      // 题目数量：10 / 20 / 30
  random?: boolean;   // 是否随机抽题
}
```

**响应：**
```typescript
{
  questions: Array<{
    id: string;
    content: string;
    type: 'single' | 'judge';
    options: string[];
    // 不返回 correctAnswer
  }>;
  totalQuestions: number;
}
```

## 前端组件

### 新增文件

| 文件 | 说明 |
|------|------|
| `client/src/pages/SoloGamePage.tsx` | 单人答题主页面 |
| `client/src/components/solo/SoloLobby.tsx` | 选择题库/随机、选题目数量 |
| `client/src/components/solo/SoloQuestionCard.tsx` | 单人模式答题卡片包装层 |

### 复用组件

- `QuestionCard` — 展示题目和选项
- `ResultScreen` — 展示最终结果（适配单人模式）
- `mistakes.ts` 工具 — 错题记录

### 状态管理

```typescript
type SoloPhase = 'lobby' | 'countdown' | 'playing' | 'result';

interface SoloGameState {
  phase: SoloPhase;
  questions: Question[];
  currentIndex: number;
  answers: Map<string, {
    selected: number;
    correct: boolean;
    timeSpent: number;
  }>;
  score: number;
  startTime: number;
}
```

### 路由

```typescript
<Route path="/solo" element={<SoloGamePage />} />
```

### 首页入口

在 `HomePage` 中新增「单人答题」按钮，点击跳转 `/solo`。

## 计分规则

- 答对: +10 分（基础分）
- 答对且用时 < 5 秒: +5 额外分
- 答对且用时 < 10 秒: +2 额外分
- 答错: 0 分
- 超时: 0 分（标记为答错）

## 计时规则

- 每题 15 秒倒计时（与双人模式一致）
- 超时自动跳过，标记为答错

## 错题记录

答错时立即写入本地存储（复用现有 `mistakes.ts`）：
```typescript
addMistake({
  questionId: string,
  question: Question,
  selectedAnswer: number,
  correctAnswer: number,
});
```

## 结果展示

- 总得分
- 正确率（正确数 / 总题数）
- 总用时
- 每道题的答题详情（可展开查看）
