import { Prisma, STATUS } from '@prisma/client';
import {
  NextFunction, Request, Response, 
} from 'express';
import { CustomError } from '../middlewares/error';
import {
  createDeliveryOrderSchema,
  DeliveryOrderCreateInput,
  deliveryOrderIdSchema,
  DeliveryOrderUpdateInput,
  updateDeliveryOrderSchema,
} from '../schemas/deliveryOrder';
import customerService from '../services/customerService';
import deliveryOrderService from '../services/deliveryOrderService';
import productService from '../services/productService';
import { success } from '../types/response';

export default {
  /**
   * Get all delivery orders with pagination and search
   */
  async getAllDeliveryOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const search = req.query.search as string | undefined;
      const status = req.query.status as STATUS | undefined;

      if (status && !Object.values(STATUS).includes(status as STATUS)) {
        throw new CustomError({
          message: 'Invalid status',
          errorCode: 'INVALID_STATUS',
          status: 400,
        });
      }

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

      const result = await deliveryOrderService.getAllDeliveryOrders(page, limit, search, status);

      res.status(200).json(
        success({
          deliveryOrders: result.deliveryOrders,
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
   * Get archived delivery orders with pagination and search
   */
  async getArchivedDeliveryOrders(req: Request, res: Response, next: NextFunction) {
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

      const result = await deliveryOrderService.getArchivedDeliveryOrders(page, limit, search);

      res.status(200).json(
        success({
          deliveryOrders: result.deliveryOrders,
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
   * Get a delivery order by ID
   */
  async getDeliveryOrderById(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await deliveryOrderIdSchema.validateAsync({
        id,
      });

      const deliveryOrder = await deliveryOrderService.getDeliveryOrderById(id);

      if (!deliveryOrder) {
        throw new CustomError({
          message: 'Delivery order not found',
          errorCode: 'DELIVERY_ORDER_NOT_FOUND',
          status: 404,
        });
      }

      res.status(200).json(success(deliveryOrder));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create a new delivery order
   */
  async createDeliveryOrder(
    req: Request<Record<string, never>, unknown, DeliveryOrderCreateInput>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const validated = await createDeliveryOrderSchema.validateAsync(req.body);

      const performedById = req.user?.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      if (validated.customerId) {
        const customer = await customerService.getCustomerById(validated.customerId);

        if (!customer) {
          throw new CustomError({
            message: 'Customer not found',
            errorCode: 'CUSTOMER_NOT_FOUND',
            status: 404,
          });
        }
      }

      if (validated.items && validated.items.length > 0) {
        // Check for duplicate product IDs
        const productIds = validated.items.map((item) => item.productId);
        const uniqueProductIds = new Set(productIds);

        if (uniqueProductIds.size !== productIds.length) {
          const duplicates = productIds.filter((id, index) => productIds.indexOf(id) !== index);
          throw new CustomError({
            message: `Duplicate products not allowed. Found duplicate product ID(s): ${duplicates.join(', ')}`,
            errorCode: 'DUPLICATE_PRODUCTS',
            status: 400,
          });
        }

        // Fetch all products in a single query
        const products = await productService.getProductsByIds([...uniqueProductIds]);

        // Create a map of product IDs to products for quick lookup
        const productMap = new Map(products.map((product) => [product.id, product]));

        // Check if all products exist
        for (const item of validated.items) {
          if (!productMap.has(item.productId)) {
            throw new CustomError({
              message: 'Product not found',
              errorCode: 'PRODUCT_NOT_FOUND',
              status: 404,
            });
          }
        }
      }

      const deliveryOrder = await deliveryOrderService.createDeliveryOrder(
        validated,
        performedById,
      );

      res.status(201).json(success(deliveryOrder));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Handle specific Prisma errors
        if (error.code === 'P2003') {
          throw new CustomError({
            message: 'Referenced entity does not exist',
            errorCode: 'REFERENCE_ERROR',
            status: 400,
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

  /**
   * Update an existing delivery order
   */
  async updateDeliveryOrder(
    req: Request<{ id: string }, unknown, DeliveryOrderUpdateInput>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;

      await deliveryOrderIdSchema.validateAsync({
        id,
      });

      const existingDeliveryOrder = await deliveryOrderService.getDeliveryOrderById(id);

      if (!existingDeliveryOrder) {
        throw new CustomError({
          message: 'Delivery order not found',
          errorCode: 'DELIVERY_ORDER_NOT_FOUND',
          status: 404,
        });
      }

      const validated = await updateDeliveryOrderSchema.validateAsync(req.body);

      // If customerId is provided, check if the customer exists
      if (validated.customerId) {
        const customer = await customerService.getCustomerById(validated.customerId);

        if (!customer) {
          throw new CustomError({
            message: 'Customer not found',
            errorCode: 'CUSTOMER_NOT_FOUND',
            status: 404,
          });
        }
      }

      // If items are provided, validate all products exist
      if (validated.items && validated.items.length > 0) {
        const productIds = validated.items.map((item) => item.productId);
        const uniqueProductIds = new Set(productIds);

        if (uniqueProductIds.size !== productIds.length) {
          // Find the duplicated product IDs
          const duplicates = productIds.filter((id, index) => productIds.indexOf(id) !== index);
          throw new CustomError({
            message: `Duplicate products not allowed. Found duplicate product ID(s): ${duplicates.join(', ')}`,
            errorCode: 'DUPLICATE_PRODUCTS',
            status: 400,
          });
        }

        // Fetch all products in a single query
        const products = await productService.getProductsByIds([...uniqueProductIds]);

        // Create a map of product IDs to products for quick lookup
        const productMap = new Map(products.map((product) => [product.id, product]));

        // Check if all products exist
        for (const item of validated.items) {
          if (!productMap.has(item.productId)) {
            throw new CustomError({
              message: 'Product not found',
              errorCode: 'PRODUCT_NOT_FOUND',
              status: 404,
            });
          }
        }
      }

      const performedById = req.user?.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      const updatedDeliveryOrder = await deliveryOrderService.updateDeliveryOrder(
        id,
        validated,
        performedById,
        existingDeliveryOrder,
      );

      res.status(200).json(success(updatedDeliveryOrder));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Handle specific Prisma errors
        if (error.code === 'P2003') {
          throw new CustomError({
            message: 'Referenced entity does not exist',
            errorCode: 'REFERENCE_ERROR',
            status: 400,
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

  /**
   * Delete a delivery order (soft delete)
   */
  async deleteDeliveryOrder(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await deliveryOrderIdSchema.validateAsync({
        id,
      });

      const existingDeliveryOrder = await deliveryOrderService.getDeliveryOrderById(id);

      if (!existingDeliveryOrder) {
        throw new CustomError({
          message: 'Delivery order not found',
          errorCode: 'DELIVERY_ORDER_NOT_FOUND',
          status: 404,
        });
      }

      if (existingDeliveryOrder.deletedAt) {
        throw new CustomError({
          message: 'Delivery order is already archived',
          errorCode: 'DELIVERY_ORDER_ALREADY_ARCHIVED',
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

      await deliveryOrderService.softDeleteDeliveryOrder(id, performedById);

      res.status(200).json(
        success({
          message: 'Delivery order archived successfully',
          id,
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * Restore an archived delivery order
   */
  async restoreDeliveryOrder(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await deliveryOrderIdSchema.validateAsync({
        id,
      });

      const existingDeliveryOrder = await deliveryOrderService.getDeliveryOrderById(id);

      if (!existingDeliveryOrder) {
        throw new CustomError({
          message: 'Delivery order not found',
          errorCode: 'DELIVERY_ORDER_NOT_FOUND',
          status: 404,
        });
      }

      if (!existingDeliveryOrder.deletedAt) {
        throw new CustomError({
          message: 'Delivery order is not archived',
          errorCode: 'DELIVERY_ORDER_NOT_ARCHIVED',
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

      const restoredDeliveryOrder = await deliveryOrderService.restoreDeliveryOrder(
        id,
        performedById,
      );

      res.status(200).json(
        success({
          message: 'Delivery order restored successfully',
          deliveryOrder: restoredDeliveryOrder,
        }),
      );
    } catch (error) {
      next(error);
    }
  },
};
