import express from 'express';
import fileController from '../controllers/fileController';

const router = express.Router();

// Serve image files using a wildcard route
router.get('/*', fileController.serveImageFile);

export default router;
