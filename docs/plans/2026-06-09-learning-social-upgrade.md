# 学玩融合功能升级 — 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为「知识PK大作战」添加答题报告、结果分享图、题目收藏/分享三个功能模块

**Architecture:** 纯前端增强，不修改后端。答题报告从现有 answers 数据前端计算；分享图使用 html2canvas 将 DOM 渲染为图片；收藏系统复用 localStorage 模式（与错题系统一致）。新增 `components/report/` 目录存放报告组件，`utils/favorites.ts` 复用 `utils/mistakes.ts` 的 localStorage 模式。

**Tech Stack:** React 18 + TypeScript + Tailwind CSS + html2canvas（新增）

**设计文档:** `docs/plans/2026-06-09-learning-social-upgrade-design.md`

---

## Task 1: 答题统计工具函数

创建纯函数工具，从 answers 数据中计算各项统计指标。报告组件将调用这些函数。

**Files:**
- Create: `client/src/utils/gameStats.ts`

**Step 1: 创建统计工具文件**

```typescript
// client/src/utils/gameStats.ts
import type { AnswerRecord, SoloAnswerRecord, Question } from '../../../shared/types';

// ==================== 对战模式统计 ====================

export interface BattleStats {
  totalQuestions: number;
  myCorrect: number;
  opponentCorrect: number;
  myAccuracy: number;
  opponentAccuracy: number;
  myScore: number;
  opponentScore: number;
  /** 分数走势: [myCumScore, opponentCumScore][] */
  scoreProgress: [number, number][];
  /** 翻盘点: 连续得分反超的题号 */
  turningPoints: { questionIndex: number; description: string }[];
}

export function computeBattleStats(
  answers: AnswerRecord[],
  questions: Question[],
  scores: [number, number],
  playerIndex: number,
): BattleStats {
  const myAnswers = answers.filter(a => a.playerIndex === playerIndex);
  const opponentAnswers = answers.filter(a => a.playerIndex === 1 - playerIndex);

  const myCorrect = myAnswers.filter(a => a.correct).length;
  const opponentCorrect = opponentAnswers.filter(a => a.correct).length;

  const myAccuracy = questions.length > 0 ? Math.round((myCorrect / questions.length) * 100) : 0;
  const opponentAccuracy = questions.length > 0
    ? Math.round((opponentCorrect / questions.length) * 100)
    : 0;

  // Build score progress by walking through questions in order
  const scoreProgress: [number, number][] = [[0, 0]];
  let myCum = 0;
  let oppCum = 0;

  for (let i = 0; i < questions.length; i++) {
    const qAnswers = answers.filter(a => a.questionIndex === i);
    for (const a of qAnswers) {
      if (a.correct) {
        if (a.playerIndex === playerIndex) myCum++;
        else oppCum++;
      }
    }
    scoreProgress.push([myCum, oppCum]);
  }

  // Detect turning points (trailing by 2+ then equalize or lead)
  const turningPoints: { questionIndex: number; description: string }[] = [];
  let trailStart = -1;
  for (let i = 0; i < scoreProgress.length; i++) {
    const [m, o] = scoreProgress[i];
    const diff = m - o;
    if (diff <= -2 && trailStart === -1) {
      trailStart = i;
    } else if (diff >= 0 && trailStart !== -1) {
      turningPoints.push({
        questionIndex: trailStart,
        description: `第${trailStart + 1}题落后，第${i}题追平/反超`,
      });
      trailStart = -1;
    }
  }

  return {
    totalQuestions: questions.length,
    myCorrect,
    opponentCorrect,
    myAccuracy,
    opponentAccuracy,
    myScore: scores[playerIndex],
    opponentScore: scores[1 - playerIndex],
    scoreProgress,
    turningPoints,
  };
}

// ==================== 单人模式统计 ====================

export interface SoloStats {
  totalQuestions: number;
  correctCount: number;
  accuracy: number;
  totalTime: number;
  avgTime: number;
  speedBonus: number;
  baseScore: number;
  totalScore: number;
  fastestTime: number;
  slowestTime: number;
}

export function computeSoloStats(
  answers: SoloAnswerRecord[],
  totalTime: number,
  score: number,
): SoloStats {
  const totalQuestions = answers.length;
  const correctAnswers = answers.filter(a => a.correct);
  const correctCount = correctAnswers.length;
  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const times = answers.map(a => a.timeSpent);
  const fastestTime = times.length > 0 ? Math.min(...times) : 0;
  const slowestTime = times.length > 0 ? Math.max(...times) : 0;
  const avgTime = times.length > 0
    ? Math.round((times.reduce((s, t) => s + t, 0) / times.length) * 10) / 10
    : 0;

  // Recompute speed bonus from answer records
  let speedBonus = 0;
  let baseScore = 0;
  for (const a of correctAnswers) {
    baseScore += 10;
    if (a.timeSpent < 5) speedBonus += 5;
    else if (a.timeSpent < 10) speedBonus += 2;
  }

  return {
    totalQuestions,
    correctCount,
    accuracy,
    totalTime,
    avgTime,
    speedBonus,
    baseScore,
    totalScore: score,
    fastestTime: Math.round(fastestTime * 10) / 10,
    slowestTime: Math.round(slowestTime * 10) / 10,
  };
}
```

**Step 2: 提交**

```bash
git add client/src/utils/gameStats.ts
git commit -m "feat: add game stats computation utilities for report feature"
```

---

## Task 2: StatsCard 通用组件

可复用的统计数据卡片，用于报告页面中展示各项指标。

**Files:**
- Create: `client/src/components/report/StatsCard.tsx`

**Step 1: 创建 StatsCard 组件**

```typescript
// client/src/components/report/StatsCard.tsx
interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: string;
  color?: string; // tailwind text color class, e.g. 'text-purple-600'
  sub?: string;
}

export default function StatsCard({ label, value, icon, color = 'text-gray-800', sub }: StatsCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4 text-center">
      {icon && <div className="text-lg mb-1">{icon}</div>}
      <div className={`text-xl sm:text-2xl font-black ${color}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-300 mt-0.5">{sub}</div>}
    </div>
  );
}
```

**Step 2: 提交**

```bash
git add client/src/components/report/StatsCard.tsx
git commit -m "feat: add StatsCard component for report display"
```

---

## Task 3: ScoreChart 分数走势图组件

轻量 Canvas 绘制的折线图，展示对战双方分数变化趋势。

**Files:**
- Create: `client/src/components/report/ScoreChart.tsx`

**Step 1: 创建 ScoreChart 组件**

```typescript
// client/src/components/report/ScoreChart.tsx
import { useRef, useEffect } from 'react';

