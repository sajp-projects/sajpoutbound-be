import express from 'express';
import userLogController from '../controllers/userLogController';

const router = express.Router();

// Get logs for a specific user
router.get('/user/:userId', userLogController.getUserLogs);

// Get logs of actions performed by a specific user
router.get('/performer/:userId', userLogController.getLogsByPerformer);

// Search all logs (admin function)
router.get('/search', userLogController.searchLogs);

export default router;
