import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Question, QuestionCount, SoloAnswerRecord } from '../../../shared/types';
import SoloLobby from '../components/solo/SoloLobby';
import SoloQuestionCard from '../components/solo/SoloQuestionCard';
import SoloScoreBar from '../components/solo/SoloScoreBar';
import SoloResultScreen from '../components/solo/SoloResultScreen';
import CountdownOverlay from '../components/game/CountdownOverlay';
import { upsertMistake } from '../utils/mistakes';
import { API_BASE } from '../utils/api';

type SoloPhase = 'lobby' | 'countdown' | 'playing' | 'result';

const QUESTION_TIME = 15;
const RESULT_DELAY = 1500;

export default function SoloGamePage() {
  const navigate = useNavigate();

  const [phase, setPhase] = useState<SoloPhase>('lobby');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<SoloAnswerRecord[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [countdownNumber, setCountdownNumber] = useState(3);
  const [totalTime, setTotalTime] = useState(0);
  const [error, setError] = useState('');

  const questionStartRef = useRef(Date.now());
  const totalStartRef = useRef(0);

  // Fetch questions and start countdown
  const handleStart = useCallback(async (quizId: number | null, count: QuestionCount) => {
    try {
      setError('');
      const res = await fetch(`${API_BASE}/solo/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId, count }),
      });
      if (!res.ok) throw new Error('获取题目失败');
      const data = await res.json();
      if (!data.questions?.length) throw new Error('题库中没有题目');

      setQuestions(data.questions);
      setPhase('countdown');
      setCountdownNumber(3);
    } catch (err: any) {
      setError(err.message || '获取题目失败');
    }
  }, []);

  // Countdown logic: 3 → 2 → 1 → start
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

  // Per-question countdown timer
  useEffect(() => {
    if (phase !== 'playing' || answered) return;
    questionStartRef.current = Date.now();
    setTimeLeft(QUESTION_TIME);

    const timer = setInterval(() => {
      setTimeLeft(prev => prev <= 1 ? 0 : prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, answered, currentIndex]);

  // Handle timeout (timeLeft reached 0)
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

  // Handle user selecting an option
  const handleSelect = (optionIndex: number) => {
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

    if (!isCorrect) {
      upsertMistake(question, optionIndex, question.answer);
    }
  };

  // Auto-advance to next question after showing result
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

  const handlePlayAgain = () => {
    setPhase('lobby');
    setQuestions([]);
    setAnswers([]);
    setScore(0);
    setError('');
  };

  const handleGoHome = () => navigate('/');

  if (error && phase === 'lobby') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4">😕</div>
        <p className="text-xl text-gray-600 mb-4">{error}</p>
        <button onClick={() => setError('')} className="px-6 py-3 bg-teal-500 text-white rounded-xl font-bold hover:bg-teal-600 transition-colors">
          返回
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      {phase === 'countdown' && <CountdownOverlay number={countdownNumber} />}
      {phase === 'lobby' && <SoloLobby onStart={handleStart} />}
      {phase === 'playing' && questions[currentIndex] && (
        <div className="max-w-lg mx-auto pt-4">
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
          onPlayAgain={handlePlayAgain}
          onGoHome={handleGoHome}
        />
      )}
    </div>
  );
}
