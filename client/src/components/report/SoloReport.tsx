import type { Question, SoloAnswerRecord } from '../../../../shared/types';
import { computeSoloStats } from '../../utils/gameStats';
import StatsCard from './StatsCard';

interface SoloReportProps {
  score: number;
  totalTime: number;
  questions: Question[];
  answers: SoloAnswerRecord[];
}

export default function SoloReport({ score, totalTime, answers }: SoloReportProps) {
  const stats = computeSoloStats(answers, totalTime, score);
  const minutes = Math.floor(stats.totalTime / 60);
  const seconds = stats.totalTime % 60;

  return (
    <div className="max-w-lg mx-auto px-4 pb-8">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">📊</div>
        <h2 className="text-xl font-black text-gray-800">答题报告</h2>
      </div>

      <div className="bg-white rounded-3xl shadow-xl p-5 mb-6 text-center">
        <div className="text-sm text-gray-400 mb-1">总分</div>
        <div className="text-4xl font-black text-teal-600">{stats.totalScore}</div>
        <div className="text-xs text-gray-300 mt-1">基础 {stats.baseScore} + 速度 {stats.speedBonus}</div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatsCard label="正确率" value={`${stats.accuracy}%`} icon="🎯" color="text-teal-600" />
        <StatsCard label="答对/总题" value={`${stats.correctCount}/${stats.totalQuestions}`} icon="✅" color="text-green-600" />
        <StatsCard label="总用时" value={`${minutes}:${String(seconds).padStart(2, '0')}`} icon="⏱️" color="text-cyan-600" />
        <StatsCard label="平均用时" value={`${stats.avgTime}s`} icon="⚡" color="text-purple-600" />
        <StatsCard label="最快一题" value={`${stats.fastestTime}s`} icon="🚀" color="text-orange-500" />
        <StatsCard label="最慢一题" value={`${stats.slowestTime}s`} icon="🐢" color="text-gray-500" />
      </div>

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
