import type { Server, Socket } from 'socket.io';
import * as RoomManager from './roomManager.js';

const DISCONNECT_TIMEOUT = 30_000;

export function registerSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] 连接: ${socket.id}`);

    socket.on('create-room', (data: { playerName: string }) => {
      const room = RoomManager.createRoom(socket.id, data.playerName || '玩家A');
      socket.join(room.id);
      socket.emit('room-created', { roomId: room.id, playerIndex: 0, players: room.players.map(p => p ?? null) });
      console.log(`[Room] 创建: ${room.id}`);
    });

    socket.on('join-room', (data: { roomId: string; playerName: string }) => {
      const result = RoomManager.joinRoom(data.roomId, socket.id, data.playerName || '玩家B');
      if ('error' in result) { socket.emit('room-error', result.error); return; }
      socket.join(data.roomId);
      const { room, playerIndex } = result;
      socket.emit('room-joined', { roomId: room.id, playerIndex, players: room.players.map(p => p ?? null) });
      io.to(data.roomId).emit('player-joined', room.players.map(p => p ?? null));
      console.log(`[Room] ${socket.id} 加入房间 ${data.roomId}`);
    });

    socket.on('reconnect-room', (data: { roomId: string; playerIndex: number; playerName: string }) => {
      const result = RoomManager.reconnectPlayer(data.roomId, data.playerIndex, socket.id);
      if ('error' in result) {
        socket.emit('room-error', result.error);
        return;
      }
      socket.join(data.roomId);
      const { room } = result;

      // Notify the reconnecting player
      socket.emit('reconnected', {
        roomId: data.roomId,
        playerIndex: data.playerIndex,
        players: room.players.map(p => p ?? null),
        phase: room.status,
      });

      // Notify opponent
      socket.to(data.roomId).emit('opponent-reconnected');
      console.log(`[Room] ${socket.id} 重连房间 ${data.roomId}`);
    });

    socket.on('play-again', () => {
      const room = RoomManager.findRoomByPlayer(socket.id);
      if (!room || room.status !== 'finished') return;

      RoomManager.resetRoom(room);
      io.to(room.id).emit('room-reset', room.players.map(p => p ?? null));
      console.log(`[Room] 房间 ${room.id} 再来一局`);
    });

    socket.on('select-quiz', (quizId: number | null) => {
      const room = RoomManager.findRoomByPlayer(socket.id);
      if (!room) { socket.emit('room-error', '你不在任何房间中'); return; }
      RoomManager.selectQuiz(room, quizId);
      io.to(room.id).emit('quiz-selected', quizId);
    });

    socket.on('player-ready', () => {
      const room = RoomManager.findRoomByPlayer(socket.id);
      if (!room) { socket.emit('room-error', '你不在任何房间中'); return; }
      const playerIndex = room.players[0]?.id === socket.id ? 0 : 1;
      const bothReady = RoomManager.playerReady(room, playerIndex);
      io.to(room.id).emit('player-ready-update', room.players.map(p => p ?? null));
      if (bothReady) {
        const loaded = RoomManager.loadQuestions(room);
        if (!loaded) {
          io.to(room.id).emit('room-error', '题库为空，请先添加题目');
          room.players[0].ready = false;
          if (room.players[1]) room.players[1].ready = false;
          io.to(room.id).emit('player-ready-update', room.players.map(p => p ?? null));
          return;
        }
        startCountdown(io, room.id);
      }
    });

    socket.on('submit-answer', (data: { questionIndex: number; optionIndex: number }) => {
      const room = RoomManager.findRoomByPlayer(socket.id);
      if (!room || room.status !== 'playing') return;
      const playerIndex = room.players[0]?.id === socket.id ? 0 : 1;
      const result = RoomManager.submitAnswer(room, playerIndex, data.questionIndex, data.optionIndex);
      if (!result.accepted) { socket.emit('answer-rejected', result.reason); return; }
      const question = room.questions[data.questionIndex];
      io.to(room.id).emit('answer-result', {
        questionIndex: data.questionIndex, playerIndex, selectedOption: data.optionIndex,
        correct: result.correct, correctAnswer: question.answer, scores: result.scores,
      });
      setTimeout(() => {
        const next = RoomManager.advanceToNextQuestion(room);
        if (next === null) {
          const gameOver = RoomManager.getGameOverPayload(room);
          io.to(room.id).emit('game-over', gameOver);
          // Don't auto-delete — allow play-again. Clean up after 5 minutes of inactivity.
          setTimeout(() => {
            const currentRoom = RoomManager.getRoom(room.id);
            if (currentRoom && currentRoom.status === 'finished') {
              RoomManager.deleteRoom(room.id);
              io.socketsLeave(room.id);
            }
          }, 5 * 60_000);
        } else {
          io.to(room.id).emit('next-question', { question: next.question, questionIndex: next.index, totalQuestions: next.total });
        }
      }, 1500);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] 断开: ${socket.id}`);
      const room = RoomManager.handleDisconnect(socket.id);
      if (room) {
        socket.to(room.id).emit('opponent-disconnected');
        setTimeout(() => {
          const currentRoom = RoomManager.getRoom(room.id);
          if (currentRoom && currentRoom.status !== 'finished') {
            const disconnectedIndex = currentRoom.players[0]?.id === socket.id ? 0 : 1;
            const winner = 1 - disconnectedIndex;
            io.to(room.id).emit('game-over', { scores: currentRoom.scores, winner, answers: currentRoom.answers });
            RoomManager.deleteRoom(room.id);
          }
        }, DISCONNECT_TIMEOUT);
      }
    });
  });
}

function startCountdown(io: Server, roomId: string): void {
  let count = 3;
  const tick = () => {
    io.to(roomId).emit('countdown', count);
    if (count > 1) { count--; setTimeout(tick, 1000); }
    else {
      setTimeout(() => {
        const room = RoomManager.getRoom(roomId);
        if (!room) return;
        room.status = 'playing';
        io.to(roomId).emit('next-question', { question: room.questions[0], questionIndex: 0, totalQuestions: room.questions.length });
      }, 1000);
    }
  };
  tick();
}
