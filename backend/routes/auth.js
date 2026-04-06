import express from 'express';
const router  = express.Router();
import {
	register,
	login,
	forgotPassword,
	googleSignIn,
	verifyToken,
	updateProfile,
	changePassword,
} from '../controllers/authController.js';

router.post('/register', register);
router.post('/login',    login);
router.post('/forgot-password', forgotPassword);
router.post('/google', googleSignIn);
router.put('/profile',   verifyToken, updateProfile);
router.put('/password',  verifyToken, changePassword);

export default router;
