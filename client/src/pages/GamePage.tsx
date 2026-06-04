import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import type { Player, Question, AnswerResultPayload, GameOverPayload } from '../../../shared/types';
import RoomLobby from '../components/room/RoomLobby';
import CountdownOverlay from '../components/game/CountdownOverlay';
import QuestionCard from '../components/game/QuestionCard';
import ScoreBoard from '../components/game/ScoreBoard';
import ResultScreen from '../components/game/ResultScreen';

type GamePhase = 'lobby' | 'countdown' | 'playing' | 'result';

export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { connected, on, emit } = useSocket();

  const routeState = location.state as any;
  const isCreator = !!routeState?.creator;
  const isJoiner = !!routeState?.joined;
  const savedPlayerIndex = routeState?.playerIndex ?? 0;
  const savedPlayers = (routeState?.players ?? null) as (Player | null)[] | null;

  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [playerIndex, setPlayerIndex] = useState<number>(savedPlayerIndex);
  const [players, setPlayers] = useState<(Player | null)[]>(
    isCreator
      ? [{ id: '', name: '玩家A', playerIndex: 0, ready: false }, null]
      : savedPlayers ?? []
  );
  const [countdownNumber, setCountdownNumber] = useState<number>(3);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [showResult, setShowResult] = useState<{
    selectedOption: number;
    correct: boolean;
    correctAnswer: number;
  } | null>(null);
  const [answerDisabled, setAnswerDisabled] = useState(false);
  const [gameResult, setGameResult] = useState<GameOverPayload | null>(null);
  const [error, setError] = useState('');

  // Join room on mount (only for fresh visits via URL — creators and joiners are already in the room)
  useEffect(() => {
    if (!connected || !roomId || isCreator || isJoiner) return;
    const cleanupJoined = on('room-joined', (data) => {
      setPlayerIndex(data.playerIndex);
      setPlayers(data.players);
    });
    const cleanupError = on('room-error', (msg) => { setError(msg); });
    emit('join-room', roomId);
    return () => { cleanupJoined(); cleanupError(); };
  }, [connected, roomId]);

  // Listen for player joined
  useEffect(() => {
    return on('player-joined', (updatedPlayers) => { setPlayers(updatedPlayers); });
  }, [on]);

  // Listen for countdown
  useEffect(() => {
    return on('countdown', (number) => { setPhase('countdown'); setCountdownNumber(number); });
  }, [on]);

  // Listen for next question
  useEffect(() => {
    return on('next-question', (data) => {
      setPhase('playing');
      setCurrentQuestion(data.question);
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setShowResult(null);
      setAnswerDisabled(false);
    });
  }, [on]);

  // Listen for answer result
  useEffect(() => {
    return on('answer-result', (data: AnswerResultPayload) => {
      setScores(data.scores);
      setShowResult({ selectedOption: data.selectedOption, correct: data.correct, correctAnswer: data.correctAnswer });
      setAnswerDisabled(true);
    });
  }, [on]);

  // Listen for answer rejected
  useEffect(() => {
    return on('answer-rejected', () => { setAnswerDisabled(true); });
  }, [on]);

  // Listen for game over
  useEffect(() => {
    return on('game-over', (data: GameOverPayload) => {
      setGameResult(data);
      setScores(data.scores);
      setPhase('result');
    });
  }, [on]);

  // Listen for opponent disconnect
  useEffect(() => {
    return on('opponent-disconnected', () => { setError('对手已断线，等待重连...'); });
  }, [on]);

  const handleSubmitAnswer = useCallback((optionIndex: number) => {
    if (!currentQuestion || answerDisabled) return;
    emit('submit-answer', { questionIndex, optionIndex });
  }, [currentQuestion, answerDisabled, emit, questionIndex]);

  if (error && phase === 'lobby') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4">😕</div>
        <p className="text-xl text-gray-600 mb-4">{error}</p>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-purple-500 text-white rounded-xl font-bold hover:bg-purple-600 transition-colors">
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      {phase === 'countdown' && <CountdownOverlay number={countdownNumber} />}
      {phase === 'lobby' && (
        <RoomLobby roomId={roomId!} playerIndex={playerIndex} players={players} connected={connected} onEmit={emit as any} on={on as any} />
      )}
      {phase === 'playing' && currentQuestion && (
        <div className="max-w-lg mx-auto pt-4">
          <ScoreBoard playerIndex={playerIndex} scores={scores} totalQuestions={totalQuestions} currentQuestion={questionIndex} />
          <QuestionCard question={currentQuestion} questionIndex={questionIndex} disabled={answerDisabled} showResult={showResult} onSubmit={handleSubmitAnswer} />
        </div>
      )}
      {phase === 'result' && gameResult && (
        <ResultScreen result={gameResult} playerIndex={playerIndex} players={players} />
      )}
      {error && phase !== 'lobby' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 bg-yellow-100 text-yellow-700 rounded-full shadow-lg text-sm font-medium">{error}</div>
      )}
    </div>
  );
}
