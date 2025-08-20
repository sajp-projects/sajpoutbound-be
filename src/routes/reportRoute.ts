import { PERMISSION_ACTION } from '@prisma/client';
import express from 'express';
import reportController from '../controllers/reportController';
import { checkPermission } from '../middlewares/permission';

const router = express.Router();

// Dashboard Summary route
router.get('/dashboard-summary', reportController.getDashboardSummary);

// Operational Report routes
router.get(
  '/operational',
  checkPermission('report', PERMISSION_ACTION.READ),
  reportController.getOperationalReport,
);
router.get(
  '/operational/table',
  checkPermission('report', PERMISSION_ACTION.READ),
  reportController.getOperationalReportTable,
);

// Daily Output Report routes
router.get(
  '/daily-output',
  checkPermission('report', PERMISSION_ACTION.READ),
  reportController.getDailyOutputReport,
);
router.get(
  '/daily-output/table',
  checkPermission('report', PERMISSION_ACTION.READ),
  reportController.getDailyOutputReportTable,
);

// Shipment Assignment Report routes
router.get(
  '/shipment-assignment',
  checkPermission('report', PERMISSION_ACTION.READ),
  reportController.getShipmentAssignmentReport,
);

// Expenditure Excel Report route
router.get(
  '/expenditure/excel',
  checkPermission('report', PERMISSION_ACTION.READ),
  reportController.downloadExpenditureExcel,
);

export default router;
