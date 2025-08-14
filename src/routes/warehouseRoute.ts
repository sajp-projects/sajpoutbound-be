import { PERMISSION_ACTION } from '@prisma/client';
import express from 'express';
import warehouseController from '../controllers/warehouseController';
import { checkPermission } from '../middlewares/permission';
import warehouseLogRoutes from './warehouseLogRoute';

const router = express.Router();

// Warehouse logs routes
router.use('/logs', warehouseLogRoutes);

// Get all warehouses for options
router.get('/options', warehouseController.getAllWarehouses);

// Get all warehouses
router.get(
  '/',
  checkPermission('warehouse', PERMISSION_ACTION.READ),
  warehouseController.getAllWarehouses,
);

// Get warehouse by ID
router.get(
  '/:id',
  checkPermission('warehouse', PERMISSION_ACTION.READ),
  warehouseController.getWarehouseById,
);

// Get warehouse products with pagination
router.get(
  '/:id/products',
  checkPermission('warehouse', PERMISSION_ACTION.READ),
  warehouseController.getWarehouseProducts,
);

// Get warehouse users with pagination
router.get(
  '/:id/users',
  checkPermission('warehouse', PERMISSION_ACTION.READ),
  warehouseController.getWarehouseUsers,
);

// Create warehouse
router.post(
  '/',
  checkPermission('warehouse', PERMISSION_ACTION.CREATE),
  warehouseController.createWarehouse,
);

// Update warehouse
router.put(
  '/:id',
  checkPermission('warehouse', PERMISSION_ACTION.UPDATE),
  warehouseController.updateWarehouse,
);

// Delete warehouse
router.delete(
  '/:id',
  checkPermission('warehouse', PERMISSION_ACTION.DELETE),
  warehouseController.deleteWarehouse,
);

// Assign user to warehouse
router.post(
  '/:id/users',
  checkPermission('warehouse', PERMISSION_ACTION.UPDATE),
  warehouseController.assignUserToWarehouse,
);

// Unassign user from warehouse
router.delete(
  '/:id/users/:userId',
  checkPermission('warehouse', PERMISSION_ACTION.UPDATE),
  warehouseController.unassignUserFromWarehouse,
);

export default router;
