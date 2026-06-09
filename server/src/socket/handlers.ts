import type { Server, Socket } from 'socket.io';
import type { QuestionCount, Room } from '../../../shared/types.js';
import * as RoomManager from './roomManager.js';

const DISCONNECT_TIMEOUT = 30_000;

function emitRoomState(io: Server, room: Room): void {
  io.to(room.id).emit('room-state', RoomManager.getRoomStatePayload(room));
}

function emitRoomStateTo(socket: Socket, room: Room): void {
  socket.emit('room-state', RoomManager.getRoomStatePayload(room));
}

export function registerSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] 连接: ${socket.id} (${socket.data.nickname})`);

    socket.on('create-room', () => {
      const room = RoomManager.createRoom(socket.id, socket.data.userId, socket.data.nickname);
      socket.join(room.id);
      const players = RoomManager.getPlayersSnapshot(room);
      const state = RoomManager.getRoomStatePayload(room);
      socket.emit('room-created', { roomId: room.id, playerIndex: 0, players, state });
      emitRoomStateTo(socket, room);
      console.log(`[Room] 创建: ${room.id}`);
    });

    socket.on('join-room', (data: { roomId: string }) => {
      const result = RoomManager.joinRoom(data.roomId, socket.id, socket.data.userId, socket.data.nickname);
      if ('error' in result) { socket.emit('room-error', result.error); return; }
      socket.join(data.roomId);
      const { room, playerIndex } = result;
      const players = RoomManager.getPlayersSnapshot(room);
      const state = RoomManager.getRoomStatePayload(room);
      socket.emit('room-joined', { roomId: room.id, playerIndex, players, state });
      io.to(data.roomId).emit('player-joined', players);
      emitRoomState(io, room);
      console.log(`[Room] ${socket.id} 加入房间 ${data.roomId}`);
    });

    socket.on('reconnect-room', (data: { roomId: string; playerIndex: number }) => {
      const result = RoomManager.reconnectPlayer(data.roomId, data.playerIndex, socket.id, socket.data.userId);
      if ('error' in result) {
        socket.emit('room-error', result.error);
        return;
      }
      socket.join(data.roomId);
      const { room } = result;
      const players = RoomManager.getPlayersSnapshot(room);
      const state = RoomManager.getRoomStatePayload(room);

      socket.emit('reconnected', {
        roomId: data.roomId,
        playerIndex: data.playerIndex,
        players,
        phase: room.status,
        state,
      });
      emitRoomStateTo(socket, room);

      socket.to(data.roomId).emit('opponent-reconnected');
      emitRoomState(io, room);
      console.log(`[Room] ${socket.id} 重连房间 ${data.roomId}`);
    });

    socket.on('sync-room', (data: { roomId: string }) => {
      const room = RoomManager.findRoomByPlayer(socket.id);
      if (!room || room.id !== data.roomId) return;
      emitRoomStateTo(socket, room);
    });

    socket.on('play-again', () => {
      const room = RoomManager.findRoomByPlayer(socket.id);
      if (!room || room.status !== 'finished') return;

      RoomManager.resetRoom(room);
      io.to(room.id).emit('room-reset', RoomManager.getPlayersSnapshot(room));
      emitRoomState(io, room);
      console.log(`[Room] 房间 ${room.id} 再来一局`);
    });

    socket.on('select-quiz', (quizId: number | null) => {
      const room = RoomManager.findRoomByPlayer(socket.id);
      if (!room) { socket.emit('room-error', '你不在任何房间中'); return; }
      if (room.status !== 'readying') {
        emitRoomStateTo(socket, room);
        return;
      }
      RoomManager.selectQuiz(room, quizId);
      io.to(room.id).emit('quiz-selected', quizId);
      io.to(room.id).emit('player-ready-update', RoomManager.getPlayersSnapshot(room));
      emitRoomState(io, room);
    });

    socket.on('select-question-count', (count: QuestionCount) => {
      const room = RoomManager.findRoomByPlayer(socket.id);
      if (!room) { socket.emit('room-error', '你不在任何房间中'); return; }
      if (room.status !== 'readying') {
        emitRoomStateTo(socket, room);
        return;
      }
      if (!RoomManager.selectQuestionCount(room, count)) {
        socket.emit('room-error', '题目数量只能选择10、20或30题');
        return;
      }
      io.to(room.id).emit('question-count-selected', count);
      io.to(room.id).emit('player-ready-update', RoomManager.getPlayersSnapshot(room));
      emitRoomState(io, room);
    });

    socket.on('player-ready', () => {
      const room = RoomManager.findRoomByPlayer(socket.id);
      if (!room) { socket.emit('room-error', '你不在任何房间中'); return; }
      if (room.status !== 'readying' || !room.players[1]) {
        emitRoomStateTo(socket, room);
        return;
      }
      const playerIndex = room.players[0]?.id === socket.id ? 0 : 1;
      const bothReady = RoomManager.playerReady(room, playerIndex);
      io.to(room.id).emit('player-ready-update', RoomManager.getPlayersSnapshot(room));
      emitRoomState(io, room);
      if (bothReady) {
        const loaded = RoomManager.loadQuestions(room);
        if (!loaded) {
          io.to(room.id).emit('room-error', '题库为空，请先添加题目');
          room.players[0].ready = false;
          if (room.players[1]) room.players[1].ready = false;
          io.to(room.id).emit('player-ready-update', RoomManager.getPlayersSnapshot(room));
          emitRoomState(io, room);
          return;
        }
        emitRoomState(io, room);
        startCountdown(io, room.id);
      }
    });

    socket.on('submit-answer', (data: { questionIndex: number; optionIndex: number }) => {
      const room = RoomManager.findRoomByPlayer(socket.id);
      if (!room || room.status !== 'playing') return;
      const playerIndex = room.players[0]?.id === socket.id ? 0 : 1;
      const result = RoomManager.submitAnswer(room, playerIndex, data.questionIndex, data.optionIndex);
      if (!result.accepted) { socket.emit('answer-rejected', result.reason); return; }
      emitRoomState(io, room);
      if (!result.allAnswered) return;
      const answerResult = RoomManager.calculateQuestionResult(room, data.questionIndex);
      io.to(room.id).emit('answer-result', answerResult);
      emitRoomState(io, room);
      setTimeout(() => {
        const currentRoom = RoomManager.getRoom(room.id);
        if (!currentRoom || currentRoom.status !== 'playing' || currentRoom.currentQuestion !== data.questionIndex) return;
        const next = RoomManager.advanceToNextQuestion(currentRoom);
        if (next === null) {
          const gameOver = RoomManager.getGameOverPayload(currentRoom);
          io.to(currentRoom.id).emit('game-over', gameOver);
          emitRoomState(io, currentRoom);
          setTimeout(() => {
            const latestRoom = RoomManager.getRoom(currentRoom.id);
            if (latestRoom && latestRoom.status === 'finished') {
              RoomManager.deleteRoom(currentRoom.id);
              io.socketsLeave(currentRoom.id);
            }
          }, 5 * 60_000);
        } else {
          io.to(currentRoom.id).emit('next-question', { question: next.question, questionIndex: next.index, totalQuestions: next.total });
          emitRoomState(io, currentRoom);
        }
      }, 1500);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] 断开: ${socket.id}`);
      const room = RoomManager.handleDisconnect(socket.id);
      if (room) {
        const disconnectedIndex = room.players[0]?.id === socket.id ? 0 : 1;
        socket.to(room.id).emit('opponent-disconnected');
        setTimeout(() => {
          const currentRoom = RoomManager.getRoom(room.id);
          if (currentRoom && currentRoom.status !== 'finished') {
            if (currentRoom.players[disconnectedIndex]?.id !== socket.id) return;
            const winner = 1 - disconnectedIndex;
            io.to(room.id).emit('game-over', { ...RoomManager.getGameOverPayload(currentRoom), winner });
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
        emitRoomState(io, room);
      }, 1000);
    }
  };
  tick();
}
