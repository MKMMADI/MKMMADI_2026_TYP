/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Implements realtime domain operations and their persistence or integrations.
 */

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

/**
 * Returns the Socket.IO room name associated with a user ID.
 * @param userId ID of the user whose Socket.IO room or active connections are addressed.
 * @returns The Socket.IO room name for the user.
 */
function userRoom(userId: number) {
  return `user:${userId}`;
}

/**
 * Verifies the socket access token and attaches the authenticated user to the socket.
 * @param socket Incoming Socket.IO connection whose token is authenticated.
 * @param next Socket.IO middleware callback used to accept the connection or reject it with an error.
 * @returns A promise resolving after the authentication check and callback complete; failures are passed to next(error).
 */
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

/**
 * Attaches Socket.IO to the HTTP server and registers authenticated connection handling.
 * @param httpServer HTTP server to which realtime communication is attached.
 * @returns The configured Socket.IO server instance.
 */
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

/**
 * Emits a new-message event to the conversation participants.
 * @param message New message to broadcast to its conversation.
 * @returns No value; emits the message to the appropriate participant rooms.
 */
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

/**
 * Emits read-receipt details to the relevant conversation participants.
 * @param readerId ID of the user who read the messages.
 * @param otherParticipantId ID of the other participant who should receive the read receipt.
 * @param receipt Read-receipt information to emit to the participants.
 * @returns No value; emits the receipt to the appropriate participant rooms.
 */
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

/**
 * Emits booking-displacement details to the affected employee.
 * @param employeeId ID of the employee who receives the displacement notification.
 * @param displacement Booking-displacement information to emit to the employee.
 * @returns No value; emits the displacement notification to the employee’s room.
 */
export function publishBookingDisplacement(
  employeeId: number,
  displacement: {
    bookingId: number;
    displacedByBookingId: number;
    suggestedStartAt: Date | null;
    suggestedEndAt: Date | null;
  },
) {
  realtimeServer?.to(userRoom(employeeId)).emit('booking:displaced', displacement);
}

/**
 * Emits a booking status update to the affected employee.
 * @param employeeId ID of the employee who receives the status update.
 * @param update Booking status information to emit to the employee.
 * @returns No value; emits the status update to the employee’s room.
 */
export function publishBookingUpdate(
  employeeId: number,
  update: { bookingId: number; status: string },
) {
  realtimeServer?.to(userRoom(employeeId)).emit('booking:updated', update);
}

/**
 * Disconnects every active socket associated with the specified user.
 * @param userId ID of the user whose Socket.IO room or active connections are addressed.
 * @returns No value; disconnects the user’s active sockets.
 */
export function disconnectUserSockets(userId: number) {
  realtimeServer?.in(userRoom(userId)).disconnectSockets(true);
}