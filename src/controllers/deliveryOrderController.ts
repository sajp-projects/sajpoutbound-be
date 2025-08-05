import { Prisma, STATUS } from '@prisma/client';
import {
  NextFunction, Request, Response, 
} from 'express';
import { customAlphabet } from 'nanoid';
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
      const availableOnly = req.query.availableOnly === 'true';

      if (status && !Object.values(STATUS).includes(status as STATUS)) {
        throw new CustomError({
          message: 'Status tidak valid',
          errorCode: 'STATUS_TIDAK_VALID',
          status: 400,
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

      const result = await deliveryOrderService.getAllDeliveryOrders(
        page,
        limit,
        search,
        status,
        availableOnly,
      );

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
          message: 'Pesanan pengiriman tidak ditemukan',
          errorCode: 'PESANAN_PENGIRIMAN_TIDAK_DITEMUKAN',
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
          message: 'Autentikasi diperlukan untuk aksi ini',
          errorCode: 'PERLU_AUTENTIKASI',
          status: 401,
        });
      }

      if (validated.customerId) {
        const customer = await customerService.getCustomerById(validated.customerId);

        if (!customer) {
          throw new CustomError({
            message: 'Pelanggan tidak ditemukan',
            errorCode: 'PELANGGAN_TIDAK_DITEMUKAN',
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
            message: `Produk duplikat tidak diperbolehkan. Ditemukan ID produk duplikat: ${duplicates.join(', ')}`,
            errorCode: 'PRODUK_DUPLIKAT',
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
              message: 'Produk tidak ditemukan',
              errorCode: 'PRODUK_TIDAK_DITEMUKAN',
              status: 404,
            });
          }
        }
      }

      const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);
      let doNumber;
      let attempts = 0;
      const maxAttempts = 1000;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        doNumber = nanoid();
        const existing = await deliveryOrderService.getDeliveryOrderByDoNumber(doNumber);
        if (!existing) {
          break;
        }
        attempts++;

        if (attempts >= maxAttempts) {
          throw new CustomError({
            message: 'Terjadi kesalahan saat membuat nomor DO, harap coba lagi.',
            errorCode: 'DUPLIKASI_NOMOR_DO',
            status: 500,
          });
        }
      }

      const deliveryOrder = await deliveryOrderService.createDeliveryOrder(
        validated,
        performedById,
        doNumber,
      );

      res.status(201).json(success(deliveryOrder));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Handle specific Prisma errors
        if (error.code === 'P2003') {
          throw new CustomError({
            message: 'Entitas referensi tidak ada',
            errorCode: 'REFERENSI_TIDAK_DITEMUKAN',
            status: 400,
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
          message: 'Pesanan pengiriman tidak ditemukan',
          errorCode: 'PESANAN_PENGIRIMAN_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      if (existingDeliveryOrder.status === STATUS.SELESAI) {
        throw new CustomError({
          message: 'Pesanan pengiriman sudah selesai, tidak dapat diubah.',
          errorCode: 'PESANAN_PENGIRIMAN_SUDAH_SELESAI',
          status: 400,
        });
      }

      const validated = await updateDeliveryOrderSchema.validateAsync(req.body);

      // If customerId is provided, check if the customer exists
      if (validated.customerId) {
        const customer = await customerService.getCustomerById(validated.customerId);

        if (!customer) {
          throw new CustomError({
            message: 'Pelanggan tidak ditemukan',
            errorCode: 'PELANGGAN_TIDAK_DITEMUKAN',
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
            message: `Produk duplikat tidak diperbolehkan. Ditemukan ID produk duplikat: ${duplicates.join(', ')}`,
            errorCode: 'PRODUK_DUPLIKAT',
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
              message: 'Produk tidak ditemukan',
              errorCode: 'PRODUK_TIDAK_DITEMUKAN',
              status: 404,
            });
          }
        }

        // --- Begin: Validation for processed/completed quantities ---
        // Create a map of old items by id for quick lookup
        const oldItemsMap = new Map();
        for (const oldItem of existingDeliveryOrder.items) {
          oldItemsMap.set(oldItem.id, oldItem);
        }
        for (const item of validated.items) {
          if (item.id) {
            const oldItem = oldItemsMap.get(item.id);
            if (oldItem) {
              const minQuantity = oldItem.processingQuantity + oldItem.completedQuantity;
              if (item.quantity < minQuantity) {
                throw new CustomError({
                  message: `Kuantitas tidak boleh kurang dari jumlah yang sudah diproses/selesai untuk produk ${oldItem.product.name}. Minimal: ${minQuantity}`,
                  errorCode: 'KUANTITAS_TIDAK_CUKUP',
                  status: 400,
                });
              }
            }
          }
        }
        // --- End: Validation for processed/completed quantities ---
      }

      const performedById = req.user?.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Autentikasi diperlukan untuk aksi ini',
          errorCode: 'PERLU_AUTENTIKASI',
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
            message: 'Entitas referensi tidak ada',
            errorCode: 'REFERENSI_TIDAK_DITEMUKAN',
            status: 400,
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
          message: 'Pesanan pengiriman tidak ditemukan',
          errorCode: 'PESANAN_PENGIRIMAN_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      if (existingDeliveryOrder.deletedAt) {
        throw new CustomError({
          message: 'Pesanan pengiriman sudah diarsipkan',
          errorCode: 'PESANAN_PENGIRIMAN_SUDAH_DIARSIPKAN',
          status: 400,
        });
      }

      if (
        existingDeliveryOrder.status === STATUS.PROSES ||
        existingDeliveryOrder.status === STATUS.SELESAI
      ) {
        throw new CustomError({
          message: 'Pesanan pengiriman dengan status PROSES atau SELESAI tidak dapat diarsipkan',
          errorCode: 'TIDAK_BISA_ARSIPKAN_STATUS_PROSES_SELESAI',
          status: 400,
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

      const deletedDeliveryOrder = await deliveryOrderService.softDeleteDeliveryOrder(
        existingDeliveryOrder,
        performedById,
      );

      res.status(200).json(success(deletedDeliveryOrder));
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
          message: 'Pesanan pengiriman tidak ditemukan',
          errorCode: 'PESANAN_PENGIRIMAN_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      if (!existingDeliveryOrder.deletedAt) {
        throw new CustomError({
          message: 'Pesanan pengiriman belum diarsipkan',
          errorCode: 'PESANAN_PENGIRIMAN_BELUM_DIARSIPKAN',
          status: 400,
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

      const restoredDeliveryOrder = await deliveryOrderService.restoreDeliveryOrder(
        existingDeliveryOrder,
        performedById,
      );

      res.status(200).json(
        success({
          message: 'Pesanan pengiriman berhasil dipulihkan',
          deliveryOrder: restoredDeliveryOrder,
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get multiple delivery orders by their IDs
   */
  async getDeliveryOrdersByIds(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new CustomError({
          message: 'Parameter ids harus berupa array dan tidak boleh kosong',
          errorCode: 'PARAMETER_TIDAK_VALID',
          status: 400,
        });
      }
      // Optionally validate each id is a string
      if (!ids.every((id) => typeof id === 'string')) {
        throw new CustomError({
          message: 'Setiap id harus berupa string',
          errorCode: 'PARAMETER_TIDAK_VALID',
          status: 400,
        });
      }

      const deliveryOrders = await deliveryOrderService.getDeliveryOrdersByIds(ids);

      res.status(200).json(
        success({
          deliveryOrders,
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all shipments that use items from a given delivery order
   */
  async getShipmentsByDeliveryOrderId(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;

      await deliveryOrderIdSchema.validateAsync({
        id,
      });

      const shipments = await deliveryOrderService.getShipmentsByDeliveryOrderId(id);

      if (!shipments || shipments.length === 0) {
        throw new CustomError({
          message: 'Tidak ada pengiriman yang menggunakan delivery order ini',
          errorCode: 'PENGIRIMAN_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      res.status(200).json(
        success({
          shipments,
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * Change customer of a delivery order after weighing
   */
  async changeCustomerAfterWeighing(
    req: Request<{ id: string }, any, { customerId: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;
      const { customerId } = req.body;

      await deliveryOrderIdSchema.validateAsync({
        id,
      });

      if (!customerId) {
        throw new CustomError({
          message: 'Customer ID harus diisi',
          errorCode: 'CUSTOMER_ID_REQUIRED',
          status: 400,
        });
      }

      // Verify customer exists
      const customer = await customerService.getCustomerById(customerId);
      if (!customer) {
        throw new CustomError({
          message: 'Customer tidak ditemukan',
          errorCode: 'CUSTOMER_NOT_FOUND',
          status: 404,
        });
      }

      // Get current user ID from token (assuming it's in req.user)
      const performedById = (req as any).user?.id || 'SYSTEM';

      const updatedDeliveryOrder = await deliveryOrderService.changeCustomerAfterWeighing(
        id,
        customerId,
        performedById,
      );

      if (!updatedDeliveryOrder) {
        throw new CustomError({
          message: 'Delivery order tidak ditemukan',
          errorCode: 'DELIVERY_ORDER_NOT_FOUND',
          status: 404,
        });
      }

      res.status(200).json(
        success({
          deliveryOrder: updatedDeliveryOrder,
          message: 'Customer berhasil diubah',
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * Revise delivery order items after weighing
   */
  async reviseDeliveryOrderAfterWeighing(
    req: Request<{ id: string }, any, { items: any[] }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;
      const { items } = req.body;

      await deliveryOrderIdSchema.validateAsync({
        id,
      });

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new CustomError({
          message: 'Items harus diisi dan berupa array',
          errorCode: 'ITEMS_REQUIRED',
          status: 400,
        });
      }

      // Validate each item has required fields
      for (const item of items) {
        if (!item.id || typeof item.quantity !== 'number' || item.quantity < 0) {
          throw new CustomError({
            message: 'Setiap item harus memiliki id dan quantity yang valid (>= 0)',
            errorCode: 'INVALID_ITEM_DATA',
            status: 400,
          });
        }
      }

      // Get current user ID from token (assuming it's in req.user)
      const performedById = (req as any).user?.id;

      const result = await deliveryOrderService.reviseDeliveryOrderAfterWeighing(
        id,
        items,
        performedById,
      );

      if (!result) {
        throw new CustomError({
          message: 'Delivery order tidak ditemukan',
          errorCode: 'DELIVERY_ORDER_NOT_FOUND',
          status: 404,
        });
      }

      // Check if service returned an error
      if ('error' in result) {
        throw new CustomError({
          message: result.error,
          errorCode: 'REVISION_ERROR',
          status: 400,
        });
      }

      res.status(200).json(
        success({
          deliveryOrder: result,
          message: 'DO berhasil direvisi',
        }),
      );
    } catch (error) {
      next(error);
    }
  },
};
