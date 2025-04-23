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

      // Extract pagination parameters from query
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      // Validate pagination parameters
      if (isNaN(page) || page < 1) {
        throw new CustomError({
          message: 'Page must be a positive integer',
          errorCode: 'INVALID_PAGINATION',
          status: 400,
        });
      }

      if (isNaN(limit) || limit < 1 || limit > 100) {
        throw new CustomError({
          message: 'Limit must be a positive integer between 1 and 100',
          errorCode: 'INVALID_PAGINATION',
          status: 400,
        });
      }

      // Get paginated logs
      const result = await userLogService.getUserLogs(userId, page, limit);

      res.status(200).json(
        success({
          logs: result.logs,
          pagination: {
            total: result.total,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit),
            hasNext: page * limit < result.total,
            hasPrev: page > 1,
          },
        }),
      );
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

      // Extract pagination parameters from query
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      // Validate pagination parameters
      if (isNaN(page) || page < 1) {
        throw new CustomError({
          message: 'Page must be a positive integer',
          errorCode: 'INVALID_PAGINATION',
          status: 400,
        });
      }

      if (isNaN(limit) || limit < 1 || limit > 100) {
        throw new CustomError({
          message: 'Limit must be a positive integer between 1 and 100',
          errorCode: 'INVALID_PAGINATION',
          status: 400,
        });
      }

      // Get paginated logs
      const result = await userLogService.getLogsByPerformer(userId, page, limit);

      res.status(200).json(
        success({
          logs: result.logs,
          pagination: {
            total: result.total,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit),
            hasNext: page * limit < result.total,
            hasPrev: page > 1,
          },
        }),
      );
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
