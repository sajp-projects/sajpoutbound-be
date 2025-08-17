import { NextFunction, Request, Response } from 'express';
import { CustomError } from '../middlewares/error';
import {
  createDriverSchema,
  driverIdSchema,
  DriverCreateInput,
  DriverUpdateInput,
  updateDriverSchema,
} from '../schemas/driver';
import driverService from '../services/driverService';
import { success } from '../types/response';

export default {
  /**
   * Get all drivers with pagination and search
   */
  async getAllDrivers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const search = req.query.search as string | undefined;

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

      const result = await driverService.getAllDrivers(page, limit, search);

      res.status(200).json(
        success({
          drivers: result.drivers,
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
   * Get all active drivers (for dropdown/selection)
   */
  async getActiveDrivers(req: Request, res: Response, next: NextFunction) {
    try {
      const drivers = await driverService.getActiveDrivers();

      res.status(200).json(success({ drivers }));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get driver by ID
   */
  async getDriverById(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await driverIdSchema.validateAsync({ id });

      const driver = await driverService.getDriverById(id);

      if (!driver) {
        throw new CustomError({
          message: 'Supir tidak ditemukan',
          errorCode: 'SUPIR_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      res.status(200).json(success(driver));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create a new driver
   */
  async createDriver(
    req: Request<Record<string, never>, unknown, DriverCreateInput>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const validated = await createDriverSchema.validateAsync(req.body);

      const driver = await driverService.createDriver(validated);

      res.status(201).json(success(driver));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update a driver
   */
  async updateDriver(
    req: Request<{ id: string }, unknown, DriverUpdateInput>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;
      const validated = await updateDriverSchema.validateAsync(req.body);

      await driverIdSchema.validateAsync({ id });

      const existingDriver = await driverService.getDriverById(id);

      if (!existingDriver) {
        throw new CustomError({
          message: 'Supir tidak ditemukan',
          errorCode: 'SUPIR_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      const updatedDriver = await driverService.updateDriver(id, validated);

      res.status(200).json(success(updatedDriver));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete a driver
   */
  async deleteDriver(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await driverIdSchema.validateAsync({ id });

      const existingDriver = await driverService.getDriverById(id);

      if (!existingDriver) {
        throw new CustomError({
          message: 'Supir tidak ditemukan',
          errorCode: 'SUPIR_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      const deletedDriver = await driverService.deleteDriver(id);

      res.status(200).json(success(deletedDriver));
    } catch (error) {
      next(error);
    }
  },
};
