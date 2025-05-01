import { PERMISSION_ACTION } from '@prisma/client';
import express from 'express';
import userLogController from '../controllers/userLogController';
import { checkPermission } from '../middlewares/permission';

const router = express.Router();

// Get all user logs
router.get('/', checkPermission('user', PERMISSION_ACTION.READ), userLogController.getAllUserLogs);

// Get logs for a specific user
router.get(
  '/user/:userId',
  checkPermission('user', PERMISSION_ACTION.READ),
  userLogController.getUserLogs,
);

export default router;
