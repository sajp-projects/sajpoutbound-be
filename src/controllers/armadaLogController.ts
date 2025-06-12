import {
  NextFunction, Request, Response, 
} from 'express';
import { CustomError } from '../middlewares/error';
import { armadaIdSchema } from '../schemas/armada';
import armadaLogService from '../services/armadaLogService';
import armadaService from '../services/armadaService';
import { success } from '../types/response';

export default {
  async getAllArmadaLogs(req: Request, res: Response, next: NextFunction) {
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

      const result = await armadaLogService.getAllArmadaLogs(page, limit);

      res.status(200).json(
        success({
          armadaLogs: result.logs,
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

  async getArmadaLogs(req: Request<{ armadaId: string }>, res: Response, next: NextFunction) {
    try {
      const { armadaId } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      await armadaIdSchema.validateAsync({
        id: armadaId,
      });

      // Check if armada exists
      const armada = await armadaService.getArmadaById(armadaId);

      if (!armada) {
        throw new CustomError({
          message: 'Armada tidak ditemukan',
          errorCode: 'ARMADA_TIDAK_DITEMUKAN',
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

      const result = await armadaLogService.getArmadaLogs(armadaId, page, limit);

      res.status(200).json(
        success({
          armadaLogs: result.logs,
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
