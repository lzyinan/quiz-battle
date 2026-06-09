import type { Room, Player, Question, RoomStatePayload, GameOverPayload, AnswerResultPayload, QuestionCount } from '../../../shared/types.js';
import { getDb } from '../db/index.js';

const rooms = new Map<string, Room>();
const EMPTY_ROOM_TIMEOUT = 5 * 60 * 1000;
const QUESTION_COUNTS: QuestionCount[] = [10, 20, 30];

export function generateRoomId(): string {
  let id: string;
  do {
    id = String(Math.floor(1000 + Math.random() * 9000));
  } while (rooms.has(id));
  return id;
}

export function createRoom(playerId: string, userId: number, playerName: string): Room {
  const id = generateRoomId();
  const player: Player = { id: playerId, userId, name: playerName, playerIndex: 0, ready: false };
  const room: Room = {
    id, players: [player, undefined], status: 'waiting', quizId: null, questionCount: 10,
    questions: [], currentQuestion: 0, scores: [0, 0], answeredBy: [false, false],
    answers: [], createdAt: Date.now(), gameStartedAt: null,
  };
  rooms.set(id, room);
  scheduleEmptyRoomCleanup(id);
  return room;
}

export function joinRoom(roomId: string, playerId: string, userId: number, playerName: string): { room: Room; playerIndex: number } | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: '房间不存在' };
  if (room.players[0]?.id === playerId) return { error: '你已经在房间里了' };
  if (room.players[1]) {
    if (room.players[1].id === playerId) return { error: '你已经在房间里了' };
    return { error: '房间已满' };
  }
  const player: Player = { id: playerId, userId, name: playerName, playerIndex: 1, ready: false };
  room.players[1] = player;
  room.status = 'readying';
  return { room, playerIndex: 1 };
}

/** Reconnect a disconnected player */
export function reconnectPlayer(roomId: string, playerIndex: number, newSocketId: string, userId: number): { room: Room; playerIndex: number } | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: '房间不存在' };
  if (playerIndex !== 0 && playerIndex !== 1) return { error: '玩家不存在' };
  const player = room.players[playerIndex];
  if (!player) return { error: '玩家不存在' };

  player.id = newSocketId;
  player.userId = userId;
  return { room, playerIndex };
}

/** Reset room for a new game */
export function resetRoom(room: Room): void {
  room.status = 'readying';
  room.questions = [];
  room.currentQuestion = 0;
  room.scores = [0, 0];
  room.answeredBy = [false, false];
  room.answers = [];
  room.gameStartedAt = null;
  room.quizId = null;
  room.questionCount = 10;
  // Reset ready status
  room.players[0].ready = false;
  if (room.players[1]) room.players[1].ready = false;
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function findRoomByPlayer(socketId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.players[0]?.id === socketId || room.players[1]?.id === socketId) return room;
  }
  return undefined;
}

export function selectQuiz(room: Room, quizId: number | null): void {
  room.quizId = quizId;
  room.players[0].ready = false;
  if (room.players[1]) room.players[1].ready = false;
}

export function selectQuestionCount(room: Room, count: QuestionCount): boolean {
  if (!QUESTION_COUNTS.includes(count)) return false;
  room.questionCount = count;
  room.players[0].ready = false;
  if (room.players[1]) room.players[1].ready = false;
  return true;
}

export function playerReady(room: Room, playerIndex: number): boolean {
  if (room.status !== 'readying' || !room.players[1]) return false;
  const player = room.players[playerIndex];
  if (!player) return false;
  player.ready = true;
  return !!(room.players[0]?.ready && room.players[1]?.ready);
}

export function loadQuestions(room: Room): boolean {
  const db = getDb();
  let questions: any[];
  if (room.quizId === null) {
    questions = db.prepare('SELECT * FROM questions ORDER BY RANDOM() LIMIT ?').all(room.questionCount);
  } else {
    questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY RANDOM() LIMIT ?').all(room.quizId, room.questionCount);
  }
  if (questions.length === 0) return false;
  room.questions = questions.map((q: any) => ({ ...q, options: JSON.parse(q.options) }));
  room.currentQuestion = 0;
  room.scores = [0, 0];
  room.answeredBy = [false, false];
  room.answers = [];
  room.gameStartedAt = Date.now();
  room.status = 'countdown';
  return true;
}

export function advanceToNextQuestion(room: Room): { question: Question; index: number; total: number } | null {
  room.currentQuestion++;
  room.answeredBy = [false, false];
  if (room.currentQuestion >= room.questions.length) {
    room.status = 'finished';
    return null;
  }
  room.status = 'playing';
  return { question: room.questions[room.currentQuestion], index: room.currentQuestion, total: room.questions.length };
}

