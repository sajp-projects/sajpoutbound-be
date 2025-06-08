import express from 'express';
import shipmentController from '../controllers/shipmentController';

const router = express.Router();

// Weigh individual shipment item
router.post('/', shipmentController.weighShipmentItem);

// Bulk weigh all items for a product at once
router.post('/bulk', shipmentController.bulkWeighShipmentItems);

export default router;
