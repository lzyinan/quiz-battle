import { useState, useRef, useEffect } from 'react';
import type { GameOverPayload, Player } from '../../../../shared/types';
import BattleReport from '../report/BattleReport';
import BattleShareCard from '../share/BattleShareCard';
import { captureAndDownload } from '../../utils/shareUtils';

interface ResultScreenProps {
  result: GameOverPayload;
  playerIndex: number;
  players: (Player | null)[];
  onPlayAgain: () => void;
  onGoHome: () => void;
  opponentWantsPlayAgain: boolean;
}

function useCountUp(target: number, duration = 600) {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  return value;
}

export default function ResultScreen({ result, playerIndex, players, onPlayAgain, onGoHome, opponentWantsPlayAgain }: ResultScreenProps) {
  const [showReport, setShowReport] = useState(false);
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const { scores, winner, answers, questions } = result;
  const myScore = useCountUp(scores[playerIndex]);
  const opponentScore = useCountUp(scores[1 - playerIndex]);
  const isWinner = winner === playerIndex;
  const isDraw = winner === null;

  const myName = players[playerIndex]?.name ?? '你';
  const opponentName = players[1 - playerIndex]?.name ?? '对手';

  const handleShare = async () => {
    setSharing(true);
    await new Promise(r => setTimeout(r, 100));
    const el = shareCardRef.current;
    if (el) {
      await captureAndDownload(el, `知识PK-${myName}vs${opponentName}.png`);
    }
    setSharing(false);
  };

  const answerMap = new Map<number, { playerIndex: number; selectedOption: number; correct: boolean }[]>();
  for (const a of answers) {
    const questionAnswers = answerMap.get(a.questionIndex) ?? [];
    questionAnswers.push(a);
    answerMap.set(a.questionIndex, questionAnswers);
  }

  const confettiPieces = Array.from({ length: 20 }, (_, i) => (
    <div
      key={i}
      className="fixed w-3 h-3 rounded-full animate-confetti"
      style={{
        left: `${Math.random() * 100}%`,
        top: '-10px',
        backgroundColor: ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'][i % 5],
        animationDelay: `${Math.random() * 0.5}s`,
        animationDuration: `${1 + Math.random() * 1}s`,
      }}
    />
  ));

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 relative z-10">
      {(isWinner || isDraw) && confettiPieces}

      <div className="text-center mb-6 sm:mb-8 animate-fade-in-up">
        <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">{isWinner ? '🏆' : isDraw ? '🤝' : '😅'}</div>
        <h2 className="text-2xl sm:text-3xl font-black">
          {isWinner ? (
            <span className="bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">你赢了！</span>
          ) : isDraw ? (
            <span className="bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">势均力敌！</span>
          ) : (
            <span className="text-white/60">惜败一步</span>
          )}
        </h2>
      </div>

      <div className="glass-card p-5 sm:p-8 mb-6 sm:mb-8 w-full max-w-sm animate-scale-pop">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <div className="text-sm text-white/50 mb-1">{myName}</div>
            <div className="text-3xl sm:text-4xl font-black text-purple-300">{myScore}</div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white/20 px-3 sm:px-4">VS</div>
          <div className="text-center flex-1">
            <div className="text-sm text-white/50 mb-1">{opponentName}</div>
            <div className="text-3xl sm:text-4xl font-black text-pink-300">{opponentScore}</div>
          </div>
        </div>
      </div>

      {showReport && (
        <BattleReport result={result} playerIndex={playerIndex} players={players} />
      )}
      {!showReport && (
      <div className="w-full max-w-lg mb-6 sm:mb-8">
        <h3 className="text-sm text-white/50 font-medium mb-4">答题回顾</h3>
        <div className="space-y-3">
          {questions.map((question, idx) => {
            const questionAnswers = answerMap.get(idx) ?? [];
            const myAnswer = questionAnswers.find(answer => answer.playerIndex === playerIndex);
            const opponentAnswer = questionAnswers.find(answer => answer.playerIndex === 1 - playerIndex);

            return (
              <div key={idx} className="glass-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
                  <span className="text-xs font-bold text-white/40">第 {idx + 1} 题</span>
                  {myAnswer || opponentAnswer ? (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                      {myName}{myAnswer ? (myAnswer.correct ? '✓' : '✗') : '未答'} / {opponentName}{opponentAnswer ? (opponentAnswer.correct ? '✓' : '✗') : '未答'}
                    </span>
                  ) : (
                    <span className="text-xs text-white/30">未作答</span>
                  )}
                </div>

                <div className="px-4 py-3">
                  <p className="text-sm font-medium text-white/80 mb-3">{question.content}</p>

                  <div className="space-y-1.5">
                    {question.options.map((option, optIdx) => {
                      const isCorrectAnswer = optIdx === question.answer;
                      const isMySelection = myAnswer?.selectedOption === optIdx;
                      const isOpponentSelection = opponentAnswer?.selectedOption === optIdx;

                      let optionStyle = 'bg-white/5 text-white/40 border border-transparent';
                      const indicators: string[] = [];

                      if (isCorrectAnswer) {
                        optionStyle = 'bg-green-500/15 text-green-300 border border-green-400/30';
                        indicators.push('正确答案');
                      }
                      if (isMySelection && !isCorrectAnswer) {
                        optionStyle = 'bg-red-500/15 text-red-300 border border-red-400/30';
                        indicators.push(`${myName}选错`);
                      }
                      if (isOpponentSelection && !isCorrectAnswer) {
                        optionStyle = isMySelection
                          ? 'bg-red-500/15 text-red-300 border border-red-400/30'
                          : 'bg-pink-500/15 text-pink-300 border border-pink-400/30';
                        indicators.push(`${opponentName}选错`);
                      }
                      if ((isMySelection || isOpponentSelection) && isCorrectAnswer) {
                        optionStyle = 'bg-green-500/20 text-green-300 border border-green-400/40';
                        if (isMySelection) indicators.push(`${myName}答对`);
                        if (isOpponentSelection) indicators.push(`${opponentName}答对`);
                      }

                      return (
                        <div key={optIdx} className={`rounded-lg px-3 py-2 text-sm flex items-center justify-between ${optionStyle}`}>
                          <span className="flex items-center gap-2">
                            <span className="text-xs font-mono text-white/30">{String.fromCharCode(65 + optIdx)}</span>
                            <span>{option}</span>
                          </span>
                          {indicators.length > 0 && (
                            <span className="text-xs font-medium whitespace-nowrap ml-2">{indicators.join(' · ')}</span>
                          )}
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
      )}

      <div className="flex gap-3 flex-wrap justify-center">
        <button
          onClick={() => setShowReport(!showReport)}
          className="glass-card px-6 py-3 font-bold hover:bg-white/20 transition-all"
        >
          {showReport ? '📋 答题回顾' : '📊 查看报告'}
        </button>
        <button
          onClick={handleShare}
          disabled={sharing}
          className="px-6 py-3 bg-gradient-to-r from-orange-400 to-pink-500 text-white font-bold rounded-xl hover:scale-105 hover:brightness-110 transition-all duration-200 shadow-lg disabled:opacity-50"
        >
          {sharing ? '⏳ 生成中...' : '📤 分享战绩'}
        </button>
        {opponentWantsPlayAgain ? (
          <button
            onClick={onPlayAgain}
            className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:scale-105 hover:brightness-110 transition-all duration-200 shadow-lg animate-pulse"
          >
            🎯 对手想再来！点击开始
          </button>
        ) : (
          <button
            onClick={onPlayAgain}
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl hover:scale-105 hover:brightness-110 transition-all duration-200 shadow-lg"
          >
            再来一局
          </button>
        )}
        <button
          onClick={onGoHome}
          className="px-8 py-3 glass-card font-bold hover:bg-white/20 transition-all"
        >
          返回首页
        </button>
      </div>

      <div className="fixed left-[-9999px] top-0">
        <BattleShareCard ref={shareCardRef} result={result} playerIndex={playerIndex} players={players} />
      </div>
    </div>
  );
}
