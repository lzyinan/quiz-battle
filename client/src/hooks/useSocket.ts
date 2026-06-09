import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerEvents, ClientEvents } from '../../../shared/types';

type GameSocket = Socket<ServerEvents, ClientEvents>;

const TOKEN_KEY = 'quizpk_token';

let globalSocket: GameSocket | null = null;

function createSocket(): GameSocket {
  const token = localStorage.getItem(TOKEN_KEY);
  return io({
    autoConnect: !!token,
    path: '/pk/socket.io',
    auth: { token },
  });
}

export function getSocket(): GameSocket {
  if (!globalSocket) {
    globalSocket = createSocket();
  }
  return globalSocket;
}

/** Disconnect and recreate socket (e.g. after login) */
export function reconnectSocket(): GameSocket {
  if (globalSocket) {
    globalSocket.disconnect();
  }
  globalSocket = createSocket();
  globalSocket.connect();
  return globalSocket;
}

export function useSocket() {
  const [connected, setConnected] = useState(() => globalSocket?.connected ?? false);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => { setConnected(true); };
    const onDisconnect = () => { setConnected(false); };

    if (socket.connected) setConnected(true);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const on = useCallback(<E extends keyof ServerEvents>(event: E, handler: ServerEvents[E]) => {
    const socket = getSocket();
    socket.on(event, handler as any);
    return () => { socket.off(event, handler as any); };
  }, []);

  const emit = useCallback(<E extends keyof ClientEvents>(event: E, ...args: Parameters<ClientEvents[E]>) => {
    const socket = getSocket();
    socket.emit(event, ...args);
  }, []);

  return { connected, on, emit };
}
