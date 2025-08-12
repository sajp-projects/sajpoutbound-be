import { Prisma } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { CustomError } from '../middlewares/error';
import {
  createProductSchema,
  ProductCreateInput,
  productIdSchema,
  ProductUpdateInput,
  updateProductSchema,
} from '../schemas/product';
import deliveryOrderService from '../services/deliveryOrderService';
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
          message: 'Produk tidak ditemukan',
          errorCode: 'PRODUK_TIDAK_DITEMUKAN',
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
          message: 'Gudang tidak ditemukan',
          errorCode: 'GUDANG_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      const performedById = req.user?.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Autentikasi diperlukan untuk aksi ini',
          errorCode: 'PERLU_AUTENTIKASI',
          status: 401,
        });
      }

      const product = await productService.createProduct(validated, performedById);

      res.status(201).json(success(product));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new CustomError({
            message: 'Produk dengan ID SL ini sudah ada',
            errorCode: 'ID_SL_PRODUK_DUPLIKAT',
            status: 409,
          });
        }

        throw new CustomError({
          message: error.message || 'Terjadi kesalahan pada basis data',
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
          message: 'Produk tidak ditemukan',
          errorCode: 'PRODUK_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      const validated = await updateProductSchema.validateAsync(req.body);

      // If warehouseId is included, validate that it exists
      if (validated.warehouseId) {
        const warehouse = await warehouseService.getWarehouseById(validated.warehouseId);

        if (!warehouse) {
          throw new CustomError({
            message: 'Gudang tidak ditemukan',
            errorCode: 'GUDANG_TIDAK_DITEMUKAN',
            status: 404,
          });
        }
      }

      const performedById = req.user?.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Autentikasi diperlukan untuk aksi ini',
          errorCode: 'PERLU_AUTENTIKASI',
          status: 401,
        });
      }

      const updatedProduct = await productService.updateProduct(
        existingProduct,
        validated,
        performedById,
      );

      res.status(200).json(success(updatedProduct));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new CustomError({
            message: 'Produk dengan ID SL ini sudah ada',
            errorCode: 'ID_SL_PRODUK_DUPLIKAT',
            status: 409,
          });
        }

        throw new CustomError({
          message: error.message || 'Terjadi kesalahan pada basis data',
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
          message: 'Produk tidak ditemukan',
          errorCode: 'PRODUK_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      // Check if product is used in any active delivery order items
      const deliveryOrderItems = await deliveryOrderService.getProductDeliveryOrderItems(id);

      if (deliveryOrderItems.length > 0) {
        throw new CustomError({
          message:
            'Produk sedang digunakan dalam pesanan pengiriman aktif. Arsipkan pesanan pengiriman terkait terlebih dahulu.',
          errorCode: 'PRODUK_SEDANG_DIGUNAKAN',
          status: 409,
        });
      }

      const performedById = req.user?.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Autentikasi diperlukan untuk aksi ini',
          errorCode: 'PERLU_AUTENTIKASI',
          status: 401,
        });
      }

      const deletedProduct = await productService.deleteProduct(existingProduct, performedById);
      res.status(200).json(success(deletedProduct));
    } catch (error) {
      next(error);
    }
  },
};
