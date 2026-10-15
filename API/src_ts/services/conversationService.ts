/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Implements conversation service domain operations and their persistence or integrations.
 */

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

/**
 * Returns only the participant ID, name, and role for client responses.
 * @param user User record whose public participant fields are selected.
 * @returns The participant ID, name, and role.
 */
function publicParticipant(user: { id: number; name: string; role: Role }) {
  return { id: user.id, name: user.name, role: user.role };
}

/**
 * Returns the message with sender and recipient reduced to public participant fields.
 * @param message Message with sender and recipient records to serialize for clients.
 * @returns The message with sender and recipient represented by public participant fields.
 */
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

/**
 * Allows conversation pairs that include a manager or pair an employee with a clerk.
 * @param firstRole Role of one conversation participant.
 * @param secondRole Role of the other conversation participant.
 * @returns True when the roles are permitted to communicate; otherwise false.
 */
function rolesMayCommunicate(firstRole: Role, secondRole: Role) {
  if (firstRole === 'MANAGER' || secondRole === 'MANAGER') return true;
  const pair = new Set([firstRole, secondRole]);
  return pair.has('EMPLOYEE') && pair.has('CLERK');
}

/**
 * Returns eligible contact roles for the current user; managers may see all other active roles.
 * @param role Role of the current user whose eligible contacts are being filtered.
 * @returns The set of roles eligible for contact, or undefined when all other roles are eligible.
 */
function contactRoleFilter(role: Role): Role[] | undefined {
  if (role === 'MANAGER') return undefined; // all other active users
  if (role === 'EMPLOYEE') return ['MANAGER', 'CLERK'];
  if (role === 'CLERK') return ['MANAGER', 'EMPLOYEE'];
  return ['MANAGER'];
}

/**
 * Returns the conversation participant other than the given user, or throws if the user is not a participant.
 * @param conversation Conversation and participant records used to identify or serialize the other participant.
 * @param userId ID of the authenticated participant accessing the conversation or contact list.
 * @returns The other participant’s user record.
 */
function getOtherParticipant(conversation: ConversationWithParticipants, userId: number) {
  if (conversation.participantAId === userId) return conversation.participantB;
  if (conversation.participantBId === userId) return conversation.participantA;
  throw createHttpError('Conversation not found', 404);
}

/**
 * Loads a conversation and verifies both participant accounts and their roles permit access.
 * @param conversationId ID of the conversation to list, send to, or mark read.
 * @param userId ID of the authenticated participant accessing the conversation or contact list.
 * @returns The conversation record and the other participant’s user record.
 */
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

/**
 * Builds the public conversation details and identifies the other participant.
 * @param conversation Conversation and participant records used to identify or serialize the other participant.
 * @param otherParticipant Public participant record returned alongside conversation metadata.
 * @returns Public conversation metadata with the other participant’s public identity.
 */
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

/**
 * Looks up the conversation for the ordered participant ID pair.
 * @param participantAId ID of the first participant in the canonical pair.
 * @param participantBId ID of the second participant in the canonical pair.
 * @returns A promise resolving to the matching conversation with participants, or null if none exists.
 */
async function findCanonicalConversation(participantAId: number, participantBId: number) {
  return prisma.conversation.findUnique({
    where: { participantAId_participantBId: { participantAId, participantBId } },
    include: conversationInclude,
  });
}

/**
 * Returns accessible conversations with their latest message and unread-message count.
 * @param userId ID of the authenticated participant accessing the conversation or contact list.
 * @returns A promise resolving to accessible conversations with last-message details and unread counts.
 */
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

/**
 * Returns active users the current user is permitted to contact, ordered by name.
 * @param userId ID of the authenticated participant accessing the conversation or contact list.
 * @returns A promise resolving to active, permitted contacts in name order.
 */
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

/**
 * Rejects self-conversations and creates or returns the canonical conversation with the participant.
 * @param userId ID of the authenticated participant accessing the conversation or contact list.
 * @param participantId ID of the user to include as the other conversation participant.
 * @returns A promise resolving to the conversation record and whether it was newly created.
 */
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

/**
 * Returns one page of messages in an accessible conversation, optionally before a message cursor.
 * @param userId ID of the authenticated participant accessing the conversation or contact list.
 * @param conversationId ID of the conversation to list, send to, or mark read.
 * @param pageSize Maximum number of messages to return on this page.
 * @param beforeId Optional message ID; only earlier messages are returned when provided.
 * @returns A promise resolving to the requested message page and pagination metadata.
 */
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

/**
 * Validates the sender’s access and creates a message in the conversation.
 * @param userId ID of the authenticated participant accessing the conversation or contact list.
 * @param conversationId ID of the conversation to list, send to, or mark read.
 * @param rawBody Untrusted message text supplied by the sender.
 * @returns A promise resolving to the created message with public sender and recipient details.
 */
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

/**
 * Marks the user’s unread messages in the conversation as read and returns the read-receipt details.
 * @param userId ID of the authenticated participant accessing the conversation or contact list.
 * @param conversationId ID of the conversation to list, send to, or mark read.
 * @returns A promise resolving to the number of messages marked read and the other participant ID.
 */
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
