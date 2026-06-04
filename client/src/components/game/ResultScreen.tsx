import { Link } from 'react-router-dom';
import type { GameOverPayload, Player } from '../../../../shared/types';

interface ResultScreenProps {
  result: GameOverPayload;
  playerIndex: number;
  players: (Player | null)[];
}

export default function ResultScreen({ result, playerIndex, players }: ResultScreenProps) {
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

      <div className="text-center mb-8">
        <div className="text-6xl mb-4">{isWinner ? '🏆' : isDraw ? '🤝' : '😅'}</div>
        <h2 className="text-3xl font-black">
          {isWinner ? (
            <span className="bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">你赢了！</span>
          ) : isDraw ? (
            <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">势均力敌！</span>
          ) : (
            <span className="text-gray-600">惜败一步</span>
          )}
        </h2>
      </div>

      <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 w-full max-w-sm">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <div className="text-sm text-gray-400 mb-1">{players[playerIndex]?.name}</div>
            <div className="text-4xl font-black text-purple-600">{myScore}</div>
          </div>
          <div className="text-2xl font-bold text-gray-300 px-4">VS</div>
          <div className="text-center flex-1">
            <div className="text-sm text-gray-400 mb-1">{players[1 - playerIndex]?.name}</div>
            <div className="text-4xl font-black text-pink-600">{opponentScore}</div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm mb-8">
        <h3 className="text-sm text-gray-500 font-medium mb-3">答题回顾</h3>
        <div className="grid grid-cols-5 gap-2">
          {result.answers.map((answer, idx) => (
            <div key={idx} className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
              answer.playerIndex === playerIndex
                ? answer.correct ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                : 'bg-gray-100 text-gray-400'
            }`}>
              {answer.playerIndex === playerIndex ? (answer.correct ? '✓' : '✗') : `${idx + 1}`}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <Link to="/" className="px-8 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors">
          返回首页
        </Link>
      </div>
    </div>
  );
}
