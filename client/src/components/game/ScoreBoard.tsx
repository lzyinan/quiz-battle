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

  return (
    <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 bg-white/80 backdrop-blur-sm rounded-2xl shadow-md mb-4 sm:mb-6">
      <div className="text-xs sm:text-sm font-medium text-gray-500">
        第 {currentQuestion + 1}/{totalQuestions} 题
      </div>
      <div className="flex items-center gap-3 sm:gap-6">
        <div className="text-center">
          <div className="text-xs text-gray-400">{myName}</div>
          <div className={`text-xl sm:text-2xl font-black text-purple-600`}>{myScore}</div>
        </div>
        <div className="text-gray-300 font-bold">VS</div>
        <div className="text-center">
          <div className="text-xs text-gray-400">{opponentName}</div>
          <div className="text-xl sm:text-2xl font-black text-pink-600">{opponentScore}</div>
        </div>
      </div>
    </div>
  );
}
