import { useState, useEffect } from 'react';
import type { Quiz, QuestionCount } from '../../../../shared/types';
import { API_BASE } from '../../utils/api';

interface SoloLobbyProps {
  onStart: (quizId: number | null, count: QuestionCount) => void;
}

const QUESTION_COUNTS: QuestionCount[] = [10, 20, 30];

export default function SoloLobby({ onStart }: SoloLobbyProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(null);
  const [questionCount, setQuestionCount] = useState<QuestionCount>(10);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/quizzes`)
      .then(res => res.json())
      .then((data: Quiz[]) => { setQuizzes(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-lg mx-auto p-4 sm:p-6">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-teal-500 to-cyan-600 bg-clip-text text-transparent mb-2">
          📝 单人答题
        </h1>
        <p className="text-gray-500 text-sm">选择题库，开始答题之旅</p>
      </div>

      <div className="mb-6">
        <h3 className="text-center text-gray-600 font-medium mb-3 text-sm sm:text-base">选择题库</h3>
        {loading ? (
          <div className="text-center text-gray-400 py-4">加载中...</div>
        ) : (
          <div className="space-y-2">
            {quizzes.map(quiz => (
              <button
                key={quiz.id}
                onClick={() => setSelectedQuiz(quiz.id)}
                className={`w-full px-3 sm:px-4 py-3 rounded-xl text-left transition-all text-sm sm:text-base ${
                  selectedQuiz === quiz.id
                    ? 'bg-teal-500 text-white shadow-lg scale-[1.02]'
                    : 'bg-white hover:bg-teal-50 border-2 border-gray-100 hover:border-teal-200'
                }`}
              >
                <span className="font-medium">{quiz.name}</span>
                <span className={`text-xs sm:text-sm ml-2 ${selectedQuiz === quiz.id ? 'text-teal-200' : 'text-gray-400'}`}>
                  ({quiz.questionCount ?? 0}题)
                </span>
              </button>
            ))}
            <button
              onClick={() => setSelectedQuiz(null)}
              className={`w-full px-4 py-3 rounded-xl text-left transition-all ${
                selectedQuiz === null
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg scale-[1.02]'
                  : 'bg-white hover:bg-pink-50 border-2 border-gray-100 hover:border-pink-200'
              }`}
            >
              <span className="font-medium">🎲 随机出题</span>
              <span className={`text-xs sm:text-sm ml-2 ${selectedQuiz === null ? 'text-pink-200' : 'text-gray-400'}`}>
                (从所有题库随机)
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="mb-6">
        <h3 className="text-center text-gray-600 font-medium mb-3 text-sm sm:text-base">选择答题数量</h3>
        <div className="grid grid-cols-3 gap-2">
          {QUESTION_COUNTS.map(count => (
            <button
              key={count}
              onClick={() => setQuestionCount(count)}
              className={`px-3 py-3 rounded-xl text-center font-bold transition-all ${
                questionCount === count
                  ? 'bg-cyan-500 text-white shadow-lg scale-[1.02]'
                  : 'bg-white hover:bg-cyan-50 border-2 border-gray-100 hover:border-cyan-200 text-gray-600'
              }`}
            >
              {count}题
            </button>
          ))}
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={() => onStart(selectedQuiz, questionCount)}
          className="px-8 sm:px-12 py-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-lg sm:text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
        >
          🚀 开始答题
        </button>
      </div>
    </div>
  );
}
