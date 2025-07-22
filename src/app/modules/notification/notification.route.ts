import express from 'express';
import auth from '../../middlewares/auth';
import { UserRoleEnum } from '@prisma/client';
import { notificationsControllers } from './notification.controller';
import validateRequest from '../../middlewares/validateRequest';
import { notificationValidation } from './notification.validation';

export const NotificationsRouter = express.Router();

// Get all notifications for the authenticated user
NotificationsRouter.get(
  '/',
  auth('ANY'),
  notificationsControllers.getAllNotifications,
);

// Get all users by a specific notification ID
NotificationsRouter.get(
  '/users/:notificationId',
  auth('SUPERADMIN'),
  notificationsControllers.getUsersByNotification,
);

// Mark a specific notification as read for the authenticated user
NotificationsRouter.patch(
  '/read/:notificationId',
  auth('ANY'),
  notificationsControllers.markNotificationAsRead,
);

// Get the unread notification count for the authenticated user
NotificationsRouter.get(
  '/unread/count',
  auth('ANY'),
  notificationsControllers.getUnreadNotificationCount,
);

// Mark all notifications as read for the authenticated user
NotificationsRouter.patch(
  '/read-all',
  auth('ANY'),
  notificationsControllers.markAllNotificationsAsRead,
);