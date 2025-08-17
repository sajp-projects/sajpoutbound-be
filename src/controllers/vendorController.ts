import { WEIGHING_METHOD } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { customAlphabet } from 'nanoid';
import { CustomError } from '../middlewares/error';
import {
  ShipmentBulkWeighInput,
  shipmentBulkWeighSchema,
  shipmentIdSchema,
} from '../schemas/shipment';
import productService from '../services/productService';
import shipmentService from '../services/shipmentService';
import userService from '../services/userService';
import { success } from '../types/response';

export default {
  /**
   * Get all available items for weighing (vendor-only endpoint)
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

      // Get only vendor-marked items
      const shipments = await shipmentService.getVendorPendingShipments();

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
   * Get available items for weighing by shipment ID (vendor-only endpoint)
   */
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

      // Get only vendor-marked chosen products for this shipment
      const items =
        await shipmentService.getVendorAvailableItemsForWeighingByShipmentId(shipmentId);

      res.status(200).json(success(items));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Bulk weigh multiple shipment items with the same product (vendor-only endpoint)
   */
  async bulkWeighShipmentItems(
    req: Request<unknown, unknown, ShipmentBulkWeighInput>,
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

      // Use system user for vendor weighing
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

      // Validate that the chosen product is marked for vendor weighing
      const chosenProduct = await shipmentService.getShipmentChosenProduct(
        validated.shipmentId,
        validated.productId,
      );

      if (!chosenProduct) {
        throw new CustomError({
          message: 'Produk dipilih untuk pengiriman tidak ditemukan',
          errorCode: 'PRODUK_DIPILIH_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      if (chosenProduct.weighingMethod !== WEIGHING_METHOD.VENDOR) {
        throw new CustomError({
          message: 'Produk ini tidak ditandai untuk penimbangan vendor',
          errorCode: 'BUKAN_PRODUK_VENDOR',
          status: 400,
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

      const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);
      let code;
      let attempts = 0;
      const maxAttempts = 1000;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        code = nanoid();
        const existing = await shipmentService.getShipmentChosenProductByCode(code);
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

      // Now proceed with bulk weighing the items
      const result = await shipmentService.bulkWeighShipmentItems(validated, performedById, code);

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

  /**
   * Individual weigh a specific shipment item (vendor-only endpoint)
   */
  async individualWeighShipmentItem(
    req: Request<
      unknown,
      unknown,
      {
        shipmentItemId: string;
        grossWeight: number;
        netWeight?: number;
        tareWeight?: number;
      }
    >,
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

      const { shipmentItemId, grossWeight, netWeight, tareWeight } = req.body;

      // Validate required fields
      if (!shipmentItemId || !grossWeight) {
        throw new CustomError({
          message: 'ID item pengiriman dan berat kotor harus diisi',
          errorCode: 'DATA_TIDAK_LENGKAP',
          status: 400,
        });
      }

      if (grossWeight <= 0) {
        throw new CustomError({
          message: 'Berat kotor harus lebih dari 0',
          errorCode: 'BERAT_TIDAK_VALID',
          status: 400,
        });
      }

      // Get system user for vendor weighing
      let performedById;
      if ((req as any).user) {
        performedById = (req as any).user.id;
      } else {
        const user = await userService.getUserByEmail('jeffrey@gmail.com');
        performedById = user?.id;
      }

      // Get the shipment item and validate it's marked for vendor weighing
      const shipmentItem = await shipmentService.getShipmentItemById(shipmentItemId);

      if (!shipmentItem) {
        throw new CustomError({
          message: 'Item pengiriman tidak ditemukan',
          errorCode: 'ITEM_PENGIRIMAN_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      // Check if the item is in CHOSEN status
      if (shipmentItem.status !== 'CHOSEN') {
        throw new CustomError({
          message: 'Item pengiriman tidak dalam status yang dapat ditimbang',
          errorCode: 'STATUS_ITEM_TIDAK_SESUAI',
          status: 400,
        });
      }

      // Get the chosen product to check weighing method
      const chosenProduct = await shipmentService.getShipmentChosenProduct(
        shipmentItem.shipmentId,
        shipmentItem.productId,
      );

      if (!chosenProduct) {
        throw new CustomError({
          message: 'Produk dipilih untuk pengiriman tidak ditemukan',
          errorCode: 'PRODUK_DIPILIH_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      if (chosenProduct.weighingMethod !== WEIGHING_METHOD.VENDOR) {
        throw new CustomError({
          message: 'Item ini tidak ditandai untuk penimbangan vendor',
          errorCode: 'BUKAN_ITEM_VENDOR',
          status: 400,
        });
      }

      // Generate unique code for the weighing
      const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);
      let code;
      let attempts = 0;
      const maxAttempts = 1000;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        code = nanoid();
        const existing = await shipmentService.getShipmentChosenProductByCode(code);
        if (!existing) {
          break;
        }
        attempts++;

        if (attempts >= maxAttempts) {
          throw new CustomError({
            message: 'Terjadi kesalahan saat membuat kode penimbangan, harap coba lagi.',
            errorCode: 'DUPLIKASI_KODE_PENIMBANGAN',
            status: 500,
          });
        }
      }

      // Perform individual weighing
      const result = await shipmentService.individualWeighShipmentItem(
        shipmentItemId,
        {
          grossWeight,
          netWeight,
          tareWeight,
        },
        performedById,
        code,
      );

      if (!result) {
        throw new CustomError({
          message: 'Gagal melakukan penimbangan item',
          errorCode: 'GAGAL_PENIMBANGAN',
          status: 500,
        });
      }

      // Format the response
      res.status(200).json(
        success({
          shipmentItem: {
            id: result.shipmentItem.id,
            status: result.shipmentItem.status,
          },
          product: {
            id: result.product.id,
            name: result.product.name,
            satuan: result.product.satuan,
          },
          weights: {
            gross: result.weights.gross,
            net: result.weights.net,
            tare: result.weights.tare,
          },
          weighedAt: result.weighedAt,
        }),
      );
    } catch (error) {
      next(error);
    }
  },
};
