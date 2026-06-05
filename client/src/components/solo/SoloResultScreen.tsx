import type { Question, SoloAnswerRecord } from '../../../../shared/types';

interface SoloResultScreenProps {
  score: number;
  totalTime: number;
  questions: Question[];
  answers: SoloAnswerRecord[];
  onPlayAgain: () => void;
  onGoHome: () => void;
}

export default function SoloResultScreen({ score, totalTime, questions, answers, onPlayAgain, onGoHome }: SoloResultScreenProps) {
  const correctCount = answers.filter(a => a.correct).length;
  const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
  const minutes = Math.floor(totalTime / 60);
  const seconds = totalTime % 60;

  const confettiPieces = Array.from({ length: 20 }, (_, i) => (
    <div
      key={i}
      className="fixed w-3 h-3 rounded-full animate-confetti"
      style={{
        left: `${Math.random() * 100}%`,
        top: '-10px',
        backgroundColor: ['#14B8A6', '#06B6D4', '#8B5CF6', '#EC4899', '#F59E0B'][i % 5],
        animationDelay: `${Math.random() * 0.5}s`,
        animationDuration: `${1 + Math.random() * 1}s`,
      }}
    />
  ));

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      {confettiPieces}

      <div className="text-center mb-6 sm:mb-8">
        <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">🎉</div>
        <h2 className="text-2xl sm:text-3xl font-black">
          <span className="bg-gradient-to-r from-teal-500 to-cyan-600 bg-clip-text text-transparent">答题完成！</span>
        </h2>
      </div>

      <div className="bg-white rounded-3xl shadow-xl p-5 sm:p-8 mb-6 sm:mb-8 w-full max-w-sm">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-gray-400 mb-1">得分</div>
            <div className="text-2xl sm:text-3xl font-black text-teal-600">{score}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">正确率</div>
            <div className="text-2xl sm:text-3xl font-black text-purple-600">{accuracy}%</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">用时</div>
            <div className="text-2xl sm:text-3xl font-black text-cyan-600">
              {minutes}:{String(seconds).padStart(2, '0')}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-lg mb-6 sm:mb-8">
        <h3 className="text-sm text-gray-500 font-medium mb-4">答题回顾</h3>
        <div className="space-y-3">
          {questions.map((question, idx) => {
            const answer = answers.find(a => a.questionIndex === idx);
            const isCorrect = answer?.correct ?? false;
            const isTimeout = answer?.selectedOption === null;

            return (
              <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs font-bold text-gray-400">第 {idx + 1} 题</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    isCorrect ? 'bg-green-50 text-green-600'
                      : isTimeout ? 'bg-yellow-50 text-yellow-600'
                        : 'bg-red-50 text-red-600'
                  }`}>
                    {isCorrect ? '✓ 正确' : isTimeout ? '⏰ 超时' : '✗ 错误'}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-800 mb-3">{question.content}</p>
                  <div className="space-y-1.5">
                    {question.options.map((option, optIdx) => {
                      const isCorrectAnswer = optIdx === question.answer;
                      const isSelected = answer?.selectedOption === optIdx;

                      let optionStyle = 'bg-gray-50 text-gray-600 border border-transparent';
                      if (isCorrectAnswer) {
                        optionStyle = 'bg-green-50 text-green-700 border border-green-200';
                      } else if (isSelected) {
                        optionStyle = 'bg-red-50 text-red-700 border border-red-200';
                      }

                      return (
                        <div key={optIdx} className={`rounded-lg px-3 py-2 text-sm flex items-center justify-between ${optionStyle}`}>
                          <span className="flex items-center gap-2">
                            <span className="text-xs font-mono text-gray-400">{String.fromCharCode(65 + optIdx)}</span>
                            <span>{option}</span>
                          </span>
                          {isCorrectAnswer && <span className="text-xs font-medium text-green-600">正确答案</span>}
                          {isSelected && !isCorrectAnswer && <span className="text-xs font-medium text-red-600">你的选择</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onPlayAgain}
          className="px-8 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold rounded-xl hover:scale-105 transition-all duration-200 shadow-lg"
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