interface ScoreChartProps {
  /** 每个数据点: [myScore, opponentScore] */
  data: [number, number][];
  myName?: string;
  opponentName?: string;
}

export default function ScoreChart({ data, myName = '你', opponentName = '对手' }: ScoreChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padTop = 16;
    const padBottom = 24;
    const padLeft = 28;
    const padRight = 16;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;

    // Clear
    ctx.clearRect(0, 0, w, h);

    if (data.length < 2) return;

    const maxVal = Math.max(...data.flat(), 1);

    // Grid lines
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padTop + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + chartW, y);
      ctx.stroke();
    }

    // Y-axis labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = padTop + (chartH / 4) * i;
      const val = Math.round(maxVal - (maxVal / 4) * i);
      ctx.fillText(String(val), padLeft - 4, y + 3);
    }

    const drawLine = (points: number[], color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      points.forEach((val, i) => {
        const x = padLeft + (chartW / (data.length - 1)) * i;
        const y = padTop + chartH - (val / maxVal) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };

    // My line (purple)
    drawLine(data.map(d => d[0]), '#8B5CF6');
    // Opponent line (pink)
    drawLine(data.map(d => d[1]), '#EC4899');

    // End dots
    const drawEndDot = (points: number[], color: string) => {
      const lastVal = points[points.length - 1];
      const x = padLeft + chartW;
      const y = padTop + chartH - (lastVal / maxVal) * chartH;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    };
    drawEndDot(data.map(d => d[0]), '#8B5CF6');
    drawEndDot(data.map(d => d[1]), '#EC4899');
  }, [data]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-4 mb-2 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-purple-500 rounded" />
          <span className="text-gray-500">{myName}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-pink-500 rounded" />
          <span className="text-gray-500">{opponentName}</span>
        </span>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: 160 }}
      />
    </div>
  );
}
```

**Step 2: 提交**

```bash
git add client/src/components/report/ScoreChart.tsx
git commit -m "feat: add ScoreChart canvas component for battle report"
```

---

## Task 4: 对战报告组件

展示对战模式的详细报告：统计卡片 + 分数走势图 + 翻盘点。

**Files:**
- Create: `client/src/components/report/BattleReport.tsx`

**Step 1: 创建 BattleReport 组件**

```typescript
// client/src/components/report/BattleReport.tsx
import type { GameOverPayload, Player } from '../../../../shared/types';
import { computeBattleStats } from '../../utils/gameStats';
import StatsCard from './StatsCard';
import ScoreChart from './ScoreChart';

interface BattleReportProps {
  result: GameOverPayload;
  playerIndex: number;
  players: (Player | null)[];
}

