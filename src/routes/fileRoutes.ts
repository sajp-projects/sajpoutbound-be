import express from 'express';
import fileController from '../controllers/fileController';
import { authenticateToken } from '../middlewares/authentication';

const router = express.Router();

// Serve image files using a wildcard route - requires authentication
router.get('/*', authenticateToken, fileController.serveImageFile);

export default router;
