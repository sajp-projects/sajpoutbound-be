import { NextFunction, Request, Response } from 'express';
import { CustomError } from '../middlewares/error';
import permissionService from '../services/permissionService';
import { success } from '../types/response';

export default {
  /**
   * Get all permissions with optional pagination
   */
  async getAllPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      // Extract pagination parameters from query
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      // If pagination parameters are provided, validate them
      if (page !== undefined && (isNaN(page) || page < 1)) {
        throw new CustomError({
          message: 'Halaman harus berupa bilangan bulat positif',
          errorCode: 'PAGINASI_TIDAK_VALID',
          status: 400,
        });
      }

      if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 100)) {
        throw new CustomError({
          message: 'Batas harus berupa bilangan bulat positif antara 1 dan 100',
          errorCode: 'PAGINASI_TIDAK_VALID',
          status: 400,
        });
      }

      // Get permissions with or without pagination
      const result = await permissionService.getAllPermissions(page, limit);

      // If pagination parameters were provided, include pagination info
      if (page !== undefined && limit !== undefined) {
        res.status(200).json(
          success({
            permissions: result.permissions,
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
      } else {
        // Return all permissions without pagination info
        res.status(200).json(
          success({
            permissions: result.permissions,
          }),
        );
      }
    } catch (error) {
      next(error);
    }
  },
};
