import { Prisma } from '@prisma/client';
import {
  NextFunction, Request, Response, 
} from 'express';
import { CustomError } from '../middlewares/error';
import {
  createProductSchema,
  ProductCreateInput,
  productIdSchema,
  ProductUpdateInput,
  updateProductSchema,
} from '../schemas/product';
import productService from '../services/productService';
import warehouseService from '../services/warehouseService';
import { success } from '../types/response';

export default {
  async getAllProducts(req: Request, res: Response, next: NextFunction) {
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

      const result = await productService.getAllProducts(page, limit, search);

      res.status(200).json(
        success({
          products: result.products,
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

  async getProductById(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await productIdSchema.validateAsync({
        id,
      });

      const product = await productService.getProductById(id);

      if (!product) {
        throw new CustomError({
          message: 'Product not found',
          errorCode: 'PRODUCT_NOT_FOUND',
          status: 404,
        });
      }

      res.status(200).json(success(product));
    } catch (error) {
      next(error);
    }
  },

  async createProduct(
    req: Request<Record<string, never>, unknown, ProductCreateInput>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const validated = await createProductSchema.validateAsync(req.body);

      // Validate warehouse existence
      const warehouse = await warehouseService.getWarehouseById(validated.warehouseId);

      if (!warehouse) {
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

      const product = await productService.createProduct(validated, performedById);

      res.status(201).json(success(product));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new CustomError({
            message: 'Product with this ID SL already exists',
            errorCode: 'PRODUCT_ID_SL_DUPLICATE',
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

  async updateProduct(
    req: Request<{ id: string }, unknown, ProductUpdateInput>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;

      await productIdSchema.validateAsync({
        id,
      });

      const existingProduct = await productService.getProductById(id);

      if (!existingProduct) {
        throw new CustomError({
          message: 'Product not found',
          errorCode: 'PRODUCT_NOT_FOUND',
          status: 404,
        });
      }

      const validated = await updateProductSchema.validateAsync(req.body);

      // If warehouseId is included, validate that it exists
      if (validated.warehouseId) {
        const warehouse = await warehouseService.getWarehouseById(validated.warehouseId);

        if (!warehouse) {
          throw new CustomError({
            message: 'Warehouse not found',
            errorCode: 'WAREHOUSE_NOT_FOUND',
            status: 404,
          });
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

      const updatedProduct = await productService.updateProduct(id, validated, performedById);

      res.status(200).json(success(updatedProduct));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new CustomError({
            message: 'Product with this ID SL already exists',
            errorCode: 'PRODUCT_ID_SL_DUPLICATE',
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

  async deleteProduct(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await productIdSchema.validateAsync({
        id,
      });

      const existingProduct = await productService.getProductById(id);

      if (!existingProduct) {
        throw new CustomError({
          message: 'Product not found',
          errorCode: 'PRODUCT_NOT_FOUND',
          status: 404,
        });
      }

      // Check if warehouseId exists
      if (existingProduct.warehouseId) {
        const warehouse = await warehouseService.getWarehouseById(existingProduct.warehouseId);

        if (!warehouse) {
          throw new CustomError({
            message: 'Warehouse not found',
            errorCode: 'WAREHOUSE_NOT_FOUND',
            status: 404,
          });
        }

        // Product is associated with a warehouse, prevent deletion
        throw new CustomError({
          message:
            'Cannot delete product as it is associated with a warehouse. Update the product to remove warehouse association first.',
          errorCode: 'PRODUCT_WAREHOUSE_ASSOCIATION',
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

      const deletedProduct = await productService.deleteProduct(id, performedById);

      res.status(200).json(success(deletedProduct));
    } catch (error) {
      next(error);
    }
  },
};
