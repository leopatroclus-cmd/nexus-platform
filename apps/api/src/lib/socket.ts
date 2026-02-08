import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { verifyAccessToken } from './jwt.js';

let io: SocketServer;

export function initSocketIO(httpServer: HttpServer, corsOrigin: string) {
  io = new SocketServer(httpServer, {
    cors: { origin: corsOrigin, methods: ['GET', 'POST'], credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      socket.data.orgId = payload.orgId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const orgId = socket.data.orgId;
    socket.join(`org:${orgId}`);

    socket.on('join-conversation', (conversationId: string) => {
      socket.join(`conv:${conversationId}`);
    });

    socket.on('leave-conversation', (conversationId: string) => {
      socket.leave(`conv:${conversationId}`);
    });

    socket.on('disconnect', () => {
      // Cleanup handled by Socket.IO
    });
  });

  return io;
}

export function getIO(): SocketServer {
  return io;
}

export function emitToConversation(conversationId: string, event: string, data: unknown) {
  if (io) {
    io.to(`conv:${conversationId}`).emit(event, data);
  }
}

export function emitToOrg(orgId: string, event: string, data: unknown) {
  if (io) {
    io.to(`org:${orgId}`).emit(event, data);
  }
}
