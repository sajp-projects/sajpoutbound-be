import express from 'express';
import authRoutes from './authRoute';
import userRoutes from './userRoute';

const router = express.Router();

// Authentication routes
router.use('/auth', authRoutes);

// User routes
router.use('/users', userRoutes);

export default router;
