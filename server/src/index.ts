import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { apiRouter } from './routes/api.js';
import { authRouter } from './routes/auth.js';
import { registerSocketHandlers } from './socket/handlers.js';
import { seedData } from './seed.js';
import { getDb } from './db/index.js';

const PORT = process.env.PORT || 3001;

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], methods: ['GET', 'POST'] },
});

// Socket.IO auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  const db = getDb();
  const user = db.prepare('SELECT id, nickname FROM users WHERE token = ?').get(token) as { id: number; nickname: string } | undefined;
  if (!user) {
    return next(new Error('Invalid token'));
  }
  socket.data.userId = user.id;
  socket.data.nickname = user.nickname;
  next();
});

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api', apiRouter);

registerSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`🚀 服务端运行在 http://localhost:${PORT}`);
  seedData();
});
