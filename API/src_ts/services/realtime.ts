import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';
import prisma from '../prisma';
import config from '../config';

interface SocketUser {
  id: number;
  role: string;
}

type AuthenticatedSocket = Socket & { data: { user?: SocketUser } };

let realtimeServer: Server | null = null;

function userRoom(userId: number) {
  return `user:${userId}`;
}

async function authenticateSocket(socket: AuthenticatedSocket, next: (error?: Error) => void) {
  try {
    const accessToken = socket.handshake.auth?.accessToken;
    if (typeof accessToken !== 'string' || !accessToken) {
      return next(new Error('unauthorized'));
    }

    const decoded = jwt.verify(accessToken, config.JWT_SECRET) as jwt.JwtPayload;
    const jwtId = decoded.jti;
    if (!jwtId) return next(new Error('unauthorized'));

    const session = await prisma.session.findUnique({ where: { jwtId } });
    if (!session || session.revoked || session.expiresAt <= new Date()) {
      return next(new Error('unauthorized'));
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || !user.Active) return next(new Error('unauthorized'));

    socket.data.user = { id: user.id, role: user.role };
    next();
  } catch {
    next(new Error('unauthorized'));
  }
}

export function initializeRealtime(httpServer: HttpServer) {
  const allowedOrigins = new Set(
    config.SOCKET_ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
  );

  realtimeServer = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || config.NODE_ENV !== 'production' || allowedOrigins.has(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Origin is not allowed'));
        }
      },
    },
    allowRequest: (request, callback) => {
      const origin = request.headers.origin;
      if (!origin || config.NODE_ENV !== 'production' || allowedOrigins.has(origin)) {
        callback(null, true);
      } else {
        callback('Origin is not allowed', false);
      }
    },
  });

  realtimeServer.use((socket, next) => {
    void authenticateSocket(socket as AuthenticatedSocket, next);
  });

  realtimeServer.on('connection', (socket) => {
    const authenticatedSocket = socket as AuthenticatedSocket;
    const user = authenticatedSocket.data.user;
    if (user) authenticatedSocket.join(userRoom(user.id));
  });

  return realtimeServer;
}

export function publishNewMessage(message: {
  conversationId: number;
  sender: { id: number };
  recipient: { id: number };
}) {
  if (!realtimeServer) return;
  realtimeServer
    .to([userRoom(message.sender.id), userRoom(message.recipient.id)])
    .emit('message:new', { conversationId: message.conversationId, message });
}

export function publishReadReceipt(
  readerId: number,
  otherParticipantId: number,
  receipt: { conversationId: number; markedRead: number; readAt: Date },
) {
  if (!realtimeServer || receipt.markedRead === 0) return;
  realtimeServer
    .to([userRoom(readerId), userRoom(otherParticipantId)])
    .emit('conversation:read', { conversationId: receipt.conversationId, readerId, readAt: receipt.readAt });
}

export function disconnectUserSockets(userId: number) {
  realtimeServer?.in(userRoom(userId)).disconnectSockets(true);
}