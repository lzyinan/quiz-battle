import { useState, useEffect } from 'react';
import type { Player, QuestionCount, Quiz } from '../../../../shared/types';
import { API_BASE } from '../../utils/api';

interface RoomLobbyProps {
  roomId: string;
  playerIndex: number;
  players: (Player | null)[];
  connected: boolean;
  selectedQuiz: number | null;
  questionCount: QuestionCount;
  onEmit: (event: string, ...args: any[]) => void;
}

const QUESTION_COUNTS: QuestionCount[] = [10, 20, 30];

export default function RoomLobby({ roomId, playerIndex, players, connected, selectedQuiz, questionCount, onEmit }: RoomLobbyProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/quizzes`).then(res => res.json()).then(setQuizzes).catch(console.error);
  }, []);

  const myPlayer = players[playerIndex];
  const opponent = players[1 - playerIndex];
  const ready = !!myPlayer?.ready;
  const opponentReady = !!opponent?.ready;

  return (
    <div className="max-w-lg mx-auto p-4 sm:p-6">
      <div className="text-center mb-6 sm:mb-8">
        <div className="text-white/50 text-xs sm:text-sm mb-1">房间号</div>
        <div className="text-3xl sm:text-4xl font-mono font-black tracking-[0.2em] sm:tracking-[0.3em] text-purple-300 glass-card px-4 sm:px-6 py-2 sm:py-3 inline-block">
          {roomId}
        </div>
      </div>

      <div className="flex justify-center gap-3 sm:gap-8 mb-6 sm:mb-8">
        <div className={`text-center px-3 sm:px-6 py-3 rounded-xl transition-all duration-300 ${myPlayer?.ready ? 'glass-card border-green-400/40 bg-green-500/15' : 'glass-card'}`}>
          <div className="text-2xl mb-1">👤</div>
          <div className="font-bold text-sm sm:text-base text-white/90">{myPlayer?.name}</div>
          <div className="text-xs sm:text-sm text-white/50">{myPlayer?.ready ? '✅ 已准备' : '等待准备'}</div>
        </div>
        <div className={`text-center px-3 sm:px-6 py-3 rounded-xl transition-all duration-300 ${opponent ? (opponentReady ? 'glass-card border-green-400/40 bg-green-500/15' : 'glass-card') : 'border-2 border-dashed border-yellow-400/30 bg-yellow-500/10 rounded-xl'}`}>
          <div className="text-2xl mb-1">{opponent ? '👤' : '⏳'}</div>
          <div className="font-bold text-sm sm:text-base text-white/90">{opponent?.name || '等待对手...'}</div>
          <div className="text-xs sm:text-sm text-white/50">{opponent ? (opponentReady ? '✅ 已准备' : '等待准备') : '等待加入'}</div>
        </div>
      </div>

      {opponent && (
        <div className="mb-6 sm:mb-8">
          <h3 className="text-center text-white/60 font-medium mb-3 text-sm sm:text-base">选择对战题库</h3>
          <div className="space-y-2">
            {quizzes.map(quiz => (
              <button
                key={quiz.id}
                onClick={() => { onEmit('select-quiz', quiz.id); }}
                disabled={!connected}
                className={`w-full px-3 sm:px-4 py-3 rounded-xl text-left transition-all text-sm sm:text-base ${
                  selectedQuiz === quiz.id ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg scale-[1.02] brightness-110' : 'glass-card hover:bg-white/20'
                }`}
              >
                <span className="font-medium">{quiz.name}</span>
                <span className={`text-xs sm:text-sm ml-2 ${selectedQuiz === quiz.id ? 'text-white/70' : 'text-white/40'}`}>({quiz.questionCount ?? 0}题)</span>
              </button>
            ))}
            <button
              onClick={() => { onEmit('select-quiz', null); }}
              disabled={!connected}
              className={`w-full px-4 py-3 rounded-xl text-left transition-all ${
                selectedQuiz === null ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg scale-[1.02]' : 'glass-card hover:bg-white/20'
              }`}
            >
              <span className="font-medium">🎲 随机出题</span>
              <span className={`text-xs sm:text-sm ml-2 ${selectedQuiz === null ? 'text-white/70' : 'text-white/40'}`}>(从所有题库随机)</span>
            </button>
          </div>
        </div>
      )}

      {opponent && (
        <div className="mb-6 sm:mb-8">
          <h3 className="text-center text-white/60 font-medium mb-3 text-sm sm:text-base">选择答题数量</h3>
          <div className="grid grid-cols-3 gap-2">
            {QUESTION_COUNTS.map(count => (
              <button
                key={count}
                onClick={() => { onEmit('select-question-count', count); }}
                disabled={!connected}
                className={`px-3 py-3 rounded-xl text-center font-bold transition-all ${
                  questionCount === count
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg scale-[1.02]'
                    : 'glass-card hover:bg-white/20 text-white/70'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {count}题
              </button>
            ))}
          </div>
        </div>
      )}

      {opponent && !ready && (
        <div className="text-center">
          <button
            onClick={() => { onEmit('player-ready'); }}
            disabled={!connected}
            className="px-8 sm:px-12 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-lg sm:text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 hover:brightness-110 transition-all duration-200"
          >
            ✋ 准备就绪！
          </button>
        </div>
      )}
      {ready && !opponentReady && (
        <div className="text-center text-white/50 animate-pulse">等待对手准备...</div>
      )}
    </div>
  );
}
