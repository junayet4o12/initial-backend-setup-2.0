import express from 'express';
import { AuthRouters } from '../modules/Auth/auth.routes';
import { UserRouters } from '../modules/User/user.routes';
import { MessageRouters } from '../modules/Messages/message.route';
import { NotificationsRouters } from '../modules/Notification/notification.route';
const router = express.Router();

const moduleRoutes = [
  {
    path: '/auth',
    route: AuthRouters,
  },
  {
    path: '/users',
    route: UserRouters,
  },
  {
    path: '/messages',
    route: MessageRouters,
  },
  {
    path: '/notifications',
    route: NotificationsRouters,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router;
