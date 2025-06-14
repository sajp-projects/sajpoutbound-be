import { PERMISSION_ACTION } from '@prisma/client';
import express from 'express';
import shipmentController from '../controllers/shipmentController';
import {
  checkPermission,
  checkShipmentNotArchived,
  checkWarehouseAccess,
} from '../middlewares/permission';
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
  checkShipmentNotArchived,
  shipmentController.chooseProductForShipment,
);

router.delete(
  '/:shipmentId/choosen-product/:productId',
  checkPermission('shipment', PERMISSION_ACTION.UPDATE),
  checkWarehouseAccess(),
  checkShipmentNotArchived,
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
  checkShipmentNotArchived,
  shipmentController.updateShipment,
);

// Delete shipment
router.delete(
  '/:id',
  checkPermission('shipment', PERMISSION_ACTION.DELETE),
  checkShipmentNotArchived,
  shipmentController.deleteShipment,
);

// Upload Plate Photo (multipart/form-data with 'platePhoto' field)
router.patch(
  '/:id/upload-plate-photo',
  checkPermission('shipment', PERMISSION_ACTION.UPDATE),
  checkShipmentNotArchived,
  shipmentController.uploadPlatePhoto,
);

// Verify Plate Number and Photo
router.patch(
  '/:id/verify-plate',
  checkPermission('shipment', PERMISSION_ACTION.UPDATE),
  checkShipmentNotArchived,
  shipmentController.verifyPlateNumberAndPhoto,
);

export default router;
