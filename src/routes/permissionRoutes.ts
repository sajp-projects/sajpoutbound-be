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

export default router;
