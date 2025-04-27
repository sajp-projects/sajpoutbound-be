import express from 'express';
import { authenticateToken } from '../middlewares/authentication';
import authRoutes from './authRoute';
import permissionRoutes from './permissionRoutes';
import rolePermissionRoutes from './rolePermissionRoutes';
import roleRoutes from './roleRoute';
import userLogRoutes from './userLogRoute';
import userRoutes from './userRoute';

const router = express.Router();

router.use('/auth', authRoutes);

router.use(authenticateToken);

// User routes
router.use('/users', userRoutes);

// Role routes
router.use('/roles', roleRoutes);

// User logs routes
router.use('/logs', userLogRoutes);

// Permission routes
router.use('/permissions', permissionRoutes);

// Role-Permission routes
router.use('/role-permissions', rolePermissionRoutes);

export default router;