export default function BattleReport({ result, playerIndex, players }: BattleReportProps) {
  const { scores, answers, questions } = result;
  const stats = computeBattleStats(answers, questions, scores, playerIndex);
  const myName = players[playerIndex]?.name ?? '你';
  const opponentName = players[1 - playerIndex]?.name ?? '对手';
  const isWinner = scores[playerIndex] > scores[1 - playerIndex];

  return (
    <div className="max-w-lg mx-auto px-4 pb-8">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">{isWinner ? '🏆' : scores[0] === scores[1] ? '🤝' : '📊'}</div>
        <h2 className="text-xl font-black text-gray-800">对战报告</h2>
        <p className="text-sm text-gray-400 mt-1">{myName} vs {opponentName}</p>
      </div>

      {/* Score summary */}
      <div className="bg-white rounded-3xl shadow-xl p-5 mb-6 flex items-center justify-between">
        <div className="text-center flex-1">
          <div className="text-sm text-gray-400 mb-1">{myName}</div>
          <div className="text-3xl font-black text-purple-600">{stats.myScore}</div>
        </div>
        <div className="text-lg font-bold text-gray-300 px-3">VS</div>
        <div className="text-center flex-1">
          <div className="text-sm text-gray-400 mb-1">{opponentName}</div>
          <div className="text-3xl font-black text-pink-600">{stats.opponentScore}</div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatsCard label="我的正确率" value={`${stats.myAccuracy}%`} icon="🎯" color="text-purple-600" />
        <StatsCard label="对手正确率" value={`${stats.opponentAccuracy}%`} icon="🎯" color="text-pink-600" />
        <StatsCard label="我答对" value={`${stats.myCorrect}/${stats.totalQuestions}`} icon="✅" color="text-green-600" />
        <StatsCard label="对手答对" value={`${stats.opponentCorrect}/${stats.totalQuestions}`} icon="✅" color="text-pink-500" />
      </div>

      {/* Score chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
        <h3 className="text-sm font-bold text-gray-600 mb-3">📈 分数走势</h3>
        <ScoreChart data={stats.scoreProgress} myName={myName} opponentName={opponentName} />
      </div>

      {/* Turning points */}
      {stats.turningPoints.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <h3 className="text-sm font-bold text-gray-600 mb-3">🔥 翻盘点</h3>
          <div className="space-y-2">
            {stats.turningPoints.map((tp, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-orange-400">⚡</span>
                <span>{tp.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: 提交**

```bash
git add client/src/components/report/BattleReport.tsx
git commit -m "feat: add BattleReport component with stats and score chart"
```

---

## Task 5: 单人报告组件

展示单人模式的详细报告：统计卡片 + 历史对比提示。

**Files:**
- Create: `client/src/components/report/SoloReport.tsx`

**Step 1: 创建 SoloReport 组件**

```typescript
// client/src/components/report/SoloReport.tsx
import type { Question, SoloAnswerRecord } from '../../../../shared/types';
import { computeSoloStats } from '../../utils/gameStats';
import StatsCard from './StatsCard';

interface SoloReportProps {
  score: number;
  totalTime: number;
  questions: Question[];
  answers: SoloAnswerRecord[];
}

export default function SoloReport({ score, totalTime, questions, answers }: SoloReportProps) {
  const stats = computeSoloStats(answers, totalTime, score);
  const minutes = Math.floor(stats.totalTime / 60);
  const seconds = stats.totalTime % 60;

  return (
    <div className="max-w-lg mx-auto px-4 pb-8">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">📊</div>
        <h2 className="text-xl font-black text-gray-800">答题报告</h2>
      </div>

      {/* Score summary */}
      <div className="bg-white rounded-3xl shadow-xl p-5 mb-6 text-center">
        <div className="text-sm text-gray-400 mb-1">总分</div>
        <div className="text-4xl font-black text-teal-600">{stats.totalScore}</div>
        <div className="text-xs text-gray-300 mt-1">基础 {stats.baseScore} + 速度 {stats.speedBonus}</div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatsCard label="正确率" value={`${stats.accuracy}%`} icon="🎯" color="text-teal-600" />
        <StatsCard label="答对/总题" value={`${stats.correctCount}/${stats.totalQuestions}`} icon="✅" color="text-green-600" />
        <StatsCard label="总用时" value={`${minutes}:${String(seconds).padStart(2, '0')}`} icon="⏱️" color="text-cyan-600" />
        <StatsCard label="平均用时" value={`${stats.avgTime}s`} icon="⚡" color="text-purple-600" />
        <StatsCard label="最快一题" value={`${stats.fastestTime}s`} icon="🚀" color="text-orange-500" />
        <StatsCard label="最慢一题" value={`${stats.slowestTime}s`} icon="🐢" color="text-gray-500" />
      </div>

      {/* Performance summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-sm font-bold text-gray-600 mb-3">💡 答题分析</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            {stats.accuracy >= 90
              ? '🌟 太厉害了！正确率超过90%，继续保持！'
              : stats.accuracy >= 70
                ? '👍 不错！正确率70%以上，再接再厉！'
                : stats.accuracy >= 50
                  ? '💪 还需努力！多练习错题，正确率会提升的。'
                  : '📚 别气馁！建议回顾错题，下次一定更好。'}
          </p>
          {stats.speedBonus > 0 && (
            <p>⚡ 速度加分获得 {stats.speedBonus} 分，反应很快！</p>
          )}
          {stats.avgTime < 5 && stats.correctCount > 0 && (
            <p>🔥 平均答题不到5秒，你是闪电侠吗？</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: 提交**

```bash
git add client/src/components/report/SoloReport.tsx
git commit -m "feat: add SoloReport component with stats and analysis"
```

---

## Task 6: 集成报告到对战结果页

修改 `ResultScreen`，在结果页底部增加「查看报告」按钮，点击展开报告内容（同一页面内切换，不新增路由）。

**Files:**
- Modify: `client/src/components/game/ResultScreen.tsx`
- Modify: `client/src/pages/GamePage.tsx`

**Step 1: 修改 ResultScreen，增加报告展示**

在 `ResultScreen.tsx` 中：
1. 新增 import BattleReport
2. 新增 `showReport` state
3. 按钮区域增加「查看报告」按钮
4. showReport 为 true 时渲染 BattleReport 替代回顾列表

在 ResultScreen 的 import 区域后添加：

```typescript
import { useState } from 'react';
import BattleReport from '../report/BattleReport';
```

将 ResultScreen 函数体开头改为：

```typescript
export default function ResultScreen({ result, playerIndex, players, onPlayAgain, onGoHome }: ResultScreenProps) {
  const [showReport, setShowReport] = useState(false);
  const { scores, winner, answers, questions } = result;
```

在按钮区域（`<div className="flex gap-4">`）前加入：

```typescript
      {/* Report view */}
      {showReport && (
        <BattleReport result={result} playerIndex={playerIndex} players={players} />
      )}

      {/* Review list (hidden when showing report) */}
      {!showReport && (
```

在回顾列表的 `</div>` 结束标签后加入 `)}` 包裹。

在按钮组中加入「查看报告 / 返回回顾」按钮，修改按钮区域：

```typescript
      <div className="flex gap-3 flex-wrap justify-center">
        <button
          onClick={() => setShowReport(!showReport)}
          className="px-6 py-3 bg-white border-2 border-purple-200 text-purple-600 font-bold rounded-xl hover:bg-purple-50 transition-colors"
        >
          {showReport ? '📋 答题回顾' : '📊 查看报告'}
        </button>
        <button
          onClick={onPlayAgain}
          className="px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl hover:scale-105 transition-all duration-200 shadow-lg"
        >
          再来一局
        </button>
        <button
          onClick={onGoHome}
          className="px-8 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
        >
          返回首页
        </button>
      </div>
```

**Step 2: 验证**

启动开发服务器，完成一局对战，确认结果页出现「查看报告」按钮，点击可切换报告/回顾视图。

**Step 3: 提交**

```bash
git add client/src/components/game/ResultScreen.tsx
git commit -m "feat: integrate battle report into result screen with toggle"
```

---

## Task 7: 集成报告到单人结果页

修改 `SoloResultScreen`，增加「查看报告」按钮和报告展示。

**Files:**
- Modify: `client/src/components/solo/SoloResultScreen.tsx`

**Step 1: 修改 SoloResultScreen**

1. 新增 import useState 和 SoloReport
2. 新增 `showReport` state
3. 按钮区域增加切换按钮
4. showReport 时渲染 SoloReport

在 import 区域添加：

```typescript
import { useState } from 'react';
import SoloReport from '../report/SoloReport';
```

在函数体开头添加 state：

```typescript
export default function SoloResultScreen({ score, totalTime, questions, answers, onPlayAgain, onGoHome }: SoloResultScreenProps) {
  const [showReport, setShowReport] = useState(false);
  const correctCount = answers.filter(a => a.correct).length;
```

在回顾列表区域外包一层条件 `{!showReport && (...回顾列表...) }` ，在其前加入报告视图：

```typescript
      {showReport && (
        <SoloReport score={score} totalTime={totalTime} questions={questions} answers={answers} />
      )}
```

修改按钮区域：

```typescript
      <div className="flex gap-3 flex-wrap justify-center">
        <button
          onClick={() => setShowReport(!showReport)}
          className="px-6 py-3 bg-white border-2 border-teal-200 text-teal-600 font-bold rounded-xl hover:bg-teal-50 transition-colors"
        >
          {showReport ? '📋 答题回顾' : '📊 查看报告'}
        </button>
        <button
          onClick={onPlayAgain}
          className="px-8 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold rounded-xl hover:scale-105 transition-all duration-200 shadow-lg"
        >
          再来一局
        </button>
        <button
          onClick={onGoHome}
          className="px-8 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
        >
          返回首页
        </button>
      </div>
```

**Step 2: 验证**

启动开发服务器，完成一局单人答题，确认结果页出现报告按钮和报告视图。

**Step 3: 提交**

```bash
git add client/src/components/solo/SoloResultScreen.tsx
git commit -m "feat: integrate solo report into result screen with toggle"
```

---

## Task 8: 安装 html2canvas

为分享图功能安装依赖。

**Files:**
- Modify: `client/package.json`

**Step 1: 安装依赖**

```bash
cd client && npm install html2canvas
```

**Step 2: 提交**

```bash
git add client/package.json client/package-lock.json
git commit -m "chore: add html2canvas dependency for share card generation"
```

---

## Task 9: 分享图工具函数

封装 html2canvas 调用，提供生成图片和下载的能力。

**Files:**
- Create: `client/src/utils/shareUtils.ts`

**Step 1: 创建分享工具**

```typescript
// client/src/utils/shareUtils.ts
import html2canvas from 'html2canvas';

/**
 * 将 DOM 元素渲染为图片并下载
 */
export async function captureAndDownload(
  element: HTMLElement,
  filename = 'quiz-result.png',
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: null,
    useCORS: true,
    logging: false,
  });

  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * 将 DOM 元素渲染为 Blob
 */
export async function captureToBlob(element: HTMLElement): Promise<Blob | null> {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: null,
    useCORS: true,
    logging: false,
  });

  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });
}
```

**Step 2: 提交**

```bash
git add client/src/utils/shareUtils.ts
git commit -m "feat: add shareUtils with html2canvas capture helpers"
```

---

## Task 10: 对战分享卡片组件

用于生成对战结果分享图的 DOM 模板，会被 html2canvas 渲染为图片。

**Files:**
- Create: `client/src/components/share/BattleShareCard.tsx`

**Step 1: 创建对战分享卡片**

```typescript
// client/src/components/share/BattleShareCard.tsx
import { forwardRef } from 'react';
import type { GameOverPayload, Player } from '../../../../shared/types';

interface BattleShareCardProps {
  result: GameOverPayload;
  playerIndex: number;
  players: (Player | null)[];
}

const BattleShareCard = forwardRef<HTMLDivElement, BattleShareCardProps>(
  ({ result, playerIndex, players }, ref) => {
    const { scores, answers, questions } = result;
    const myName = players[playerIndex]?.name ?? '你';
    const opponentName = players[1 - playerIndex]?.name ?? '对手';
    const myCorrect = answers.filter(a => a.playerIndex === playerIndex && a.correct).length;
    const opponentCorrect = answers.filter(a => a.playerIndex === 1 - playerIndex && a.correct).length;

    return (
      <div
        ref={ref}
        className="w-[360px] p-6 bg-gradient-to-br from-purple-600 via-indigo-600 to-pink-600 text-white"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        {/* Title */}
        <div className="text-center mb-4">
          <div className="text-2xl font-black">⚔️ 知识PK大作战 ⚔️</div>
        </div>

        {/* VS section */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <div className="text-sm opacity-80">{myName}</div>
              <div className="text-3xl font-black">{scores[playerIndex]}</div>
            </div>
            <div className="text-xl font-bold opacity-50">VS</div>
            <div className="text-center flex-1">
              <div className="text-sm opacity-80">{opponentName}</div>
              <div className="text-3xl font-black">{scores[1 - playerIndex]}</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-center text-sm">
          <div className="bg-white/10 rounded-xl p-2">
            <div className="opacity-70">正确率</div>
            <div className="font-bold">{Math.round((myCorrect / questions.length) * 100)}% vs {Math.round((opponentCorrect / questions.length) * 100)}%</div>
          </div>
          <div className="bg-white/10 rounded-xl p-2">
            <div className="opacity-70">总题数</div>
            <div className="font-bold">{questions.length} 题</div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs opacity-60">
          扫码来挑战我吧！ · 知识PK大作战
        </div>
      </div>
    );
  },
);

BattleShareCard.displayName = 'BattleShareCard';
export default BattleShareCard;
```

**Step 2: 提交**

```bash
git add client/src/components/share/BattleShareCard.tsx
git commit -m "feat: add BattleShareCard for battle result sharing"
```

---

## Task 11: 单人分享卡片组件

**Files:**
- Create: `client/src/components/share/SoloShareCard.tsx`

**Step 1: 创建单人分享卡片**

```typescript
// client/src/components/share/SoloShareCard.tsx
import { forwardRef } from 'react';
import type { Question, SoloAnswerRecord } from '../../../../shared/types';

interface SoloShareCardProps {
  score: number;
  totalTime: number;
  questions: Question[];
  answers: SoloAnswerRecord[];
}

const SoloShareCard = forwardRef<HTMLDivElement, SoloShareCardProps>(
  ({ score, totalTime, questions, answers }, ref) => {
    const correctCount = answers.filter(a => a.correct).length;
    const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;

    return (
      <div
        ref={ref}
        className="w-[360px] p-6 bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-600 text-white"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        <div className="text-center mb-4">
          <div className="text-2xl font-black">📝 答题成绩单 📝</div>
        </div>

        <div className="bg-white/10 backdrop-blur rounded-2xl p-4 mb-4 text-center">
          <div className="text-sm opacity-80 mb-1">总分</div>
          <div className="text-4xl font-black">{score}</div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4 text-center text-sm">
          <div className="bg-white/10 rounded-xl p-2">
            <div className="opacity-70">正确率</div>
            <div className="font-bold">{accuracy}%</div>
          </div>
          <div className="bg-white/10 rounded-xl p-2">
            <div className="opacity-70">用时</div>
            <div className="font-bold">{minutes}:{String(seconds).padStart(2, '0')}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-2">
            <div className="opacity-70">题数</div>
            <div className="font-bold">{questions.length}</div>
          </div>
        </div>

        <div className="text-center text-xs opacity-60">
          来挑战我的记录！ · 知识PK大作战
        </div>
      </div>
    );
  },
);

SoloShareCard.displayName = 'SoloShareCard';
export default SoloShareCard;
```

**Step 2: 提交**

```bash
git add client/src/components/share/SoloShareCard.tsx
git commit -m "feat: add SoloShareCard for solo result sharing"
```

---

## Task 12: 集成分享按钮到结果页

在 ResultScreen 和 SoloResultScreen 中添加分享按钮，点击时渲染隐藏的分享卡片 DOM 并调用 html2canvas 生成图片下载。

**Files:**
- Modify: `client/src/components/game/ResultScreen.tsx`
- Modify: `client/src/components/solo/SoloResultScreen.tsx`

**Step 1: 修改 ResultScreen — 添加分享功能**

在 ResultScreen.tsx 中添加 import：

```typescript
import { useRef, useState } from 'react';
import BattleReport from '../report/BattleReport';
import BattleShareCard from '../share/BattleShareCard';
import { captureAndDownload } from '../../utils/shareUtils';
```

在函数体中添加 ref 和 sharing state：

```typescript
  const [showReport, setShowReport] = useState(false);
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);
```

添加分享处理函数：

```typescript
  const handleShare = async () => {
    setSharing(true);
    // Wait for hidden card to render
    await new Promise(r => setTimeout(r, 100));
    const el = shareCardRef.current;
    if (el) {
      await captureAndDownload(el, `知识PK-${myName}vs${opponentName}.png`);
    }
    setSharing(false);
  };
```

在 return JSX 的最外层 `<div>` 末尾（关闭标签前）添加隐藏的分享卡片：

```typescript
      {/* Hidden share card for capture */}
      <div className="fixed left-[-9999px] top-0">
        <BattleShareCard ref={shareCardRef} result={result} playerIndex={playerIndex} players={players} />
      </div>
```

在按钮区域增加分享按钮：

```typescript
        <button
          onClick={handleShare}
          disabled={sharing}
          className="px-6 py-3 bg-gradient-to-r from-orange-400 to-pink-500 text-white font-bold rounded-xl hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50"
        >
          {sharing ? '⏳ 生成中...' : '📤 分享战绩'}
        </button>
```

**Step 2: 修改 SoloResultScreen — 添加分享功能**

同样的模式，添加 import、ref、handler 和按钮：

```typescript
import { useState, useRef } from 'react';
import SoloReport from '../report/SoloReport';
import SoloShareCard from '../share/SoloShareCard';
import { captureAndDownload } from '../../utils/shareUtils';
```

在函数体中：

```typescript
  const [showReport, setShowReport] = useState(false);
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    setSharing(true);
    await new Promise(r => setTimeout(r, 100));
    const el = shareCardRef.current;
    if (el) {
      await captureAndDownload(el, `答题成绩-${score}分.png`);
    }
    setSharing(false);
  };
```

隐藏卡片和按钮同理。

**Step 3: 验证**

启动开发服务器，完成一局对战/单人答题，确认分享按钮生成图片并触发下载。

**Step 4: 提交**

```bash
git add client/src/components/game/ResultScreen.tsx client/src/components/solo/SoloResultScreen.tsx
git commit -m "feat: add share buttons to result screens with image download"
```

---

## Task 13: 题目收藏工具函数

复用 `mistakes.ts` 的 localStorage 模式，提供收藏/取消收藏/获取收藏/生成挑战链接等功能。

**Files:**
- Create: `client/src/utils/favorites.ts`

**Step 1: 创建收藏工具**

```typescript
// client/src/utils/favorites.ts
import type { Question } from '../../../shared/types';

export const FAVORITES_STORAGE_KEY = 'quizpk_favorites';

export interface FavoriteRecord {
  question: Question;
  addedAt: string;
}

function parseFavorites(raw: string | null): FavoriteRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(record => record?.question?.id && Array.isArray(record.question.options));
  } catch {
    return [];
  }
}

export function getFavorites(): FavoriteRecord[] {
  return parseFavorites(localStorage.getItem(FAVORITES_STORAGE_KEY));
}

export function saveFavorites(records: FavoriteRecord[]): void {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(records));
}

