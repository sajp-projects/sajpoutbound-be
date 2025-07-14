import { PERMISSION_ACTION } from '@prisma/client';
import express from 'express';
import reportController from '../controllers/reportController';
import { checkPermission } from '../middlewares/permission';

const router = express.Router();

// Operational Report routes
router.get(
  '/operational',
  checkPermission('report', PERMISSION_ACTION.READ),
  reportController.getOperationalReport,
);

// Daily Output Report routes
router.get(
  '/daily-output',
  checkPermission('report', PERMISSION_ACTION.READ),
  reportController.getDailyOutputReport,
);

// Monthly Output Report routes
router.get(
  '/monthly-output',
  checkPermission('report', PERMISSION_ACTION.READ),
  reportController.getMonthlyOutputReport,
);

// Shipment Assignment Report routes
router.get(
  '/shipment-assignment',
  checkPermission('report', PERMISSION_ACTION.READ),
  reportController.getShipmentAssignmentReport,
);

// Dashboard Summary routes
router.get(
  '/dashboard-summary',
  checkPermission('report', PERMISSION_ACTION.READ),
  reportController.getDashboardSummary,
);

export default router;
