import { Prisma } from '@prisma/client';
import {
  NextFunction, Request, Response, 
} from 'express';
import { CustomError } from '../middlewares/error';
import {
  createWarehouseSchema,
  updateWarehouseSchema,
  WarehouseCreateInput,
  warehouseIdSchema,
  WarehouseUpdateInput,
  WarehouseUserAssignmentInput,
  warehouseUserAssignmentSchema,
} from '../schemas/warehouse';
import userService from '../services/userService';
import warehouseService from '../services/warehouseService';
import { success } from '../types/response';

export default {
  async getAllWarehouses(req: Request, res: Response, next: NextFunction) {
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

      const result = await warehouseService.getAllWarehouses(page, limit, search);

      res.status(200).json(
        success({
          warehouses: result.warehouses,
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

  async getWarehouseById(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await warehouseIdSchema.validateAsync({
        id,
      });

      const warehouse = await warehouseService.getWarehouseById(id);

      if (!warehouse) {
        throw new CustomError({
          message: 'Warehouse not found',
          errorCode: 'WAREHOUSE_NOT_FOUND',
          status: 404,
        });
      }

      res.status(200).json(success(warehouse));
    } catch (error) {
      next(error);
    }
  },

  async createWarehouse(
    req: Request<Record<string, never>, unknown, WarehouseCreateInput>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const validated = await createWarehouseSchema.validateAsync(req.body);

      const performedById = req.user?.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      const warehouse = await warehouseService.createWarehouse(validated, performedById);

      res.status(201).json(success(warehouse));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new CustomError({
            message: 'Warehouse with this name already exists',
            errorCode: 'WAREHOUSE_NAME_DUPLICATE',
            status: 409,
          });
        }

        throw new CustomError({
          message: error.message || 'Database error occurred',
          errorCode: `PRISMA_ERROR_${error.code}`,
          status: 400,
        });
      }

      next(error);
    }
  },

  async updateWarehouse(
    req: Request<{ id: string }, unknown, WarehouseUpdateInput>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;

      await warehouseIdSchema.validateAsync({
        id,
      });

      const existingWarehouse = await warehouseService.getWarehouseById(id);

      if (!existingWarehouse) {
        throw new CustomError({
          message: 'Warehouse not found',
          errorCode: 'WAREHOUSE_NOT_FOUND',
          status: 404,
        });
      }

      const validated = await updateWarehouseSchema.validateAsync(req.body);

      const performedById = req.user?.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      const updatedWarehouse = await warehouseService.updateWarehouse(id, validated, performedById);

      res.status(200).json(success(updatedWarehouse));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new CustomError({
            message: 'Warehouse with this name already exists',
            errorCode: 'WAREHOUSE_NAME_DUPLICATE',
            status: 409,
          });
        }

        throw new CustomError({
          message: error.message || 'Database error occurred',
          errorCode: `PRISMA_ERROR_${error.code}`,
          status: 400,
        });
      }

      next(error);
    }
  },

  async deleteWarehouse(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await warehouseIdSchema.validateAsync({
        id,
      });

      const existingWarehouse = await warehouseService.getWarehouseById(id);

      if (!existingWarehouse) {
        throw new CustomError({
          message: 'Warehouse not found',
          errorCode: 'WAREHOUSE_NOT_FOUND',
          status: 404,
        });
      }

      const performedById = req.user?.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      // Check if warehouse is assigned to any user
      if (existingWarehouse.users.length > 0) {
        throw new CustomError({
          message: 'Cannot delete warehouse as it is still assigned to a user',
          errorCode: 'WAREHOUSE_IN_USE',
          status: 400,
        });
      }

      // Check if warehouse has any products
      const productsCount = await warehouseService.getWarehouseProductsCount(id);
      if (productsCount > 0) {
        throw new CustomError({
          message: 'Cannot delete warehouse as it has products associated with it',
          errorCode: 'WAREHOUSE_HAS_PRODUCTS',
          status: 400,
        });
      }

      const deletedWarehouse = await warehouseService.deleteWarehouse(id, performedById);

      res.status(200).json(
        success({
          warehouse: deletedWarehouse,
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  async assignUserToWarehouse(
    req: Request<{ id: string }, unknown, WarehouseUserAssignmentInput>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id: warehouseId } = req.params;
      const { userId } = req.body;

      await warehouseIdSchema.validateAsync({
        id: warehouseId,
      });

      await warehouseUserAssignmentSchema.validateAsync(req.body);

      // Check if warehouse exists
      const existingWarehouse = await warehouseService.getWarehouseById(warehouseId);

      if (!existingWarehouse) {
        throw new CustomError({
          message: 'Warehouse not found',
          errorCode: 'WAREHOUSE_NOT_FOUND',
          status: 404,
        });
      }

      // Check if user exists
      const existingUser = await userService.getUserById(userId);

      if (!existingUser) {
        throw new CustomError({
          message: 'User not found',
          errorCode: 'USER_NOT_FOUND',
          status: 404,
        });
      }

      const performedById = req.user?.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      // Assign user to warehouse
      const updatedWarehouse = await warehouseService.assignUserToWarehouse(
        warehouseId,
        userId,
        performedById,
      );

      res.status(200).json(success(updatedWarehouse));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new CustomError({
          message: error.message || 'Database error occurred',
          errorCode: `PRISMA_ERROR_${error.code}`,
          status: 400,
        });
      }

      next(error);
    }
  },

  async unassignUserFromWarehouse(
    req: Request<{ id: string; userId: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id: warehouseId, userId } = req.params;

      await warehouseIdSchema.validateAsync({
        id: warehouseId,
      });

      // Check if warehouse exists
      const existingWarehouse = await warehouseService.getWarehouseById(warehouseId);

      if (!existingWarehouse) {
        throw new CustomError({
          message: 'Warehouse not found',
          errorCode: 'WAREHOUSE_NOT_FOUND',
          status: 404,
        });
      }

      // Check if user exists and is assigned to this warehouse
      const existingUser = await userService.getUserById(userId);

      if (!existingUser) {
        throw new CustomError({
          message: 'User not found',
          errorCode: 'USER_NOT_FOUND',
          status: 404,
        });
      }

      if (existingUser.warehouseId !== warehouseId) {
        throw new CustomError({
          message: 'User is not assigned to this warehouse',
          errorCode: 'USER_NOT_ASSIGNED',
          status: 400,
        });
      }

      const performedById = req.user?.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      // Unassign user from warehouse
      const updatedWarehouse = await warehouseService.unassignUserFromWarehouse(
        warehouseId,
        userId,
        performedById,
      );

      res.status(200).json(success(updatedWarehouse));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new CustomError({
          message: error.message || 'Database error occurred',
          errorCode: `PRISMA_ERROR_${error.code}`,
          status: 400,
        });
      }

      next(error);
    }
  },
};