export function isFavorite(questionId: number): boolean {
  return getFavorites().some(r => r.question.id === questionId);
}

export function toggleFavorite(question: Question): FavoriteRecord[] {
  const records = getFavorites();
  const existingIndex = records.findIndex(r => r.question.id === question.id);

  if (existingIndex >= 0) {
    // Remove
    records.splice(existingIndex, 1);
  } else {
    // Add to front
    records.unshift({ question, addedAt: new Date().toISOString() });
  }

  saveFavorites(records);
  return records;
}

export function removeFavorite(questionId: number): FavoriteRecord[] {
  const next = getFavorites().filter(r => r.question.id !== questionId);
  saveFavorites(next);
  return next;
}

export function clearFavorites(): void {
  localStorage.removeItem(FAVORITES_STORAGE_KEY);
}

/**
 * Encode question IDs to a base64 challenge link token
 */
export function encodeChallengeToken(questionIds: number[]): string {
  return btoa(JSON.stringify(questionIds));
}

/**
 * Decode a challenge link token back to question IDs
 */
export function decodeChallengeToken(token: string): number[] {
  try {
    const ids = JSON.parse(atob(token));
    if (Array.isArray(ids)) return ids.filter((id: any) => typeof id === 'number');
    return [];
  } catch {
    return [];
  }
}

