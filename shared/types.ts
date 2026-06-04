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
  name: string;
  playerIndex: 0 | 1;
  ready: boolean;
}

export type RoomStatus = 'waiting' | 'readying' | 'countdown' | 'playing' | 'finished';

export interface Room {
  id: string;
  players: [Player, Player?];
  status: RoomStatus;
  quizId: number | null;
  questions: Question[];
  currentQuestion: number;
  scores: [number, number];
  lockedBy: number | null;
  answers: AnswerRecord[];
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
  'join-room': (roomId: string) => void;
  'select-quiz': (quizId: number | null) => void;
  'player-ready': () => void;
  'submit-answer': (data: { questionIndex: number; optionIndex: number }) => void;
}

export interface ServerEvents {
  'room-created': (data: { roomId: string; playerIndex: number }) => void;
  'room-joined': (data: { roomId: string; playerIndex: number; players: Player[] }) => void;
  'room-error': (message: string) => void;
  'player-joined': (players: Player[]) => void;
  'quiz-selected': (quizId: number | null) => void;
  'player-ready-update': (players: Player[]) => void;
  'countdown': (number: number) => void;
  'next-question': (data: { question: Question; questionIndex: number; totalQuestions: number }) => void;
  'answer-result': (data: AnswerResultPayload) => void;
  'answer-rejected': (reason: string) => void;
  'game-over': (data: GameOverPayload) => void;
  'opponent-disconnected': () => void;
  'opponent-reconnected': () => void;
}

export interface AnswerResultPayload {
  questionIndex: number;
  playerIndex: number;
  selectedOption: number;
  correct: boolean;
  correctAnswer: number;
  scores: [number, number];
}

export interface GameOverPayload {
  scores: [number, number];
  winner: number | null;
  answers: AnswerRecord[];
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
