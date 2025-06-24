import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { MessageControllers } from './message.controller';
import auth from '../../middlewares/auth';
import { messageValidation } from './message.validation';

const router = express.Router();

// Send message
router.post(
  '/send',
  auth('USER', 'SUPERADMIN'),
  validateRequest.body(messageValidation.sendMessage),
  MessageControllers.sendMessage
);

// Get conversation between two users
router.get(
  '/conversation/:id',
  auth('USER', 'SUPERADMIN'),
  MessageControllers.getConversation
);

// Mark message as read
router.patch(
  '/mark-read/:messageId',
  auth('USER', 'SUPERADMIN'),
  MessageControllers.markMessageAsRead
);

// Delete message
router.delete(
  '/delete/:messageId',
  auth('USER', 'SUPERADMIN'),
  MessageControllers.deleteMessage
);

export const MessageRouters = router;
