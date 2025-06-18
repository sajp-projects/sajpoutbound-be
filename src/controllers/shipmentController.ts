import { SHIPMENT_TYPE, STATUS } from '@prisma/client';
import dotenv from 'dotenv';
import {
  NextFunction, Request, Response, 
} from 'express';
import { customAlphabet } from 'nanoid';
import path from 'path';
import { CustomError } from '../middlewares/error';
import {
  createShipmentSchema,
  ShipmentBulkWeighInput,
  shipmentBulkWeighSchema,
  ShipmentChosenProductInput,
  shipmentChosenProductSchema,
  ShipmentCreateInput,
  ShipmentFullUpdateInput,
  shipmentFullUpdateSchema,
  shipmentIdSchema,
  ShipmentUpdateInput,
  ShipmentWeighInput,
  shipmentWeighSchema,
  updateShipmentSchema,
} from '../schemas/shipment';
import armadaService from '../services/armadaService';
import deliveryOrderService from '../services/deliveryOrderService';
import fileService from '../services/fileService';
import geminiAiService from '../services/geminiAiService';
import productService from '../services/productService';
import shipmentService from '../services/shipmentService';
import userService from '../services/userService';
import { success } from '../types/response';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

export default {
  /**
   * Get all shipments with pagination and search
   */
  async getAllShipments(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const search = req.query.search as string | undefined;
      const status = req.query.status as STATUS | undefined;
      const type = req.query.type as SHIPMENT_TYPE | undefined;

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

      const result = await shipmentService.getAllShipments(page, limit, search, status, type);

      res.status(200).json(
        success({
          shipments: result.shipments,
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
   * Get archived shipments with pagination and search
   */
  async getArchivedShipments(req: Request, res: Response, next: NextFunction) {
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

      const result = await shipmentService.getArchivedShipments(page, limit, search);

      res.status(200).json(
        success({
          shipments: result.shipments,
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
   * Get a shipment by ID
   */
  async getShipmentById(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await shipmentIdSchema.validateAsync({
        id,
      });

      const shipment = await shipmentService.getShipmentById(id);

      if (!shipment) {
        throw new CustomError({
          message: 'Pengiriman tidak ditemukan',
          errorCode: 'PENGIRIMAN_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      res.status(200).json(success(shipment));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create a new shipment
   */
  async createShipment(
    req: Request<Record<string, never>, unknown, ShipmentCreateInput>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const validated = await createShipmentSchema.validateAsync(req.body);

      const performedById = req.user?.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Autentikasi diperlukan untuk aksi ini',
          errorCode: 'PERLU_AUTENTIKASI',
          status: 401,
        });
      }

      // Validate armada if provided
      if (validated.armadaId) {
        const armada = await armadaService.getArmadaById(validated.armadaId);
        if (!armada) {
          throw new CustomError({
            message: 'Armada tidak ditemukan',
            errorCode: 'ARMADA_TIDAK_DITEMUKAN',
            status: 404,
          });
        }
      }

      if (validated.items && validated.items.length > 0) {
        // Get unique delivery order IDs and product IDs
        const deliveryOrderIds = [...new Set(validated.items.map((item) => item.deliveryOrderId))];
        const productIds = [...new Set(validated.items.map((item) => item.productId))];

        // Validate delivery orders
        const deliveryOrders = await deliveryOrderService.getDeliveryOrdersByIds(deliveryOrderIds);
        if (deliveryOrders.length !== deliveryOrderIds.length) {
          throw new CustomError({
            message: 'Satu atau lebih pesanan pengiriman tidak ditemukan',
            errorCode: 'PESANAN_PENGIRIMAN_TIDAK_DITEMUKAN',
            status: 404,
          });
        }

        // Validate products and get their warehouse IDs
        const products = await productService.getProductsByIds(productIds);
        if (products.length !== productIds.length) {
          throw new CustomError({
            message: 'Satu atau lebih produk tidak ditemukan',
            errorCode: 'PRODUK_TIDAK_DITEMUKAN',
            status: 404,
          });
        }

        // Check if any product doesn't have a warehouse assigned
        const productsWithoutWarehouse = products.filter((product) => !product.warehouseId);
        if (productsWithoutWarehouse.length > 0) {
          throw new CustomError({
            message: `Produk dengan ID ${productsWithoutWarehouse.map((p) => p.id).join(', ')} belum memiliki gudang yang ditetapkan`,
            errorCode: 'PRODUK_TANPA_GUDANG',
            status: 400,
          });
        }

        // Validate that delivery order items exist and have enough pending quantity
        for (const item of validated.items) {
          const deliveryOrder = deliveryOrders.find((d) => d.id === item.deliveryOrderId);
          if (!deliveryOrder) continue;

          const doItem = deliveryOrder.items.find((doItem) => doItem.productId === item.productId);
          if (!doItem) {
            throw new CustomError({
              message: `Produk ${item.productId} tidak ditemukan dalam pesanan pengiriman ${item.deliveryOrderId}`,
              errorCode: 'PRODUK_TIDAK_DITEMUKAN_DI_DO',
              status: 400,
            });
          }

          if (doItem.pendingQuantity < item.requestedQuantity) {
            throw new CustomError({
              message: `Jumlah pending tidak cukup untuk produk ${item.productId} dalam pesanan pengiriman ${item.deliveryOrderId}. Tersedia: ${doItem.pendingQuantity}, Diminta: ${item.requestedQuantity}`,
              errorCode: 'JUMLAH_TIDAK_MENCUKUPI',
              status: 400,
            });
          }
        }
      }

      const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);
      let shipmentNumber;
      let attempts = 0;
      const maxAttempts = 1000;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        shipmentNumber = nanoid();
        const existing = await shipmentService.getShipmentByShipmentNumber(shipmentNumber);
        if (!existing) {
          break;
        }
        attempts++;

        if (attempts >= maxAttempts) {
          throw new CustomError({
            message: 'Terjadi kesalahan saat membuat nomor Pengiriman, harap coba lagi.',
            errorCode: 'DUPLIKASI_NOMOR_PENGIRIMAN',
            status: 500,
          });
        }
      }

      const shipment = await shipmentService.createShipment(
        validated,
        performedById,
        shipmentNumber,
      );

      res.status(201).json(success(shipment));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update a shipment
   */
  async updateShipment(
    req: Request<{ id: string }, unknown, ShipmentUpdateInput | ShipmentFullUpdateInput>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;

      // Check if this is a full update with items
      const isFullUpdate = 'items' in req.body && Array.isArray(req.body.items);

      // Validate based on update type
      const validated = isFullUpdate
        ? await shipmentFullUpdateSchema.validateAsync(req.body)
        : await updateShipmentSchema.validateAsync(req.body);

      await shipmentIdSchema.validateAsync({
        id,
      });

      const performedById = req.user?.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Autentikasi diperlukan untuk aksi ini',
          errorCode: 'PERLU_AUTENTIKASI',
          status: 401,
        });
      }

      // Validate armada if provided
      if (validated.armadaId && validated.armadaId !== '') {
        const armada = await armadaService.getArmadaById(validated.armadaId);
        if (!armada) {
          throw new CustomError({
            message: 'Armada tidak ditemukan',
            errorCode: 'ARMADA_TIDAK_DITEMUKAN',
            status: 404,
          });
        }
      }

      // If this is a full update, validate the items
      if (isFullUpdate) {
        const fullUpdate = validated as ShipmentFullUpdateInput;

        if (fullUpdate.items && fullUpdate.items.length > 0) {
          // Get unique delivery order IDs and product IDs
          const deliveryOrderIds = [
            ...new Set(fullUpdate.items.map((item) => item.deliveryOrderId)),
          ];
          const productIds = [...new Set(fullUpdate.items.map((item) => item.productId))];

          // Validate delivery orders
          const deliveryOrders =
            await deliveryOrderService.getDeliveryOrdersByIds(deliveryOrderIds);
          if (deliveryOrders.length !== deliveryOrderIds.length) {
            throw new CustomError({
              message: 'Satu atau lebih pesanan pengiriman tidak ditemukan',
              errorCode: 'PESANAN_PENGIRIMAN_TIDAK_DITEMUKAN',
              status: 404,
            });
          }

          // Validate products
          const products = await productService.getProductsByIds(productIds);
          if (products.length !== productIds.length) {
            throw new CustomError({
              message: 'Satu atau lebih produk tidak ditemukan',
              errorCode: 'PRODUK_TIDAK_DITEMUKAN',
              status: 404,
            });
          }

          // Validate that products have warehouses assigned
          const productsWithoutWarehouse = products.filter((product) => !product.warehouseId);
          if (productsWithoutWarehouse.length > 0) {
            throw new CustomError({
              message: `Produk dengan ID ${productsWithoutWarehouse.map((p) => p.id).join(', ')} belum memiliki gudang yang ditetapkan`,
              errorCode: 'PRODUK_TANPA_GUDANG',
              status: 400,
            });
          }

          // Get the current shipment to check status and items
          const shipment = await shipmentService.getShipmentById(id);

          if (!shipment) {
            throw new CustomError({
              message: 'Pengiriman tidak ditemukan',
              errorCode: 'PENGIRIMAN_TIDAK_DITEMUKAN',
              status: 404,
            });
          }

          if (shipment.status === STATUS.SELESAI) {
            throw new CustomError({
              message: 'Pengiriman sudah selesai, tidak dapat diubah.',
              errorCode: 'PENGIRIMAN_SUDAH_SELESAI',
              status: 400,
            });
          }

          // Map of existing shipment items by (deliveryOrderId, productId)
          const existingItemsMap = new Map();
          for (const item of shipment.shipmentItems) {
            existingItemsMap.set(item.deliveryOrderId + '-' + item.productId, item);
          }

          // Map of updated items by (deliveryOrderId, productId)
          const updatedItemsMap = new Map();
          for (const item of fullUpdate.items) {
            updatedItemsMap.set(item.deliveryOrderId + '-' + item.productId, item);
          }

          // 1. Prevent removing loaded items
          for (const [key, existingItem] of existingItemsMap.entries()) {
            if (!updatedItemsMap.has(key)) {
              // Hanya cegah penghapusan jika item sudah CHOSEN atau COMPLETED
              if (existingItem.status === 'CHOSEN' || existingItem.status === 'COMPLETED') {
                throw new CustomError({
                  message:
                    'Item yang sudah dimuat atau selesai tidak dapat dihapus dari pengiriman.',
                  errorCode: 'ITEM_SUDAH_DIMUAT_TIDAK_BISA_DIHAPUS',
                  status: 400,
                });
              }
            }
          }

          // 2. Prevent changing quantity of loaded items
          for (const [key, updatedItem] of updatedItemsMap.entries()) {
            if (existingItemsMap.has(key)) {
              const existingItem = existingItemsMap.get(key);
              // Hanya cegah perubahan quantity jika item sudah CHOSEN atau COMPLETED
              if (
                (existingItem.status === 'CHOSEN' || existingItem.status === 'COMPLETED') &&
                updatedItem.requestedQuantity !== existingItem.requestedQuantity
              ) {
                throw new CustomError({
                  message: 'Kuantitas item yang sudah dimuat atau selesai tidak dapat diubah.',
                  errorCode: 'KUANTITAS_ITEM_SUDAH_DIMUAT_TIDAK_BISA_DIUBAH',
                  status: 400,
                });
              }
            }
          }
        }
      }

      const shipment = await shipmentService.updateShipment(id, validated, performedById);

      if (!shipment) {
        throw new CustomError({
          message: 'Pengiriman tidak ditemukan',
          errorCode: 'PENGIRIMAN_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      res.status(200).json(success(shipment));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete a shipment
   */
  async deleteShipment(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await shipmentIdSchema.validateAsync({
        id,
      });

      const performedById = req.user?.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Autentikasi diperlukan untuk aksi ini',
          errorCode: 'PERLU_AUTENTIKASI',
          status: 401,
        });
      }

      const existingShipment = await shipmentService.getShipmentById(id);

      if (!existingShipment) {
        throw new CustomError({
          message: 'Pengiriman tidak ditemukan',
          errorCode: 'PENGIRIMAN_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      if (
        (existingShipment.status as STATUS) !== STATUS.PENDING ||
        existingShipment.shipmentItems.some((item) => item.status !== 'PENDING')
      ) {
        throw new CustomError({
          message: 'Pengiriman hanya dapat diarsipkan jika status dan semua item masih PENDING.',
          errorCode: 'PENGIRIMAN_TIDAK_BISA_DIARSIPKAN',
          status: 400,
        });
      }

      if ((existingShipment.status as STATUS) === STATUS.SELESAI) {
        throw new CustomError({
          message: 'Pengiriman sudah selesai, tidak dapat diarsipkan.',
          errorCode: 'PENGIRIMAN_SUDAH_SELESAI',
          status: 400,
        });
      }

      const shipment = await shipmentService.deleteShipment(id, performedById, existingShipment);

      res.status(200).json(success(shipment));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all available shipments that have not yet been weighed (status PENDING)
   */
  async getAvailableItemsForWeighing(req: Request, res: Response, next: NextFunction) {
    try {
      const auth = req.headers['x-auth'] as string;

      if (!auth || auth !== process.env.X_AUTH_KEY) {
        throw new CustomError({
          message: 'Tolong cek API Key kembali.',
          errorCode: 'UNAUTHORIZED',
          status: 401,
        });
      }

      const shipments = await shipmentService.getPendingShipments();

      res.status(200).json(
        success({
          shipments,
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  async getAvailableItemsForWeighingByShipmentId(
    req: Request<{ shipmentId: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const auth = req.headers['x-auth'] as string;

      if (!auth || auth !== process.env.X_AUTH_KEY) {
        throw new CustomError({
          message: 'Tolong cek API Key kembali.',
          errorCode: 'TIDAK_DIIZINKAN',
          status: 401,
        });
      }

      const { shipmentId } = req.params;

      await shipmentIdSchema.validateAsync({
        id: shipmentId,
      });

      const shipment = await shipmentService.getShipmentById(shipmentId);

      if (!shipment) {
        throw new CustomError({
          message: 'Pengiriman tidak ditemukan',
          errorCode: 'PENGIRIMAN_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      const items = await shipmentService.getAvailableItemsForWeighingByShipmentId(shipmentId);

      res.status(200).json(success(items));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Process a shipment item (weigh and record weights for chosen product)
   *
   * This endpoint handles the weighing process by:
   * 1. Validating the shipment item exists and is in CHOSEN status
   * 2. Finding the associated chosen product
   * 3. Recording the weights (gross, net, tare)
   * 4. Updating the status directly to COMPLETED
   * 5. Updating delivery order quantities
   */
  async weighShipmentItem(
    req: Request<Record<string, never>, unknown, ShipmentWeighInput>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const validated = await shipmentWeighSchema.validateAsync(req.body);

      const performedById = req.user?.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Autentikasi diperlukan untuk aksi ini',
          errorCode: 'PERLU_AUTENTIKASI',
          status: 401,
        });
      }

      // First, get the shipment item to check if it exists and validate its state
      const existingItem = await shipmentService.getShipmentItemById(validated.shipmentItemId);

      if (!existingItem) {
        throw new CustomError({
          message: 'Item pengiriman tidak ditemukan',
          errorCode: 'ITEM_PENGIRIMAN_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      // Check if item is in CHOSEN status
      if (existingItem.status !== 'CHOSEN') {
        throw new CustomError({
          message: 'Anda belum menambahkan produk ini untuk diukur',
          errorCode: 'TIDAK_DAPAT_MENAMBAHKAN_PRODUK',
          status: 400,
        });
      }

      // Find the shipment chosen product associated with this item
      const shipmentChosenProduct = await shipmentService.getShipmentChosenProduct(
        existingItem.shipmentId,
        existingItem.productId,
      );

      if (!shipmentChosenProduct) {
        throw new CustomError({
          message: 'Produk dipilih untuk pengiriman tidak ditemukan',
          errorCode: 'PRODUK_DIPILIH_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      // Now proceed with weighing the item
      const item = await shipmentService.weighShipmentItem(
        validated,
        performedById,
        existingItem,
        shipmentChosenProduct,
      );

      res.status(200).json(
        success({
          item,
          weights: {
            gross: validated.grossWeight,
            net: validated.netWeight,
            tare: validated.tareWeight,
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * Choose a product for a shipment
   */
  async chooseProductForShipment(
    req: Request<{ shipmentId: string }, unknown, Omit<ShipmentChosenProductInput, 'shipmentId'>>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { shipmentId } = req.params;
      const { productId } = req.body;

      // Validate shipment ID
      await shipmentIdSchema.validateAsync({
        id: shipmentId,
      });

      // Validate input data
      const data: ShipmentChosenProductInput = {
        shipmentId,
        productId,
      };

      await shipmentChosenProductSchema.validateAsync(data);

      // Get the authenticated user ID
      const userId = req.user?.id;
      if (!userId) {
        throw new CustomError({
          message: 'Autentikasi diperlukan untuk aksi ini',
          errorCode: 'PERLU_AUTENTIKASI',
          status: 401,
        });
      }

      // Check if shipment exists
      const shipment = await shipmentService.getShipmentById(shipmentId);
      if (!shipment) {
        throw new CustomError({
          message: 'Pengiriman tidak ditemukan',
          errorCode: 'PENGIRIMAN_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      // Check if product exists
      const product = await productService.getProductById(productId);
      if (!product) {
        throw new CustomError({
          message: 'Produk tidak ditemukan',
          errorCode: 'PRODUK_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      // Check if product is already chosen for this shipment
      const existingChosenProducts = await shipmentService.getChosenProductsForShipment(shipmentId);
      const isDuplicate =
        existingChosenProducts?.some((item) => item?.productId === productId) || false;

      if (isDuplicate) {
        throw new CustomError({
          message: 'Produk ini sudah dipilih untuk pengiriman ini',
          errorCode: 'PRODUK_DUPLIKAT',
          status: 400,
        });
      }

      // Check if there are any pending shipment items for this product
      const pendingItems = shipment.shipmentItems.filter(
        (item) => item.productId === productId && item.status === 'PENDING',
      );

      if (pendingItems.length <= 0) {
        throw new CustomError({
          message: 'Tidak ada item pengiriman pending untuk produk ini',
          errorCode: 'TIDAK_ADA_ITEM_PENDING',
          status: 400,
        });
      }

      const chosenProduct = await shipmentService.chooseProductForShipment(data, product);

      res.status(200).json(success(chosenProduct));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get chosen products for a shipment
   */
  async getChosenProductsForShipment(
    req: Request<{ shipmentId: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { shipmentId } = req.params;

      // Validate shipment ID
      await shipmentIdSchema.validateAsync({
        id: shipmentId,
      });

      // Check if shipment exists
      const shipment = await shipmentService.getShipmentById(shipmentId);
      if (!shipment) {
        throw new CustomError({
          message: 'Pengiriman tidak ditemukan',
          errorCode: 'PENGIRIMAN_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      // Get chosen products - these are already combined by product ID
      const chosenProducts = await shipmentService.getChosenProductsForShipment(shipmentId);

      res.status(200).json(
        success({
          chosenProducts,
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete a chosen product from a shipment
   */
  async deleteChosenProduct(
    req: Request<{ shipmentId: string; productId: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { shipmentId, productId } = req.params;

      // Validate shipment ID
      await shipmentIdSchema.validateAsync({
        id: shipmentId,
      });

      // Check if shipment exists
      const shipment = await shipmentService.getShipmentById(shipmentId);
      if (!shipment) {
        throw new CustomError({
          message: 'Pengiriman tidak ditemukan',
          errorCode: 'PENGIRIMAN_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      // Check if shipment is in valid status
      if (shipment.status !== 'PENDING') {
        throw new CustomError({
          message: 'Tidak dapat menghapus produk dari pengiriman dengan status tidak PENDING',
          errorCode: 'TIDAK_DAPAT_MENGHAPUS_PRODUK_DARI_PENGIRIMAN',
          status: 400,
        });
      }

      // Delete chosen product
      await shipmentService.deleteChosenProduct(shipmentId, productId);

      res.status(200).json(
        success({
          message: 'Produk dihapus dari pengiriman',
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * Upload plate photo for a shipment
   *
   * This can only be done when all shipment items are in COMPLETED status
   */
  async uploadPlatePhoto(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await shipmentIdSchema.validateAsync({
        id,
      });

      const performedById = req.user?.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Autentikasi diperlukan untuk aksi ini',
          errorCode: 'PERLU_AUTENTIKASI',
          status: 401,
        });
      }

      // Check if shipment exists and validate item status
      const incompleteItems = await shipmentService.validateAllItemsComplete(id);

      if (incompleteItems === false) {
        throw new CustomError({
          message: 'Pengiriman tidak ditemukan',
          errorCode: 'PENGIRIMAN_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      if (incompleteItems !== null && incompleteItems.length > 0) {
        throw new CustomError({
          message: 'Semua item pengiriman harus selesai sebelum mengunggah foto plat',
          errorCode: 'SEMUA_ITEM_PENGIRIMAN_MUSTI_SELESAI_SEBELUM_MENGGUNGGUH_FOTO_PLAT',
          status: 400,
        });
      }

      // Process the uploaded file
      try {
        const platePhotoPath = await fileService.saveUploadedImage(
          req,
          'platePhoto',
          `plate_photo_${id}`,
        );

        // Update the shipment with the plate photo path
        const shipment = await shipmentService.updatePlatePhoto(id, platePhotoPath, performedById);

        if (!shipment) {
          throw new CustomError({
            message: 'Pengiriman tidak ditemukan',
            errorCode: 'PENGIRIMAN_TIDAK_DITEMUKAN',
            status: 404,
          });
        }

        res.status(200).json(success(shipment));
      } catch (uploadError: any) {
        throw new CustomError({
          message: uploadError.message || 'Gagal mengunggah foto plat',
          errorCode: 'GAGAL_MENGGUNGGUH_FOTO_PLAT',
          status: 400,
        });
      }
    } catch (error) {
      next(error);
    }
  },

  /**
   * Verify shipment with plate number and photo
   *
   * This can only be done when all shipment items are in COMPLETED status
   */
  async verifyPlateNumberAndPhoto(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await shipmentIdSchema.validateAsync({
        id,
      });

      const performedById = req.user?.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Autentikasi diperlukan untuk aksi ini',
          errorCode: 'PERLU_AUTENTIKASI',
          status: 401,
        });
      }

      // Check if shipment exists and get its items
      const existingShipment = await shipmentService.getShipmentById(id);

      if (!existingShipment) {
        throw new CustomError({
          message: 'Pengiriman tidak ditemukan',
          errorCode: 'PENGIRIMAN_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      // Ensure all shipment items are either in CHOSEN or COMPLETED status
      const invalidItems = existingShipment.shipmentItems.filter((item) => {
        return item.status !== 'CHOSEN' && item.status !== 'COMPLETED';
      });

      if (invalidItems.length > 0) {
        throw new CustomError({
          message:
            'Semua item pengiriman harus dipilih atau selesai sebelum memverifikasi nomor plat',
          errorCode:
            'SEMUA_ITEM_PENGIRIMAN_MUSTI_DIPILIH_ATAU_SELESAI_SEBELUM_MEMVERIFIKASI_NOMOR_PLAT',
          status: 400,
        });
      }

      // Check if shipment is already verified or completed
      if (existingShipment.isVerified || existingShipment.status === 'SELESAI') {
        throw new CustomError({
          message: 'Pengiriman sudah diverifikasi',
          errorCode: 'PENGIRIMAN_SUDAH_DIVERIFIKASI',
          status: 400,
        });
      }

      // Verify that plate number and photo exist
      if (!existingShipment.plateNumber && !existingShipment.armada?.plateNumber) {
        throw new CustomError({
          message: 'Pengiriman harus memiliki nomor plat sebelum verifikasi',
          errorCode: 'PENGIRIMAN_MUSTI_MEMILIKI_NOMOR_PLAT_SEBELUM_MEMVERIFIKASI',
          status: 400,
        });
      }

      if (!existingShipment.platePhoto) {
        throw new CustomError({
          message: 'Foto plat harus diunggah sebelum verifikasi',
          errorCode: 'FOTO_PLAT_MUSTI_DIIGGUH_SEBELUM_MEMVERIFIKASI',
          status: 400,
        });
      }

      // Get the expected plate number from either the shipment or its armada
      const expectedPlateNumber =
        existingShipment.plateNumber || existingShipment.armada?.plateNumber;

      // Get the absolute path to the uploaded plate photo
      const platePhotoRelativePath = existingShipment.platePhoto;
      const platePhotoAbsolutePath = isProd
        ? path.join('/var/www/benzeta.shop/public', platePhotoRelativePath)
        : path.join(process.cwd(), 'src', 'public', platePhotoRelativePath);

      // Use Gemini AI to extract plate number from the photo
      const extractedPlateNumber =
        await geminiAiService.extractPlateNumberFromImage(platePhotoAbsolutePath);

      // If no plate number could be extracted
      if (!extractedPlateNumber) {
        throw new CustomError({
          message:
            'Gagal mengekstrak nomor plat dari foto. Silakan pastikan plat jelas terlihat. Silakan coba lagi',
          errorCode: 'GAGAL_MENGEKSTRAK_NOMOR_PLAT_DARI_FOTO',
          status: 400,
        });
      }

      // Compare the extracted plate number with the expected plate number
      const isMatch = geminiAiService.comparePlateNumbers(
        extractedPlateNumber,
        expectedPlateNumber as string,
      );

      if (!isMatch) {
        throw new CustomError({
          message: `Nomor plat dalam foto (${extractedPlateNumber}) tidak cocok dengan nomor plat yang terdaftar (${expectedPlateNumber}) Silakan coba lagi`,
          errorCode: 'NOMOR_PLAT_TIDAK_COCOK',
          status: 400,
        });
      }

      // If we get here, the plate numbers match, so proceed with verification
      const shipment = await shipmentService.verifyPlateNumberAndPhoto(
        id,
        performedById,
        existingShipment,
      );

      res.status(200).json(
        success({
          ...shipment,
          verifikasiPlat: {
            expectedPlateNumber,
            extractedPlateNumber,
            isMatch,
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * Bulk weigh multiple shipment items with the same product
   *
   * This endpoint handles weighing all items with the same product at once, by:
   * 1. Finding all chosen items for this product in the shipment
   * 2. Distributing the weight proportionally based on each item's requested quantity
   * 3. Recording the weights for each item and its chosen product
   * 4. Updating all items to COMPLETED status
   */
  async bulkWeighShipmentItems(
    req: Request<Record<string, never>, unknown, ShipmentBulkWeighInput>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const auth = req.headers['x-auth'] as string;

      if (!auth || auth !== process.env.X_AUTH_KEY) {
        throw new CustomError({
          message: 'Tolong cek API Key kembali.',
          errorCode: 'TIDAK_DIIZINKAN',
          status: 401,
        });
      }

      const validated = await shipmentBulkWeighSchema.validateAsync(req.body);

      let performedById;

      if ((req as any).user) {
        performedById = (req as any).user.id;
      } else {
        const user = await userService.getUserByEmail('admin@example.com');
        performedById = user?.id;
      }

      // Check if shipment exists
      const shipment = await shipmentService.getShipmentById(validated.shipmentId);
      if (!shipment) {
        throw new CustomError({
          message: 'Pengiriman tidak ditemukan',
          errorCode: 'PENGIRIMAN_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      // Check if product exists
      const product = await productService.getProductById(validated.productId);
      if (!product) {
        throw new CustomError({
          message: 'Produk tidak ditemukan',
          errorCode: 'PRODUK_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      // Check if there are any items with this product that are in CHOSEN status
      const chosenItems = shipment.shipmentItems.filter(
        (item) => item.productId === validated.productId && item.status === 'CHOSEN',
      );

      if (chosenItems.length === 0) {
        throw new CustomError({
          message: 'Tidak ada item dipilih untuk produk ini dalam pengiriman',
          errorCode: 'TIDAK_ADA_ITEM_DIPILIH_UNTUK_PRODUK',
          status: 404,
        });
      }

      // Now proceed with bulk weighing the items
      const result = await shipmentService.bulkWeighShipmentItems(validated, performedById);

      // If the service returns null, it means no items were found
      if (!result) {
        throw new CustomError({
          message: 'Tidak ada item dipilih untuk produk ini dalam pengiriman',
          errorCode: 'TIDAK_ADA_ITEM_DIPILIH_UNTUK_PRODUK',
          status: 404,
        });
      }

      // Format the response to highlight the combined data
      res.status(200).json(
        success({
          product: result.product,
          shipment: result.shipment,
          weights: result.weights,
          status: result.status,
          locationType: result.locationType,
          weighedAt: result.weighedAt,
        }),
      );
    } catch (error) {
      next(error);
    }
  },
};
