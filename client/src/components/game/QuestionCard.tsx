import type { Question, Player } from '../../../../shared/types';
import FavoriteButton from '../common/FavoriteButton';

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
    <div className="w-full max-w-lg mx-auto animate-fade-in-up">
      <div className="glass-card-light p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs text-purple-300 font-medium mb-2">
              {question.type === 'judge' ? '✅ 判断题' : '📝 单选题'}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white leading-relaxed">{question.content}</h2>
          </div>
          {showResult && <FavoriteButton question={question} />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:gap-3">
        {question.options.map((option, idx) => {
          const isCorrectOption = showResult?.correctAnswer === idx;
          const mySelection = showResult?.answers[playerIndex]?.selectedOption;
          const opponentSelection = showResult?.answers[1 - playerIndex]?.selectedOption;
          const isMyChoice = mySelection === idx;
          const isOpponentChoice = opponentSelection === idx;
          const label = question.type === 'judge' ? (idx === 0 ? '✓' : '✗') : OPTION_LABELS[idx];

          let optionClass = 'bg-white/10 text-white/80 font-bold min-h-[48px] py-3 px-4 sm:py-4 sm:px-6 rounded-xl border border-white/10 break-words';
          let labelClass = 'bg-white/15 text-white/70 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-black';
          let tag: string | null = null;
          let icon: string | null = null;

          if (showResult) {
            if (isCorrectOption) {
              optionClass = 'bg-green-500/25 text-green-300 font-bold min-h-[48px] py-3 px-4 sm:py-4 sm:px-6 rounded-xl border-2 border-green-400/50 shadow-[0_0_15px_rgba(34,197,94,0.3)] break-words';
              labelClass = 'bg-green-500/40 text-green-200 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-black';
              icon = '✓';
            } else if (isMyChoice && !showResult.answers[playerIndex]?.correct) {
              optionClass = 'bg-red-500/25 text-red-300 font-bold min-h-[48px] py-3 px-4 sm:py-4 sm:px-6 rounded-xl border-2 border-red-400/50 animate-shake break-words';
              labelClass = 'bg-red-500/40 text-red-200 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-black';
              icon = '✗';
            } else {
              optionClass = 'bg-white/5 text-white/30 font-bold min-h-[48px] py-3 px-4 sm:py-4 sm:px-6 rounded-xl border border-white/5 break-words';
              labelClass = 'bg-white/10 text-white/30 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-black';
            }
            if (isMyChoice) tag = myName;
            if (isOpponentChoice) tag = tag ? `${tag} · ${opponentName}` : opponentName;
          } else if (disabled) {
            optionClass = 'bg-white/5 text-white/30 font-bold min-h-[48px] py-3 px-4 sm:py-4 sm:px-6 rounded-xl border border-white/5 cursor-not-allowed break-words';
            labelClass = 'bg-white/10 text-white/30 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-black';
          }

          return (
            <button
              key={idx}
              onClick={() => !disabled && !showResult && onSubmit(idx)}
              disabled={disabled || !!showResult}
              className={`${optionClass} ${!disabled && !showResult ? 'hover:bg-white/20 hover:border-white/30 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] transition-all duration-200' : ''} text-left transition-all duration-200`}
            >
              <span className="inline-flex items-center gap-3">
                <span className={labelClass}>{icon ? <span className="animate-scale-pop">{icon}</span> : label}</span>
                <span className="flex-1">{option.replace(/^[A-D][.、]\s*/, '')}</span>
                {showResult && tag && (
                  <span className="text-xs opacity-70 ml-2">({tag})</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {myAnswered && !showResult && !opponentAnswered && (
        <div className="text-center mt-4 text-purple-300/80 font-medium animate-pulse">⏳ 等待对手作答...</div>
      )}
      {!myAnswered && opponentAnswered && !showResult && (
        <div className="text-center mt-4 text-yellow-300/80 font-medium animate-pulse">⚡ 对手已提交答案！</div>
      )}

      {showResult && (
        <ScoreHint
          answers={showResult.answers}
          playerIndex={playerIndex}
          opponentName={opponentName}
        />
      )}
    </div>
  );
}

/** Show who scored on this question */
function ScoreHint({ answers, playerIndex, opponentName }: {
  answers: [
    { selectedOption: number; correct: boolean } | null,
    { selectedOption: number; correct: boolean } | null,
  ];
  playerIndex: number;
  opponentName: string;
}) {
  const myAnswer = answers[playerIndex];
  const opponentAnswer = answers[1 - playerIndex];
  const iScored = myAnswer?.correct === true;
  const opponentScored = opponentAnswer?.correct === true;

  if (iScored && opponentScored) {
    return (
      <div className="text-center mt-4 px-4 py-2.5 bg-green-500/15 border border-green-400/30 rounded-xl text-green-300 font-bold text-sm">
        🤝 两人都答对了！各得 1 分
      </div>
    );
  }
  if (iScored) {
    return (
      <div className="text-center mt-4 px-4 py-2.5 bg-green-500/15 border border-green-400/30 rounded-xl text-green-300 font-bold text-sm">
        ✅ 你答对了！+1 分
      </div>
    );
  }
  if (opponentScored) {
    return (
      <div className="text-center mt-4 px-4 py-2.5 bg-pink-500/15 border border-pink-400/30 rounded-xl text-pink-300 font-bold text-sm">
        ❌ {opponentName} 答对了！+1 分
      </div>
    );
  }
  return (
    <div className="text-center mt-4 px-4 py-2.5 bg-white/10 border border-white/10 rounded-xl text-white/50 font-bold text-sm">
      😅 两人都答错了，无人得分
    </div>
  );
}
