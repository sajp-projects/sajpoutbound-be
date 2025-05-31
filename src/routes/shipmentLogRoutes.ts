import { PERMISSION_ACTION } from '@prisma/client';
import express from 'express';
import shipmentLogController from '../controllers/shipmentLogController';
import { checkPermission } from '../middlewares/permission';

const router = express.Router();

// Get all logs across all shipments
router.get(
  '/',
  checkPermission('shipment', PERMISSION_ACTION.READ),
  shipmentLogController.getAllShipmentLogs,
);

// Get all logs for a specific shipment
router.get(
  '/:shipmentId',
  checkPermission('shipment', PERMISSION_ACTION.READ),
  shipmentLogController.getShipmentLogs,
);

export default router;
