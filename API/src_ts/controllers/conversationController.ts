/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Implements HTTP request handlers for conversation operations.
 */

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

/**
 * Parses a positive safe integer or throws an HTTP 400 error identifying the invalid field.
 * @param value Value to convert to a positive safe integer.
 * @param label Field label used when reporting a validation error.
 * @returns The parsed positive safe integer; throws an HTTP 400 error when invalid.
 */
function parsePositiveInteger(value: unknown, label: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw createHttpError(`${label} must be a positive integer`, 400);
  }
  return parsed;
}

/**
 * Returns the authenticated user ID or throws HTTP 401 when the request is unauthenticated.
 * @param req Express request containing route parameters, query values, request data, and authenticated identity when available.
 * @returns The authenticated user ID; throws an HTTP 401 error when the request is unauthenticated.
 */
function authenticatedUserId(req: AuthRequest) {
  if (!req.user?.id) throw createHttpError('Not authenticated', 401);
  return req.user.id as number;
}

/**
 * Returns the authenticated user’s accessible conversations.
 * @param req Express request containing route parameters, query values, request data, and authenticated identity when available.
 * @param res Express response used to send the operation result.
 * @param next Express callback used to continue middleware processing or forward an error.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function listConversationsHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const conversations = await listConversations(authenticatedUserId(req));
    res.json(conversations);
  } catch (error) {
    next(error);
  }
}

/**
 * Starts or retrieves a conversation with the participant ID from the request body.
 * @param req Express request containing route parameters, query values, request data, and authenticated identity when available.
 * @param res Express response used to send the operation result.
 * @param next Express callback used to continue middleware processing or forward an error.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function startConversationHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const participantId = parsePositiveInteger(req.body?.participantId, 'participantId');
    const result = await startConversation(authenticatedUserId(req), participantId);
    res.status(result.created ? 201 : 200).json(result.conversation);
  } catch (error) {
    next(error);
  }
}

/**
 * Returns a page of messages for the route conversation, honoring limit and beforeId query values.
 * @param req Express request containing route parameters, query values, request data, and authenticated identity when available.
 * @param res Express response used to send the operation result.
 * @param next Express callback used to continue middleware processing or forward an error.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
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

/**
 * Sends the request message to the route conversation and publishes it to realtime listeners.
 * @param req Express request containing route parameters, query values, request data, and authenticated identity when available.
 * @param res Express response used to send the operation result.
 * @param next Express callback used to continue middleware processing or forward an error.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
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

/**
 * Marks the route conversation’s messages as read and publishes the read receipt.
 * @param req Express request containing route parameters, query values, request data, and authenticated identity when available.
 * @param res Express response used to send the operation result.
 * @param next Express callback used to continue middleware processing or forward an error.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
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

/**
 * Returns users the authenticated user may start a conversation with.
 * @param req Express request containing route parameters, query values, request data, and authenticated identity when available.
 * @param res Express response used to send the operation result.
 * @param next Express callback used to continue middleware processing or forward an error.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
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