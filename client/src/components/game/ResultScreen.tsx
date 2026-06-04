import type { GameOverPayload, Player } from '../../../../shared/types';

interface ResultScreenProps {
  result: GameOverPayload;
  playerIndex: number;
  players: (Player | null)[];
  onPlayAgain: () => void;
  onGoHome: () => void;
}

export default function ResultScreen({ result, playerIndex, players, onPlayAgain, onGoHome }: ResultScreenProps) {
  const { scores, winner } = result;
  const myScore = scores[playerIndex];
  const opponentScore = scores[1 - playerIndex];
  const isWinner = winner === playerIndex;
  const isDraw = winner === null;

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
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      {(isWinner || isDraw) && confettiPieces}

      <div className="text-center mb-6 sm:mb-8">
        <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">{isWinner ? '🏆' : isDraw ? '🤝' : '😅'}</div>
        <h2 className="text-2xl sm:text-3xl font-black">
          {isWinner ? (
            <span className="bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">你赢了！</span>
          ) : isDraw ? (
            <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">势均力敌！</span>
          ) : (
            <span className="text-gray-600">惜败一步</span>
          )}
        </h2>
      </div>

      <div className="bg-white rounded-3xl shadow-xl p-5 sm:p-8 mb-6 sm:mb-8 w-full max-w-sm">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <div className="text-sm text-gray-400 mb-1">{players[playerIndex]?.name}</div>
            <div className="text-3xl sm:text-4xl font-black text-purple-600">{myScore}</div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-gray-300 px-3 sm:px-4">VS</div>
          <div className="text-center flex-1">
            <div className="text-sm text-gray-400 mb-1">{players[1 - playerIndex]?.name}</div>
            <div className="text-3xl sm:text-4xl font-black text-pink-600">{opponentScore}</div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm mb-6 sm:mb-8">
        <h3 className="text-sm text-gray-500 font-medium mb-3">答题回顾</h3>
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5 sm:gap-2" style={{ minWidth: 'max-content' }}>
            {result.answers.map((answer, idx) => (
              <div key={idx} className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold ${
              answer.playerIndex === playerIndex
                ? answer.correct ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                : 'bg-gray-100 text-gray-400'
            }`}>
              {answer.playerIndex === playerIndex ? (answer.correct ? '✓' : '✗') : `${idx + 1}`}
            </div>
          ))}
        </div>
        </div>
      </div>

      <div className="flex gap-4">
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
    </div>
  );
}
