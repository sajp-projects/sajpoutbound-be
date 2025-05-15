import {
  NextFunction, Request, Response, 
} from 'express';
import { CustomError } from '../middlewares/error';
import { getDeliveryOrderLogsSchema } from '../schemas/deliveryOrderLog';
import deliveryOrderLogService from '../services/deliveryOrderLogService';
import deliveryOrderService from '../services/deliveryOrderService';
import { success } from '../types/response';

export default {
  /**
   * Get all delivery order logs with pagination
   */
  async getAllDeliveryOrderLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

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

      const result = await deliveryOrderLogService.getAllLogs(page, limit);

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
   * Get logs for a specific delivery order by ID
   */
  async getDeliveryOrderLogs(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const { id: deliveryOrderId } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      await getDeliveryOrderLogsSchema.validateAsync({
        deliveryOrderId,
        page,
        limit,
      });

      // Check if the delivery order exists
      const deliveryOrder = await deliveryOrderService.getDeliveryOrderById(deliveryOrderId);
      if (!deliveryOrder) {
        throw new CustomError({
          message: 'Delivery order not found',
          errorCode: 'DELIVERY_ORDER_NOT_FOUND',
          status: 404,
        });
      }

      const result = await deliveryOrderLogService.getDeliveryOrderLogs(
        deliveryOrderId,
        page,
        limit,
      );

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
};
