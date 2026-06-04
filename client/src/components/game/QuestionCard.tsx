import type { Question } from '../../../../shared/types';

interface QuestionCardProps {
  question: Question;
  questionIndex: number;
  disabled: boolean;
  showResult: { selectedOption: number; correct: boolean; correctAnswer: number } | null;
  onSubmit: (optionIndex: number) => void;
}

const OPTION_COLORS = [
  'from-blue-500 to-blue-600',
  'from-orange-500 to-orange-600',
  'from-green-500 to-green-600',
  'from-purple-500 to-purple-600',
];

export default function QuestionCard({ question, disabled, showResult, onSubmit }: QuestionCardProps) {
  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="text-xs text-purple-500 font-medium mb-2">
          {question.type === 'judge' ? '✅ 判断题' : '📝 单选题'}
        </div>
        <h2 className="text-xl font-bold text-gray-800 leading-relaxed">{question.content}</h2>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {question.options.map((option, idx) => {
          const isSelected = showResult?.selectedOption === idx;
          const isCorrect = showResult?.correctAnswer === idx;
          let optionClass = `bg-gradient-to-r ${OPTION_COLORS[idx % 4]} text-white font-bold py-4 px-6 rounded-xl shadow-md transition-all duration-200`;

          if (showResult) {
            if (isCorrect) {
              optionClass = 'bg-gradient-to-r from-green-400 to-green-600 text-white font-bold py-4 px-6 rounded-xl shadow-md ring-4 ring-green-300';
            } else if (isSelected && !showResult.correct) {
              optionClass = 'bg-gradient-to-r from-red-400 to-red-600 text-white font-bold py-4 px-6 rounded-xl shadow-md animate-shake';
            } else {
              optionClass = 'bg-gray-200 text-gray-400 font-bold py-4 px-6 rounded-xl';
            }
          } else if (disabled) {
            optionClass = 'bg-gray-300 text-gray-500 font-bold py-4 px-6 rounded-xl cursor-not-allowed';
          }

          return (
            <button
              key={idx}
              onClick={() => !disabled && !showResult && onSubmit(idx)}
              disabled={disabled || !!showResult}
              className={`${optionClass} ${!disabled && !showResult ? 'hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]' : ''} text-left`}
            >
              <span className="inline-flex items-center gap-3">
                <span className="bg-white/20 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black">
                  {question.type === 'judge' ? (idx === 0 ? '✓' : '✗') : String.fromCharCode(65 + idx)}
                </span>
                <span>{option.replace(/^[A-D][.、]\s*/, '')}</span>
              </span>
            </button>
          );
        })}
      </div>

      {disabled && !showResult && (
        <div className="text-center mt-4 text-yellow-600 font-medium animate-pulse">⚡ 对手已抢答！</div>
      )}
    </div>
  );
}
