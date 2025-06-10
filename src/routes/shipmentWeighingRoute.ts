import express from 'express';
import shipmentController from '../controllers/shipmentController';

const router = express.Router();

// Bulk weigh all items for a product at once
router.post('/', shipmentController.bulkWeighShipmentItems);

export default router;
