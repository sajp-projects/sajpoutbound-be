import { PERMISSION_ACTION } from '@prisma/client';
import express from 'express';
import shipmentLogController from '../controllers/shipmentLogController';
import { checkPermission } from '../middlewares/permission';

const router = express.Router();

// Get all logs for a shipment
router.get(
  '/:shipmentId',
  checkPermission('shipment', PERMISSION_ACTION.READ),
  shipmentLogController.getShipmentLogs,
);

export default router;
