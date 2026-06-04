import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerEvents, ClientEvents } from '../../../shared/types';

type GameSocket = Socket<ServerEvents, ClientEvents>;

export function useSocket() {
  const socketRef = useRef<GameSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket: GameSocket = io({ autoConnect: true });
    socket.on('connect', () => {
      setConnected(true);
      console.log('[Socket] 已连接:', socket.id);
    });
    socket.on('disconnect', () => {
      setConnected(false);
      console.log('[Socket] 已断开');
    });
    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, []);

  const on = useCallback(<E extends keyof ServerEvents>(event: E, handler: ServerEvents[E]) => {
    socketRef.current?.on(event, handler as any);
    return () => { socketRef.current?.off(event, handler as any); };
  }, []);

  const emit = useCallback(<E extends keyof ClientEvents>(event: E, ...args: Parameters<ClientEvents[E]>) => {
    socketRef.current?.emit(event, ...args);
  }, []);

  return { socket: socketRef, connected, on, emit };
}
