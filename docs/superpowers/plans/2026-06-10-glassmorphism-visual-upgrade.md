# Glassmorphism 视觉升级实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首页、游戏页（答题+结果状态）升级为毛玻璃视觉风格，增加微交互动效和加载状态体验。

**Architecture:** 纯 Tailwind CSS 实现，通过 tailwind.config.js 扩展新动画、index.css 添加全局背景样式，逐个组件升级为 glassmorphism 风格。不引入新依赖。

**Tech Stack:** React, Tailwind CSS, TypeScript

---

## File Structure

| 文件 | 操作 | 职责 |
|------|------|------|
| `client/tailwind.config.js` | 修改 | 新增 5 个动画 keyframes |
| `client/src/index.css` | 修改 | 全局渐变背景、光斑、shimmer、reduced-motion |
| `client/src/pages/HomePage.tsx` | 修改 | 首页毛玻璃卡片、文字色适配 |
| `client/src/pages/GamePage.tsx` | 修改 | 游戏页背景、题目切换 key 触发动画 |
| `client/src/components/game/ScoreBoard.tsx` | 修改 | 毛玻璃记分板、分数飘字动画 |
| `client/src/components/game/QuestionCard.tsx` | 修改 | 毛玻璃题目卡片、选项发光效果 |
| `client/src/components/game/ResultScreen.tsx` | 修改 | 毛玻璃结果卡片、计数器动画 |
| `client/src/components/game/CountdownOverlay.tsx` | 修改 | 圆形进度环 |
| `client/src/components/room/RoomLobby.tsx` | 修改 | 毛玻璃房间大厅 |

---

### Task 1: 扩展 Tailwind 动画 + 全局样式

**Files:**
- Modify: `client/tailwind.config.js`
- Modify: `client/src/index.css`

- [ ] **Step 1: 在 tailwind.config.js 中添加 5 个新动画**

在 `theme.extend.animation` 中添加，在 `theme.extend.keyframes` 中添加对应定义：

```js
// tailwind.config.js — 完整替换内容
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
        'fade-in-up': 'fadeInUp 0.4s ease-out',
        'scale-pop': 'scalePop 0.3s ease-out',
        'score-fly': 'scoreFly 0.8s ease-out forwards',
        'shimmer': 'shimmer 2s infinite linear',
        'slide-in': 'slideIn 0.3s ease-out',
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
        fadeInUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scalePop: {
          '0%': { transform: 'scale(0.9)' },
          '50%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
        scoreFly: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-32px) scale(1.2)', opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideIn: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 2: 在 index.css 中添加全局背景和工具类**

```css
/* client/src/index.css — 完整替换内容 */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply font-sans antialiased;
  }
}

@layer components {
  /* 毛玻璃背景 — 渐变 + 漂浮光斑 */
  .glass-bg {
    @apply min-h-screen relative overflow-hidden;
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 25%, #4c1d95 50%, #581c87 75%, #1e1b4b 100%);
    background-size: 400% 400%;
    animation: gradientShift 15s ease infinite;
  }

  /* 漂浮光斑（通过伪元素实现，无需额外 DOM） */
  .glass-bg::before,
  .glass-bg::after {
    content: '';
    position: fixed;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.3;
    pointer-events: none;
    z-index: 0;
  }

  .glass-bg::before {
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, #a855f7, transparent 70%);
    top: -100px;
    right: -100px;
    animation: orbFloat1 8s ease-in-out infinite;
  }

  .glass-bg::after {
    width: 350px;
    height: 350px;
    background: radial-gradient(circle, #ec4899, transparent 70%);
    bottom: -80px;
    left: -80px;
    animation: orbFloat2 10s ease-in-out infinite;
  }

  /* 毛玻璃卡片基础类 */
  .glass-card {
    @apply bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg;
    color: white;
  }

  /* 毛玻璃卡片 — 浅色（用于游戏区域需要高对比度的地方） */
  .glass-card-light {
    @apply bg-white/15 backdrop-blur-xl border border-white/25 rounded-2xl shadow-lg;
    color: white;
  }

  /* Shimmer 骨架屏效果 */
  .skeleton-shimmer {
    background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.05) 75%);
    background-size: 200% 100%;
    animation: shimmer 2s infinite linear;
  }
}

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes orbFloat1 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-60px, 40px); }
}

@keyframes orbFloat2 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(50px, -50px); }
}

