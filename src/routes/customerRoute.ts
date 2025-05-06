import { PERMISSION_ACTION } from '@prisma/client';
import express from 'express';
import customerController from '../controllers/customerController';
import { checkPermission } from '../middlewares/permission';
import customerLogRoutes from './customerLogRoute';

const router = express.Router();

// Customer logs routes
router.use('/logs', customerLogRoutes);

// Get all customers
router.get(
  '/',
  checkPermission('customer', PERMISSION_ACTION.READ),
  customerController.getAllCustomers,
);

// Get customer by ID
router.get(
  '/:id',
  checkPermission('customer', PERMISSION_ACTION.READ),
  customerController.getCustomerById,
);

// Create customer
router.post(
  '/',
  checkPermission('customer', PERMISSION_ACTION.CREATE),
  customerController.createCustomer,
);

// Update customer
router.put(
  '/:id',
  checkPermission('customer', PERMISSION_ACTION.UPDATE),
  customerController.updateCustomer,
);

// Delete customer
router.delete(
  '/:id',
  checkPermission('customer', PERMISSION_ACTION.DELETE),
  customerController.deleteCustomer,
);

export default router;
