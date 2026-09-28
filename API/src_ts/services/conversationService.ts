import { Prisma, Role } from '@prisma/client';
import prisma from '../prisma';
import { createHttpError } from '../utils/httpError';

export const MAX_MESSAGE_LENGTH = 4000;
export const DEFAULT_MESSAGE_PAGE_SIZE = 50;
export const MAX_MESSAGE_PAGE_SIZE = 100;

const participantSelect = {
  id: true,
  name: true,
  role: true,
  Active: true,
} satisfies Prisma.UserSelect;

const conversationInclude = {
  participantA: { select: participantSelect },
  participantB: { select: participantSelect },
} satisfies Prisma.ConversationInclude;

const messageInclude = {
  sender: { select: participantSelect },
  recipient: { select: participantSelect },
} satisfies Prisma.MessageInclude;

const conversationListInclude = {
  ...conversationInclude,
  messages: {
    take: 1,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: messageInclude,
  },
} satisfies Prisma.ConversationInclude;

type ConversationWithParticipants = Prisma.ConversationGetPayload<{
  include: typeof conversationInclude;
}>;

function publicParticipant(user: { id: number; name: string; role: Role }) {
  return { id: user.id, name: user.name, role: user.role };
}

function serializeMessage<T extends {
  sender: { id: number; name: string; role: Role; Active: boolean };
  recipient: { id: number; name: string; role: Role; Active: boolean };
}>(message: T) {
  return {
    ...message,
    sender: publicParticipant(message.sender),
    recipient: publicParticipant(message.recipient),
  };
}

/** Allowed pairs: any conversation involving a manager, plus employee \u2194 clerk. */
function rolesMayCommunicate(firstRole: Role, secondRole: Role) {
  if (firstRole === 'MANAGER' || secondRole === 'MANAGER') return true;
  const pair = new Set([firstRole, secondRole]);
  return pair.has('EMPLOYEE') && pair.has('CLERK');
}

function contactRoleFilter(role: Role): Role[] | undefined {
  if (role === 'MANAGER') return undefined; // all other active users
  if (role === 'EMPLOYEE') return ['MANAGER', 'CLERK'];
  if (role === 'CLERK') return ['MANAGER', 'EMPLOYEE'];
  return ['MANAGER'];
}

function getOtherParticipant(conversation: ConversationWithParticipants, userId: number) {
  if (conversation.participantAId === userId) return conversation.participantB;
  if (conversation.participantBId === userId) return conversation.participantA;
  throw createHttpError('Conversation not found', 404);
}

async function getAccessibleConversation(conversationId: number, userId: number) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: conversationInclude,
  });

  if (!conversation) throw createHttpError('Conversation not found', 404);

  const otherParticipant = getOtherParticipant(conversation, userId);
  if (
    !conversation.participantA.Active ||
    !conversation.participantB.Active ||
    !rolesMayCommunicate(conversation.participantA.role, conversation.participantB.role)
  ) {
    throw createHttpError('Conversation not found', 404);
  }

  return { conversation, otherParticipant };
}

function serializeConversation(
  conversation: ConversationWithParticipants,
  otherParticipant: { id: number; name: string; role: Role },
) {
  return {
    id: conversation.id,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    participant: publicParticipant(otherParticipant),
  };
}

async function findCanonicalConversation(participantAId: number, participantBId: number) {
  return prisma.conversation.findUnique({
    where: { participantAId_participantBId: { participantAId, participantBId } },
    include: conversationInclude,
  });
}

export async function listConversations(userId: number) {
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ participantAId: userId }, { participantBId: userId }] },
    include: conversationListInclude,
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
  });

  const allowedConversations = conversations.filter((conversation) =>
    conversation.participantA.Active &&
    conversation.participantB.Active &&
    rolesMayCommunicate(conversation.participantA.role, conversation.participantB.role),
  );

  if (allowedConversations.length === 0) return [];

  const unreadCounts = await prisma.message.groupBy({
    by: ['conversationId'],
    where: {
      conversationId: { in: allowedConversations.map(({ id }) => id) },
      recipientId: userId,
      readAt: null,
    },
    _count: { _all: true },
  });
  const unreadCountByConversation = new Map(
    unreadCounts.map(({ conversationId, _count }) => [conversationId, _count._all]),
  );

  return allowedConversations.map((conversation) => {
    const otherParticipant = getOtherParticipant(conversation, userId);
    const lastMessage = conversation.messages[0];
    return {
      ...serializeConversation(conversation, otherParticipant),
      unreadCount: unreadCountByConversation.get(conversation.id) ?? 0,
      lastMessage: lastMessage ? serializeMessage(lastMessage) : null,
    };
  });
}

