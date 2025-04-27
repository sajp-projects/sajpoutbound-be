import { PERMISSION_ACTION } from '@prisma/client';
import express from 'express';
import permissionController from '../controllers/permissionController';
import { checkPermission } from '../middlewares/permission';

const router = express.Router();

// Permission routes
router.get(
  '/',
  checkPermission('permission', PERMISSION_ACTION.READ),
  permissionController.getAllPermissions,
);
router.get(
  '/:id',
  checkPermission('permission', PERMISSION_ACTION.READ),
  permissionController.getPermissionById,
);
router.get(
  '/resource/:resource',
  checkPermission('permission', PERMISSION_ACTION.READ),
  permissionController.getPermissionsByResource,
);
router.post(
  '/',
  checkPermission('permission', PERMISSION_ACTION.CREATE),
  permissionController.createPermission,
);
router.put(
  '/:id',
  checkPermission('permission', PERMISSION_ACTION.UPDATE),
  permissionController.updatePermission,
);
router.delete(
  '/:id',
  checkPermission('permission', PERMISSION_ACTION.DELETE),
  permissionController.deletePermission,
);

export default router;
