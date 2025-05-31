import express from 'express';
import { authenticateToken } from '../middlewares/authentication';
import armadaRoutes from './armadaRoute';
import authRoutes from './authRoute';
import customerRoutes from './customerRoute';
import deliveryOrderRoutes from './deliveryOrderRoute';
import permissionRoutes from './permissionRoutes';
import productRoutes from './productRoute';
import rolePermissionRoutes from './rolePermissionRoutes';
import roleRoutes from './roleRoute';
import shipmentRoutes from './shipmentRoute';
import userRoutes from './userRoute';
import warehouseRoutes from './warehouseRoute';

const router = express.Router();

router.use('/auth', authRoutes);

router.use(authenticateToken);

// User routes
router.use('/users', userRoutes);

// Role routes
router.use('/roles', roleRoutes);

// Permission routes
router.use('/permissions', permissionRoutes);

// Role-Permission routes
router.use('/role-permissions', rolePermissionRoutes);

// Warehouse routes
router.use('/warehouses', warehouseRoutes);

// Product routes
router.use('/products', productRoutes);

// Customer routes
router.use('/customers', customerRoutes);

// Armada routes
router.use('/armadas', armadaRoutes);

// Delivery Order routes
router.use('/delivery-orders', deliveryOrderRoutes);

// Shipment routes
router.use('/shipments', shipmentRoutes);

export default router;
