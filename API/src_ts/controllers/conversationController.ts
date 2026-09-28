import { NextFunction, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { createHttpError } from '../utils/httpError';
import { publishNewMessage, publishReadReceipt } from '../services/realtime';
import {
  DEFAULT_MESSAGE_PAGE_SIZE,
  MAX_MESSAGE_PAGE_SIZE,
  listConversationContacts,
  listConversationMessages,
  listConversations,
  markConversationRead,
  sendConversationMessage,
  startConversation,
} from '../services/conversationService';

function parsePositiveInteger(value: unknown, label: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw createHttpError(`${label} must be a positive integer`, 400);
  }
  return parsed;
}

function authenticatedUserId(req: AuthRequest) {
  if (!req.user?.id) throw createHttpError('Not authenticated', 401);
  return req.user.id as number;
}

export async function listConversationsHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const conversations = await listConversations(authenticatedUserId(req));
    res.json(conversations);
  } catch (error) {
    next(error);
  }
}

export async function startConversationHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const participantId = parsePositiveInteger(req.body?.participantId, 'participantId');
    const result = await startConversation(authenticatedUserId(req), participantId);
    res.status(result.created ? 201 : 200).json(result.conversation);
  } catch (error) {
    next(error);
  }
}

export async function listConversationMessagesHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const conversationId = parsePositiveInteger(req.params.conversationId, 'conversationId');
    const pageSize = req.query.limit === undefined
      ? DEFAULT_MESSAGE_PAGE_SIZE
      : parsePositiveInteger(req.query.limit, 'limit');
    if (pageSize > MAX_MESSAGE_PAGE_SIZE) {
      throw createHttpError(`limit must not exceed ${MAX_MESSAGE_PAGE_SIZE}`, 400);
    }
    const beforeId = req.query.beforeId === undefined
      ? undefined
      : parsePositiveInteger(req.query.beforeId, 'beforeId');

    const result = await listConversationMessages(
      authenticatedUserId(req),
      conversationId,
      pageSize,
      beforeId,
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function sendConversationMessageHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const conversationId = parsePositiveInteger(req.params.conversationId, 'conversationId');
    const message = await sendConversationMessage(
      authenticatedUserId(req),
      conversationId,
      req.body?.body,
    );
    publishNewMessage(message);
    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
}

export async function markConversationReadHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const conversationId = parsePositiveInteger(req.params.conversationId, 'conversationId');
    const userId = authenticatedUserId(req);
    const result = await markConversationRead(userId, conversationId);
    publishReadReceipt(userId, result.otherParticipantId, result);
    res.json({ markedRead: result.markedRead });
  } catch (error) {
    next(error);
  }
}

export async function listConversationContactsHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const contacts = await listConversationContacts(authenticatedUserId(req));
    res.json(contacts);
  } catch (error) {
    next(error);
  }
}