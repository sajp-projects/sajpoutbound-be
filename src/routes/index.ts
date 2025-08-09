import express from 'express';
import { authenticateToken } from '../middlewares/authentication';
import armadaRoutes from './armadaRoute';
import authRoutes from './authRoute';
import customerRoutes from './customerRoute';
import deliveryOrderRoutes from './deliveryOrderRoute';
import permissionRoutes from './permissionRoutes';
import productRoutes from './productRoute';
import reportRoutes from './reportRoute';
import rolePermissionRoutes from './rolePermissionRoutes';
import roleRoutes from './roleRoute';
import shipmentRoutes from './shipmentRoute';
import userRoutes from './userRoute';
import vendorRoutes from './vendorRoute';
import warehouseRoutes from './warehouseRoute';

const router = express.Router();

router.use('/auth', authRoutes);

// Vendor routes (require x-auth header instead of JWT)
router.use('/vendor', vendorRoutes);

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

// Report routes
router.use('/reports', reportRoutes);

export default router;
