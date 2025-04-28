import { PERMISSION_ACTION } from '@prisma/client';
import express from 'express';
import userController from '../controllers/userController';
import { checkPermission } from '../middlewares/permission';

const router = express.Router();

// Protected routes with permission checks
router.get('/', checkPermission('user', PERMISSION_ACTION.READ), userController.getAllUsers);
router.get(
  '/archived',
  checkPermission('user', PERMISSION_ACTION.READ),
  userController.getArchivedUsers,
);
router.get('/:id', checkPermission('user', PERMISSION_ACTION.READ), userController.getUserById);
router.post('/', checkPermission('user', PERMISSION_ACTION.CREATE), userController.createUser);
router.put('/:id', checkPermission('user', PERMISSION_ACTION.UPDATE), userController.updateUser);
router.patch(
  '/:id/unarchived',
  checkPermission('user', PERMISSION_ACTION.UPDATE),
  userController.unarchiveUser,
);
router.delete('/:id', checkPermission('user', PERMISSION_ACTION.DELETE), userController.deleteUser);

export default router;
