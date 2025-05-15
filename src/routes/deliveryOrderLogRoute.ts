import { PERMISSION_ACTION } from '@prisma/client';
import express from 'express';
import deliveryOrderLogController from '../controllers/deliveryOrderLogController';
import { checkPermission } from '../middlewares/permission';

const router = express.Router();

// Get all delivery order logs
router.get(
  '/',
  checkPermission('delivery_order', PERMISSION_ACTION.READ),
  deliveryOrderLogController.getAllDeliveryOrderLogs,
);

// Get all logs for a specific delivery order
router.get(
  '/:id',
  checkPermission('delivery_order', PERMISSION_ACTION.READ),
  deliveryOrderLogController.getDeliveryOrderLogs,
);

export default router;
