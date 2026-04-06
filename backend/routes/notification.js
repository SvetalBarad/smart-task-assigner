import express from 'express';
import { verifyToken } from '../controllers/authController.js';
import {
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../controllers/notificationController.js';

const router = express.Router();

router.use(verifyToken);
router.get('/', getMyNotifications);
router.patch('/read-all', markAllNotificationsAsRead);
router.patch('/:id/read', markNotificationAsRead);

export default router;
