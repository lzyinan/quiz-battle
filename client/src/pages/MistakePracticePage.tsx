import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { Question } from '../../../shared/types';
import {
  cleanOptionLabel,
  clearMistakes,
  getMistakes,
  removeMistake,
  type MistakeRecord,
  upsertMistake,
} from '../utils/mistakes';

type PracticeMode = 'review' | 'practice' | 'finished';

function optionLabel(question: Question, index: number): string {
  if (question.type === 'judge') return index === 0 ? '✓' : '✗';
  return String.fromCharCode(65 + index);
}

export default function MistakePracticePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const autoStarted = useRef(false);
  const [records, setRecords] = useState<MistakeRecord[]>(() => getMistakes());
  const [mode, setMode] = useState<PracticeMode>('review');
  const [practiceItems, setPracticeItems] = useState<MistakeRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const startPractice = useCallback((items = records) => {
    if (items.length === 0) return;
    setPracticeItems(items);
    setCurrentIndex(0);
    setSelectedOption(null);
    setLastCorrect(null);
    setCorrectCount(0);
    setMode('practice');
  }, [records]);

  useEffect(() => {
    if (!location.state?.start || autoStarted.current || records.length === 0) return;
    autoStarted.current = true;
    startPractice(records);
  }, [location.state, records, startPractice]);

  const current = practiceItems[currentIndex];

  const handleAnswer = (optionIndex: number) => {
    if (!current || selectedOption !== null) return;
    const correctAnswer = current.correctAnswer ?? current.question.answer;
    const correct = optionIndex === correctAnswer;
    setSelectedOption(optionIndex);
    setLastCorrect(correct);

    if (correct) {
      setRecords(removeMistake(current.question.id));
      setCorrectCount(count => count + 1);
    } else {
      setRecords(upsertMistake(current.question, optionIndex, correctAnswer));
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= practiceItems.length) {
      setMode('finished');
      return;
    }
    setCurrentIndex(index => index + 1);
    setSelectedOption(null);
    setLastCorrect(null);
  };

  const handleClear = () => {
    clearMistakes();
    setRecords([]);
  };

  const renderReview = () => (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-800">错题回顾</h1>
          <p className="text-sm text-gray-500 mt-1">共 {records.length} 道错题</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => startPractice()}
            disabled={records.length === 0}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl shadow-md hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            错题考试
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <p className="text-gray-700 font-bold mb-2">当前没有错题</p>
          <p className="text-sm text-gray-400">PK 中答错的题会自动进入这里</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record, index) => {
            const correctAnswer = record.correctAnswer ?? record.question.answer;
            return (
              <div key={record.question.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs font-bold text-gray-400">错题 {index + 1}</span>
                  <span className="text-xs text-gray-400">错了 {record.wrongCount} 次</span>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm sm:text-base font-bold text-gray-800 mb-3">{record.question.content}</p>
                  <div className="space-y-1.5">
                    {record.question.options.map((option, optionIndex) => {
                      const isSelected = optionIndex === record.selectedOption;
                      const isCorrect = optionIndex === correctAnswer;
                      let optionClass = 'bg-gray-50 text-gray-600 border border-transparent';
                      let tag = '';
                      if (isCorrect) {
                        optionClass = 'bg-green-50 text-green-700 border border-green-200';
                        tag = '正确答案';
                      }
                      if (isSelected && !isCorrect) {
                        optionClass = 'bg-red-50 text-red-700 border border-red-200';
                        tag = '当时选错';
                      }
                      return (
                        <div key={optionIndex} className={`rounded-lg px-3 py-2 text-sm flex items-center justify-between gap-3 ${optionClass}`}>
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="w-7 h-7 rounded-lg bg-white/70 flex items-center justify-center text-xs font-black flex-shrink-0">{optionLabel(record.question, optionIndex)}</span>
                            <span className="break-words">{cleanOptionLabel(option)}</span>
                          </span>
                          {tag && <span className="text-xs font-bold whitespace-nowrap">{tag}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {records.length > 0 && (
        <div className="text-center mt-6">
          <button onClick={handleClear} className="text-sm text-gray-400 hover:text-red-500 transition-colors">
            清空错题
          </button>
        </div>
      )}
    </>
  );

  const renderPractice = () => {
    if (!current) return null;
    const correctAnswer = current.correctAnswer ?? current.question.answer;
    return (
      <>
        <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-2xl shadow-md px-4 py-3 mb-4">
          <div className="text-sm font-medium text-gray-500">第 {currentIndex + 1}/{practiceItems.length} 题</div>
          <div className="text-sm font-bold text-purple-600">答对 {correctCount} 题</div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-4">
          <div className="text-xs text-purple-500 font-medium mb-2">
            {current.question.type === 'judge' ? '判断题' : '单选题'}
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 leading-relaxed">{current.question.content}</h2>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:gap-3">
          {current.question.options.map((option, optionIndex) => {
            const isSelected = optionIndex === selectedOption;
            const isCorrect = optionIndex === correctAnswer;
            let optionClass = 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-[1.02] active:scale-[0.98]';
            if (selectedOption !== null) {
              if (isCorrect) optionClass = 'bg-green-500 text-white ring-4 ring-green-300';
              else if (isSelected) optionClass = 'bg-red-500 text-white';
              else optionClass = 'bg-gray-100 text-gray-400';
            }
            return (
              <button
                key={optionIndex}
                onClick={() => handleAnswer(optionIndex)}
                disabled={selectedOption !== null}
                className={`${optionClass} min-h-[48px] py-3 px-4 sm:py-4 sm:px-6 rounded-xl text-left font-bold transition-all duration-200 break-words`}
              >
                <span className="inline-flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-white/30 flex-shrink-0 flex items-center justify-center text-sm font-black">{optionLabel(current.question, optionIndex)}</span>
                  <span>{cleanOptionLabel(option)}</span>
                </span>
              </button>
            );
          })}
        </div>

        {selectedOption !== null && (
          <div className="mt-5 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
            <p className={`font-bold mb-3 ${lastCorrect ? 'text-green-600' : 'text-red-600'}`}>
              {lastCorrect ? '答对了，已移出错题回顾' : '答错了，仍保留在错题回顾'}
            </p>
            <button
              onClick={handleNext}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl hover:scale-105 transition-all duration-200 shadow-lg"
            >
              {currentIndex + 1 >= practiceItems.length ? '完成考试' : '下一题'}
            </button>
          </div>
        )}
      </>
    );
  };

  const renderFinished = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
      <div className="text-5xl mb-4">✅</div>
      <h1 className="text-2xl font-black text-gray-800 mb-2">错题考试完成</h1>
      <p className="text-gray-500 mb-6">
        本次答对 {correctCount}/{practiceItems.length} 题，错题回顾还剩 {records.length} 题
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-3">
        {records.length > 0 && (
          <button
            onClick={() => startPractice(records)}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl hover:scale-105 transition-all duration-200 shadow-lg"
          >
            继续考试
          </button>
        )}
        <button
          onClick={() => setMode('review')}
          className="px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
        >
          查看错题
        </button>
        <Link
          to="/"
          className="px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
        >
          返回首页
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-4">
      <div className="w-full max-w-2xl mx-auto py-6">
        {mode === 'review' && renderReview()}
        {mode === 'practice' && renderPractice()}
        {mode === 'finished' && renderFinished()}
      </div>
    </div>
  );
}
