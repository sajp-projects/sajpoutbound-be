import express from 'express';
import shipmentController from '../controllers/shipmentController';

const router = express.Router();

// Weigh shipment item
router.post('/', shipmentController.weighShipmentItem);

export default router;
