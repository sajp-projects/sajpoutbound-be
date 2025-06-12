import {
  NextFunction, Request, Response, 
} from 'express';
import { CustomError } from '../middlewares/error';
import { customerIdSchema } from '../schemas/customer';
import customerLogService from '../services/customerLogService';
import customerService from '../services/customerService';
import { success } from '../types/response';

export default {
  async getAllCustomerLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      if (isNaN(page) || page < 1) {
        throw new CustomError({
          message: 'Halaman harus berupa bilangan bulat positif',
          errorCode: 'PAGINASI_TIDAK_VALID',
          status: 400,
        });
      }

      if (isNaN(limit) || limit < 1 || limit > 100) {
        throw new CustomError({
          message: 'Batas harus berupa bilangan bulat positif antara 1 dan 100',
          errorCode: 'PAGINASI_TIDAK_VALID',
          status: 400,
        });
      }

      const result = await customerLogService.getAllCustomerLogs(page, limit);

      res.status(200).json(
        success({
          customerLogs: result.logs,
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

  async getCustomerLogs(req: Request<{ customerId: string }>, res: Response, next: NextFunction) {
    try {
      const { customerId } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      await customerIdSchema.validateAsync({
        id: customerId,
      });

      // Check if customer exists
      const customer = await customerService.getCustomerById(customerId);

      if (!customer) {
        throw new CustomError({
          message: 'Pelanggan tidak ditemukan',
          errorCode: 'PELANGGAN_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      if (isNaN(page) || page < 1) {
        throw new CustomError({
          message: 'Halaman harus berupa bilangan bulat positif',
          errorCode: 'PAGINASI_TIDAK_VALID',
          status: 400,
        });
      }

      if (isNaN(limit) || limit < 1 || limit > 100) {
        throw new CustomError({
          message: 'Batas harus berupa bilangan bulat positif antara 1 dan 100',
          errorCode: 'PAGINASI_TIDAK_VALID',
          status: 400,
        });
      }

      const result = await customerLogService.getCustomerLogs(customerId, page, limit);

      res.status(200).json(
        success({
          customerLogs: result.logs,
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
