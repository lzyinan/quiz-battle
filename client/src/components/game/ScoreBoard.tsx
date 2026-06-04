interface ScoreBoardProps {
  playerIndex: number;
  scores: [number, number];
  totalQuestions: number;
  currentQuestion: number;
}

export default function ScoreBoard({ playerIndex, scores, totalQuestions, currentQuestion }: ScoreBoardProps) {
  const myScore = scores[playerIndex];
  const opponentScore = scores[1 - playerIndex];

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-sm rounded-2xl shadow-md mb-6">
      <div className="text-sm font-medium text-gray-500">
        第 {currentQuestion + 1}/{totalQuestions} 题
      </div>
      <div className="flex items-center gap-6">
        <div className="text-center">
          <div className="text-xs text-gray-400">你</div>
          <div className={`text-2xl font-black text-purple-600`}>{myScore}</div>
        </div>
        <div className="text-gray-300 font-bold">VS</div>
        <div className="text-center">
          <div className="text-xs text-gray-400">对手</div>
          <div className="text-2xl font-black text-pink-600">{opponentScore}</div>
        </div>
      </div>
    </div>
  );
}
