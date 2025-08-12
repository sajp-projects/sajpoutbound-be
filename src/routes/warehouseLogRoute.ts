import { PERMISSION_ACTION } from '@prisma/client';
import express from 'express';
import warehouseLogController from '../controllers/warehouseLogController';
import { checkPermission } from '../middlewares/permission';

const router = express.Router();

// Get all warehouse logs
router.get(
  '/',
  checkPermission('warehouse_log', PERMISSION_ACTION.READ),
  warehouseLogController.getAllWarehouseLogs,
);

// Get warehouse logs by warehouse ID
router.get(
  '/:warehouseId',
  checkPermission('warehouse_log', PERMISSION_ACTION.READ),
  warehouseLogController.getWarehouseLogsByWarehouseId,
);

export default router;
