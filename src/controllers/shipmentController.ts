import {
  NextFunction, Request, Response, 
} from 'express';
import { CustomError } from '../middlewares/error';
import {
  createShipmentSchema,
  ShipmentCreateInput,
  shipmentIdSchema,
  ShipmentUpdateInput,
  ShipmentWeighInput,
  shipmentWeighSchema,
  updateShipmentSchema,
} from '../schemas/shipment';
import armadaService from '../services/armadaService';
import deliveryOrderService from '../services/deliveryOrderService';
import productService from '../services/productService';
import shipmentService from '../services/shipmentService';
import { success } from '../types/response';

export default {
  /**
   * Get all shipments with pagination and search
   */
  async getAllShipments(req: Request, res: Response, next: NextFunction) {
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

      const result = await shipmentService.getAllShipments(page, limit, search);

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
          message: 'Shipment not found',
          errorCode: 'SHIPMENT_NOT_FOUND',
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
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      // Validate armada if provided
      if (validated.armadaId) {
        const armada = await armadaService.getArmadaById(validated.armadaId);
        if (!armada) {
          throw new CustomError({
            message: 'Armada not found',
            errorCode: 'ARMADA_NOT_FOUND',
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
            message: 'One or more delivery orders not found',
            errorCode: 'DELIVERY_ORDER_NOT_FOUND',
            status: 404,
          });
        }

        // Validate products and get their warehouse IDs
        const products = await productService.getProductsByIds(productIds);
        if (products.length !== productIds.length) {
          throw new CustomError({
            message: 'One or more products not found',
            errorCode: 'PRODUCT_NOT_FOUND',
            status: 404,
          });
        }

        // Check if any product doesn't have a warehouse assigned
        const productsWithoutWarehouse = products.filter((product) => !product.warehouseId);
        if (productsWithoutWarehouse.length > 0) {
          throw new CustomError({
            message: `Products with IDs ${productsWithoutWarehouse.map((p) => p.id).join(', ')} don't have warehouses assigned`,
            errorCode: 'PRODUCT_WITHOUT_WAREHOUSE',
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
              message: `Product ${item.productId} not found in delivery order ${item.deliveryOrderId}`,
              errorCode: 'PRODUCT_NOT_IN_DO',
              status: 400,
            });
          }

          if (doItem.pendingQuantity < item.requestedQuantity) {
            throw new CustomError({
              message: `Not enough pending quantity for product ${item.productId} in delivery order ${item.deliveryOrderId}. Available: ${doItem.pendingQuantity}, Requested: ${item.requestedQuantity}`,
              errorCode: 'INSUFFICIENT_QUANTITY',
              status: 400,
            });
          }
        }
      }

      const shipment = await shipmentService.createShipment(validated, performedById);

      res.status(201).json(success(shipment));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update a shipment
   */
  async updateShipment(
    req: Request<{ id: string }, unknown, ShipmentUpdateInput>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;
      const validated = await updateShipmentSchema.validateAsync(req.body);

      await shipmentIdSchema.validateAsync({
        id,
      });

      const performedById = req.user?.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      // Validate armada if provided
      if (validated.armadaId) {
        const armada = await armadaService.getArmadaById(validated.armadaId);
        if (!armada) {
          throw new CustomError({
            message: 'Armada not found',
            errorCode: 'ARMADA_NOT_FOUND',
            status: 404,
          });
        }
      }

      const shipment = await shipmentService.updateShipment(id, validated, performedById);

      if (!shipment) {
        throw new CustomError({
          message: 'Shipment not found',
          errorCode: 'SHIPMENT_NOT_FOUND',
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
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      const shipment = await shipmentService.deleteShipment(id, performedById);

      if (!shipment) {
        throw new CustomError({
          message: 'Shipment not found',
          errorCode: 'SHIPMENT_NOT_FOUND',
          status: 404,
        });
      }

      res.status(200).json(success(shipment));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Restore a deleted shipment
   */
  async restoreShipment(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await shipmentIdSchema.validateAsync({
        id,
      });

      const performedById = req.user?.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      const shipment = await shipmentService.restoreShipment(id, performedById);

      if (!shipment) {
        throw new CustomError({
          message: 'Shipment not found or not deleted',
          errorCode: 'SHIPMENT_NOT_FOUND',
          status: 404,
        });
      }

      res.status(200).json(success(shipment));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all available items for weighing in a shipment
   */
  async getAvailableItemsForWeighing(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;

      await shipmentIdSchema.validateAsync({
        id,
      });

      const shipment = await shipmentService.getShipmentById(id);

      if (!shipment) {
        throw new CustomError({
          message: 'Shipment not found',
          errorCode: 'SHIPMENT_NOT_FOUND',
          status: 404,
        });
      }

      const items = await shipmentService.getAvailableItemsForWeighing(id);

      res.status(200).json(success(items));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Process a shipment item (weigh and update status)
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
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      const item = await shipmentService.weighShipmentItem(validated, performedById);

      if (!item) {
        throw new CustomError({
          message: 'Shipment item not found',
          errorCode: 'SHIPMENT_ITEM_NOT_FOUND',
          status: 404,
        });
      }

      res.status(200).json(success(item));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Verify a shipment and mark it as completed
   */
  async verifyShipment(
    req: Request<{ id: string }, unknown, { platePhoto: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;
      const { platePhoto } = req.body;

      await shipmentIdSchema.validateAsync({
        id,
      });

      if (!platePhoto) {
        throw new CustomError({
          message: 'Plate photo is required',
          errorCode: 'PLATE_PHOTO_REQUIRED',
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

      const shipment = await shipmentService.verifyShipment(id, platePhoto, performedById);

      if (!shipment) {
        throw new CustomError({
          message: 'Shipment not found',
          errorCode: 'SHIPMENT_NOT_FOUND',
          status: 404,
        });
      }

      res.status(200).json(success(shipment));
    } catch (error) {
      next(error);
    }
  },
};
