import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerEvents, ClientEvents } from '../../../shared/types';

type GameSocket = Socket<ServerEvents, ClientEvents>;

// 全局单例 — 整个应用生命周期共享同一个连接
// 页面切换时不断开，只有浏览器关闭/刷新才断开
let globalSocket: GameSocket | null = null;

function getSocket(): GameSocket {
  if (!globalSocket) {
    globalSocket = io({ autoConnect: true, path: '/pk/socket.io' });
  }
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

    // 只移除事件监听，不断开连接
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
