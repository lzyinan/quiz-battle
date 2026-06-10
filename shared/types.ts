// ==================== 题库 & 题目 ====================

export interface Quiz {
  id: number;
  name: string;
  description: string;
  questionCount?: number;
  created_at: string;
  updated_at: string;
}

export type QuestionType = 'single' | 'judge';

export interface Question {
  id: number;
  quiz_id: number;
  type: QuestionType;
  content: string;
  options: string[];
  answer: number;
  created_at: string;
}

export interface QuestionInput {
  type: QuestionType;
  content: string;
  options: string[];
  answer: number;
}

// ==================== 玩家 & 房间 ====================

export interface Player {
  id: string;
  userId: number;
  name: string;
  playerIndex: 0 | 1;
  ready: boolean;
}

export type RoomStatus = 'waiting' | 'readying' | 'countdown' | 'playing' | 'finished';
export type QuestionCount = 10 | 20 | 30;

export interface Room {
  id: string;
  players: [Player, Player?];
  status: RoomStatus;
  quizId: number | null;
  questionCount: QuestionCount;
  questions: Question[];
  currentQuestion: number;
  scores: [number, number];
  answeredBy: [boolean, boolean];
  answers: AnswerRecord[];
  gameStartedAt: number | null;
  playAgainFlags: [boolean, boolean];
  createdAt: number;
}

export interface AnswerRecord {
  questionIndex: number;
  playerIndex: number;
  selectedOption: number;
  correct: boolean;
}

// ==================== Socket 事件类型 ====================

export interface ClientEvents {
  'create-room': () => void;
  'join-room': (data: { roomId: string }) => void;
  'reconnect-room': (data: { roomId: string; playerIndex: number }) => void;
  'sync-room': (data: { roomId: string }) => void;
  'select-quiz': (quizId: number | null) => void;
  'select-question-count': (count: QuestionCount) => void;
  'player-ready': () => void;
  'submit-answer': (data: { questionIndex: number; optionIndex: number }) => void;
  'play-again': () => void;
  'leave-room': () => void;
}

export interface ServerEvents {
  'room-created': (data: { roomId: string; playerIndex: number; players: (Player | null)[]; state: RoomStatePayload }) => void;
  'room-joined': (data: { roomId: string; playerIndex: number; players: (Player | null)[]; state: RoomStatePayload }) => void;
  'room-error': (message: string) => void;
  'player-joined': (players: (Player | null)[]) => void;
  'quiz-selected': (quizId: number | null) => void;
  'question-count-selected': (count: QuestionCount) => void;
  'player-ready-update': (players: (Player | null)[]) => void;
  'room-state': (data: RoomStatePayload) => void;
  'countdown': (number: number) => void;
  'next-question': (data: { question: Question; questionIndex: number; totalQuestions: number }) => void;
  'answer-result': (data: AnswerResultPayload) => void;
  'answer-rejected': (reason: string) => void;
  'game-over': (data: GameOverPayload) => void;
  'opponent-disconnected': () => void;
  'opponent-reconnected': () => void;
  'reconnected': (data: { roomId: string; playerIndex: number; players: (Player | null)[]; phase: string; state: RoomStatePayload }) => void;
  'room-reset': (players: (Player | null)[]) => void;
  'opponent-play-again': () => void;
  'opponent-left': () => void;
}

export interface AnswerResultPayload {
  questionIndex: number;
  answers: [
    { selectedOption: number; correct: boolean } | null,
    { selectedOption: number; correct: boolean } | null,
  ];
  correctAnswer: number;
  scores: [number, number];
}

export interface GameOverPayload {
  scores: [number, number];
  winner: number | null;
  answers: AnswerRecord[];
  questions: Question[];
}

export interface RoomStatePayload {
  roomId: string;
  players: (Player | null)[];
  status: RoomStatus;
  quizId: number | null;
  questionCount: QuestionCount;
  currentQuestion: number;
  totalQuestions: number;
  scores: [number, number];
  answeredBy: [boolean, boolean];
  question: Question | null;
  activeAnswerResult: AnswerResultPayload | null;
  gameOver: GameOverPayload | null;
}

// ==================== REST API 类型 ====================

export interface CreateQuizInput {
  name: string;
  description?: string;
}

export interface UpdateQuizInput {
  name?: string;
  description?: string;
}

// ==================== 单人模式 ====================

export interface SoloQuestionsRequest {
  quizId?: number | null;
  count: number;
}

export interface SoloQuestionsResponse {
  questions: Question[];
  totalQuestions: number;
}

export interface SoloAnswerRecord {
  questionIndex: number;
  selectedOption: number | null;
  correct: boolean;
  timeSpent: number;
}

// ==================== 用户认证 ====================

export interface AuthUser {
  id: number;
  nickname: string;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
}

// ==================== 战绩历史 ====================

export interface GameRecordItem {
  id: number;
  opponentName: string;
  myScore: number;
  opponentScore: number;
  result: 'win' | 'lose' | 'draw';
  questionCount: number;
  durationSeconds: number;
  createdAt: string;
}

export interface UserStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  totalScore: number;
  avgScore: number;
}
