import { PERMISSION_ACTION } from '@prisma/client';
import express from 'express';
import deliveryOrderController from '../controllers/deliveryOrderController';
import { checkPermission } from '../middlewares/permission';
import deliveryOrderLogRoutes from './deliveryOrderLogRoute';

const router = express.Router();

// Delivery order logs routes
router.use('/logs', deliveryOrderLogRoutes);

// Add new endpoint to get multiple DOs by IDs
router.post(
  '/by-ids',
  checkPermission('delivery_order', PERMISSION_ACTION.READ),
  deliveryOrderController.getDeliveryOrdersByIds,
);

// Get all delivery orders
router.get(
  '/',
  checkPermission('delivery_order', PERMISSION_ACTION.READ),
  deliveryOrderController.getAllDeliveryOrders,
);

// Get archived delivery orders
router.get(
  '/archived',
  checkPermission('delivery_order', PERMISSION_ACTION.READ_ARCHIVED),
  deliveryOrderController.getArchivedDeliveryOrders,
);

// Get delivery order by ID
router.get(
  '/:id',
  checkPermission('delivery_order', PERMISSION_ACTION.READ),
  deliveryOrderController.getDeliveryOrderById,
);

// Add new endpoint to get all shipments that use items from a given DO
router.get(
  '/:id/shipments',
  checkPermission('delivery_order', PERMISSION_ACTION.READ),
  deliveryOrderController.getShipmentsByDeliveryOrderId,
);

// Create delivery order
router.post(
  '/',
  checkPermission('delivery_order', PERMISSION_ACTION.CREATE),
  deliveryOrderController.createDeliveryOrder,
);

/**
 * @openapi
 * /api/delivery-orders/transfer-items:
 *   post:
 *     summary: Transfer items dari pengiriman selesai ke customer baru
 *     description: |
 *       Membuat DO baru dengan mentransfer item dari DO yang sudah selesai dalam suatu shipment
 *       ke customer yang berbeda. Kuantitas item di DO asli akan dikurangi sesuai jumlah transfer.
 *     tags: [Delivery Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetCustomerId
 *               - sourceShipmentId
 *               - transferItems
 *             properties:
 *               targetCustomerId:
 *                 type: string
 *                 format: uuid
 *                 description: ID customer tujuan transfer
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               sourceShipmentId:
 *                 type: string
 *                 format: uuid
 *                 description: ID shipment yang sudah selesai (status SELESAI)
 *                 example: "123e4567-e89b-12d3-a456-426614174001"
 *               transferItems:
 *                 type: array
 *                 description: Array item yang akan ditransfer
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - deliveryOrderId
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     deliveryOrderId:
 *                       type: string
 *                       format: uuid
 *                       description: ID DO sumber dalam shipment
 *                       example: "123e4567-e89b-12d3-a456-426614174002"
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                       description: ID produk yang akan ditransfer
 *                       example: "123e4567-e89b-12d3-a456-426614174003"
 *                     quantity:
 *                       type: number
 *                       minimum: 0.01
 *                       description: Jumlah yang akan ditransfer (tidak boleh melebihi completedQuantity)
 *                       example: 25.5
 *     responses:
 *       201:
 *         description: Transfer berhasil
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
 *                     message:
 *                       type: string
 *                       example: "Item berhasil ditransfer ke customer baru"
 *                     newDeliveryOrder:
 *                       $ref: '#/components/schemas/DeliveryOrder'
 *                     updatedOriginalDOs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/DeliveryOrder'
 *                     transferSummary:
 *                       type: object
 *                       properties:
 *                         sourceShipmentId:
 *                           type: string
 *                         sourceShipmentNumber:
 *                           type: string
 *                         targetCustomer:
 *                           type: string
 *                         totalItemsTransferred:
 *                           type: number
 *                         newDoNumber:
 *                           type: string
 *       400:
 *         description: Bad request - validasi gagal atau transfer tidak memungkinkan
 *       401:
 *         description: Unauthorized - token tidak valid
 *       403:
 *         description: Forbidden - tidak memiliki permission TRANSFER_ITEMS pada resource shipment
 *       404:
 *         description: Not found - shipment/customer/DO/produk tidak ditemukan
 */
// Transfer items from completed shipment to new customer
router.post(
  '/transfer-items',
  checkPermission('shipment', PERMISSION_ACTION.TRANSFER_ITEMS),
  deliveryOrderController.transferItemsToNewCustomer,
);

/**
 * @openapi
 * /api/delivery-orders/reduce-quantity:
 *   post:
 *     summary: Kurangi kuantitas item dalam shipment yang sudah selesai
 *     description: |
 *       Mengurangi kuantitas item dalam shipment yang sudah selesai (biasanya karena truk kelebihan muatan).
 *       Kuantitas yang dikurangi akan dikembalikan ke pendingQuantity di DO asli.
 *       Fitur ini untuk koreksi post-shipment, tidak memerlukan regenerasi dokumen.
 *     tags: [Delivery Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shipmentItemId
 *               - newQuantity
 *             properties:
 *               shipmentItemId:
 *                 type: string
 *                 format: uuid
 *                 description: ID shipment item yang akan dikurangi kuantitasnya
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               newQuantity:
 *                 type: number
 *                 minimum: 0.01
 *                 description: Kuantitas baru (harus lebih kecil dari kuantitas saat ini)
 *                 example: 25
 *     responses:
 *       200:
 *         description: Kuantitas berhasil dikurangi
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
 *                     message:
 *                       type: string
 *                       example: "Successfully reduced quantity by 25. 25 units moved back to pending."
 *                     data:
 *                       type: object
 *                       properties:
 *                         updatedShipmentItem:
 *                           type: object
 *                           description: Data shipment item yang sudah diperbarui
 *                         updatedDeliveryOrderItem:
 *                           type: object
 *                           description: Data delivery order item yang sudah diperbarui
 *       400:
 *         description: Bad request - kuantitas baru tidak valid atau terlalu besar
 *       401:
 *         description: Unauthorized - token tidak valid
 *       403:
 *         description: Forbidden - tidak memiliki permission REDUCE_ITEMS pada resource shipment
 *       404:
 *         description: Not found - shipment item tidak ditemukan
 */
// Reduce quantity of completed shipment item
router.post(
  '/reduce-quantity',
  checkPermission('shipment', PERMISSION_ACTION.REDUCE_ITEMS),
  deliveryOrderController.reduceShipmentItemQuantity,
);

// Update delivery order
router.put(
  '/:id',
  checkPermission('delivery_order', PERMISSION_ACTION.UPDATE),
  deliveryOrderController.updateDeliveryOrder,
);

// Delete delivery order
router.delete(
  '/:id',
  checkPermission('delivery_order', PERMISSION_ACTION.DELETE),
  deliveryOrderController.deleteDeliveryOrder,
);

// Restore archived delivery order
router.patch(
  '/:id/restore',
  checkPermission('delivery_order', PERMISSION_ACTION.UNARCHIVE),
  deliveryOrderController.restoreDeliveryOrder,
);

export default router;
