# 视觉升级设计方案：毛玻璃风格 (Glassmorphism)

**日期**：2026-06-10
**范围**：首页、游戏页（含答题和结果状态）
**方案**：渐进式精致化（纯 Tailwind CSS，零新依赖）

## 1. 全局设计语言

### 1.1 毛玻璃视觉系统

```
背景层：渐变动态背景（紫色 → 粉色 → 靛蓝，缓慢流动）
  └─ 内容层：半透明卡片（bg-white/10 ~ bg-white/20 + backdrop-blur-xl）
       └─ 强调层：渐变按钮（保留紫色渐变，加 hover 光晕效果）
```

### 1.2 色彩升级

- 背景：纯色 → 柔和渐变 + 2-3 个漂浮光斑（CSS `blur(80px)` 圆形伪元素）
- 卡片边框：`border-white/20` 半透明描边
- 文字颜色：从纯黑 → 白色系（适配深色玻璃背景）

### 1.3 新增 CSS 动画（4 个）

| 动画 | 用途 | 效果 |
|------|------|------|
| `fade-in-up` | 页面/组件进入 | 从下方淡入上滑 |
| `scale-pop` | 按钮点击 | 弹性缩放反馈 |
| `score-fly` | 得分反馈 | +1 飘向上方消散 |
| `shimmer` | 骨架屏 | 光泽扫过效果 |

## 2. 首页（HomePage）

### 改动清单

1. **背景**：纯白底 → 紫色渐变 + 漂浮半透明光斑
2. **标题**：`text-shadow` 发光效果，保持渐变色
3. **输入框**：`bg-white/15 backdrop-blur-xl border-white/30`，聚焦时边框发光
4. **功能卡片**：毛玻璃卡片，hover 时 `translateY(-4px)` + 阴影扩散
5. **按钮**：保留渐变色，`hover:brightness-110` + `active:scale-95`

## 3. 游戏页 - 答题状态（GamePage Playing）

### 改动清单

1. **记分板**：毛玻璃化，分数变化时 +1 文字从分数位置向上飘散
2. **题目卡片**：每次换题时 `fade-in-up` 动画
3. **选项按钮**：
   - hover：边框渐变发光 + 轻微浮起
   - 选中：渐变填充
   - 答对：绿色脉冲 + ✓ 图标缩放弹入
   - 答错：红色抖动 + ✗ 图标弹入 + 红色闪烁
4. **得分提示**：答对时绿色光脉冲，答错时微抖
5. **对手状态**：更醒目的脉冲动画

## 4. 游戏页 - 结果状态（ResultScreen）

### 改动清单

1. **比分展示**：数字从 0 递增到最终分数的计数器动画
2. **结果标题**：胜/负/平各有不同动画（胜利弹跳、失败渐现）
3. **背景**：胜利时光斑更亮、更快移动
4. **保留**：现有 confetti 彩纸效果

## 5. 微交互清单

| 场景 | 当前 | 升级后 |
|------|------|--------|
| 按钮点击 | `active:scale-95` | + 涟漪效果（伪元素扩展动画） |
| 选项 hover | 无明显效果 | 边框渐变发光 + 轻微浮起 |
| 分数变化 | 直接更新数字 | +1 飘字动画（向上+淡出） |
| 答对 | 绿色边框 | 绿色脉冲光环 + ✓ 图标缩放弹入 |
| 答错 | `animate-shake` | 保留抖动 + ✗ 图标弹入 + 红色闪烁 |
| 题目切换 | 直接替换 | 旧题 fade-out → 新题 fade-in-up |
| 倒计时 | `bounce-in` | 保留 + 加圆形进度环动画 |
| 准备状态 | 文字"已准备" | 准备按钮填充进度条动画 |
| 对手加入 | 直接出现 | 对手信息 slide-in |

## 6. 加载状态

1. **骨架屏**：shimmer 光泽扫过效果
2. **房间等待**：呼吸动画 + "正在匹配..." 文字脉冲
3. **题目加载**：shimmer 骨架卡片

## 7. 性能保障

- 所有动画使用 `transform` + `opacity`（GPU 加速）
- `backdrop-filter: blur()` 仅用于静态元素
- 尊重 `prefers-reduced-motion` 媒体查询

## 8. 涉及文件

- `tailwind.config.js` — 新增动画 keyframes
- `client/src/index.css` — 全局样式、光斑背景
- `client/src/pages/HomePage.tsx` — 首页升级
- `client/src/pages/GamePage.tsx` — 游戏页升级
- `client/src/components/game/QuestionCard.tsx` — 答题卡片
- `client/src/components/game/ScoreBoard.tsx` — 记分板
- `client/src/components/game/ResultScreen.tsx` — 结果页
- `client/src/components/game/CountdownOverlay.tsx` — 倒计时
- `client/src/components/room/RoomLobby.tsx` — 房间大厅
