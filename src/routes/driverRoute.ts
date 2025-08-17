import { PERMISSION_ACTION } from '@prisma/client';
import express from 'express';
import driverController from '../controllers/driverController';
import { checkPermission } from '../middlewares/permission';

const router = express.Router();

// Get all drivers
router.get('/', checkPermission('driver', PERMISSION_ACTION.READ), driverController.getAllDrivers);

// Get all active drivers (for dropdown/selection)
router.get(
  '/active',
  checkPermission('driver', PERMISSION_ACTION.READ),
  driverController.getActiveDrivers,
);

// Get driver by ID
router.get(
  '/:id',
  checkPermission('driver', PERMISSION_ACTION.READ),
  driverController.getDriverById,
);

// Create new driver
router.post(
  '/',
  checkPermission('driver', PERMISSION_ACTION.CREATE),
  driverController.createDriver,
);

// Update driver
router.put(
  '/:id',
  checkPermission('driver', PERMISSION_ACTION.UPDATE),
  driverController.updateDriver,
);

// Delete driver
router.delete(
  '/:id',
  checkPermission('driver', PERMISSION_ACTION.DELETE),
  driverController.deleteDriver,
);

export default router;