export function submitAnswer(
  room: Room, playerIndex: number, questionIndex: number, optionIndex: number
): { accepted: true; allAnswered: boolean } | { accepted: false; reason: string } {
  if (questionIndex !== room.currentQuestion) return { accepted: false, reason: '题目索引不匹配' };
  if (room.answeredBy[playerIndex]) return { accepted: false, reason: '你已经答过这道题了' };
  const question = room.questions[questionIndex];
  if (!question || optionIndex < 0 || optionIndex >= question.options.length) return { accepted: false, reason: '答案选项无效' };
  const correct = optionIndex === question.answer;
  room.answeredBy[playerIndex] = true;
  room.answers.push({ questionIndex, playerIndex, selectedOption: optionIndex, correct });
  const allAnswered = room.answeredBy[0] && room.answeredBy[1];
  return { accepted: true, allAnswered };
}

function calculateScores(room: Room): [number, number] {
  return room.answers.reduce<[number, number]>((nextScores, answer) => {
    if (answer.correct) nextScores[answer.playerIndex]++;
    return nextScores;
  }, [0, 0]);
}

export function calculateQuestionResult(room: Room, questionIndex: number): AnswerResultPayload {
  const question = room.questions[questionIndex];
  const answers: AnswerResultPayload['answers'] = [null, null];
  for (const a of room.answers) {
    if (a.questionIndex !== questionIndex) continue;
    answers[a.playerIndex] = { selectedOption: a.selectedOption, correct: a.correct };
  }
  room.scores = calculateScores(room);
  return {
    questionIndex,
    answers,
    correctAnswer: question.answer,
    scores: [...room.scores] as [number, number],
  };
}

export function getGameOverPayload(room: Room): GameOverPayload {
  const [scoreA, scoreB] = room.scores;
  let winner: number | null;
  if (scoreA > scoreB) winner = 0; else if (scoreB > scoreA) winner = 1; else winner = null;
  return { scores: [...room.scores] as [number, number], winner, answers: [...room.answers], questions: [...room.questions] };
}

export function getPlayersSnapshot(room: Room): (Player | null)[] {
  return room.players.map(player => player ?? null);
}

export function getRoomStatePayload(room: Room): RoomStatePayload {
  const question = room.questions[room.currentQuestion] ?? null;
  const activeAnswerResult: AnswerResultPayload | null =
    question && room.answeredBy[0] && room.answeredBy[1]
      ? calculateQuestionResult(room, room.currentQuestion)
      : null;

  return {
    roomId: room.id,
    players: getPlayersSnapshot(room),
    status: room.status,
    quizId: room.quizId,
    questionCount: room.questionCount,
    currentQuestion: room.currentQuestion,
    totalQuestions: room.questions.length,
    scores: [...room.scores] as [number, number],
    answeredBy: [...room.answeredBy] as [boolean, boolean],
    question,
    activeAnswerResult,
    gameOver: room.status === 'finished' ? getGameOverPayload(room) : null,
  };
}

export function handleDisconnect(socketId: string): Room | undefined {
  const room = findRoomByPlayer(socketId);
  if (!room) return undefined;
  const playerIndex = room.players[0]?.id === socketId ? 0 : 1;
  if (room.status === 'waiting' && playerIndex === 0) {
    rooms.delete(room.id);
    return undefined;
  }
  return room;
}

export function deleteRoom(roomId: string): void {
  rooms.delete(roomId);
}

function scheduleEmptyRoomCleanup(roomId: string): void {
  setTimeout(() => {
    const room = rooms.get(roomId);
    if (room && !room.players[1]) rooms.delete(roomId);
  }, EMPTY_ROOM_TIMEOUT);
}

export function getRoomCount(): number {
  return rooms.size;
}

export function getRoomsInfo() {
  return Array.from(rooms.values()).map(room => ({
    id: room.id,
    status: room.status,
    players: room.players.filter(Boolean).map(p => ({ name: p!.name, ready: p!.ready })),
    scores: room.scores,
    currentQuestion: room.currentQuestion,
    totalQuestions: room.questions.length,
    quizId: room.quizId,
    questionCount: room.questionCount,
    createdAt: room.createdAt,
  }));
}

export function recordGameResult(room: Room): void {
  if (!room.gameStartedAt) return;
  const p1 = room.players[0];
  const p2 = room.players[1];
  if (!p1 || !p2) return;

  const [s1, s2] = room.scores;
  let winner: number | null;
  if (s1 > s2) winner = 0; else if (s2 > s1) winner = 1; else winner = null;

  const db = getDb();
  db.prepare(`
    INSERT INTO game_records (room_id, player1_id, player2_id, player1_name, player2_name, player1_score, player2_score, winner, question_count, quiz_id, answers, duration_seconds)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    room.id,
    p1.userId, p2.userId,
    p1.name, p2.name,
    s1, s2,
    winner,
    room.questions.length,
    room.quizId,
    JSON.stringify(room.answers),
    Math.round((Date.now() - room.gameStartedAt) / 1000),
  );
}
