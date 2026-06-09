import { forwardRef } from 'react';
import type { Question, SoloAnswerRecord } from '../../../../shared/types';

interface SoloShareCardProps {
  score: number;
  totalTime: number;
  questions: Question[];
  answers: SoloAnswerRecord[];
}

const SoloShareCard = forwardRef<HTMLDivElement, SoloShareCardProps>(
  ({ score, totalTime, questions, answers }, ref) => {
    const correctCount = answers.filter(a => a.correct).length;
    const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;

    return (
      <div
        ref={ref}
        className="w-[360px] p-6 bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-600 text-white"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        <div className="text-center mb-4">
          <div className="text-2xl font-black">📝 答题成绩单 📝</div>
        </div>

        <div className="bg-white/10 backdrop-blur rounded-2xl p-4 mb-4 text-center">
          <div className="text-sm opacity-80 mb-1">总分</div>
          <div className="text-4xl font-black">{score}</div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4 text-center text-sm">
          <div className="bg-white/10 rounded-xl p-2">
            <div className="opacity-70">正确率</div>
            <div className="font-bold">{accuracy}%</div>
          </div>
          <div className="bg-white/10 rounded-xl p-2">
            <div className="opacity-70">用时</div>
            <div className="font-bold">{minutes}:{String(seconds).padStart(2, '0')}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-2">
            <div className="opacity-70">题数</div>
            <div className="font-bold">{questions.length}</div>
          </div>
        </div>

        <div className="text-center text-xs opacity-60">
          来挑战我的记录！ · 知识PK大作战
        </div>
      </div>
    );
  },
);

SoloShareCard.displayName = 'SoloShareCard';
export default SoloShareCard;
