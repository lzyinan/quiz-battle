import type { Question } from '../../../../shared/types';
import FavoriteButton from '../common/FavoriteButton';

interface SoloQuestionCardProps {
  question: Question;
  answered: boolean;
  selectedOption: number | null;
  onSelect: (optionIndex: number) => void;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function SoloQuestionCard({ question, answered, selectedOption, onSelect }: SoloQuestionCardProps) {
  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs text-teal-500 font-medium mb-2">
              {question.type === 'judge' ? '✅ 判断题' : '📝 单选题'}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 leading-relaxed">{question.content}</h2>
          </div>
          {answered && <FavoriteButton question={question} />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:gap-3">
        {question.options.map((option, idx) => {
          const isCorrectOption = idx === question.answer;
          const isSelected = selectedOption === idx;
          const label = question.type === 'judge' ? (idx === 0 ? '✓' : '✗') : OPTION_LABELS[idx];

          let optionClass = 'bg-gray-100 text-gray-700 font-bold min-h-[48px] py-3 px-4 sm:py-4 sm:px-6 rounded-xl transition-all duration-200 break-words';
          let labelClass = 'bg-gray-200 text-gray-600 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-black';

          if (answered) {
            if (isCorrectOption) {
              optionClass = 'bg-green-500 text-white font-bold min-h-[48px] py-3 px-4 sm:py-4 sm:px-6 rounded-xl ring-4 ring-green-300 break-words';
              labelClass = 'bg-white/20 text-white w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-black';
            } else if (isSelected) {
              optionClass = 'bg-red-500 text-white font-bold min-h-[48px] py-3 px-4 sm:py-4 sm:px-6 rounded-xl animate-shake break-words';
              labelClass = 'bg-white/20 text-white w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-black';
            } else {
              optionClass = 'bg-gray-100 text-gray-400 font-bold min-h-[48px] py-3 px-4 sm:py-4 sm:px-6 rounded-xl break-words';
              labelClass = 'bg-gray-200 text-gray-400 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-black';
            }
          }

          return (
            <button
              key={idx}
              onClick={() => !answered && onSelect(idx)}
              disabled={answered}
              className={`${optionClass} ${!answered ? 'hover:bg-gray-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer' : 'cursor-default'} text-left`}
            >
              <span className="inline-flex items-center gap-3">
                <span className={labelClass}>{label}</span>
                <span className="flex-1">{option.replace(/^[A-D][.、]\s*/, '')}</span>
              </span>
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="text-center mt-4 text-gray-500 font-medium">
          {selectedOption === null
            ? '⏰ 时间到！'
            : selectedOption === question.answer
              ? '✅ 回答正确！'
              : '❌ 回答错误'}
        </div>
      )}
    </div>
  );
}
