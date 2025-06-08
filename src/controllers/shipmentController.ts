import {
  NextFunction, Request, Response, 
} from 'express';
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
              message: 'One or more delivery orders not found',
              errorCode: 'DELIVERY_ORDER_NOT_FOUND',
              status: 404,
            });
          }

          // Validate products
          const products = await productService.getProductsByIds(productIds);
          if (products.length !== productIds.length) {
            throw new CustomError({
              message: 'One or more products not found',
              errorCode: 'PRODUCT_NOT_FOUND',
              status: 404,
            });
          }

          // Validate that products have warehouses assigned
          const productsWithoutWarehouse = products.filter((product) => !product.warehouseId);
          if (productsWithoutWarehouse.length > 0) {
            throw new CustomError({
              message: `Products with IDs ${productsWithoutWarehouse.map((p) => p.id).join(', ')} don't have warehouses assigned`,
              errorCode: 'PRODUCT_WITHOUT_WAREHOUSE',
              status: 400,
            });
          }

          // Get the current shipment to check status
          const shipment = await shipmentService.getShipmentById(id);
          if (!shipment) {
            throw new CustomError({
              message: 'Shipment not found',
              errorCode: 'SHIPMENT_NOT_FOUND',
              status: 404,
            });
          }

          if (shipment.status !== 'PENDING') {
            throw new CustomError({
              message: 'Cannot update shipment items when status is not PENDING',
              errorCode: 'INVALID_STATUS_FOR_ITEM_UPDATE',
              status: 400,
            });
          }
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
   *
   * Note: Items with the same product ID are combined for easier weighing.
   * These can be weighed at once using the bulk weighing endpoint.
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
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      // First, get the shipment item to check if it exists and validate its state
      const existingItem = await shipmentService.getShipmentItemById(validated.shipmentItemId);

      if (!existingItem) {
        throw new CustomError({
          message: 'Shipment item not found',
          errorCode: 'SHIPMENT_ITEM_NOT_FOUND',
          status: 404,
        });
      }

      // Check if item is in CHOSEN status
      if (existingItem.status !== 'CHOSEN') {
        throw new CustomError({
          message: 'You have not added this product for weighing',
          errorCode: 'INVALID_ITEM_STATUS',
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
          message: 'Shipment chosen product not found',
          errorCode: 'CHOSEN_PRODUCT_NOT_FOUND',
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
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      // Check if shipment exists
      const shipment = await shipmentService.getShipmentById(shipmentId);
      if (!shipment) {
        throw new CustomError({
          message: 'Shipment not found',
          errorCode: 'SHIPMENT_NOT_FOUND',
          status: 404,
        });
      }

      // Check if shipment is in valid status
      if (shipment.status !== 'PENDING') {
        throw new CustomError({
          message: 'Cannot choose products for shipment with non-PENDING status',
          errorCode: 'INVALID_SHIPMENT_STATUS',
          status: 400,
        });
      }

      // Check if product exists
      const product = await productService.getProductById(productId);
      if (!product) {
        throw new CustomError({
          message: 'Product not found',
          errorCode: 'PRODUCT_NOT_FOUND',
          status: 404,
        });
      }

      // Check if product is already chosen for this shipment
      const existingChosenProducts = await shipmentService.getChosenProductsForShipment(shipmentId);
      const isDuplicate =
        existingChosenProducts?.some((item) => item?.productId === productId) || false;

      if (isDuplicate) {
        throw new CustomError({
          message: 'This product is already chosen for this shipment',
          errorCode: 'DUPLICATE_PRODUCT',
          status: 400,
        });
      }

      // Check if there are any pending shipment items for this product
      const pendingItems = shipment.shipmentItems.filter(
        (item) => item.productId === productId && item.status === 'PENDING',
      );

      if (pendingItems.length <= 0) {
        throw new CustomError({
          message: 'No pending shipment items found for this product',
          errorCode: 'NO_PENDING_ITEMS',
          status: 400,
        });
      }

      const chosenProduct = await shipmentService.chooseProductForShipment(data);

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
          message: 'Shipment not found',
          errorCode: 'SHIPMENT_NOT_FOUND',
          status: 404,
        });
      }

      // Get chosen products - these are already combined by product ID
      const chosenProducts = await shipmentService.getChosenProductsForShipment(shipmentId);

      res.status(200).json(
        success({
          note: 'Products are combined by product ID. Each product has a single weighing record that represents the total weight for that product across all delivery orders.',
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
          message: 'Shipment not found',
          errorCode: 'SHIPMENT_NOT_FOUND',
          status: 404,
        });
      }

      // Check if shipment is in valid status
      if (shipment.status !== 'PENDING') {
        throw new CustomError({
          message: 'Cannot remove products from shipment with non-PENDING status',
          errorCode: 'INVALID_SHIPMENT_STATUS',
          status: 400,
        });
      }

      // Delete chosen product
      await shipmentService.deleteChosenProduct(shipmentId, productId);

      res.status(200).json(
        success({
          message: 'Product removed from shipment',
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
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      // Check if shipment exists and validate item status
      const incompleteItems = await shipmentService.validateAllItemsComplete(id);

      if (incompleteItems === false) {
        throw new CustomError({
          message: 'Shipment not found',
          errorCode: 'SHIPMENT_NOT_FOUND',
          status: 404,
        });
      }

      if (incompleteItems !== null && incompleteItems.length > 0) {
        throw new CustomError({
          message: 'All shipment items must be completed before uploading plate photo',
          errorCode: 'INCOMPLETE_ITEMS',
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
            message: 'Shipment not found',
            errorCode: 'SHIPMENT_NOT_FOUND',
            status: 404,
          });
        }

        res.status(200).json(success(shipment));
      } catch (uploadError: any) {
        throw new CustomError({
          message: uploadError.message || 'Error uploading plate photo',
          errorCode: 'UPLOAD_ERROR',
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
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      // Check if shipment exists and validate item status
      const incompleteItems = await shipmentService.validateAllItemsComplete(id);

      if (incompleteItems === false) {
        throw new CustomError({
          message: 'Shipment not found',
          errorCode: 'SHIPMENT_NOT_FOUND',
          status: 404,
        });
      }

      if (incompleteItems !== null && incompleteItems.length > 0) {
        throw new CustomError({
          message: 'All shipment items must be completed before verifying plate number',
          errorCode: 'INCOMPLETE_ITEMS',
          status: 400,
        });
      }

      // Check if shipment exists and has plate photo
      const existingShipment = await shipmentService.getShipmentById(id);

      if (!existingShipment) {
        throw new CustomError({
          message: 'Shipment not found',
          errorCode: 'SHIPMENT_NOT_FOUND',
          status: 404,
        });
      }

      // Verify that plate number and photo exist
      if (!existingShipment.plateNumber && !existingShipment.armada?.plateNumber) {
        throw new CustomError({
          message: 'Shipment must have a plate number before verification',
          errorCode: 'PLATE_NUMBER_REQUIRED',
          status: 400,
        });
      }

      if (!existingShipment.platePhoto) {
        throw new CustomError({
          message: 'Plate photo must be uploaded before verification',
          errorCode: 'PLATE_PHOTO_REQUIRED',
          status: 400,
        });
      }

      // Get the expected plate number from either the shipment or its armada
      const expectedPlateNumber =
        existingShipment.plateNumber || existingShipment.armada?.plateNumber;

      // Get the absolute path to the uploaded plate photo
      const platePhotoRelativePath = existingShipment.platePhoto;
      const platePhotoAbsolutePath = path.join(
        process.cwd(),
        'src',
        'public',
        platePhotoRelativePath,
      );

      // Use Gemini AI to extract plate number from the photo
      const extractedPlateNumber =
        await geminiAiService.extractPlateNumberFromImage(platePhotoAbsolutePath);

      // If no plate number could be extracted
      if (!extractedPlateNumber) {
        throw new CustomError({
          message:
            'Failed to extract plate number from photo. Please ensure the plate is clearly visible.',
          errorCode: 'PLATE_EXTRACTION_FAILED',
          status: 400,
        });
      }

      // Compare the extracted plate number with the expected plate number
      const isMatch = geminiAiService.comparePlateNumbers(
        extractedPlateNumber,
        expectedPlateNumber as string,
      );

      if (!isMatch) {
        res.status(200).json(
          success({
            message: `Plate number in photo (${extractedPlateNumber}) does not match the registered plate number (${expectedPlateNumber})`,
            errorCode: 'PLATE_MISMATCH',
            status: 400,
          }),
        );
        return;
      }

      // If we get here, the plate numbers match, so proceed with verification
      const shipment = await shipmentService.verifyPlateNumberAndPhoto(id, performedById);

      res.status(200).json(
        success({
          ...shipment,
          plateVerification: {
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
      const validated = await shipmentBulkWeighSchema.validateAsync(req.body);

      const performedById = req.user?.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      // Check if shipment exists
      const shipment = await shipmentService.getShipmentById(validated.shipmentId);
      if (!shipment) {
        throw new CustomError({
          message: 'Shipment not found',
          errorCode: 'SHIPMENT_NOT_FOUND',
          status: 404,
        });
      }

      // Check if product exists
      const product = await productService.getProductById(validated.productId);
      if (!product) {
        throw new CustomError({
          message: 'Product not found',
          errorCode: 'PRODUCT_NOT_FOUND',
          status: 404,
        });
      }

      // Check if there are any items with this product that are in CHOSEN status
      const chosenItems = shipment.shipmentItems.filter(
        (item) => item.productId === validated.productId && item.status === 'CHOSEN',
      );

      if (chosenItems.length === 0) {
        throw new CustomError({
          message: 'No chosen items found for this product in the shipment',
          errorCode: 'NO_CHOSEN_ITEMS',
          status: 404,
        });
      }

      // Now proceed with bulk weighing the items
      const result = await shipmentService.bulkWeighShipmentItems(validated, performedById);

      // If the service returns null, it means no items were found
      if (!result) {
        throw new CustomError({
          message: 'No chosen items found for this product in the shipment',
          errorCode: 'NO_CHOSEN_ITEMS',
          status: 404,
        });
      }

      // Format the response to highlight the combined data
      res.status(200).json(
        success({
          note:
            'The product has been weighed once with a total weight of ' +
            validated.grossWeight +
            '. For inventory purposes, this weight is distributed proportionally across delivery orders, ' +
            'but only one weighing record is stored to avoid confusion.',
          combinedData: {
            product: result.product,
            shipment: result.shipment,
            totalRequestedQuantity: result.totalRequestedQuantity,
            totalWeightedQuantity: result.totalWeightedQuantity,
            deliveryOrders: result.deliveryOrders,
            customers: result.customers,
            weights: result.weights,
            status: result.status,
            locationType: result.locationType,
            weighedAt: result.weighedAt,
          },
          // Keep the individual items data for reference if needed
          individualItems: result.individualItems,
        }),
      );
    } catch (error) {
      next(error);
    }
  },
};
