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