/**
 * Get the base URL for generating challenge links
 */
export function getChallengeUrl(token: string): string {
  return `${window.location.origin}/challenge/${token}`;
}
```

**Step 2: 提交**

```bash
git add client/src/utils/favorites.ts
git commit -m "feat: add favorites utility with localStorage and challenge link support"
```

---

## Task 14: FavoriteButton 组件

可在答题卡片中使用的收藏按钮。

**Files:**
- Create: `client/src/components/common/FavoriteButton.tsx`

**Step 1: 创建 FavoriteButton**

```typescript
// client/src/components/common/FavoriteButton.tsx
import { useState, useEffect } from 'react';
import type { Question } from '../../../../shared/types';
import { isFavorite, toggleFavorite } from '../../utils/favorites';

interface FavoriteButtonProps {
  question: Question;
  className?: string;
}

export default function FavoriteButton({ question, className = '' }: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(() => isFavorite(question.id));

  useEffect(() => {
    setFavorited(isFavorite(question.id));
  }, [question.id]);

  const handleToggle = () => {
    toggleFavorite(question);
    setFavorited(!favorited);
  };

  return (
    <button
      onClick={handleToggle}
      className={`transition-all duration-200 hover:scale-110 active:scale-95 ${className}`}
      title={favorited ? '取消收藏' : '收藏此题'}
    >
      <span className={`text-xl ${favorited ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}>
        {favorited ? '⭐' : '☆'}
      </span>
    </button>
  );
}
```

**Step 2: 提交**

```bash
git add client/src/components/common/FavoriteButton.tsx
git commit -m "feat: add FavoriteButton toggle component"
```

---

## Task 15: 集成收藏按钮到答题卡片

在对战答题卡片和单人答题卡片的题目区域添加收藏按钮。仅在答题结果展示时可见（答完后才能收藏）。

**Files:**
- Modify: `client/src/components/game/QuestionCard.tsx`
- Modify: `client/src/components/solo/SoloQuestionCard.tsx`

**Step 1: 修改 QuestionCard（对战）**

添加 import：

```typescript
import FavoriteButton from '../common/FavoriteButton';
```

在题目区域 `<div className="bg-white rounded-2xl ...">` 内，`<h2>` 标签后添加收藏按钮（仅在 showResult 时显示）：

```typescript
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs text-purple-500 font-medium mb-2">
                {question.type === 'judge' ? '✅ 判断题' : '📝 单选题'}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 leading-relaxed">{question.content}</h2>
            </div>
            {showResult && <FavoriteButton question={question} />}
          </div>
        </div>
```

**Step 2: 修改 SoloQuestionCard（单人）**

添加 import：

```typescript
import FavoriteButton from '../common/FavoriteButton';
```

同样的修改：在题目区域增加收藏按钮（仅在 answered 时显示）：

```typescript
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs text-teal-500 font-medium mb-2">
                {question.type === 'judge' ? '✅ 判断题' : '📝 单选题'}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 leading-relaxed">{question.content}</h2>
            </div>
            {answered && <FavoriteButton question={question} />}
          </div>
        </div>
```

**Step 3: 验证**

启动开发服务器，答一题后确认出现 ⭐ 收藏按钮，点击可切换收藏/未收藏状态。

**Step 4: 提交**

```bash
git add client/src/components/game/QuestionCard.tsx client/src/components/solo/SoloQuestionCard.tsx
git commit -m "feat: add favorite buttons to question cards (visible after answering)"
```

---

## Task 16: FavoritesPage 收藏列表页

展示所有收藏的题目，支持筛选、删除、生成挑战链接。

**Files:**
- Create: `client/src/pages/FavoritesPage.tsx`

**Step 1: 创建收藏列表页**

```typescript
// client/src/pages/FavoritesPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Question } from '../../../shared/types';
import {
  getFavorites,
  removeFavorite,
  clearFavorites,
  encodeChallengeToken,
  getChallengeUrl,
} from '../utils/favorites';

export default function FavoritesPage() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState(getFavorites());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showLink, setShowLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  const handleRemove = (questionId: number) => {
    const next = removeFavorite(questionId);
    setFavorites(next);
    setSelected(prev => {
      const s = new Set(prev);
      s.delete(questionId);
      return s;
    });
  };

  const handleClear = () => {
    if (!confirm('确定清空所有收藏？')) return;
    clearFavorites();
    setFavorites([]);
    setSelected(new Set());
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const handleGenerateLink = () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const token = encodeChallengeToken(ids);
    setShowLink(getChallengeUrl(token));
    setCopied(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(showLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = showLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePractice = () => {
    navigate('/favorites/practice');
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-4">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 transition-colors">
            ← 返回
          </button>
          <h1 className="text-xl font-black text-gray-800">⭐ 我的收藏</h1>
          <span className="text-sm text-gray-400">{favorites.length}题</span>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-400">还没有收藏任何题目</p>
            <p className="text-sm text-gray-300 mt-1">答题时点击 ⭐ 即可收藏</p>
            <button
              onClick={() => navigate('/solo')}
              className="mt-6 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold rounded-xl hover:scale-105 transition-all duration-200"
            >
              去答题
            </button>
          </div>
        ) : (
          <>
            {/* Action bar */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                onClick={handlePractice}
                className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-xl hover:scale-105 transition-all duration-200 text-sm"
              >
                📝 练习收藏
              </button>
              <button
                onClick={handleGenerateLink}
                disabled={selected.size === 0}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                🔗 生成挑战 ({selected.size})
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-gray-100 text-gray-500 font-bold rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors text-sm ml-auto"
              >
                清空
              </button>
            </div>

            {/* Challenge link display */}
            {showLink && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-4 flex items-center gap-2">
                <input
                  readOnly
                  value={showLink}
                  className="flex-1 text-sm bg-transparent outline-none text-purple-700 min-w-0"
                />
                <button
                  onClick={handleCopy}
                  className="px-3 py-1 bg-purple-500 text-white text-sm font-bold rounded-lg hover:bg-purple-600 transition-colors whitespace-nowrap"
                >
                  {copied ? '✓ 已复制' : '复制'}
                </button>
              </div>
            )}

            {/* Question list */}
            <div className="space-y-3">
              {favorites.map(record => (
                <div key={record.question.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.has(record.question.id)}
                        onChange={() => toggleSelect(record.question.id)}
                        className="w-4 h-4 accent-purple-500"
                      />
                      <span className="text-xs text-gray-400">
                        {record.question.type === 'judge' ? '✅ 判断' : '📝 选择'}
                      </span>
                    </label>
                    <button
                      onClick={() => handleRemove(record.question.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors text-sm"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-800">{record.question.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

**Step 2: 提交**

```bash
git add client/src/pages/FavoritesPage.tsx
git commit -m "feat: add FavoritesPage with list, delete, and challenge link generation"
```

---

## Task 17: FavoritePracticePage 收藏练习页

复用单人答题流程，但题源来自收藏列表。

**Files:**
- Create: `client/src/pages/FavoritePracticePage.tsx`

**Step 1: 创建收藏练习页**

```typescript
// client/src/pages/FavoritePracticePage.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Question, SoloAnswerRecord } from '../../../shared/types';
import SoloQuestionCard from '../components/solo/SoloQuestionCard';
import SoloScoreBar from '../components/solo/SoloScoreBar';
import SoloResultScreen from '../components/solo/SoloResultScreen';
import CountdownOverlay from '../components/game/CountdownOverlay';
import { getFavorites } from '../utils/favorites';
import { upsertMistake } from '../utils/mistakes';

type Phase = 'countdown' | 'playing' | 'result';

const QUESTION_TIME = 15;
const RESULT_DELAY = 1500;

export default function FavoritePracticePage() {
  const navigate = useNavigate();
  const favorites = useState(() => getFavorites())[0];
  const questions = useState(() => favorites.map(f => f.question))[0];

  const [phase, setPhase] = useState<Phase>(questions.length > 0 ? 'countdown' : 'result');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<SoloAnswerRecord[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [countdownNumber, setCountdownNumber] = useState(3);
  const [totalTime, setTotalTime] = useState(0);

  const questionStartRef = useRef(Date.now());
  const totalStartRef = useRef(0);

  // Countdown
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdownNumber <= 1) {
      const timer = setTimeout(() => {
        setPhase('playing');
        setCurrentIndex(0);
        setAnswers([]);
        setScore(0);
        setAnswered(false);
        setSelectedOption(null);
        setTimeLeft(QUESTION_TIME);
        const now = Date.now();
        totalStartRef.current = now;
        questionStartRef.current = now;
      }, 1000);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setCountdownNumber(n => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdownNumber]);

  // Per-question timer
  useEffect(() => {
    if (phase !== 'playing' || answered) return;
    questionStartRef.current = Date.now();
    setTimeLeft(QUESTION_TIME);
    const timer = setInterval(() => {
      setTimeLeft(prev => prev <= 1 ? 0 : prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, answered, currentIndex]);

  // Timeout
  useEffect(() => {
    if (timeLeft !== 0 || phase !== 'playing' || answered) return;
    const question = questions[currentIndex];
    if (!question) return;
    const timeSpent = Math.round((Date.now() - questionStartRef.current) / 100) / 10;
    setSelectedOption(null);
    setAnswered(true);
    setAnswers(prev => [...prev, { questionIndex: currentIndex, selectedOption: null, correct: false, timeSpent }]);
    upsertMistake(question, -1, question.answer);
  }, [timeLeft, phase, answered, questions, currentIndex]);

  const handleSelect = useCallback((optionIndex: number) => {
    if (answered) return;
    const question = questions[currentIndex];
    if (!question) return;
    const timeSpent = Math.round((Date.now() - questionStartRef.current) / 100) / 10;
    const isCorrect = optionIndex === question.answer;
    setSelectedOption(optionIndex);
    setAnswered(true);
    let points = 0;
    if (isCorrect) {
      points = 10;
      if (timeSpent < 5) points += 5;
      else if (timeSpent < 10) points += 2;
    }
    setScore(prev => prev + points);
    setAnswers(prev => [...prev, { questionIndex: currentIndex, selectedOption: optionIndex, correct: isCorrect, timeSpent }]);
    if (!isCorrect) upsertMistake(question, optionIndex, question.answer);
  }, [answered, questions, currentIndex]);

  // Auto-advance
  useEffect(() => {
    if (!answered || phase !== 'playing') return;
    const timer = setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setAnswered(false);
        setSelectedOption(null);
        setTimeLeft(QUESTION_TIME);
      } else {
        setTotalTime(Math.round((Date.now() - totalStartRef.current) / 1000));
        setPhase('result');
      }
    }, RESULT_DELAY);
    return () => clearTimeout(timer);
  }, [answered, phase, currentIndex, questions.length]);

  const handleGoHome = () => navigate('/');

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-5xl mb-4">📭</div>
        <p className="text-xl text-gray-600 mb-4">收藏列表为空</p>
        <button onClick={handleGoHome} className="px-6 py-3 bg-yellow-400 text-white rounded-xl font-bold">
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      {phase === 'countdown' && <CountdownOverlay number={countdownNumber} />}
      {phase === 'playing' && questions[currentIndex] && (
        <div className="max-w-lg mx-auto pt-4">
          <div className="text-center mb-2">
            <span className="text-sm font-bold text-yellow-500">⭐ 收藏题目练习</span>
          </div>
          <SoloScoreBar
            currentQuestion={currentIndex}
            totalQuestions={questions.length}
            score={score}
            timeLeft={timeLeft}
            totalTime={QUESTION_TIME}
          />
          <SoloQuestionCard
            question={questions[currentIndex]}
            answered={answered}
            selectedOption={selectedOption}
            onSelect={handleSelect}
          />
        </div>
      )}
      {phase === 'result' && (
        <SoloResultScreen
          score={score}
          totalTime={totalTime}
          questions={questions}
          answers={answers}
          onPlayAgain={() => navigate('/favorites/practice')}
          onGoHome={handleGoHome}
        />
      )}
    </div>
  );
}
```

**Step 2: 提交**

```bash
git add client/src/pages/FavoritePracticePage.tsx
git commit -m "feat: add FavoritePracticePage reusing solo game flow"
```

---

## Task 18: ChallengePage 挑战页面

处理 `/challenge/:token` 路由，解析 token 获取题目 ID，从错题/收藏中还原题目，进入答题模式。

**Files:**
- Create: `client/src/pages/ChallengePage.tsx`

**Step 1: 创建挑战页面**

```typescript
// client/src/pages/ChallengePage.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Question, SoloAnswerRecord } from '../../../shared/types';
import SoloQuestionCard from '../components/solo/SoloQuestionCard';
import SoloScoreBar from '../components/solo/SoloScoreBar';
import SoloResultScreen from '../components/solo/SoloResultScreen';
import CountdownOverlay from '../components/game/CountdownOverlay';
import { decodeChallengeToken } from '../utils/favorites';
import { getMistakes } from '../utils/mistakes';
import { upsertMistake } from '../utils/mistakes';
import { API_BASE } from '../utils/api';

type Phase = 'intro' | 'countdown' | 'playing' | 'result';

const QUESTION_TIME = 15;
const RESULT_DELAY = 1500;

export default function ChallengePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<SoloAnswerRecord[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [countdownNumber, setCountdownNumber] = useState(3);
  const [totalTime, setTotalTime] = useState(0);

  const questionStartRef = useRef(Date.now());
  const totalStartRef = useRef(0);

  // Decode token and find questions
  useEffect(() => {
    if (!token) { setError('无效的挑战链接'); return; }
    const ids = decodeChallengeToken(token);
    if (ids.length === 0) { setError('无效的挑战链接'); return; }

    // Try to find questions from favorites and mistakes first
    const allKnown = new Map<number, Question>();
    for (const fav of JSON.parse(localStorage.getItem('quizpk_favorites') || '[]')) {
      if (fav?.question?.id) allKnown.set(fav.question.id, fav.question);
    }
    for (const m of getMistakes()) {
      if (m?.question?.id) allKnown.set(m.question.id, m.question);
    }

    const found = ids.map(id => allKnown.get(id)).filter(Boolean) as Question[];
    if (found.length === 0) {
      setError('找不到挑战题目，请先收藏题目后生成挑战链接');
      return;
    }
    setQuestions(found);
  }, [token]);

  const handleStart = () => {
    setPhase('countdown');
    setCountdownNumber(3);
  };

  // Countdown
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdownNumber <= 1) {
      const timer = setTimeout(() => {
        setPhase('playing');
        setCurrentIndex(0);
        setAnswers([]);
        setScore(0);
        setAnswered(false);
        setSelectedOption(null);
        setTimeLeft(QUESTION_TIME);
        const now = Date.now();
        totalStartRef.current = now;
        questionStartRef.current = now;
      }, 1000);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setCountdownNumber(n => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdownNumber]);

  // Timer
  useEffect(() => {
    if (phase !== 'playing' || answered) return;
    questionStartRef.current = Date.now();
    setTimeLeft(QUESTION_TIME);
    const timer = setInterval(() => {
      setTimeLeft(prev => prev <= 1 ? 0 : prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, answered, currentIndex]);

  // Timeout
  useEffect(() => {
    if (timeLeft !== 0 || phase !== 'playing' || answered) return;
    const question = questions[currentIndex];
    if (!question) return;
    const timeSpent = Math.round((Date.now() - questionStartRef.current) / 100) / 10;
    setSelectedOption(null);
    setAnswered(true);
    setAnswers(prev => [...prev, { questionIndex: currentIndex, selectedOption: null, correct: false, timeSpent }]);
    upsertMistake(question, -1, question.answer);
  }, [timeLeft, phase, answered, questions, currentIndex]);

  const handleSelect = useCallback((optionIndex: number) => {
    if (answered) return;
    const question = questions[currentIndex];
    if (!question) return;
    const timeSpent = Math.round((Date.now() - questionStartRef.current) / 100) / 10;
    const isCorrect = optionIndex === question.answer;
    setSelectedOption(optionIndex);
    setAnswered(true);
    let points = 0;
    if (isCorrect) {
      points = 10;
      if (timeSpent < 5) points += 5;
      else if (timeSpent < 10) points += 2;
    }
    setScore(prev => prev + points);
    setAnswers(prev => [...prev, { questionIndex: currentIndex, selectedOption: optionIndex, correct: isCorrect, timeSpent }]);
    if (!isCorrect) upsertMistake(question, optionIndex, question.answer);
  }, [answered, questions, currentIndex]);

  // Auto-advance
  useEffect(() => {
    if (!answered || phase !== 'playing') return;
    const timer = setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setAnswered(false);
        setSelectedOption(null);
        setTimeLeft(QUESTION_TIME);
      } else {
        setTotalTime(Math.round((Date.now() - totalStartRef.current) / 1000));
        setPhase('result');
      }
    }, RESULT_DELAY);
    return () => clearTimeout(timer);
  }, [answered, phase, currentIndex, questions.length]);

  const handleGoHome = () => navigate('/');

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-5xl mb-4">😕</div>
        <p className="text-xl text-gray-600 mb-4">{error}</p>
        <button onClick={handleGoHome} className="px-6 py-3 bg-purple-500 text-white rounded-xl font-bold">
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      {phase === 'intro' && (
        <div className="min-h-[80vh] flex flex-col items-center justify-center">
          <div className="text-5xl mb-4">🎯</div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent mb-2">
            挑战模式
          </h2>
          <p className="text-gray-500 mb-6">共 {questions.length} 道题</p>
          <button
            onClick={handleStart}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white text-xl font-bold rounded-2xl shadow-lg hover:scale-105 transition-all duration-200"
          >
            开始挑战
          </button>
        </div>
      )}

      {phase === 'countdown' && <CountdownOverlay number={countdownNumber} />}

      {phase === 'playing' && questions[currentIndex] && (
        <div className="max-w-lg mx-auto pt-4">
          <div className="text-center mb-2">
            <span className="text-sm font-bold text-purple-500">🎯 挑战模式</span>
          </div>
          <SoloScoreBar
            currentQuestion={currentIndex}
            totalQuestions={questions.length}
            score={score}
            timeLeft={timeLeft}
            totalTime={QUESTION_TIME}
          />
          <SoloQuestionCard
            question={questions[currentIndex]}
            answered={answered}
            selectedOption={selectedOption}
            onSelect={handleSelect}
          />
        </div>
      )}

      {phase === 'result' && (
        <SoloResultScreen
          score={score}
          totalTime={totalTime}
          questions={questions}
          answers={answers}
          onPlayAgain={() => { setPhase('countdown'); setCountdownNumber(3); }}
          onGoHome={handleGoHome}
        />
      )}
    </div>
  );
}
```

**Step 2: 提交**

```bash
git add client/src/pages/ChallengePage.tsx
git commit -m "feat: add ChallengePage for shared question challenge links"
```

---

## Task 19: 注册路由和首页入口

将新页面注册到路由中，在首页添加「我的收藏」入口。

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/pages/HomePage.tsx`

