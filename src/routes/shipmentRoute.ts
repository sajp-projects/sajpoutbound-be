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
  checkPermission('shipment', PERMISSION_ACTION.READ_ARCHIVED),
  shipmentController.getArchivedShipments,
);

// Change customer after weighing
router.patch(
  '/:id/change-customer',
  checkPermission('shipment', PERMISSION_ACTION.CHANGE_CUSTOMER),
  shipmentController.changeCustomerAfterWeighing,
);

// Revise DO after weighing
router.patch(
  '/:id/revise-items',
  checkPermission('shipment', PERMISSION_ACTION.REVISE_DO),
  shipmentController.reviseDeliveryOrderAfterWeighing,
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

router.post(
  '/:shipmentId/choosen-product-selective',
  checkPermission('shipment', PERMISSION_ACTION.UPDATE),
  checkWarehouseAccess(),
  checkShipmentNotArchived,
  shipmentController.chooseProductSelectiveForShipment,
);

router.delete(
  '/:shipmentId/choosen-product/:productId',
  checkPermission('shipment', PERMISSION_ACTION.UPDATE),
  checkWarehouseAccess(),
  checkShipmentNotArchived,
  shipmentController.deleteChosenProduct,
);

// Get Nota Timbangan documents for a product
router.get(
  '/:shipmentId/nota-timbangan/:productId',
  checkPermission('shipment', PERMISSION_ACTION.READ),
  shipmentController.getNotaTimbanganForProduct,
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
  checkPermission('shipment', PERMISSION_ACTION.VERIFY_PLATE),
  checkShipmentNotArchived,
  shipmentController.verifyPlateNumberAndPhoto,
);

// Manually Verify Plate Number (No AI verification)
router.patch(
  '/:id/verify-plate-manual',
  checkPermission('shipment', PERMISSION_ACTION.VERIFY_PLATE_MANUAL),
  checkShipmentNotArchived,
  shipmentController.manualVerifyPlate,
);

router.post(
  '/:shipmentId/manual-weigh-items',
  checkPermission('shipment', PERMISSION_ACTION.WEIGH),
  checkShipmentNotArchived,
  shipmentController.manualWeighItems,
);

// Individual item weighing (legacy)
router.post(
  '/:shipmentId/weigh-item',
  checkPermission('shipment', PERMISSION_ACTION.WEIGH),
  checkShipmentNotArchived,
  shipmentController.weighShipmentItem,
);

router.patch(
  '/:id/update-tally',
  checkPermission('shipment', PERMISSION_ACTION.UPDATE_TALLY),
  shipmentController.updateTally,
);

router.delete(
  '/items/:shipmentItemId/cancel-reflected',
  checkPermission('shipment', PERMISSION_ACTION.CANCEL_ITEMS),
  shipmentController.cancelItemReflectedToDO,
);

router.delete(
  '/items/:shipmentItemId/cancel-shipment-only',
  checkPermission('shipment', PERMISSION_ACTION.CANCEL_ITEMS),
  shipmentController.cancelItemShipmentOnly,
);

export default router;