/* 尊重用户减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .glass-bg {
    animation: none;
  }
  .glass-bg::before,
  .glass-bg::after {
    animation: none;
  }
  .skeleton-shimmer {
    animation: none;
  }
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 3: 启动开发服务器验证全局样式生效**

Run: `cd /Users/jinyn/work/srdt/client && npm run dev`

在浏览器中暂时访问任意页面，确认页面没有报错。此时还没有页面使用 `glass-bg`，只需确认构建无误。

- [ ] **Step 4: 提交**

```bash
git add client/tailwind.config.js client/src/index.css
git commit -m "feat(ui): add glassmorphism animations and global styles"
```

---

### Task 2: 升级首页（HomePage）

**Files:**
- Modify: `client/src/pages/HomePage.tsx`

- [ ] **Step 1: 将 HomePage 完整替换为毛玻璃版本**

关键改动：
1. 外层 `div` 从 `min-h-screen flex flex-col items-center justify-center p-4` 改为 `glass-bg flex flex-col items-center justify-center p-4`
2. 所有内容包裹在 `<div className="relative z-10">` 中，确保内容在光斑之上
3. 白色卡片改为 `glass-card`
4. 文字颜色从灰色系改为白色系（适配深色背景）
5. 输入框改为毛玻璃风格
6. 按钮增加 `hover:brightness-110` 光晕效果
7. 功能卡片增加 hover 浮起效果 `hover:-translate-y-1`

```tsx
// client/src/pages/HomePage.tsx — 完整替换内容
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../contexts/AuthContext';
import { getMistakes } from '../utils/mistakes';
import { getFavorites } from '../utils/favorites';

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
  const [favoriteCount, setFavoriteCount] = useState(() => getFavorites().length);

  useEffect(() => {
    const saved = getSavedRoom();
    if (saved) setSavedRoom(saved);
  }, []);

  useEffect(() => {
    const refresh = () => {
      setMistakeCount(getMistakes().length);
      setFavoriteCount(getFavorites().length);
    };
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
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
    <div className="glass-bg flex flex-col items-center justify-center p-4">
      <div className="relative z-10 flex flex-col items-center w-full">
        <div className="text-center mb-10 animate-fade-in-up">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300 bg-clip-text text-transparent mb-3 drop-shadow-lg">
            🧠 知识PK大作战
          </h1>
          <p className="text-base sm:text-lg text-white/60">两人对战，抢答PK，谁才是知识之王？</p>
          <p className="text-sm text-purple-300/80 mt-1">👋 {user?.nickname}</p>
        </div>

        {!connected && (
          <div className="mb-8 px-4 py-2 bg-yellow-500/20 backdrop-blur-sm text-yellow-300 rounded-full text-sm border border-yellow-500/30">
            正在连接服务器...
          </div>
        )}

        {savedRoom && (
          <div className="mb-6 w-full max-w-xs glass-card p-4 text-center">
            <p className="text-sm text-white/80 mb-3">你有一局未完成的游戏</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleReconnect}
                disabled={!connected || reconnecting}
                className="px-5 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl hover:brightness-110 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {reconnecting ? '⏳ 重连中...' : '🔄 回到房间'}
              </button>
              <button
                onClick={handleDismissSaved}
                className="px-5 py-2 bg-white/10 text-white/70 font-bold rounded-xl hover:bg-white/20 transition-colors text-sm border border-white/10"
              >
                放弃
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
          <div className="w-full max-w-xs glass-card p-3">
            <div className="flex items-center justify-between gap-2">
              <Link
                to="/mistakes"
                className="flex-1 min-w-0 px-4 py-2.5 bg-white/10 text-white/80 font-bold rounded-xl hover:bg-white/20 hover:text-white transition-colors"
              >
                错题回顾
                <span className="ml-2 text-xs text-white/40">{mistakeCount}题</span>
              </Link>
              <button
                onClick={handleMistakePractice}
                disabled={mistakeCount === 0}
                className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl hover:brightness-110 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                错题考试
              </button>
            </div>
          </div>

          <Link
            to="/favorites"
            className="w-full max-w-xs px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 hover:brightness-110 transition-all duration-200 block text-center"
          >
            ⭐ 我的收藏
            <span className="ml-2 text-sm opacity-80">{favoriteCount}题</span>
          </Link>

          <div className="w-full max-w-xs flex gap-3">
            <Link
              to="/solo"
              className="flex-1 px-6 py-3.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 hover:brightness-110 transition-all duration-200 block text-center"
            >
              📝 单人答题
            </Link>
            <Link
              to="/history"
              className="flex-1 px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 hover:brightness-110 transition-all duration-200 block text-center"
            >
              📊 战绩
            </Link>
          </div>

          <button
            onClick={handleCreate}
            disabled={!connected}
            className="w-full max-w-xs px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 hover:brightness-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🎮 创建房间
          </button>

          <div className="text-white/30 text-sm">— 或者 —</div>

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
                className="flex-1 min-w-0 px-3 sm:px-4 py-3 text-center text-xl sm:text-2xl font-mono tracking-[0.3em] sm:tracking-[0.5em] bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-xl text-white placeholder-white/30 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/30 transition-all"
              />
              <button
                onClick={handleJoin}
                disabled={joining || roomId.length !== 4}
                className="px-4 sm:px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-base sm:text-lg font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 hover:brightness-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {joining ? '⏳' : '🚪 加入'}
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-red-400 text-center">{error}</p>}
          </div>
        </div>

        <div className="mt-10 flex items-center gap-4">
          <Link
            to="/admin"
            className="text-white/40 hover:text-purple-300 transition-colors text-sm flex items-center gap-1"
          >
            ⚙️ 题库管理
          </Link>
          <button
            onClick={logout}
            className="text-white/40 hover:text-red-400 transition-colors text-sm flex items-center gap-1"
          >
            🚪 退出
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 启动开发服务器并验证首页效果**

Run: `cd /Users/jinyn/work/srdt/client && npm run dev`

确认：
- 背景为紫色渐变 + 漂浮光斑
- 卡片为半透明毛玻璃效果
- 文字为白色系，清晰可读
- 按钮 hover 有光晕效果
- 输入框为毛玻璃风格

- [ ] **Step 3: 提交**

```bash
git add client/src/pages/HomePage.tsx
git commit -m "feat(ui): upgrade HomePage to glassmorphism style"
```

---

### Task 3: 升级游戏页背景 + 房间大厅

**Files:**
- Modify: `client/src/pages/GamePage.tsx`
- Modify: `client/src/components/room/RoomLobby.tsx`

- [ ] **Step 1: 升级 GamePage 背景为 glass-bg**

在 `GamePage.tsx` 中，将外层容器从 `<div className="min-h-screen p-4">` 改为带 `glass-bg` 的版本。同时给题目卡片和记分板区域添加 `relative z-10`。错误提示和 info 提示也适配深色背景。

改动点：
1. 外层 `<div className="min-h-screen p-4">` → `<div className="glass-bg p-4">`
2. 错误页面的容器也加 `glass-bg`
3. playing 区域包裹 `<div className="relative z-10 max-w-lg mx-auto pt-4">`
4. lobby 的 info 提示文字改为 `text-blue-300 bg-blue-500/20 border border-blue-500/30`
5. 底部错误提示改为 `bg-yellow-500/20 backdrop-blur-sm text-yellow-300 border border-yellow-500/30`
6. 给 QuestionCard 添加 `key={currentQuestion.id ?? questionIndex}` 触发换题动画

具体修改 `GamePage.tsx` 的 render 部分（约 307-343 行）：

```tsx
  // 错误页（约 307-317 行）
  if (error && phase === 'lobby') {
    return (
      <div className="glass-bg flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4">😕</div>
        <p className="text-xl text-white/70 mb-4">{error}</p>
        <button onClick={handleGoHome} className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-bold hover:brightness-110 transition-all">
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div className="glass-bg p-4">
      {phase === 'countdown' && <CountdownOverlay number={countdownNumber} />}
      {phase === 'lobby' && (
        <div className="relative z-10">
          {infoMessage && (
            <div className="max-w-lg mx-auto mb-4 px-4 py-3 bg-blue-500/20 backdrop-blur-sm text-blue-300 border border-blue-500/30 rounded-xl text-sm font-medium text-center">{infoMessage}</div>
          )}
          <RoomLobby roomId={roomId!} playerIndex={effectivePlayerIndex} players={players} connected={connected} selectedQuiz={selectedQuiz} questionCount={questionCount} onEmit={emit as any} />
        </div>
      )}
      {phase === 'playing' && currentQuestion && (
        <div className="relative z-10 max-w-lg mx-auto pt-4">
          <ScoreBoard playerIndex={effectivePlayerIndex} scores={scores} totalQuestions={totalQuestions} currentQuestion={questionIndex} players={players} />
          <QuestionCard key={currentQuestion.id ?? questionIndex} question={currentQuestion} questionIndex={questionIndex} myAnswered={myAnswered} opponentAnswered={opponentAnswered} showResult={showResult} onSubmit={handleSubmitAnswer} playerIndex={effectivePlayerIndex} players={players} />
        </div>
      )}
      {phase === 'result' && gameResult && (
        <ResultScreen result={gameResult} playerIndex={effectivePlayerIndex} players={players} onPlayAgain={handlePlayAgain} onGoHome={handleGoHome} opponentWantsPlayAgain={opponentWantsPlayAgain} />
      )}
      {error && phase !== 'lobby' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 bg-yellow-500/20 backdrop-blur-sm text-yellow-300 border border-yellow-500/30 rounded-full shadow-lg text-sm font-medium">{error}</div>
      )}
    </div>
  );
```

- [ ] **Step 2: 升级 RoomLobby 为毛玻璃风格**

在 `RoomLobby.tsx` 中，适配深色背景：
1. 房间号背景：白底 → `glass-card`
2. 玩家卡片：白底 → `glass-card`，文字改为白色系
3. 题库选择按钮：白底 → 毛玻璃，选中状态保留紫色渐变
4. 准备按钮：保持渐变色，加 `hover:brightness-110`
5. 文字颜色：灰色 → 白色/透明度白色

具体修改：

```tsx
// RoomLobby.tsx — 完整替换
import { useState, useEffect } from 'react';
import type { Player, QuestionCount, Quiz } from '../../../../shared/types';
import { API_BASE } from '../../utils/api';

interface RoomLobbyProps {
  roomId: string;
  playerIndex: number;
  players: (Player | null)[];
  connected: boolean;
  selectedQuiz: number | null;
  questionCount: QuestionCount;
  onEmit: (event: string, ...args: any[]) => void;
}

const QUESTION_COUNTS: QuestionCount[] = [10, 20, 30];

export default function RoomLobby({ roomId, playerIndex, players, connected, selectedQuiz, questionCount, onEmit }: RoomLobbyProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/quizzes`).then(res => res.json()).then(setQuizzes).catch(console.error);
  }, []);

  const myPlayer = players[playerIndex];
  const opponent = players[1 - playerIndex];
  const ready = !!myPlayer?.ready;
  const opponentReady = !!opponent?.ready;

  return (
    <div className="max-w-lg mx-auto p-4 sm:p-6">
      <div className="text-center mb-6 sm:mb-8">
        <div className="text-white/50 text-xs sm:text-sm mb-1">房间号</div>
        <div className="text-3xl sm:text-4xl font-mono font-black tracking-[0.2em] sm:tracking-[0.3em] text-purple-300 glass-card px-4 sm:px-6 py-2 sm:py-3 inline-block">
          {roomId}
        </div>
      </div>

      <div className="flex justify-center gap-3 sm:gap-8 mb-6 sm:mb-8">
        <div className={`text-center px-3 sm:px-6 py-3 rounded-xl transition-all duration-300 ${myPlayer?.ready ? 'glass-card border-green-400/40 bg-green-500/15' : 'glass-card'}`}>
          <div className="text-2xl mb-1">👤</div>
          <div className="font-bold text-sm sm:text-base text-white/90">{myPlayer?.name}</div>
          <div className="text-xs sm:text-sm text-white/50">{myPlayer?.ready ? '✅ 已准备' : '等待准备'}</div>
        </div>
        <div className={`text-center px-3 sm:px-6 py-3 rounded-xl transition-all duration-300 ${opponent ? (opponentReady ? 'glass-card border-green-400/40 bg-green-500/15' : 'glass-card') : 'border-2 border-dashed border-yellow-400/30 bg-yellow-500/10 rounded-xl'}`}>
          <div className="text-2xl mb-1">{opponent ? '👤' : '⏳'}</div>
          <div className="font-bold text-sm sm:text-base text-white/90">{opponent?.name || '等待对手...'}</div>
          <div className="text-xs sm:text-sm text-white/50">{opponent ? (opponentReady ? '✅ 已准备' : '等待准备') : '等待加入'}</div>
        </div>
      </div>

      {opponent && (
        <div className="mb-6 sm:mb-8">
          <h3 className="text-center text-white/60 font-medium mb-3 text-sm sm:text-base">选择对战题库</h3>
          <div className="space-y-2">
            {quizzes.map(quiz => (
              <button
                key={quiz.id}
                onClick={() => { onEmit('select-quiz', quiz.id); }}
                disabled={!connected}
                className={`w-full px-3 sm:px-4 py-3 rounded-xl text-left transition-all text-sm sm:text-base ${
                  selectedQuiz === quiz.id ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg scale-[1.02] brightness-110' : 'glass-card hover:bg-white/20'
                }`}
              >
                <span className="font-medium">{quiz.name}</span>
                <span className={`text-xs sm:text-sm ml-2 ${selectedQuiz === quiz.id ? 'text-white/70' : 'text-white/40'}`}>({quiz.questionCount ?? 0}题)</span>
              </button>
            ))}
            <button
              onClick={() => { onEmit('select-quiz', null); }}
              disabled={!connected}
              className={`w-full px-4 py-3 rounded-xl text-left transition-all ${
                selectedQuiz === null ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg scale-[1.02]' : 'glass-card hover:bg-white/20'
              }`}
            >
              <span className="font-medium">🎲 随机出题</span>
              <span className={`text-xs sm:text-sm ml-2 ${selectedQuiz === null ? 'text-white/70' : 'text-white/40'}`}>(从所有题库随机)</span>
            </button>
          </div>
        </div>
      )}

      {opponent && (
        <div className="mb-6 sm:mb-8">
          <h3 className="text-center text-white/60 font-medium mb-3 text-sm sm:text-base">选择答题数量</h3>
          <div className="grid grid-cols-3 gap-2">
            {QUESTION_COUNTS.map(count => (
              <button
                key={count}
                onClick={() => { onEmit('select-question-count', count); }}
                disabled={!connected}
                className={`px-3 py-3 rounded-xl text-center font-bold transition-all ${
                  questionCount === count
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg scale-[1.02]'
                    : 'glass-card hover:bg-white/20 text-white/70'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {count}题
              </button>
            ))}
          </div>
        </div>
      )}

      {opponent && !ready && (
        <div className="text-center">
          <button
            onClick={() => { onEmit('player-ready'); }}
            disabled={!connected}
            className="px-8 sm:px-12 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-lg sm:text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 hover:brightness-110 transition-all duration-200"
          >
            ✋ 准备就绪！
          </button>
        </div>
      )}
      {ready && !opponentReady && (
        <div className="text-center text-white/50 animate-pulse">等待对手准备...</div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 验证游戏页大厅效果**

确认房间大厅在深色毛玻璃背景下文字清晰、卡片半透明、按钮可交互。

- [ ] **Step 4: 提交**

```bash
git add client/src/pages/GamePage.tsx client/src/components/room/RoomLobby.tsx
git commit -m "feat(ui): upgrade GamePage background and RoomLobby to glassmorphism"
```

---

### Task 4: 升级记分板 + 分数飘字动画

**Files:**
- Modify: `client/src/components/game/ScoreBoard.tsx`

- [ ] **Step 1: 升级 ScoreBoard 为毛玻璃 + 分数飘字效果**

关键改动：
1. 卡片改为 `glass-card` 样式
2. 用 `useRef` + `useEffect` 监听分数变化，触发飘字动画
3. 文字改为白色系
4. 进度点改为半透明样式

```tsx
// client/src/components/game/ScoreBoard.tsx — 完整替换
import { useState, useEffect, useRef } from 'react';
import type { Player } from '../../../../shared/types';

interface ScoreBoardProps {
  playerIndex: number;
  scores: [number, number];
  totalQuestions: number;
  currentQuestion: number;
  players: (Player | null)[];
}

export default function ScoreBoard({ playerIndex, scores, totalQuestions, currentQuestion, players }: ScoreBoardProps) {
  const myScore = scores[playerIndex];
  const opponentScore = scores[1 - playerIndex];
  const myName = players[playerIndex]?.name || '你';
  const opponentName = players[1 - playerIndex]?.name || '对手';

  const prevScoresRef = useRef(scores);
  const [flyingScore, setFlyingScore] = useState<{ side: 'my' | 'opponent'; key: number } | null>(null);

  useEffect(() => {
    const prevMy = prevScoresRef.current[playerIndex];
    const prevOpp = prevScoresRef.current[1 - playerIndex];
    if (myScore > prevMy) {
      setFlyingScore({ side: 'my', key: Date.now() });
    } else if (opponentScore > prevOpp) {
      setFlyingScore({ side: 'opponent', key: Date.now() });
    }
    prevScoresRef.current = scores;
  }, [scores, playerIndex, myScore, opponentScore]);

  return (
    <div className="glass-card flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 mb-4 sm:mb-6 relative">
      <div className="text-xs sm:text-sm font-medium text-white/50">
        第 {currentQuestion + 1}/{totalQuestions} 题
      </div>
      <div className="flex items-center gap-3 sm:gap-6">
        <div className="text-center relative">
          <div className="text-xs text-white/40">{myName}</div>
          <div className="text-xl sm:text-2xl font-black text-purple-300">{myScore}</div>
          {flyingScore?.side === 'my' && (
            <span key={flyingScore.key} className="absolute -top-2 left-1/2 -translate-x-1/2 text-green-400 font-black text-sm animate-score-fly pointer-events-none">
              +1
            </span>
          )}
        </div>
        <div className="text-white/20 font-bold">VS</div>
        <div className="text-center relative">
          <div className="text-xs text-white/40">{opponentName}</div>
          <div className="text-xl sm:text-2xl font-black text-pink-300">{opponentScore}</div>
          {flyingScore?.side === 'opponent' && (
            <span key={flyingScore.key} className="absolute -top-2 left-1/2 -translate-x-1/2 text-pink-400 font-black text-sm animate-score-fly pointer-events-none">
              +1
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证记分板效果**

确认毛玻璃效果、分数飘字动画正常。

- [ ] **Step 3: 提交**

```bash
git add client/src/components/game/ScoreBoard.tsx
git commit -m "feat(ui): upgrade ScoreBoard with glass effect and score fly animation"
```

---

### Task 5: 升级答题卡片（QuestionCard）

**Files:**
- Modify: `client/src/components/game/QuestionCard.tsx`

- [ ] **Step 1: 升级 QuestionCard 为毛玻璃 + 选项发光效果**

关键改动：
1. 题目卡片改为 `glass-card`
2. 选项按钮默认态改为 `glass-card` 风格，hover 时边框发光 + 轻微浮起
3. 答对状态：绿色渐变 + ✓ 图标弹入
4. 答错状态：保留 shake + ✗ 图标弹入
5. 等待/提示文字改为白色系
6. ScoreHint 组件也适配深色背景
7. 整体添加 `animate-fade-in-up` 入场动画

```tsx
// client/src/components/game/QuestionCard.tsx — 完整替换
import type { Question, Player } from '../../../../shared/types';
import FavoriteButton from '../common/FavoriteButton';

interface QuestionCardProps {
  question: Question;
  questionIndex: number;
  myAnswered: boolean;
  opponentAnswered: boolean;
  showResult: {
    answers: [
      { selectedOption: number; correct: boolean } | null,
      { selectedOption: number; correct: boolean } | null,
    ];
    correctAnswer: number;
  } | null;
  onSubmit: (optionIndex: number) => void;
  playerIndex: number;
  players: (Player | null)[];
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function QuestionCard({ question, myAnswered, opponentAnswered, showResult, onSubmit, playerIndex, players }: QuestionCardProps) {
  const myName = players[playerIndex]?.name || '我';
  const opponentName = players[1 - playerIndex]?.name || '对手';
  const disabled = myAnswered || !!showResult;

  return (
    <div className="w-full max-w-lg mx-auto animate-fade-in-up">
      <div className="glass-card-light p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs text-purple-300 font-medium mb-2">
              {question.type === 'judge' ? '✅ 判断题' : '📝 单选题'}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white leading-relaxed">{question.content}</h2>
          </div>
          {showResult && <FavoriteButton question={question} />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:gap-3">
        {question.options.map((option, idx) => {
          const isCorrectOption = showResult?.correctAnswer === idx;
          const mySelection = showResult?.answers[playerIndex]?.selectedOption;
          const opponentSelection = showResult?.answers[1 - playerIndex]?.selectedOption;
          const isMyChoice = mySelection === idx;
          const isOpponentChoice = opponentSelection === idx;
          const label = question.type === 'judge' ? (idx === 0 ? '✓' : '✗') : OPTION_LABELS[idx];

          let optionClass = 'bg-white/10 text-white/80 font-bold min-h-[48px] py-3 px-4 sm:py-4 sm:px-6 rounded-xl border border-white/10 break-words';
          let labelClass = 'bg-white/15 text-white/70 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-black';
          let tag: string | null = null;
          let icon: string | null = null;

          if (showResult) {
            if (isCorrectOption) {
              optionClass = 'bg-green-500/25 text-green-300 font-bold min-h-[48px] py-3 px-4 sm:py-4 sm:px-6 rounded-xl border-2 border-green-400/50 shadow-[0_0_15px_rgba(34,197,94,0.3)] break-words';
              labelClass = 'bg-green-500/40 text-green-200 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-black';
              icon = '✓';
            } else if (isMyChoice && !showResult.answers[playerIndex]?.correct) {
              optionClass = 'bg-red-500/25 text-red-300 font-bold min-h-[48px] py-3 px-4 sm:py-4 sm:px-6 rounded-xl border-2 border-red-400/50 animate-shake break-words';
              labelClass = 'bg-red-500/40 text-red-200 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-black';
              icon = '✗';
            } else {
              optionClass = 'bg-white/5 text-white/30 font-bold min-h-[48px] py-3 px-4 sm:py-4 sm:px-6 rounded-xl border border-white/5 break-words';
              labelClass = 'bg-white/10 text-white/30 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-black';
            }
            if (isMyChoice) tag = myName;
            if (isOpponentChoice) tag = tag ? `${tag} · ${opponentName}` : opponentName;
          } else if (disabled) {
            optionClass = 'bg-white/5 text-white/30 font-bold min-h-[48px] py-3 px-4 sm:py-4 sm:px-6 rounded-xl border border-white/5 cursor-not-allowed break-words';
            labelClass = 'bg-white/10 text-white/30 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-black';
          }

          return (
            <button
              key={idx}
              onClick={() => !disabled && !showResult && onSubmit(idx)}
              disabled={disabled || !!showResult}
              className={`${optionClass} ${!disabled && !showResult ? 'hover:bg-white/20 hover:border-white/30 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] transition-all duration-200' : ''} text-left transition-all duration-200`}
            >
              <span className="inline-flex items-center gap-3">
                <span className={labelClass}>{icon ? <span className="animate-scale-pop">{icon}</span> : label}</span>
                <span className="flex-1">{option.replace(/^[A-D][.、]\s*/, '')}</span>
                {showResult && tag && (
                  <span className="text-xs opacity-70 ml-2">({tag})</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {myAnswered && !showResult && !opponentAnswered && (
        <div className="text-center mt-4 text-purple-300/80 font-medium animate-pulse">⏳ 等待对手作答...</div>
      )}
      {!myAnswered && opponentAnswered && !showResult && (
        <div className="text-center mt-4 text-yellow-300/80 font-medium animate-pulse">⚡ 对手已提交答案！</div>
      )}

      {showResult && (
        <ScoreHint
          answers={showResult.answers}
          playerIndex={playerIndex}
          opponentName={opponentName}
        />
      )}
    </div>
  );
}

