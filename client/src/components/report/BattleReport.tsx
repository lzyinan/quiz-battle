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
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">{isWinner ? '🏆' : scores[0] === scores[1] ? '🤝' : '📊'}</div>
        <h2 className="text-xl font-black text-gray-800">对战报告</h2>
        <p className="text-sm text-gray-400 mt-1">{myName} vs {opponentName}</p>
      </div>

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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatsCard label="我的正确率" value={`${stats.myAccuracy}%`} icon="🎯" color="text-purple-600" />
        <StatsCard label="对手正确率" value={`${stats.opponentAccuracy}%`} icon="🎯" color="text-pink-600" />
        <StatsCard label="我答对" value={`${stats.myCorrect}/${stats.totalQuestions}`} icon="✅" color="text-green-600" />
        <StatsCard label="对手答对" value={`${stats.opponentCorrect}/${stats.totalQuestions}`} icon="✅" color="text-pink-500" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
        <h3 className="text-sm font-bold text-gray-600 mb-3">📈 分数走势</h3>
        <ScoreChart data={stats.scoreProgress} myName={myName} opponentName={opponentName} />
      </div>

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
