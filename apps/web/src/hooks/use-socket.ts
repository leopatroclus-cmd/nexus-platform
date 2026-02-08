'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

let globalSocket: Socket | null = null;

export function useSocket() {
  const { accessToken, isAuthenticated } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      if (globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
      }
      return;
    }

    if (!globalSocket || !globalSocket.connected) {
      globalSocket = io(SOCKET_URL, {
        auth: { token: accessToken },
        transports: ['websocket', 'polling'],
      });

      globalSocket.on('connect', () => {
        console.log('[Socket] Connected');
      });

      globalSocket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
      });

      globalSocket.on('connect_error', (err) => {
        console.error('[Socket] Connection error:', err.message);
      });
    }

    socketRef.current = globalSocket;

    return () => {
      // Don't disconnect on unmount — keep alive across page navigations
    };
  }, [isAuthenticated, accessToken]);

  const joinConversation = useCallback((conversationId: string) => {
    globalSocket?.emit('join-conversation', conversationId);
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    globalSocket?.emit('leave-conversation', conversationId);
  }, []);

  const onEvent = useCallback((event: string, handler: (...args: any[]) => void) => {
    globalSocket?.on(event, handler);
    return () => {
      globalSocket?.off(event, handler);
    };
  }, []);

  return {
    socket: socketRef.current,
    joinConversation,
    leaveConversation,
    onEvent,
    isConnected: globalSocket?.connected ?? false,
  };
}
