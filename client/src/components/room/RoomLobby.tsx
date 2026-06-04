import { useState, useEffect } from 'react';
import type { Player, Quiz } from '../../../../shared/types';

interface RoomLobbyProps {
  roomId: string;
  playerIndex: number;
  players: (Player | null)[];
  connected: boolean;
  onEmit: (event: string, ...args: any[]) => void;
  on: (event: string, handler: (...args: any[]) => void) => () => void;
}

export default function RoomLobby({ roomId, playerIndex, players, connected, onEmit, on }: RoomLobbyProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);

  useEffect(() => {
    fetch('/api/quizzes').then(res => res.json()).then(setQuizzes).catch(console.error);
  }, []);

  useEffect(() => {
    return on('quiz-selected', (quizId: number | null) => setSelectedQuiz(quizId));
  }, [on]);

  useEffect(() => {
    return on('player-ready-update', (updatedPlayers: (Player | null)[]) => {
      const myPlayer = updatedPlayers[playerIndex];
      const opponent = updatedPlayers[1 - playerIndex];
      if (myPlayer) setReady(myPlayer.ready);
      if (opponent) setOpponentReady(opponent.ready);
    });
  }, [on, playerIndex]);

  const myPlayer = players[playerIndex];
  const opponent = players[1 - playerIndex];

  return (
    <div className="max-w-lg mx-auto p-6">
      <div className="text-center mb-8">
        <div className="text-gray-500 text-sm mb-1">房间号</div>
        <div className="text-4xl font-mono font-black tracking-[0.3em] text-purple-700 bg-white px-6 py-3 rounded-2xl shadow-inner inline-block">
          {roomId}
        </div>
      </div>

      <div className="flex justify-center gap-8 mb-8">
        <div className={`text-center px-6 py-3 rounded-xl ${myPlayer?.ready ? 'bg-green-100 border-2 border-green-400' : 'bg-gray-100 border-2 border-gray-200'}`}>
          <div className="text-2xl mb-1">👤</div>
          <div className="font-bold">{myPlayer?.name}</div>
          <div className="text-sm text-gray-500">{myPlayer?.ready ? '✅ 已准备' : '等待准备'}</div>
        </div>
        <div className={`text-center px-6 py-3 rounded-xl ${opponent ? (opponentReady ? 'bg-green-100 border-2 border-green-400' : 'bg-gray-100 border-2 border-gray-200') : 'bg-yellow-50 border-2 border-dashed border-yellow-300'}`}>
          <div className="text-2xl mb-1">{opponent ? '👤' : '⏳'}</div>
          <div className="font-bold">{opponent?.name || '等待对手...'}</div>
          <div className="text-sm text-gray-500">{opponent ? (opponentReady ? '✅ 已准备' : '等待准备') : '等待加入'}</div>
        </div>
      </div>

      {opponent && (
        <div className="mb-8">
          <h3 className="text-center text-gray-600 font-medium mb-3">选择对战题库</h3>
          <div className="space-y-2">
            {quizzes.map(quiz => (
              <button
                key={quiz.id}
                onClick={() => { setSelectedQuiz(quiz.id); onEmit('select-quiz', quiz.id); }}
                className={`w-full px-4 py-3 rounded-xl text-left transition-all ${
                  selectedQuiz === quiz.id ? 'bg-purple-500 text-white shadow-lg scale-[1.02]' : 'bg-white hover:bg-purple-50 border-2 border-gray-100 hover:border-purple-200'
                }`}
              >
                <span className="font-medium">{quiz.name}</span>
                <span className={`text-sm ml-2 ${selectedQuiz === quiz.id ? 'text-purple-200' : 'text-gray-400'}`}>({quiz.questionCount ?? 0}题)</span>
              </button>
            ))}
            <button
              onClick={() => { setSelectedQuiz(null); onEmit('select-quiz', null); }}
              className={`w-full px-4 py-3 rounded-xl text-left transition-all ${
                selectedQuiz === null ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg scale-[1.02]' : 'bg-white hover:bg-pink-50 border-2 border-gray-100 hover:border-pink-200'
              }`}
            >
              <span className="font-medium">🎲 随机出题</span>
              <span className={`text-sm ml-2 ${selectedQuiz === null ? 'text-pink-200' : 'text-gray-400'}`}>(从所有题库随机)</span>
            </button>
          </div>
        </div>
      )}

      {opponent && !ready && (
        <div className="text-center">
          <button
            onClick={() => { setReady(true); onEmit('player-ready'); }}
            className="px-12 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            ✋ 准备就绪！
          </button>
        </div>
      )}
      {ready && !opponentReady && (
        <div className="text-center text-gray-500 animate-pulse">等待对手准备...</div>
      )}
    </div>
  );
}
