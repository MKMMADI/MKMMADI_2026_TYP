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

const router = Router();

router.use(authenticate);
router.get('/contacts', listConversationContactsHandler);
router.get('/', listConversationsHandler);
router.post('/', startConversationHandler);
router.get('/:conversationId/messages', listConversationMessagesHandler);
router.post('/:conversationId/messages', sendConversationMessageHandler);
router.patch('/:conversationId/read', markConversationReadHandler);

export default router;