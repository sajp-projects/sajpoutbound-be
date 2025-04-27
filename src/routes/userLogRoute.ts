import { PERMISSION_ACTION } from '@prisma/client';
import express from 'express';
import userLogController from '../controllers/userLogController';
import { checkPermission } from '../middlewares/permission';

const router = express.Router();

// Get logs for a specific user
router.get(
  '/user/:userId',
  checkPermission('user', PERMISSION_ACTION.READ),
  userLogController.getUserLogs,
);

// Get logs of actions performed by a specific user
router.get(
  '/performer/:userId',
  checkPermission('user', PERMISSION_ACTION.READ),
  userLogController.getLogsByPerformer,
);

// Search all logs (admin function)
router.get(
  '/search',
  checkPermission('user', PERMISSION_ACTION.READ),
  userLogController.searchLogs,
);

export default router;
