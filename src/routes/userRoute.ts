import { PERMISSION_ACTION } from '@prisma/client';
import express from 'express';
import userController from '../controllers/userController';
import { authenticateToken } from '../middlewares/authentication';
import { checkPermission } from '../middlewares/permission';

const router = express.Router();

// Protected routes with permission checks
router.get(
  '/',
  authenticateToken,
  checkPermission('user', PERMISSION_ACTION.READ),
  userController.getAllUsers,
);
router.get(
  '/archived',
  authenticateToken,
  checkPermission('user', PERMISSION_ACTION.READ),
  userController.getArchivedUsers,
);
router.get(
  '/:id',
  authenticateToken,
  checkPermission('user', PERMISSION_ACTION.READ),
  userController.getUserById,
);
router.post(
  '/',
  authenticateToken,
  checkPermission('user', PERMISSION_ACTION.CREATE),
  userController.createUser,
);
router.put(
  '/:id',
  authenticateToken,
  checkPermission('user', PERMISSION_ACTION.UPDATE),
  userController.updateUser,
);
router.patch(
  '/:id/unarchived',
  authenticateToken,
  checkPermission('user', PERMISSION_ACTION.UPDATE),
  userController.unarchiveUser,
);
router.delete(
  '/:id',
  authenticateToken,
  checkPermission('user', PERMISSION_ACTION.DELETE),
  userController.deleteUser,
);

export default router;
