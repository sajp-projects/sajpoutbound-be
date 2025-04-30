import { PERMISSION_ACTION } from '@prisma/client';
import express from 'express';
import rolePermissionController from '../controllers/rolePermissionController';
import { checkPermission } from '../middlewares/permission';

const router = express.Router();

// Toggle permissions for a role (add if not assigned, remove if already assigned)
router.put(
  '/:roleId/update-all',
  checkPermission('role', PERMISSION_ACTION.UPDATE),
  checkPermission('permission', PERMISSION_ACTION.UPDATE),
  rolePermissionController.updateRolePermissions,
);

// Get permissions for a specific role
router.get('/:roleId', rolePermissionController.getRolePermissions);

export default router;
