import {
  NextFunction, Request, Response, 
} from 'express';
import { CustomError } from '../middlewares/error';
import { userIdSchema } from '../schemas/user';
import userLogService from '../services/userLogService';
import { success } from '../types/response';

export default {
  /**
   * Get logs for a specific user
   */
  async getUserLogs(req: Request<{ userId: string }>, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;

      await userIdSchema.validateAsync({
        id: userId,
      });

      const logs = await userLogService.getUserLogs(userId);
      res.status(200).json(success(logs));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get logs of actions performed by a specific user
   */
  async getLogsByPerformer(req: Request<{ userId: string }>, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;

      await userIdSchema.validateAsync({
        id: userId,
      });

      const logs = await userLogService.getLogsByPerformer(userId);
      res.status(200).json(success(logs));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Search all logs (admin function)
   * This would typically include pagination, filtering, etc.
   */
  async searchLogs(req: Request, res: Response, next: NextFunction) {
    try {
      // This is a placeholder for a more sophisticated search functionality
      // In a real implementation, you would pass query parameters for filtering

      // TODO: Implement full log search with pagination, filters, etc.
      throw new CustomError({
        message: 'Log search functionality not implemented yet',
        errorCode: 'NOT_IMPLEMENTED',
        status: 501,
      });
    } catch (error) {
      next(error);
    }
  },
};
