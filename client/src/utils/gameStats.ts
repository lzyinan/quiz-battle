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
  scoreProgress: [number, number][];
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
