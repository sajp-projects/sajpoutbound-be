import express from 'express';
import authRoutes from './authRoute';
import roleRoutes from './roleRoute';
import userRoutes from './userRoute';

const router = express.Router();

// Authentication routes
router.use('/auth', authRoutes);

// User routes
router.use('/users', userRoutes);

// Role routes
router.use('/roles', roleRoutes);

export default router;
