import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Question, SoloAnswerRecord } from '../../../shared/types';
import SoloQuestionCard from '../components/solo/SoloQuestionCard';
import SoloScoreBar from '../components/solo/SoloScoreBar';
import SoloResultScreen from '../components/solo/SoloResultScreen';
import CountdownOverlay from '../components/game/CountdownOverlay';
import { decodeChallengeToken } from '../utils/favorites';
import { getMistakes, upsertMistake } from '../utils/mistakes';

type Phase = 'intro' | 'countdown' | 'playing' | 'result';

const QUESTION_TIME = 15;
const RESULT_DELAY = 1500;

export default function ChallengePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<Phase>('intro');
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
    if (!token) { setError('无效的挑战链接'); return; }
    const ids = decodeChallengeToken(token);
    if (ids.length === 0) { setError('无效的挑战链接'); return; }

    const allKnown = new Map<number, Question>();
    try {
      const favs = JSON.parse(localStorage.getItem('quizpk_favorites') || '[]');
      for (const fav of favs) {
        if (fav?.question?.id) allKnown.set(fav.question.id, fav.question);
      }
    } catch { /* ignore */ }
    for (const m of getMistakes()) {
      if (m?.question?.id) allKnown.set(m.question.id, m.question);
    }

    const found = ids.map(id => allKnown.get(id)).filter(Boolean) as Question[];
    if (found.length === 0) {
      setError('找不到挑战题目，请先收藏题目后生成挑战链接');
      return;
    }
    setQuestions(found);
  }, [token]);

  const handleStart = () => {
    setPhase('countdown');
    setCountdownNumber(3);
  };

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

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-5xl mb-4">😕</div>
        <p className="text-xl text-gray-600 mb-4">{error}</p>
        <button onClick={handleGoHome} className="px-6 py-3 bg-purple-500 text-white rounded-xl font-bold">
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      {phase === 'intro' && (
        <div className="min-h-[80vh] flex flex-col items-center justify-center">
          <div className="text-5xl mb-4">🎯</div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent mb-2">
            挑战模式
          </h2>
          <p className="text-gray-500 mb-6">共 {questions.length} 道题</p>
          <button
            onClick={handleStart}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white text-xl font-bold rounded-2xl shadow-lg hover:scale-105 transition-all duration-200"
          >
            开始挑战
          </button>
        </div>
      )}

      {phase === 'countdown' && <CountdownOverlay number={countdownNumber} />}

      {phase === 'playing' && questions[currentIndex] && (
        <div className="max-w-lg mx-auto pt-4">
          <div className="text-center mb-2">
            <span className="text-sm font-bold text-purple-500">🎯 挑战模式</span>
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
          onPlayAgain={() => { setPhase('countdown'); setCountdownNumber(3); }}
          onGoHome={handleGoHome}
        />
      )}
    </div>
  );
}
