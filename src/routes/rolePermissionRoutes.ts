import { PERMISSION_ACTION } from '@prisma/client';
import express from 'express';
import rolePermissionController from '../controllers/rolePermissionController';
import { checkPermission } from '../middlewares/permission';

const router = express.Router();

// Role-Permission routes
router.post(
  '/',
  checkPermission('role', PERMISSION_ACTION.UPDATE),
  rolePermissionController.assignPermissions,
);
router.delete(
  '/:roleId/:permissionId',
  checkPermission('role', PERMISSION_ACTION.UPDATE),
  rolePermissionController.removePermission,
);
router.put(
  '/:roleId',
  checkPermission('role', PERMISSION_ACTION.UPDATE),
  rolePermissionController.updateRolePermissions,
);
router.get(
  '/:roleId',
  checkPermission('role', PERMISSION_ACTION.READ),
  rolePermissionController.getRolePermissions,
);

export default router;
