import {
  NextFunction, Request, Response, 
} from 'express';
import { CustomError } from '../middlewares/error';
import {
  armadaIdSchema, createArmadaSchema, updateArmadaSchema, 
} from '../schemas/armada';
import armadaService from '../services/armadaService';
import { success } from '../types/response';

export default {
  async getAllArmadas(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const search = req.query.search as string | undefined;

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

      const result = await armadaService.getAllArmadas(page, limit, search);

      res.status(200).json(
        success({
          armadas: result.armadas,
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

  async getArmadaById(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await armadaIdSchema.validateAsync({
        id,
      });

      const armada = await armadaService.getArmadaById(id);

      if (!armada) {
        throw new CustomError({
          message: 'Armada not found',
          errorCode: 'ARMADA_NOT_FOUND',
          status: 404,
        });
      }

      res.status(200).json(success(armada));
    } catch (error) {
      next(error);
    }
  },

  async createArmada(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body;
      const performedById = req.user?.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      await createArmadaSchema.validateAsync(data);

      const armada = await armadaService.createArmada(data, performedById);

      res.status(201).json(success(armada));
    } catch (error) {
      next(error);
    }
  },

  async updateArmada(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = req.body;
      const performedById = req.user?.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      await armadaIdSchema.validateAsync({
        id,
      });
      await updateArmadaSchema.validateAsync(data);

      const existingArmada = await armadaService.getArmadaById(id);

      if (!existingArmada) {
        throw new CustomError({
          message: 'Armada not found',
          errorCode: 'ARMADA_NOT_FOUND',
          status: 404,
        });
      }

      const updatedArmada = await armadaService.updateArmada(id, data, performedById);

      res.status(200).json(success(updatedArmada));
    } catch (error) {
      next(error);
    }
  },

  async deleteArmada(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const performedById = req.user?.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      await armadaIdSchema.validateAsync({
        id,
      });

      const existingArmada = await armadaService.getArmadaById(id);

      if (!existingArmada) {
        throw new CustomError({
          message: 'Armada not found',
          errorCode: 'ARMADA_NOT_FOUND',
          status: 404,
        });
      }

      const deletedArmada = await armadaService.deleteArmada(id, performedById);

      res.status(200).json(success(deletedArmada));
    } catch (error) {
      next(error);
    }
  },
};
