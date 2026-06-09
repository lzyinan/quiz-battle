import { forwardRef } from 'react';
import type { GameOverPayload, Player } from '../../../../shared/types';

interface BattleShareCardProps {
  result: GameOverPayload;
  playerIndex: number;
  players: (Player | null)[];
}

const BattleShareCard = forwardRef<HTMLDivElement, BattleShareCardProps>(
  ({ result, playerIndex, players }, ref) => {
    const { scores, answers, questions } = result;
    const myName = players[playerIndex]?.name ?? '你';
    const opponentName = players[1 - playerIndex]?.name ?? '对手';
    const myCorrect = answers.filter(a => a.playerIndex === playerIndex && a.correct).length;
    const opponentCorrect = answers.filter(a => a.playerIndex === 1 - playerIndex && a.correct).length;

    return (
      <div
        ref={ref}
        className="w-[360px] p-6 bg-gradient-to-br from-purple-600 via-indigo-600 to-pink-600 text-white"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        <div className="text-center mb-4">
          <div className="text-2xl font-black">⚔️ 知识PK大作战 ⚔️</div>
        </div>

        <div className="bg-white/10 backdrop-blur rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <div className="text-sm opacity-80">{myName}</div>
              <div className="text-3xl font-black">{scores[playerIndex]}</div>
            </div>
            <div className="text-xl font-bold opacity-50">VS</div>
            <div className="text-center flex-1">
              <div className="text-sm opacity-80">{opponentName}</div>
              <div className="text-3xl font-black">{scores[1 - playerIndex]}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4 text-center text-sm">
          <div className="bg-white/10 rounded-xl p-2">
            <div className="opacity-70">正确率</div>
            <div className="font-bold">{Math.round((myCorrect / questions.length) * 100)}% vs {Math.round((opponentCorrect / questions.length) * 100)}%</div>
          </div>
          <div className="bg-white/10 rounded-xl p-2">
            <div className="opacity-70">总题数</div>
            <div className="font-bold">{questions.length} 题</div>
          </div>
        </div>

        <div className="text-center text-xs opacity-60">
          扫码来挑战我吧！ · 知识PK大作战
        </div>
      </div>
    );
  },
);

BattleShareCard.displayName = 'BattleShareCard';
export default BattleShareCard;
