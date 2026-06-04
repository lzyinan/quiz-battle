import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { apiRouter } from './routes/api.js';
import { registerSocketHandlers } from './socket/handlers.js';
import { seedData } from './seed.js';

const PORT = process.env.PORT || 3001;

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());
app.use('/api', apiRouter);

registerSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`🚀 服务端运行在 http://localhost:${PORT}`);
  seedData();
});