**Step 1: 修改 App.tsx — 添加路由**

在 lazy import 区域添加：

```typescript
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const FavoritePracticePage = lazy(() => import('./pages/FavoritePracticePage'));
const ChallengePage = lazy(() => import('./pages/ChallengePage'));
```

在 `<Routes>` 中添加路由（在 `/mistakes` 路由后）：

```typescript
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/favorites/practice" element={<FavoritePracticePage />} />
        <Route path="/challenge/:token" element={<ChallengePage />} />
```

**Step 2: 修改 HomePage.tsx — 添加收藏入口**

添加 import：

```typescript
import { getFavorites } from '../utils/favorites';
```

在组件函数体中添加 state（与 mistakeCount 并列）：

```typescript
  const [favoriteCount, setFavoriteCount] = useState(() => getFavorites().length);
```

在 refreshMistakeCount 的 useEffect 中同时刷新收藏数：

```typescript
  useEffect(() => {
    const refresh = () => {
      setMistakeCount(getMistakes().length);
      setFavoriteCount(getFavorites().length);
    };
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);
```

在首页 JSX 的错题区域 `<div className="w-full max-w-xs ...">` 后面，添加收藏入口（与错题区域同级，在 `<Link to="/solo">` 之前）：

```typescript
        <Link
          to="/favorites"
          className="w-full max-w-xs px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 block text-center"
        >
          ⭐ 我的收藏
          <span className="ml-2 text-sm opacity-80">{favoriteCount}题</span>
        </Link>
```

