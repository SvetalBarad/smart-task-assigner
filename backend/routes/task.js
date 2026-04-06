import express from 'express';
import { verifyToken } from '../controllers/authController.js';
import {
  createTask,
  deleteTask,
  getProjectTasks,
  getMyTasks,
  updateTaskStatus,
  updateTaskProgress,
  updateTask,
} from '../controllers/taskController.js';

const router = express.Router();

router.use(verifyToken);

router.get('/tasks/my', getMyTasks);
router.get('/projects/:projectId/tasks', getProjectTasks);
router.post('/projects/:projectId/tasks', createTask);
router.patch('/tasks/:taskId/status', updateTaskStatus);
router.patch('/tasks/:taskId/progress', updateTaskProgress);
router.patch('/tasks/:taskId', updateTask);
router.delete('/tasks/:taskId', deleteTask);

export default router;
