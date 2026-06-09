import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import type { Player, Question, QuestionCount, AnswerResultPayload, GameOverPayload, RoomStatePayload, RoomStatus } from '../../../shared/types';
import RoomLobby from '../components/room/RoomLobby';
import CountdownOverlay from '../components/game/CountdownOverlay';
import QuestionCard from '../components/game/QuestionCard';
import ScoreBoard from '../components/game/ScoreBoard';
import ResultScreen from '../components/game/ResultScreen';
import { upsertMistake } from '../utils/mistakes';

const STORAGE_KEY = 'quizpk_room';

type GamePhase = 'lobby' | 'countdown' | 'playing' | 'result';

function clearSavedRoom() {
  localStorage.removeItem(STORAGE_KEY);
}

function phaseFromRoomStatus(status?: RoomStatus | string): GamePhase {
  if (status === 'countdown') return 'countdown';
  if (status === 'playing') return 'playing';
  if (status === 'finished') return 'result';
  return 'lobby';
}

export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { connected, on, emit } = useSocket();

  const routeState = location.state as any;
  const isCreator = !!routeState?.creator;
  const isJoiner = !!routeState?.joined;
  const isReconnected = !!routeState?.reconnected;
  const savedPlayerIndex = routeState?.playerIndex ?? 0;
  const savedPlayers = (routeState?.players ?? null) as (Player | null)[] | null;
  const initialRoomState = routeState?.roomState as RoomStatePayload | undefined;
  const reconnectedPhase = initialRoomState?.status ?? (routeState?.phase as string | undefined);
  const initialPlayers = initialRoomState?.players ?? savedPlayers;
  const initialAnswerResult = initialRoomState?.activeAnswerResult;

  const [phase, setPhase] = useState<GamePhase>(() => {
    if (initialRoomState || isReconnected) return phaseFromRoomStatus(reconnectedPhase);
    return 'lobby';
  });
  const [playerIndex, setPlayerIndex] = useState<number>(savedPlayerIndex);
  const [players, setPlayers] = useState<(Player | null)[]>(
    initialPlayers ?? (isCreator ? [{ id: '', name: '玩家A', playerIndex: 0, ready: false }, null] : [])
  );
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(initialRoomState?.quizId ?? null);
  const [questionCount, setQuestionCount] = useState<QuestionCount>(initialRoomState?.questionCount ?? 10);
  const [countdownNumber, setCountdownNumber] = useState<number>(3);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(initialRoomState?.question ?? null);
  const [questionIndex, setQuestionIndex] = useState(initialRoomState?.currentQuestion ?? 0);
  const [totalQuestions, setTotalQuestions] = useState(initialRoomState?.totalQuestions ?? 0);
  const [scores, setScores] = useState<[number, number]>(initialRoomState?.scores ?? [0, 0]);
  const [showResult, setShowResult] = useState<{
    answers: [
      { selectedOption: number; correct: boolean } | null,
      { selectedOption: number; correct: boolean } | null,
    ];
    correctAnswer: number;
  } | null>(
    initialAnswerResult
      ? {
          answers: initialAnswerResult.answers,
          correctAnswer: initialAnswerResult.correctAnswer,
        }
      : null
  );
  const [myAnswered, setMyAnswered] = useState(false);
  const [opponentAnswered, setOpponentAnswered] = useState(false);
  const [gameResult, setGameResult] = useState<GameOverPayload | null>(initialRoomState?.gameOver ?? null);
  const [error, setError] = useState('');

  const applyRoomState = useCallback((state: RoomStatePayload) => {
    if (state.roomId !== roomId) return;

    setPlayers(state.players);
    setSelectedQuiz(state.quizId);
    setQuestionCount(state.questionCount);
    setScores(state.scores);
    setQuestionIndex(state.currentQuestion);
    setTotalQuestions(state.totalQuestions);
    setMyAnswered(state.answeredBy[playerIndex]);
    setOpponentAnswered(state.answeredBy[1 - playerIndex]);

    if (state.status === 'waiting' || state.status === 'readying') {
      setPhase('lobby');
      setCurrentQuestion(null);
      setShowResult(null);
      setMyAnswered(false);
      setOpponentAnswered(false);
      setGameResult(null);
      return;
    }

    if (state.status === 'countdown') {
      setPhase('countdown');
      setCurrentQuestion(state.question);
      setShowResult(null);
      setMyAnswered(false);
      setOpponentAnswered(false);
      setGameResult(null);
      return;
    }

    if (state.status === 'playing') {
      setPhase('playing');
      setCurrentQuestion(state.question);
      setGameResult(null);
      if (state.activeAnswerResult) {
        setShowResult({
          answers: state.activeAnswerResult.answers,
          correctAnswer: state.activeAnswerResult.correctAnswer,
        });
      } else {
        setShowResult(null);
      }
      return;
    }

    setPhase('result');
    setCurrentQuestion(null);
    setShowResult(null);
    setMyAnswered(false);
    setOpponentAnswered(false);
    setGameResult(state.gameOver ?? { scores: state.scores, winner: null, answers: [], questions: [] });
  }, [roomId, playerIndex]);

  // Authoritative room snapshot; keeps both players on the same screen even if a transient event is missed.
  useEffect(() => {
    return on('room-state', applyRoomState);
  }, [on, applyRoomState]);

  useEffect(() => {
    if (!connected || !roomId) return;
    emit('sync-room', { roomId });
  }, [connected, roomId, emit]);

  // Join room on mount (only for fresh visits via URL — creators and joiners are already in the room)
  useEffect(() => {
    if (!connected || !roomId || isCreator || isJoiner || isReconnected) return;
    const cleanupJoined = on('room-joined', (data) => {
      setPlayerIndex(data.playerIndex);
      setPlayers(data.players);
      applyRoomState(data.state);
    });
    const cleanupError = on('room-error', (msg) => { setError(msg); });
    emit('join-room', { roomId });
    return () => { cleanupJoined(); cleanupError(); };
  }, [connected, roomId, isCreator, isJoiner, isReconnected, on, emit, applyRoomState]);

  // Listen for player joined
  useEffect(() => {
    return on('player-joined', (updatedPlayers) => { setPlayers(updatedPlayers); });
  }, [on]);

  useEffect(() => {
    return on('player-ready-update', (updatedPlayers) => { setPlayers(updatedPlayers); });
  }, [on]);

  useEffect(() => {
    return on('quiz-selected', (quizId) => { setSelectedQuiz(quizId); });
  }, [on]);

  useEffect(() => {
    return on('question-count-selected', (count) => { setQuestionCount(count); });
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
      setMyAnswered(false);
      setOpponentAnswered(false);
    });
  }, [on]);

  // Listen for answer result
  useEffect(() => {
    return on('answer-result', (data: AnswerResultPayload) => {
      setScores(data.scores);
      setShowResult({ answers: data.answers, correctAnswer: data.correctAnswer });
      setMyAnswered(true);
      setOpponentAnswered(true);
      const myAnswer = data.answers[playerIndex];
      if (currentQuestion && myAnswer && !myAnswer.correct) {
        upsertMistake(currentQuestion, myAnswer.selectedOption, data.correctAnswer);
      }
    });
  }, [on, currentQuestion, playerIndex]);

  // Listen for answer rejected
  useEffect(() => {
    return on('answer-rejected', () => {});
  }, [on]);

  // Listen for game over
  useEffect(() => {
    return on('game-over', (data: GameOverPayload) => {
      setGameResult(data);
      setScores(data.scores);
      setPhase('result');
      // Don't clear saved room yet — player might want to play again
    });
  }, [on]);

  // Listen for opponent disconnect
  useEffect(() => {
    return on('opponent-disconnected', () => { setError('对手已断线，等待重连...'); });
  }, [on]);

  // Listen for opponent reconnect
  useEffect(() => {
    return on('opponent-reconnected', () => { setError(''); });
  }, [on]);

  // Listen for room reset (play again)
  useEffect(() => {
    return on('room-reset', (updatedPlayers) => {
      setPhase('lobby');
      setScores([0, 0]);
      setShowResult(null);
      setGameResult(null);
      setCurrentQuestion(null);
      setMyAnswered(false);
      setOpponentAnswered(false);
      setPlayers(updatedPlayers);
      setSelectedQuiz(null);
      setQuestionCount(10);
      setError('');
    });
  }, [on]);

  // Listen for reconnected event
  useEffect(() => {
    return on('reconnected', (data) => {
      setPlayerIndex(data.playerIndex);
      setPlayers(data.players);
      setError('');
      applyRoomState(data.state);
    });
  }, [on, applyRoomState]);

  // Clear saved room when navigating away (return to home without play-again)
  const handleGoHome = useCallback(() => {
    clearSavedRoom();
    navigate('/');
  }, [navigate]);

  const handleSubmitAnswer = useCallback((optionIndex: number) => {
    if (!currentQuestion || myAnswered) return;
    emit('submit-answer', { questionIndex, optionIndex });
  }, [currentQuestion, myAnswered, emit, questionIndex]);

  const handlePlayAgain = useCallback(() => {
    emit('play-again');
  }, [emit]);

  if (error && phase === 'lobby') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4">😕</div>
        <p className="text-xl text-gray-600 mb-4">{error}</p>
        <button onClick={handleGoHome} className="px-6 py-3 bg-purple-500 text-white rounded-xl font-bold hover:bg-purple-600 transition-colors">
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      {phase === 'countdown' && <CountdownOverlay number={countdownNumber} />}
      {phase === 'lobby' && (
        <RoomLobby roomId={roomId!} playerIndex={playerIndex} players={players} connected={connected} selectedQuiz={selectedQuiz} questionCount={questionCount} onEmit={emit as any} />
      )}
      {phase === 'playing' && currentQuestion && (
        <div className="max-w-lg mx-auto pt-4">
          <ScoreBoard playerIndex={playerIndex} scores={scores} totalQuestions={totalQuestions} currentQuestion={questionIndex} />
          <QuestionCard question={currentQuestion} questionIndex={questionIndex} myAnswered={myAnswered} opponentAnswered={opponentAnswered} showResult={showResult} onSubmit={handleSubmitAnswer} playerIndex={playerIndex} players={players} />
        </div>
      )}
      {phase === 'result' && gameResult && (
        <ResultScreen result={gameResult} playerIndex={playerIndex} players={players} onPlayAgain={handlePlayAgain} onGoHome={handleGoHome} />
      )}
      {error && phase !== 'lobby' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 bg-yellow-100 text-yellow-700 rounded-full shadow-lg text-sm font-medium">{error}</div>
      )}
    </div>
  );
}
