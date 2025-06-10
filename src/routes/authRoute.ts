import express from 'express';
import authController from '../controllers/authController';
import { authenticateToken } from '../middlewares/authentication';

const router = express.Router();

router.post('/login', authController.login);
// Protected routes (authentication required)
router.get('/refresh-token', authController.refreshToken);
router.post('/logout', authenticateToken, authController.logout);

export default router;
