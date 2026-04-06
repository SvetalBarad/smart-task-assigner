import express from 'express';
import {
  addProjectMember,
  createProject,
  deleteProject,
  getProject,
  getProjectMembers,
  getProjects,
  removeProjectMember,
  updateProject,
} from '../controllers/projectController.js';
import { verifyToken } from '../controllers/authController.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', getProjects);
router.get('/:id', getProject);
router.post('/', createProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);
router.get('/:id/members', getProjectMembers);
router.post('/:id/members', addProjectMember);
router.delete('/:id/members/:userId', removeProjectMember);

export default router;
