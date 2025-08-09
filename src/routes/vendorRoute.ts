import express from 'express';
import vendorController from '../controllers/vendorController';

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Vendor Weighing API
 *     description: |
 *       Public API endpoints for third-party vendor weighing systems.
 *       
 *       ## Authentication
 *       These endpoints are **public** and do not require JWT Bearer authentication.
 *       Instead, they use a custom `x-auth` header for vendor authentication.
 *       
 *       ## Usage
 *       1. Obtain vendor API key from system administrator
 *       2. Include API key in `x-auth` header for all requests
 *       3. Only access items marked with VENDOR weighing method
 *       
 *       ## Workflow
 *       1. Get available shipments with vendor items: `GET /api/vendor/shipments/available-items`
 *       2. Get specific shipment items: `GET /api/vendor/shipments/{shipmentId}/available-items`
 *       3. Submit weighing data: `POST /api/vendor/shipments/bulk-weigh`
 */

/**
 * @openapi
 * /api/vendor/shipments/available-items:
 *   get:
 *     summary: Get available items for vendor weighing across all shipments
 *     description: |
 *       **Public API Endpoint** - No JWT authentication required, only x-auth header.
 *       
 *       Returns a list of shipments that have items marked for VENDOR weighing method.
 *       These items have been chosen with VENDOR weighing method and are ready for 
 *       external vendor weighing processing via API.
 *       
 *       This endpoint only returns items that were specifically marked for vendor weighing
 *       during the product selection process.
 *       
 *       **Authentication**: Uses x-auth header instead of JWT Bearer token.
 *     tags:
 *       - Vendor Weighing API
 *     parameters:
 *       - in: header
 *         name: x-auth
 *         required: true
 *         schema:
 *           type: string
 *           example: "vendor-api-key-12345"
 *         description: Vendor API key for authentication (provided by system administrator)
 *     responses:
 *       200:
 *         description: Successfully retrieved vendor weighing items
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
 *                     shipments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           armada:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               model:
 *                                 type: string
 *                               plateNumber:
 *                                 type: string
 *                           shipmentItems:
 *                             type: array
 *                             description: Items marked for vendor weighing
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                   format: uuid
 *                                 status:
 *                                   type: string
 *                                   enum: [CHOSEN]
 *                                 product:
 *                                   type: object
 *                                   properties:
 *                                     id:
 *                                       type: string
 *                                       format: uuid
 *                                     name:
 *                                       type: string
 *                                     satuan:
 *                                       type: string
 *       401:
 *         description: Unauthorized - Invalid or missing vendor API key
 *       500:
 *         description: Server error
 */
router.get('/shipments/available-items', vendorController.getAvailableItemsForWeighing);

/**
 * @openapi
 * /api/vendor/shipments/{shipmentId}/available-items:
 *   get:
 *     summary: Get available vendor weighing items for a specific shipment
 *     description: |
 *       **Public API Endpoint** - No JWT authentication required, only x-auth header.
 *       
 *       Returns items marked for VENDOR weighing method in a specific shipment.
 *       These items are ready for external vendor weighing processing and are grouped
 *       by product to facilitate bulk weighing operations.
 *       
 *       Only items that were chosen with VENDOR weighing method will be returned.
 *       
 *       **Authentication**: Uses x-auth header instead of JWT Bearer token.
 *     tags:
 *       - Vendor Weighing API
 *     parameters:
 *       - in: header
 *         name: x-auth
 *         required: true
 *         schema:
 *           type: string
 *           example: "vendor-api-key-12345"
 *         description: Vendor API key for authentication (provided by system administrator)
 *       - name: shipmentId
 *         in: path
 *         required: true
 *         description: The ID of the shipment to get vendor items for
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Successfully retrieved vendor weighing items for shipment
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
 *                               code:
 *                                 type: string
 *                                 description: Product code for vendor reference
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
 *                             description: Delivery orders associated with these items
 *                             items:
 *                               type: object
 *                           requestedQuantity:
 *                             type: number
 *                             description: Total quantity to be weighed
 *                           shipmentItemIds:
 *                             type: array
 *                             items:
 *                               type: string
 *                               format: uuid
 *       401:
 *         description: Unauthorized - Invalid or missing vendor API key
 *       404:
 *         description: Shipment not found
 *       500:
 *         description: Server error
 */
router.get('/shipments/:shipmentId/available-items', vendorController.getAvailableItemsForWeighingByShipmentId);

/**
 * @openapi
 * /api/vendor/shipments/bulk-weigh:
 *   post:
 *     summary: Vendor bulk weigh items marked for vendor weighing
 *     description: |
 *       **Public API Endpoint** - No JWT authentication required, only x-auth header.
 *       
 *       This endpoint allows vendor systems to submit weighing data for items that were
 *       marked with VENDOR weighing method. It processes all CHOSEN items with the 
 *       specified product in the shipment by:
 *       1. Validating that the chosen product is marked for VENDOR weighing
 *       2. Finding all chosen items for this product in the shipment
 *       3. Distributing the weight proportionally based on each item's requested quantity
 *       4. Recording the weights for each item and its chosen product
 *       5. Updating all items to COMPLETED status
 *       
 *       This endpoint only accepts weighing data for products that were specifically
 *       chosen with VENDOR weighing method during the product selection process.
 *       
 *       **Authentication**: Uses x-auth header instead of JWT Bearer token.
 *     tags:
 *       - Vendor Weighing API
 *     parameters:
 *       - in: header
 *         name: x-auth
 *         required: true
 *         schema:
 *           type: string
 *           example: "vendor-api-key-12345"
 *         description: Vendor API key for authentication (provided by system administrator)
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
 *                 description: The ID of the product to weigh (must be marked for vendor weighing)
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
 *         description: Successfully processed vendor weighing
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
 *                       description: Shipment information
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
 *       400:
 *         description: Bad request - Product not marked for vendor weighing or validation errors
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
 *                       example: "Produk ini tidak ditandai untuk penimbangan vendor"
 *                     errorCode:
 *                       type: string
 *                       example: "BUKAN_PRODUK_VENDOR"
 *       401:
 *         description: Unauthorized - Invalid or missing vendor API key
 *       404:
 *         description: Shipment, product, or chosen items not found
 *       500:
 *         description: Server error
 */
router.post('/shipments/bulk-weigh', vendorController.bulkWeighShipmentItems);

export default router;
