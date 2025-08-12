import { PERMISSION_ACTION } from '@prisma/client';
import express from 'express';
import productLogController from '../controllers/productLogController';
import { checkPermission } from '../middlewares/permission';

const router = express.Router();

// Get all product logs
router.get(
  '/',
  checkPermission('product_log', PERMISSION_ACTION.READ),
  productLogController.getAllProductLogs,
);

// Get product logs by product ID
router.get(
  '/:productId',
  checkPermission('product_log', PERMISSION_ACTION.READ),
  productLogController.getProductLogsByProductId,
);

export default router;
