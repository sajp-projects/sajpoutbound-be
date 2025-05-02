import { PERMISSION_ACTION } from '@prisma/client';
import express from 'express';
import productController from '../controllers/productController';
import { checkPermission } from '../middlewares/permission';
import productLogRoutes from './productLogRoute';

const router = express.Router();

// Product logs routes
router.use('/logs', productLogRoutes);

// Get all products
router.get(
  '/',
  checkPermission('product', PERMISSION_ACTION.READ),
  productController.getAllProducts,
);

// Get product by ID
router.get(
  '/:id',
  checkPermission('product', PERMISSION_ACTION.READ),
  productController.getProductById,
);

// Create product
router.post(
  '/',
  checkPermission('product', PERMISSION_ACTION.CREATE),
  productController.createProduct,
);

// Update product
router.put(
  '/:id',
  checkPermission('product', PERMISSION_ACTION.UPDATE),
  productController.updateProduct,
);

// Delete product
router.delete(
  '/:id',
  checkPermission('product', PERMISSION_ACTION.DELETE),
  productController.deleteProduct,
);

export default router;
