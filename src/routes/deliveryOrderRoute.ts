import { PERMISSION_ACTION } from '@prisma/client';
import express from 'express';
import deliveryOrderController from '../controllers/deliveryOrderController';
import { checkPermission } from '../middlewares/permission';
import deliveryOrderLogRoutes from './deliveryOrderLogRoute';

const router = express.Router();

// Delivery order logs routes
router.use('/logs', deliveryOrderLogRoutes);

// Add new endpoint to get multiple DOs by IDs
router.post(
  '/by-ids',
  checkPermission('delivery_order', PERMISSION_ACTION.READ),
  deliveryOrderController.getDeliveryOrdersByIds,
);

// Get all delivery orders
router.get(
  '/',
  checkPermission('delivery_order', PERMISSION_ACTION.READ),
  deliveryOrderController.getAllDeliveryOrders,
);

// Get archived delivery orders
router.get(
  '/archived',
  checkPermission('delivery_order', PERMISSION_ACTION.READ),
  deliveryOrderController.getArchivedDeliveryOrders,
);

// Get delivery order by ID
router.get(
  '/:id',
  checkPermission('delivery_order', PERMISSION_ACTION.READ),
  deliveryOrderController.getDeliveryOrderById,
);

// Create delivery order
router.post(
  '/',
  checkPermission('delivery_order', PERMISSION_ACTION.CREATE),
  deliveryOrderController.createDeliveryOrder,
);

// Update delivery order
router.put(
  '/:id',
  checkPermission('delivery_order', PERMISSION_ACTION.UPDATE),
  deliveryOrderController.updateDeliveryOrder,
);

// Delete delivery order
router.delete(
  '/:id',
  checkPermission('delivery_order', PERMISSION_ACTION.DELETE),
  deliveryOrderController.deleteDeliveryOrder,
);

// Restore archived delivery order
router.patch(
  '/:id/restore',
  checkPermission('delivery_order', PERMISSION_ACTION.UPDATE),
  deliveryOrderController.restoreDeliveryOrder,
);

export default router;
