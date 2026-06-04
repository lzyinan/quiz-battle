import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerEvents, ClientEvents } from '../../../shared/types';

type GameSocket = Socket<ServerEvents, ClientEvents>;

// 全局单例 — 跨页面共享同一个 Socket 连接，避免路由切换时断线导致房间丢失
let globalSocket: GameSocket | null = null;
let refCount = 0;

function getSocket(): GameSocket {
  if (!globalSocket) {
    globalSocket = io({ autoConnect: true });
  }
  return globalSocket;
}

export function useSocket() {
  const [connected, setConnected] = useState(() => globalSocket?.connected ?? false);

  useEffect(() => {
    const socket = getSocket();
    refCount++;

    const onConnect = () => { setConnected(true); };
    const onDisconnect = () => { setConnected(false); };

    if (socket.connected) setConnected(true);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      refCount--;
      if (refCount <= 0) {
        socket.disconnect();
        globalSocket = null;
        refCount = 0;
      }
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
