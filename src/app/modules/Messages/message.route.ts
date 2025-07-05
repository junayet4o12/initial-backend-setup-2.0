import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { MessageControllers } from './message.controller';
import auth from '../../middlewares/auth';
import { messageValidation } from './message.validation';
import { upload } from '../../middlewares/upload';
import { parseBody } from '../../middlewares/parseBody';

const router = express.Router();

// Send message
router.post(
  '/send',
  auth('USER', 'SUPERADMIN'),
  upload.array('files'),
  parseBody,
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
