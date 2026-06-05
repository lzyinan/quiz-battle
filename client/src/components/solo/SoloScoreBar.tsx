interface SoloScoreBarProps {
  currentQuestion: number;
  totalQuestions: number;
  score: number;
  timeLeft: number;
  totalTime: number;
}

export default function SoloScoreBar({ currentQuestion, totalQuestions, score, timeLeft, totalTime }: SoloScoreBarProps) {
  const progress = (timeLeft / totalTime) * 100;
  const isUrgent = timeLeft <= 5;

  return (
    <div className="px-3 py-2 sm:px-4 sm:py-3 bg-white/80 backdrop-blur-sm rounded-2xl shadow-md mb-4 sm:mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs sm:text-sm font-medium text-gray-500">
          第 {currentQuestion + 1}/{totalQuestions} 题
        </div>
        <div className="text-xl sm:text-2xl font-black text-teal-600">{score}分</div>
        <div className={`text-xs sm:text-sm font-bold ${isUrgent ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
          ⏱ {timeLeft}s
        </div>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${isUrgent ? 'bg-red-500' : 'bg-teal-500'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
