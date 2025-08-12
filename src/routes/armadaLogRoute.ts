import { PERMISSION_ACTION } from '@prisma/client';
import express from 'express';
import armadaLogController from '../controllers/armadaLogController';
import { checkPermission } from '../middlewares/permission';

const router = express.Router();

// Get all armada logs
router.get(
  '/',
  checkPermission('armada_log', PERMISSION_ACTION.READ),
  armadaLogController.getAllArmadaLogs,
);

// Get armada logs by armada ID
router.get(
  '/:armadaId',
  checkPermission('armada_log', PERMISSION_ACTION.READ),
  armadaLogController.getArmadaLogs,
);

export default router;