export async function listConversationContacts(userId: number) {
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: participantSelect,
  });
  if (!currentUser?.Active) throw createHttpError('Not authenticated', 401);

  const allowedRoles = contactRoleFilter(currentUser.role);
  const contacts = await prisma.user.findMany({
    where: {
      id: { not: userId },
      Active: true,
      ...(allowedRoles ? { role: { in: allowedRoles } } : {}),
    },
    select: participantSelect,
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
  });

  return contacts
    .filter((contact) => rolesMayCommunicate(currentUser.role, contact.role))
    .map(publicParticipant);
}

export async function startConversation(userId: number, participantId: number) {
  if (userId === participantId) {
    throw createHttpError('You cannot start a conversation with yourself', 400);
  }

  const [currentUser, otherUser] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: participantSelect }),
    prisma.user.findUnique({ where: { id: participantId }, select: participantSelect }),
  ]);

  if (!currentUser?.Active) throw createHttpError('Not authenticated', 401);
  if (!otherUser?.Active) throw createHttpError('User not found', 404);
  if (!rolesMayCommunicate(currentUser.role, otherUser.role)) {
    throw createHttpError('You are not allowed to message this user', 403);
  }

  const participantAId = Math.min(userId, participantId);
  const participantBId = Math.max(userId, participantId);
  const existing = await findCanonicalConversation(participantAId, participantBId);
  if (existing) {
    return {
      conversation: serializeConversation(existing, getOtherParticipant(existing, userId)),
      created: false,
    };
  }

  try {
    const conversation = await prisma.conversation.create({
      data: { participantAId, participantBId },
      include: conversationInclude,
    });
    return {
      conversation: serializeConversation(conversation, getOtherParticipant(conversation, userId)),
      created: true,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const racedConversation = await findCanonicalConversation(participantAId, participantBId);
      if (racedConversation) {
        return {
          conversation: serializeConversation(
            racedConversation,
            getOtherParticipant(racedConversation, userId),
          ),
          created: false,
        };
      }
    }
    throw error;
  }
}

export async function listConversationMessages(
  userId: number,
  conversationId: number,
  pageSize = DEFAULT_MESSAGE_PAGE_SIZE,
  beforeId?: number,
) {
  const { conversation } = await getAccessibleConversation(conversationId, userId);

  if (beforeId !== undefined) {
    const cursorMessage = await prisma.message.findFirst({
      where: { id: beforeId, conversationId },
      select: { id: true },
    });
    if (!cursorMessage) throw createHttpError('Message cursor not found', 404);
  }

  const results = await prisma.message.findMany({
    where: { conversationId },
    ...(beforeId === undefined ? {} : { cursor: { id: beforeId }, skip: 1 }),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: pageSize + 1,
    include: messageInclude,
  });
  const hasMore = results.length > pageSize;
  const page = results.slice(0, pageSize);
  const nextBeforeId = hasMore ? page[page.length - 1].id : null;

  return {
    conversationId: conversation.id,
    messages: page.reverse().map(serializeMessage),
    nextBeforeId,
  };
}

export async function sendConversationMessage(userId: number, conversationId: number, rawBody: unknown) {
  const { conversation, otherParticipant } = await getAccessibleConversation(conversationId, userId);
  const body = typeof rawBody === 'string' ? rawBody.trim() : '';
  if (!body) throw createHttpError('Message body is required', 400);
  if (body.length > MAX_MESSAGE_LENGTH) {
    throw createHttpError(`Message body must be ${MAX_MESSAGE_LENGTH} characters or fewer`, 400);
  }

  const message = await prisma.$transaction(async (transaction) => {
    const created = await transaction.message.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        recipientId: otherParticipant.id,
        body,
      },
      include: messageInclude,
    });
    await transaction.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });
    return created;
  });

  return serializeMessage(message);
}

export async function markConversationRead(userId: number, conversationId: number) {
  const { otherParticipant } = await getAccessibleConversation(conversationId, userId);
  const readAt = new Date();
  const result = await prisma.message.updateMany({
    where: { conversationId, recipientId: userId, readAt: null },
    data: { readAt },
  });
  return {
    conversationId,
    markedRead: result.count,
    readAt,
    otherParticipantId: otherParticipant.id,
  };
}
