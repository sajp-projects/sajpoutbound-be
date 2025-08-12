import { PERMISSION_ACTION } from '@prisma/client';
import express from 'express';
import customerLogController from '../controllers/customerLogController';
import { checkPermission } from '../middlewares/permission';

const router = express.Router();

// Get all customer logs
router.get(
  '/',
  checkPermission('customer_log', PERMISSION_ACTION.READ),
  customerLogController.getAllCustomerLogs,
);

// Get customer logs by customer ID
router.get(
  '/:customerId',
  checkPermission('customer_log', PERMISSION_ACTION.READ),
  customerLogController.getCustomerLogs,
);

export default router;
