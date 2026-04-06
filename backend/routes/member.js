import express from 'express';
import { verifyToken } from '../controllers/authController.js';
import { getMembers } from '../controllers/memberController.js';

const router = express.Router();

router.use(verifyToken);
router.get('/', getMembers);

export default router;
