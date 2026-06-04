import type { Room, Player, Question } from '../../../shared/types.js';
import { getDb } from '../db/index.js';

const rooms = new Map<string, Room>();
const EMPTY_ROOM_TIMEOUT = 5 * 60 * 1000;

export function generateRoomId(): string {
  let id: string;
  do {
    id = String(Math.floor(1000 + Math.random() * 9000));
  } while (rooms.has(id));
  return id;
}

export function createRoom(playerId: string, playerName: string): Room {
  const id = generateRoomId();
  const player: Player = { id: playerId, name: playerName || '玩家A', playerIndex: 0, ready: false };
  const room: Room = {
    id, players: [player, undefined], status: 'waiting', quizId: null,
    questions: [], currentQuestion: 0, scores: [0, 0], lockedBy: null,
    answers: [], createdAt: Date.now(),
  };
  rooms.set(id, room);
  scheduleEmptyRoomCleanup(id);
  return room;
}

export function joinRoom(roomId: string, playerId: string, playerName: string): { room: Room; playerIndex: number } | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: '房间不存在' };
  if (room.players[0]?.id === playerId) return { error: '你已经在房间里了' };
  if (room.players[1]) {
    if (room.players[1].id === playerId) return { error: '你已经在房间里了' };
    return { error: '房间已满' };
  }
  const player: Player = { id: playerId, name: playerName || '玩家B', playerIndex: 1, ready: false };
  room.players[1] = player;
  room.status = 'readying';
  return { room, playerIndex: 1 };
}

/** Reconnect a disconnected player */
export function reconnectPlayer(roomId: string, playerIndex: number, newSocketId: string): { room: Room; playerIndex: number } | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: '房间不存在' };
  const player = room.players[playerIndex];
  if (!player) return { error: '玩家不存在' };

  // Update socket id
  player.id = newSocketId;
  return { room, playerIndex };
}

/** Reset room for a new game */
export function resetRoom(room: Room): void {
  room.status = 'readying';
  room.questions = [];
  room.currentQuestion = 0;
  room.scores = [0, 0];
  room.lockedBy = null;
  room.answers = [];
  room.quizId = null;
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

export function playerReady(room: Room, playerIndex: number): boolean {
  const player = room.players[playerIndex];
  if (!player) return false;
  player.ready = true;
  return !!(room.players[0]?.ready && room.players[1]?.ready);
}

export function loadQuestions(room: Room): boolean {
  const db = getDb();
  let questions: any[];
  if (room.quizId === null) {
    questions = db.prepare('SELECT * FROM questions ORDER BY RANDOM() LIMIT 10').all();
  } else {
    questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY RANDOM() LIMIT 10').all(room.quizId);
  }
  if (questions.length === 0) return false;
  room.questions = questions.map((q: any) => ({ ...q, options: JSON.parse(q.options) }));
  room.currentQuestion = 0;
  room.scores = [0, 0];
  room.lockedBy = null;
  room.answers = [];
  room.status = 'countdown';
  return true;
}

export function advanceToNextQuestion(room: Room): { question: Question; index: number; total: number } | null {
  room.currentQuestion++;
  room.lockedBy = null;
  if (room.currentQuestion >= room.questions.length) {
    room.status = 'finished';
    return null;
  }
  room.status = 'playing';
  return { question: room.questions[room.currentQuestion], index: room.currentQuestion, total: room.questions.length };
}

export function submitAnswer(
  room: Room, playerIndex: number, questionIndex: number, optionIndex: number
): { accepted: true; correct: boolean; scores: [number, number] } | { accepted: false; reason: string } {
  if (questionIndex !== room.currentQuestion) return { accepted: false, reason: '题目索引不匹配' };
  if (room.lockedBy !== null) return { accepted: false, reason: '对手已抢答' };
  room.lockedBy = playerIndex;
  const question = room.questions[questionIndex];
  const correct = optionIndex === question.answer;
  if (correct) { room.scores[playerIndex]++; } else { room.scores[1 - playerIndex]++; }
  room.answers.push({ questionIndex, playerIndex, selectedOption: optionIndex, correct });
  return { accepted: true, correct, scores: [...room.scores] as [number, number] };
}

export function getGameOverPayload(room: Room) {
  const [scoreA, scoreB] = room.scores;
  let winner: number | null;
  if (scoreA > scoreB) winner = 0; else if (scoreB > scoreA) winner = 1; else winner = null;
  return { scores: room.scores, winner, answers: room.answers };
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
    createdAt: room.createdAt,
  }));
}
