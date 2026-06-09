import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Question, SoloAnswerRecord } from '../../../shared/types';
import SoloQuestionCard from '../components/solo/SoloQuestionCard';
import SoloScoreBar from '../components/solo/SoloScoreBar';
import SoloResultScreen from '../components/solo/SoloResultScreen';
import CountdownOverlay from '../components/game/CountdownOverlay';
import { getFavorites } from '../utils/favorites';
import { upsertMistake } from '../utils/mistakes';

type Phase = 'countdown' | 'playing' | 'result';

const QUESTION_TIME = 15;
const RESULT_DELAY = 1500;

export default function FavoritePracticePage() {
  const navigate = useNavigate();
  const favorites = useState(() => getFavorites())[0];
  const questions = useState(() => favorites.map(f => f.question))[0];

  const [phase, setPhase] = useState<Phase>(questions.length > 0 ? 'countdown' : 'result');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<SoloAnswerRecord[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [countdownNumber, setCountdownNumber] = useState(3);
  const [totalTime, setTotalTime] = useState(0);

  const questionStartRef = useRef(Date.now());
  const totalStartRef = useRef(0);

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdownNumber <= 1) {
      const timer = setTimeout(() => {
        setPhase('playing');
        setCurrentIndex(0);
        setAnswers([]);
        setScore(0);
        setAnswered(false);
        setSelectedOption(null);
        setTimeLeft(QUESTION_TIME);
        const now = Date.now();
        totalStartRef.current = now;
        questionStartRef.current = now;
      }, 1000);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setCountdownNumber(n => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdownNumber]);

  useEffect(() => {
    if (phase !== 'playing' || answered) return;
    questionStartRef.current = Date.now();
    setTimeLeft(QUESTION_TIME);
    const timer = setInterval(() => {
      setTimeLeft(prev => prev <= 1 ? 0 : prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, answered, currentIndex]);

  useEffect(() => {
    if (timeLeft !== 0 || phase !== 'playing' || answered) return;
    const question = questions[currentIndex];
    if (!question) return;
    const timeSpent = Math.round((Date.now() - questionStartRef.current) / 100) / 10;
    setSelectedOption(null);
    setAnswered(true);
    setAnswers(prev => [...prev, { questionIndex: currentIndex, selectedOption: null, correct: false, timeSpent }]);
    upsertMistake(question, -1, question.answer);
  }, [timeLeft, phase, answered, questions, currentIndex]);

  const handleSelect = useCallback((optionIndex: number) => {
    if (answered) return;
    const question = questions[currentIndex];
    if (!question) return;
    const timeSpent = Math.round((Date.now() - questionStartRef.current) / 100) / 10;
    const isCorrect = optionIndex === question.answer;
    setSelectedOption(optionIndex);
    setAnswered(true);
    let points = 0;
    if (isCorrect) {
      points = 10;
      if (timeSpent < 5) points += 5;
      else if (timeSpent < 10) points += 2;
    }
    setScore(prev => prev + points);
    setAnswers(prev => [...prev, { questionIndex: currentIndex, selectedOption: optionIndex, correct: isCorrect, timeSpent }]);
    if (!isCorrect) upsertMistake(question, optionIndex, question.answer);
  }, [answered, questions, currentIndex]);

  useEffect(() => {
    if (!answered || phase !== 'playing') return;
    const timer = setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setAnswered(false);
        setSelectedOption(null);
        setTimeLeft(QUESTION_TIME);
      } else {
        setTotalTime(Math.round((Date.now() - totalStartRef.current) / 1000));
        setPhase('result');
      }
    }, RESULT_DELAY);
    return () => clearTimeout(timer);
  }, [answered, phase, currentIndex, questions.length]);

  const handleGoHome = () => navigate('/');

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-5xl mb-4">📭</div>
        <p className="text-xl text-gray-600 mb-4">收藏列表为空</p>
        <button onClick={handleGoHome} className="px-6 py-3 bg-yellow-400 text-white rounded-xl font-bold">
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      {phase === 'countdown' && <CountdownOverlay number={countdownNumber} />}
      {phase === 'playing' && questions[currentIndex] && (
        <div className="max-w-lg mx-auto pt-4">
          <div className="text-center mb-2">
            <span className="text-sm font-bold text-yellow-500">⭐ 收藏题目练习</span>
          </div>
          <SoloScoreBar
            currentQuestion={currentIndex}
            totalQuestions={questions.length}
            score={score}
            timeLeft={timeLeft}
            totalTime={QUESTION_TIME}
          />
          <SoloQuestionCard
            question={questions[currentIndex]}
            answered={answered}
            selectedOption={selectedOption}
            onSelect={handleSelect}
          />
        </div>
      )}
      {phase === 'result' && (
        <SoloResultScreen
          score={score}
          totalTime={totalTime}
          questions={questions}
          answers={answers}
          onPlayAgain={() => navigate('/favorites/practice')}
          onGoHome={handleGoHome}
        />
      )}
    </div>
  );
}