**Step 3: 验证**

启动开发服务器，确认首页出现「我的收藏」入口，点击进入收藏列表页。确认 `/challenge/test` 路由可访问。

**Step 4: 提交**

```bash
git add client/src/App.tsx client/src/pages/HomePage.tsx
git commit -m "feat: register new routes and add favorites entry on homepage"
```

---

## 任务总结

| Task | 功能 | 新增/修改文件 | 复杂度 |
|------|------|-------------|--------|
| 1 | 统计工具函数 | +gameStats.ts | 低 |
| 2 | StatsCard 组件 | +StatsCard.tsx | 低 |
| 3 | ScoreChart 组件 | +ScoreChart.tsx | 中 |
| 4 | 对战报告组件 | +BattleReport.tsx | 中 |
| 5 | 单人报告组件 | +SoloReport.tsx | 低 |
| 6 | 集成对战报告 | ~ResultScreen.tsx | 低 |
| 7 | 集成单人报告 | ~SoloResultScreen.tsx | 低 |
| 8 | 安装 html2canvas | ~package.json | 低 |
| 9 | 分享工具函数 | +shareUtils.ts | 低 |
| 10 | 对战分享卡片 | +BattleShareCard.tsx | 低 |
| 11 | 单人分享卡片 | +SoloShareCard.tsx | 低 |
| 12 | 集成分享按钮 | ~ResultScreen, ~SoloResultScreen | 中 |
| 13 | 收藏工具函数 | +favorites.ts | 低 |
| 14 | 收藏按钮组件 | +FavoriteButton.tsx | 低 |
| 15 | 集成收藏按钮 | ~QuestionCard, ~SoloQuestionCard | 低 |
| 16 | 收藏列表页 | +FavoritesPage.tsx | 中 |
| 17 | 收藏练习页 | +FavoritePracticePage.tsx | 中 |
| 18 | 挑战页面 | +ChallengePage.tsx | 中 |
| 19 | 路由和首页 | ~App.tsx, ~HomePage.tsx | 低 |

**文件变更统计：** 15 个新增文件，6 个修改文件，0 个后端改动
