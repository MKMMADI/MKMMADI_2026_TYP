/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Defines the Express endpoints for conversation API operations.
 */

import { Router } from 'express';
import {
  listConversationMessagesHandler,
  listConversationContactsHandler,
  listConversationsHandler,
  markConversationReadHandler,
  sendConversationMessageHandler,
  startConversationHandler,
} from '../controllers/conversationController';
import { authenticate } from '../middleware/auth';
import { validateConversationMessage } from '../middleware/validation';

const router = Router();

router.use(authenticate);
router.get('/contacts', listConversationContactsHandler);
router.get('/', listConversationsHandler);
router.post('/', startConversationHandler);
router.get('/:conversationId/messages', listConversationMessagesHandler);
router.post('/:conversationId/messages', validateConversationMessage, sendConversationMessageHandler);
router.patch('/:conversationId/read', markConversationReadHandler);

export default router;