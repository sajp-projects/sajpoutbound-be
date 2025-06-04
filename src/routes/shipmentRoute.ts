import { PERMISSION_ACTION } from '@prisma/client';
import express from 'express';
import shipmentController from '../controllers/shipmentController';
import { checkPermission, checkWarehouseAccess } from '../middlewares/permission';
import shipmentLogRoutes from './shipmentLogRoutes';

const router = express.Router();

// Shipment logs routes
router.use('/logs', shipmentLogRoutes);

// Get all shipments
router.get(
  '/',
  checkPermission('shipment', PERMISSION_ACTION.READ),
  shipmentController.getAllShipments,
);

// Get archived shipments
router.get(
  '/archived',
  checkPermission('shipment', PERMISSION_ACTION.READ),
  shipmentController.getArchivedShipments,
);

// Get available items for weighing in a shipment
router.get(
  '/:id/available-items',
  checkPermission('shipment', PERMISSION_ACTION.READ),
  shipmentController.getAvailableItemsForWeighing,
);

// Chosen products routes
router.get(
  '/:shipmentId/choosen-product',
  checkPermission('shipment', PERMISSION_ACTION.READ),
  shipmentController.getChosenProductsForShipment,
);

router.post(
  '/:shipmentId/choosen-product',
  checkPermission('shipment', PERMISSION_ACTION.UPDATE),
  checkWarehouseAccess(),
  shipmentController.chooseProductForShipment,
);

router.delete(
  '/:shipmentId/choosen-product/:productId',
  checkPermission('shipment', PERMISSION_ACTION.UPDATE),
  checkWarehouseAccess(),
  shipmentController.deleteChosenProduct,
);

// Get shipment by ID
router.get(
  '/:id',
  checkPermission('shipment', PERMISSION_ACTION.READ),
  shipmentController.getShipmentById,
);

// Create shipment
router.post(
  '/',
  checkPermission('shipment', PERMISSION_ACTION.CREATE),
  shipmentController.createShipment,
);

// Update shipment
router.put(
  '/:id',
  checkPermission('shipment', PERMISSION_ACTION.UPDATE),
  shipmentController.updateShipment,
);

// Delete shipment
router.delete(
  '/:id',
  checkPermission('shipment', PERMISSION_ACTION.DELETE),
  shipmentController.deleteShipment,
);

// Restore archived shipment
router.patch(
  '/:id/restore',
  checkPermission('shipment', PERMISSION_ACTION.UPDATE),
  shipmentController.restoreShipment,
);

// Weigh shipment item
router.post(
  '/weigh',
  checkPermission('shipment', PERMISSION_ACTION.UPDATE),
  shipmentController.weighShipmentItem,
);

// Verify shipment
router.patch(
  '/:id/verify',
  checkPermission('shipment', PERMISSION_ACTION.UPDATE),
  shipmentController.verifyShipment,
);

export default router;
