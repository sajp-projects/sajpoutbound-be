import express from 'express';
import { authenticateToken } from '../middlewares/authentication';
import authRoutes from './authRoute';
import roleRoutes from './roleRoute';
import userLogRoutes from './userLogRoute';
import userRoutes from './userRoute';

const router = express.Router();

// Authentication routes
router.use('/auth', authRoutes);

router.use(authenticateToken);

// User routes
router.use('/users', userRoutes);

// Role routes
router.use('/roles', roleRoutes);

// User logs routes
router.use('/logs', userLogRoutes);

export default router;
