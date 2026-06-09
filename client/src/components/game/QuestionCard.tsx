import type { Question, Player } from '../../../../shared/types';

interface QuestionCardProps {
  question: Question;
  questionIndex: number;
  myAnswered: boolean;
  opponentAnswered: boolean;
  showResult: {
    answers: [
      { selectedOption: number; correct: boolean } | null,
      { selectedOption: number; correct: boolean } | null,
    ];
    correctAnswer: number;
  } | null;
  onSubmit: (optionIndex: number) => void;
  playerIndex: number;
  players: (Player | null)[];
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function QuestionCard({ question, myAnswered, opponentAnswered, showResult, onSubmit, playerIndex, players }: QuestionCardProps) {
  const myName = players[playerIndex]?.name || '我';
  const opponentName = players[1 - playerIndex]?.name || '对手';
  const disabled = myAnswered || !!showResult;

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="text-xs text-purple-500 font-medium mb-2">
          {question.type === 'judge' ? '✅ 判断题' : '📝 单选题'}
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 leading-relaxed">{question.content}</h2>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:gap-3">
        {question.options.map((option, idx) => {
          const isCorrectOption = showResult?.correctAnswer === idx;
          const mySelection = showResult?.answers[playerIndex]?.selectedOption;
          const opponentSelection = showResult?.answers[1 - playerIndex]?.selectedOption;
          const isMyChoice = mySelection === idx;
          const isOpponentChoice = opponentSelection === idx;
          const label = question.type === 'judge' ? (idx === 0 ? '✓' : '✗') : OPTION_LABELS[idx];

          let optionClass = 'bg-gray-100 text-gray-700 font-bold min-h-[48px] py-3 px-4 sm:py-4 sm:px-6 rounded-xl transition-all duration-200 break-words';
          let labelClass = 'bg-gray-200 text-gray-600 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-black';
          let tag: string | null = null;

          if (showResult) {
            if (isCorrectOption) {
              optionClass = 'bg-green-500 text-white font-bold min-h-[48px] py-3 px-4 sm:py-4 sm:px-6 rounded-xl ring-4 ring-green-300 break-words';
              labelClass = 'bg-white/20 text-white w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-black';
            } else if (isMyChoice && !showResult.answers[playerIndex]?.correct) {
              optionClass = 'bg-red-500 text-white font-bold min-h-[48px] py-3 px-4 sm:py-4 sm:px-6 rounded-xl animate-shake break-words';
              labelClass = 'bg-white/20 text-white w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-black';
            } else {
              optionClass = 'bg-gray-100 text-gray-400 font-bold min-h-[48px] py-3 px-4 sm:py-4 sm:px-6 rounded-xl break-words';
              labelClass = 'bg-gray-200 text-gray-400 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-black';
            }
            if (isMyChoice) tag = myName;
            if (isOpponentChoice) tag = tag ? `${tag} · ${opponentName}` : opponentName;
          } else if (disabled) {
            optionClass = 'bg-gray-100 text-gray-400 font-bold min-h-[48px] py-3 px-4 sm:py-4 sm:px-6 rounded-xl cursor-not-allowed break-words';
            labelClass = 'bg-gray-200 text-gray-400 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-black';
          }

          return (
            <button
              key={idx}
              onClick={() => !disabled && !showResult && onSubmit(idx)}
              disabled={disabled || !!showResult}
              className={`${optionClass} ${!disabled && !showResult ? 'hover:bg-gray-200 hover:scale-[1.02] active:scale-[0.98]' : ''} text-left`}
            >
              <span className="inline-flex items-center gap-3">
                <span className={labelClass}>{label}</span>
                <span className="flex-1">{option.replace(/^[A-D][.、]\s*/, '')}</span>
                {showResult && tag && (
                  <span className="text-xs opacity-80 ml-2">({tag})</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {myAnswered && !showResult && !opponentAnswered && (
        <div className="text-center mt-4 text-purple-600 font-medium animate-pulse">⏳ 等待对手作答...</div>
      )}
      {!myAnswered && opponentAnswered && !showResult && (
        <div className="text-center mt-4 text-yellow-600 font-medium animate-pulse">⚡ 对手已提交答案！</div>
      )}
    </div>
  );
}