/** Show who scored on this question */
function ScoreHint({ answers, playerIndex, opponentName }: {
  answers: [
    { selectedOption: number; correct: boolean } | null,
    { selectedOption: number; correct: boolean } | null,
  ];
  playerIndex: number;
  opponentName: string;
}) {
  const myAnswer = answers[playerIndex];
  const opponentAnswer = answers[1 - playerIndex];
  const iScored = myAnswer?.correct === true;
  const opponentScored = opponentAnswer?.correct === true;

  if (iScored && opponentScored) {
    return (
      <div className="text-center mt-4 px-4 py-2.5 bg-green-500/15 border border-green-400/30 rounded-xl text-green-300 font-bold text-sm">
        🤝 两人都答对了！各得 1 分
      </div>
    );
  }
  if (iScored) {
    return (
      <div className="text-center mt-4 px-4 py-2.5 bg-green-500/15 border border-green-400/30 rounded-xl text-green-300 font-bold text-sm">
        ✅ 你答对了！+1 分
      </div>
    );
  }
  if (opponentScored) {
    return (
      <div className="text-center mt-4 px-4 py-2.5 bg-pink-500/15 border border-pink-400/30 rounded-xl text-pink-300 font-bold text-sm">
        ❌ {opponentName} 答对了！+1 分
      </div>
    );
  }
  return (
    <div className="text-center mt-4 px-4 py-2.5 bg-white/10 border border-white/10 rounded-xl text-white/50 font-bold text-sm">
      😅 两人都答错了，无人得分
    </div>
  );
}
```

- [ ] **Step 2: 验证答题卡片效果**

确认：题目卡片毛玻璃、选项 hover 发光浮起、答对绿色脉冲+✓弹入、答错抖动+✗弹入。

- [ ] **Step 3: 提交**

```bash
git add client/src/components/game/QuestionCard.tsx
git commit -m "feat(ui): upgrade QuestionCard with glass effect and option glow"
```

---

### Task 6: 升级结果页（ResultScreen）

**Files:**
- Modify: `client/src/components/game/ResultScreen.tsx`

- [ ] **Step 1: 升级 ResultScreen 为毛玻璃 + 计数器动画**

关键改动：
1. 比分大卡片改为 `glass-card`
2. 分数用 `useEffect` + `useState` 实现从 0 递增到最终分数的动画
3. 答题回顾卡片改为 `glass-card`
4. 按钮适配深色背景
5. 结果标题文字改为白色系
6. 底部按钮：毛玻璃风格

```tsx
// client/src/components/game/ResultScreen.tsx — 完整替换
import { useState, useRef, useEffect } from 'react';
import type { GameOverPayload, Player } from '../../../../shared/types';
import BattleReport from '../report/BattleReport';
import BattleShareCard from '../share/BattleShareCard';
import { captureAndDownload } from '../../utils/shareUtils';

