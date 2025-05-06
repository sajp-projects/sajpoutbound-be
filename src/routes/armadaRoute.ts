import { PERMISSION_ACTION } from '@prisma/client';
import express from 'express';
import armadaController from '../controllers/armadaController';
import { checkPermission } from '../middlewares/permission';
import armadaLogRoutes from './armadaLogRoute';
const router = express.Router();

router.use('/logs', armadaLogRoutes);

// Get all armadas
router.get('/', checkPermission('armada', PERMISSION_ACTION.READ), armadaController.getAllArmadas);

// Get armada by ID
router.get(
  '/:id',
  checkPermission('armada', PERMISSION_ACTION.READ),
  armadaController.getArmadaById,
);

// Create new armada
router.post(
  '/',
  checkPermission('armada', PERMISSION_ACTION.CREATE),
  armadaController.createArmada,
);

// Update armada
router.put(
  '/:id',
  checkPermission('armada', PERMISSION_ACTION.UPDATE),
  armadaController.updateArmada,
);

// Delete armada
router.delete(
  '/:id',
  checkPermission('armada', PERMISSION_ACTION.DELETE),
  armadaController.deleteArmada,
);

export default router;
