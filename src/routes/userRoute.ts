import { PERMISSION_ACTION } from '@prisma/client';
import express from 'express';
import userController from '../controllers/userController';
import { checkPermission } from '../middlewares/permission';
import userLogRoutes from './userLogRoute';
const router = express.Router();

// User logs routes
router.use('/logs', userLogRoutes);

// Get all users
router.get('/', checkPermission('user', PERMISSION_ACTION.READ), userController.getAllUsers);

// Get archived users
router.get(
  '/archived',
  checkPermission('user', PERMISSION_ACTION.READ),
  userController.getArchivedUsers,
);

// Get user by ID
router.get('/:id', checkPermission('user', PERMISSION_ACTION.READ), userController.getUserById);

// Create user
router.post('/', checkPermission('user', PERMISSION_ACTION.CREATE), userController.createUser);

// Update user
router.put('/:id', checkPermission('user', PERMISSION_ACTION.UPDATE), userController.updateUser);

// Unarchive user
router.patch(
  '/:id/unarchived',
  checkPermission('user', PERMISSION_ACTION.UPDATE),
  userController.unarchiveUser,
);

// Delete user
router.delete('/:id', checkPermission('user', PERMISSION_ACTION.DELETE), userController.deleteUser);

export default router;