interface ResultScreenProps {
  result: GameOverPayload;
  playerIndex: number;
  players: (Player | null)[];
  onPlayAgain: () => void;
  onGoHome: () => void;
  opponentWantsPlayAgain: boolean;
}

/** Count up from 0 to target over ~600ms */
function useCountUp(target: number, duration = 600) {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      // ease-out curve
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  return value;
}

export default function ResultScreen({ result, playerIndex, players, onPlayAgain, onGoHome, opponentWantsPlayAgain }: ResultScreenProps) {
  const [showReport, setShowReport] = useState(false);
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const { scores, winner, answers, questions } = result;
  const myScore = useCountUp(scores[playerIndex]);
  const opponentScore = useCountUp(scores[1 - playerIndex]);
  const isWinner = winner === playerIndex;
  const isDraw = winner === null;

  const myName = players[playerIndex]?.name ?? '你';
  const opponentName = players[1 - playerIndex]?.name ?? '对手';

  const handleShare = async () => {
    setSharing(true);
    await new Promise(r => setTimeout(r, 100));
    const el = shareCardRef.current;
    if (el) {
      await captureAndDownload(el, `知识PK-${myName}vs${opponentName}.png`);
    }
    setSharing(false);
  };

  const answerMap = new Map<number, { playerIndex: number; selectedOption: number; correct: boolean }[]>();
  for (const a of answers) {
    const questionAnswers = answerMap.get(a.questionIndex) ?? [];
    questionAnswers.push(a);
    answerMap.set(a.questionIndex, questionAnswers);
  }

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
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 relative z-10">
      {(isWinner || isDraw) && confettiPieces}

      <div className="text-center mb-6 sm:mb-8 animate-fade-in-up">
        <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">{isWinner ? '🏆' : isDraw ? '🤝' : '😅'}</div>
        <h2 className="text-2xl sm:text-3xl font-black">
          {isWinner ? (
            <span className="bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">你赢了！</span>
          ) : isDraw ? (
            <span className="bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">势均力敌！</span>
          ) : (
            <span className="text-white/60">惜败一步</span>
          )}
        </h2>
      </div>

      <div className="glass-card p-5 sm:p-8 mb-6 sm:mb-8 w-full max-w-sm animate-scale-pop">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <div className="text-sm text-white/50 mb-1">{myName}</div>
            <div className="text-3xl sm:text-4xl font-black text-purple-300">{myScore}</div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white/20 px-3 sm:px-4">VS</div>
          <div className="text-center flex-1">
            <div className="text-sm text-white/50 mb-1">{opponentName}</div>
            <div className="text-3xl sm:text-4xl font-black text-pink-300">{opponentScore}</div>
          </div>
        </div>
      </div>

      {showReport && (
        <BattleReport result={result} playerIndex={playerIndex} players={players} />
      )}
      {!showReport && (
      <div className="w-full max-w-lg mb-6 sm:mb-8">
        <h3 className="text-sm text-white/50 font-medium mb-4">答题回顾</h3>
        <div className="space-y-3">
          {questions.map((question, idx) => {
            const questionAnswers = answerMap.get(idx) ?? [];
            const myAnswer = questionAnswers.find(answer => answer.playerIndex === playerIndex);
            const opponentAnswer = questionAnswers.find(answer => answer.playerIndex === 1 - playerIndex);

            return (
              <div key={idx} className="glass-card overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
                  <span className="text-xs font-bold text-white/40">第 {idx + 1} 题</span>
                  {myAnswer || opponentAnswer ? (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                      {myName}{myAnswer ? (myAnswer.correct ? '✓' : '✗') : '未答'} / {opponentName}{opponentAnswer ? (opponentAnswer.correct ? '✓' : '✗') : '未答'}
                    </span>
                  ) : (
                    <span className="text-xs text-white/30">未作答</span>
                  )}
                </div>

                {/* Question content */}
                <div className="px-4 py-3">
                  <p className="text-sm font-medium text-white/80 mb-3">{question.content}</p>

                  {/* Options */}
                  <div className="space-y-1.5">
                    {question.options.map((option, optIdx) => {
                      const isCorrectAnswer = optIdx === question.answer;
                      const isMySelection = myAnswer?.selectedOption === optIdx;
                      const isOpponentSelection = opponentAnswer?.selectedOption === optIdx;

                      let optionStyle = 'bg-white/5 text-white/40 border border-transparent';
                      const indicators: string[] = [];

                      if (isCorrectAnswer) {
                        optionStyle = 'bg-green-500/15 text-green-300 border border-green-400/30';
                        indicators.push('正确答案');
                      }
                      if (isMySelection && !isCorrectAnswer) {
                        optionStyle = 'bg-red-500/15 text-red-300 border border-red-400/30';
                        indicators.push(`${myName}选错`);
                      }
                      if (isOpponentSelection && !isCorrectAnswer) {
                        optionStyle = isMySelection
                          ? 'bg-red-500/15 text-red-300 border border-red-400/30'
                          : 'bg-pink-500/15 text-pink-300 border border-pink-400/30';
                        indicators.push(`${opponentName}选错`);
                      }
                      if ((isMySelection || isOpponentSelection) && isCorrectAnswer) {
                        optionStyle = 'bg-green-500/20 text-green-300 border border-green-400/40';
                        if (isMySelection) indicators.push(`${myName}答对`);
                        if (isOpponentSelection) indicators.push(`${opponentName}答对`);
                      }

                      return (
                        <div key={optIdx} className={`rounded-lg px-3 py-2 text-sm flex items-center justify-between ${optionStyle}`}>
                          <span className="flex items-center gap-2">
                            <span className="text-xs font-mono text-white/30">{String.fromCharCode(65 + optIdx)}</span>
                            <span>{option}</span>
                          </span>
                          {indicators.length > 0 && (
                            <span className="text-xs font-medium whitespace-nowrap ml-2">{indicators.join(' · ')}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      <div className="flex gap-3 flex-wrap justify-center">
        <button
          onClick={() => setShowReport(!showReport)}
          className="glass-card px-6 py-3 font-bold hover:bg-white/20 transition-all"
        >
          {showReport ? '📋 答题回顾' : '📊 查看报告'}
        </button>
        <button
          onClick={handleShare}
          disabled={sharing}
          className="px-6 py-3 bg-gradient-to-r from-orange-400 to-pink-500 text-white font-bold rounded-xl hover:scale-105 hover:brightness-110 transition-all duration-200 shadow-lg disabled:opacity-50"
        >
          {sharing ? '⏳ 生成中...' : '📤 分享战绩'}
        </button>
        {opponentWantsPlayAgain ? (
          <button
            onClick={onPlayAgain}
            className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:scale-105 hover:brightness-110 transition-all duration-200 shadow-lg animate-pulse"
          >
            🎯 对手想再来！点击开始
          </button>
        ) : (
          <button
            onClick={onPlayAgain}
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl hover:scale-105 hover:brightness-110 transition-all duration-200 shadow-lg"
          >
            再来一局
          </button>
        )}
        <button
          onClick={onGoHome}
          className="px-8 py-3 glass-card font-bold hover:bg-white/20 transition-all"
        >
          返回首页
        </button>
      </div>

      {/* Hidden share card for capture */}
      <div className="fixed left-[-9999px] top-0">
        <BattleShareCard ref={shareCardRef} result={result} playerIndex={playerIndex} players={players} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证结果页效果**

确认：计数器动画从 0 递增、毛玻璃卡片、文字白色系、按钮交互正常。

- [ ] **Step 3: 提交**

```bash
git add client/src/components/game/ResultScreen.tsx
git commit -m "feat(ui): upgrade ResultScreen with glass effect and score counter animation"
```

---

### Task 7: 升级倒计时叠加层

**Files:**
- Modify: `client/src/components/game/CountdownOverlay.tsx`

- [ ] **Step 1: 为倒计时添加圆形进度环**

保持现有毛玻璃遮罩和弹跳动画，增加一个圆形进度环环绕数字。

```tsx
// client/src/components/game/CountdownOverlay.tsx — 完整替换
interface CountdownOverlayProps {
  number: number;
}

export default function CountdownOverlay({ number }: CountdownOverlayProps) {
  const circumference = 2 * Math.PI * 70; // radius=70

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50">
      <div className="relative animate-bounce-in">
        {/* Circular progress ring */}
        <svg
          className="absolute inset-0 w-full h-full -rotate-90"
          viewBox="0 0 180 180"
          style={{ filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.6))' }}
        >
          <circle
            cx="90"
            cy="90"
            r="70"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="6"
          />
          <circle
            cx="90"
            cy="90"
            r="70"
            fill="none"
            stroke="url(#countdownGradient)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - number / 3)}
            style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
          />
          <defs>
            <linearGradient id="countdownGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </svg>
        {/* Number */}
        <div
          className="w-[180px] h-[180px] flex items-center justify-center text-[5rem] sm:text-[6rem] font-black text-white"
          style={{ textShadow: '0 0 40px rgba(168, 85, 247, 0.8), 0 0 80px rgba(168, 85, 247, 0.3)' }}
        >
          {number}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证倒计时效果**

确认：紫色渐变进度环随倒计时填充、数字弹跳、背景模糊遮罩。

- [ ] **Step 3: 提交**

```bash
git add client/src/components/game/CountdownOverlay.tsx
git commit -m "feat(ui): add circular progress ring to countdown overlay"
```

---

### Task 8: 最终验证 + 全局检查

**Files:** 无新增修改

- [ ] **Step 1: 启动完整开发环境**

Run:
```bash
cd /Users/jinyn/work/srdt/server && npm run dev &
cd /Users/jinyn/work/srdt/client && npm run dev
```

- [ ] **Step 2: 逐页面验证**

1. **首页** — 渐变背景 + 光斑 + 毛玻璃卡片 + hover 效果
2. **创建房间 → 大厅** — 深色背景 + 毛玻璃房间号 + 玩家卡片
3. **倒计时** — 进度环 + 弹跳数字
4. **答题中** — 毛玻璃记分板 + 分数飘字 + 选项发光 + 答对/答错反馈
5. **结果页** — 计数器动画 + 毛玻璃比分 + 答题回顾

- [ ] **Step 3: 检查浏览器控制台无报错**

确认无 TypeScript 编译错误、无运行时错误。

- [ ] **Step 4: 最终提交**

```bash
git add -A
git commit -m "feat(ui): complete glassmorphism visual upgrade"
```
