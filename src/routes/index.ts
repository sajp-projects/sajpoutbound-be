import express from 'express';
import shipmentController from '../controllers/shipmentController';
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
import warehouseRoutes from './warehouseRoute';

const router = express.Router();

router.use('/auth', authRoutes);

/**
 * @openapi
 * /api/shipments/weighing:
 *   post:
 *     summary: Bulk weigh multiple shipment items with the same product
 *     description: |
 *       This endpoint handles weighing all items with the same product at once, by:
 *       1. Finding all chosen items for this product in the shipment
 *       2. Distributing the weight proportionally based on each item's requested quantity
 *       3. Recording the weights for each item and its chosen product
 *       4. Updating all items to COMPLETED status
 *     tags:
 *       - Shipment Weighing
 *     parameters:
 *       - in: header
 *         name: x-auth
 *         required: true
 *         schema:
 *           type: string
 *         description: Custom authentication header.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shipmentId
 *               - productId
 *               - grossWeight
 *             properties:
 *               shipmentId:
 *                 type: string
 *                 format: uuid
 *                 description: The ID of the shipment containing the items to weigh
 *               productId:
 *                 type: string
 *                 format: uuid
 *                 description: The ID of the product to weigh (all chosen items with this product will be weighed)
 *               grossWeight:
 *                 type: number
 *                 description: The total gross weight for all items with this product
 *                 minimum: 0
 *               netWeight:
 *                 type: number
 *                 description: The total net weight for all items with this product (optional)
 *                 minimum: 0
 *               tareWeight:
 *                 type: number
 *                 description: The total tare weight for all items with this product (optional)
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Successfully weighed items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     product:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         name:
 *                           type: string
 *                         satuan:
 *                           type: string
 *                     shipment:
 *                       type: object
 *                     totalRequestedQuantity:
 *                       type: number
 *                     totalWeightedQuantity:
 *                       type: number
 *                     deliveryOrders:
 *                       type: array
 *                       items:
 *                         type: object
 *                     customers:
 *                       type: array
 *                       items:
 *                         type: object
 *                     weights:
 *                       type: object
 *                       properties:
 *                         gross:
 *                           type: number
 *                         net:
 *                           type: number
 *                         tare:
 *                           type: number
 *                     status:
 *                       type: string
 *                       example: "COMPLETED"
 *                     locationType:
 *                       type: string
 *                     weighedAt:
 *                       type: string
 *                       format: date-time
 *                     individualItems:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                     errorCode:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Shipment, product, or chosen items not found
 */
// Bulk weigh all items for a product at once
router.post('/shipments/weighing', shipmentController.bulkWeighShipmentItems);

// Get available items for weighing in a shipment
/**
 * @openapi
 * /api/shipments/available-items:
 *   get:
 *     summary: Get available items for weighing in shipments
 *     description: |
 *       Returns a list of items that are ready for weighing across all shipments.
 *       These items have been marked as "CHOSEN" and are grouped by product to facilitate
 *       bulk weighing operations.
 *     tags:
 *       - Shipment Weighing
 *     parameters:
 *       - in: header
 *         name: x-auth
 *         required: true
 *         schema:
 *           type: string
 *         description: Custom authentication header.
 *     responses:
 *       200:
 *         description: Successfully retrieved available items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     availableItems:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           shipmentId:
 *                             type: string
 *                             format: uuid
 *                             description: ID of the shipment containing these items
 *                           product:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               name:
 *                                 type: string
 *                               satuan:
 *                                 type: string
 *                                 description: Unit of measurement
 *                           warehouse:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               name:
 *                                 type: string
 *                           deliveryOrders:
 *                             type: array
 *                             description: List of delivery orders associated with these items
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                   format: uuid
 *                                 customer:
 *                                   type: object
 *                                   properties:
 *                                     id:
 *                                       type: string
 *                                       format: uuid
 *                                     name:
 *                                       type: string
 *                           requestedQuantity:
 *                             type: number
 *                             description: Total requested quantity for all items with this product
 *                           shipmentItemIds:
 *                             type: array
 *                             description: IDs of all shipment items included in this group
 *                             items:
 *                               type: string
 *                               format: uuid
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/shipments/available-items', shipmentController.getAvailableItemsForWeighing);

/**
 * @openapi
 * /api/shipments/{shipmentId}/available-items:
 *   get:
 *     summary: Get available items for weighing in a specific shipment
 *     description: |
 *       Returns a list of items that are ready for weighing in a specific shipment.
 *       These items have been marked as "CHOSEN" and are grouped by product to facilitate
 *       bulk weighing operations.
 *     tags:
 *       - Shipment Weighing
 *     parameters:
 *       - in: header
 *         name: x-auth
 *         required: true
 *         schema:
 *           type: string
 *         description: Custom authentication header.
 *       - name: shipmentId
 *         in: path
 *         required: true
 *         description: The ID of the shipment to get available items for
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Successfully retrieved available items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     availableItems:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           shipmentId:
 *                             type: string
 *                             format: uuid
 *                             description: ID of the shipment containing these items
 *                           product:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               name:
 *                                 type: string
 *                               satuan:
 *                                 type: string
 *                                 description: Unit of measurement
 *                           warehouse:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               name:
 *                                 type: string
 *                           deliveryOrders:
 *                             type: array
 *                             description: List of delivery orders associated with these items
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                   format: uuid
 *                                 customer:
 *                                   type: object
 *                                   properties:
 *                                     id:
 *                                       type: string
 *                                       format: uuid
 *                                     name:
 *                                       type: string
 *                           requestedQuantity:
 *                             type: number
 *                             description: Total requested quantity for all items with this product
 *                           shipmentItemIds:
 *                             type: array
 *                             description: IDs of all shipment items included in this group
 *                             items:
 *                               type: string
 *                               format: uuid
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Shipment not found
 *       500:
 *         description: Server error
 */
router.get(
  '/shipments/:shipmentId/available-items',
  shipmentController.getAvailableItemsForWeighingByShipmentId,
);

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
