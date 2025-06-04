import { SHIPMENT_ITEM_STATUS, STATUS } from '@prisma/client';
import prisma from '../config/prisma';
import {
  ShipmentChosenProductInput,
  ShipmentCreateInput,
  ShipmentItemUpdateInput,
  ShipmentUpdateInput,
  ShipmentWeighInput,
} from '../schemas/shipment';
import { SPMBCreateInput } from '../schemas/spmb';
import armadaService from './armadaService';
import shipmentLogService from './shipmentLogService';

/**
 * Service for handling shipment operations
 */
export default {
  /**
   * Get all shipments with pagination and search
   */
  async getAllShipments(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;

    const whereConditions: any = {
      deletedAt: null,
    };

    if (search) {
      whereConditions.OR = [
        {
          plateNumber: {
            contains: search,
          },
        },
        {
          internalNote: {
            contains: search,
          },
        },
        {
          armada: {
            model: {
              contains: search,
            },
          },
        },
        {
          armada: {
            plateNumber: {
              contains: search,
            },
          },
        },
      ];
    }

    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        where: whereConditions,
        include: {
          armada: {
            select: {
              id: true,
              model: true,
              plateNumber: true,
            },
          },
          shipmentItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  satuan: true,
                },
              },
              deliveryOrder: {
                select: {
                  id: true,
                  customer: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
              warehouse: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.shipment.count({
        where: whereConditions,
      }),
    ]);

    return {
      shipments,
      total,
    };
  },

  /**
   * Get archived shipments with pagination and search
   */
  async getArchivedShipments(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;

    const whereConditions: any = {
      NOT: {
        deletedAt: null,
      },
    };

    if (search) {
      whereConditions.OR = [
        {
          plateNumber: {
            contains: search,
          },
        },
        {
          internalNote: {
            contains: search,
          },
        },
        {
          armada: {
            model: {
              contains: search,
            },
          },
        },
        {
          armada: {
            plateNumber: {
              contains: search,
            },
          },
        },
      ];
    }

    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        where: whereConditions,
        include: {
          armada: {
            select: {
              id: true,
              model: true,
              plateNumber: true,
            },
          },
          shipmentItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  satuan: true,
                },
              },
              deliveryOrder: {
                select: {
                  id: true,
                  customer: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
              warehouse: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.shipment.count({
        where: whereConditions,
      }),
    ]);

    return {
      shipments,
      total,
    };
  },

  /**
   * Get a shipment by ID
   */
  async getShipmentById(id: string) {
    return prisma.shipment.findUnique({
      where: {
        id,
      },
      include: {
        armada: {
          select: {
            id: true,
            model: true,
            plateNumber: true,
          },
        },
        shipmentItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                satuan: true,
                warehouseId: true,
                warehouse: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            deliveryOrder: {
              select: {
                id: true,
                customerId: true,
                customer: {
                  select: {
                    id: true,
                    name: true,
                    address: true,
                  },
                },
              },
            },
            warehouse: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        spmbs: true,
      },
    });
  },

  /**
   * Create a new shipment with items
   */
  async createShipment(data: ShipmentCreateInput, performedById: string) {
    return prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      let plateNumberToUse = data.plateNumber;
      if (data.type === 'ANTAR' && data.armadaId) {
        const armada = await armadaService.getArmadaById(data.armadaId);
        if (armada?.plateNumber) {
          plateNumberToUse = armada.plateNumber;
        }
      }

      // Prepare shipment creation data
      const shipmentData: any = {
        type: data.type,
        internalNote: data.internalNote,
        plateNumber: plateNumberToUse,
        status: STATUS.PENDING,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      };

      // Only connect armada if armadaId is provided and not null
      if (data.armadaId) {
        shipmentData.armada = {
          connect: {
            id: data.armadaId,
          },
        };
      }

      // Create the shipment
      const shipment = await tx.shipment.create({
        data: shipmentData,
        include: {
          armada: true,
        },
      });

      // Get products to fetch warehouse IDs
      const productIds = [...new Set(data.items.map((item) => item.productId))];
      const products = await tx.product.findMany({
        where: {
          id: {
            in: productIds,
          },
        },
        select: {
          id: true,
          warehouseId: true,
        },
      });

      // Create shipment items
      const shipmentItems = [];
      for (const item of data.items) {
        // Get warehouseId from product
        const product = products.find((p) => p.id === item.productId);
        if (!product || !product.warehouseId) {
          throw new Error(`Product ${item.productId} does not have a warehouse assigned`);
        }

        const shipmentItem = await tx.shipmentItem.create({
          data: {
            shipmentId: shipment.id,
            deliveryOrderId: item.deliveryOrderId,
            productId: item.productId,
            requestedQuantity: item.requestedQuantity,
            status: SHIPMENT_ITEM_STATUS.PENDING,
            warehouseId: product.warehouseId,
            createdAt: jakartaTime,
            updatedAt: jakartaTime,
          },
          include: {
            product: {
              select: {
                name: true,
                satuan: true,
              },
            },
            deliveryOrder: {
              select: {
                customer: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            warehouse: {
              select: {
                name: true,
              },
            },
          },
        });

        shipmentItems.push(shipmentItem);
      }

      // Generate SPMB for each unique delivery order
      const uniqueDeliveryOrderIds = [...new Set(data.items.map((item) => item.deliveryOrderId))];
      const spmbs = [];

      for (const doId of uniqueDeliveryOrderIds) {
        // Generate a unique SPMB code
        const spmbCode = `SPMB-${Date.now()}-${doId.substring(0, 8)}`;

        const spmb = await tx.sPMB.create({
          data: {
            shipmentId: shipment.id,
            deliveryOrderId: doId,
            code: spmbCode,
            status: 'PENDING',
            createdAt: jakartaTime,
            updatedAt: jakartaTime,
          },
        });

        spmbs.push(spmb);
      }

      // Prepare complete shipment data with items for logging
      const shipmentWithItems = {
        ...shipment,
        shipmentItems,
        spmbs,
      };

      // Create log entry
      await shipmentLogService.logShipmentCreation(
        shipment.id,
        performedById,
        shipmentWithItems,
        tx,
      );

      return shipmentWithItems;
    });
  },

  /**
   * Update a shipment
   */
  async updateShipment(id: string, data: ShipmentUpdateInput, performedById: string) {
    return prisma.$transaction(async (tx) => {
      // Get the current shipment data before update
      const existingShipment = await tx.shipment.findUnique({
        where: {
          id,
        },
        include: {
          armada: true,
          shipmentItems: true,
        },
      });

      if (!existingShipment) {
        return null;
      }

      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Prepare update data
      const updateData: any = {
        ...data,
        updatedAt: jakartaTime,
      };

      if (data.armadaId === null || data.armadaId === undefined) {
        // Disconnect armada if null or undefined
        updateData.armada = {
          disconnect: true,
        };
      }

      // If this is a full update with items, make sure the shipment is in PENDING status
      if ('items' in data && Array.isArray(data.items)) {
        // Handle items update
        const items = data.items as unknown as ShipmentItemUpdateInput[];

        // First, get all existing shipment items to determine which to delete
        const existingItems = existingShipment.shipmentItems;
        const updatedItemIds = items
          .filter((item: any) => item.shipmentItemId)
          .map((item: any) => item.shipmentItemId);

        // Delete items that are not in the update
        const itemsToDelete = existingItems
          .filter((item) => !updatedItemIds.includes(item.id))
          .map((item) => item.id);

        if (itemsToDelete.length > 0) {
          await tx.shipmentItem.deleteMany({
            where: {
              id: {
                in: itemsToDelete,
              },
            },
          });
        }

        // Update existing items and create new ones
        for (const item of items) {
          if (item.shipmentItemId) {
            // Update existing item
            await tx.shipmentItem.update({
              where: {
                id: item.shipmentItemId,
              },
              data: {
                deliveryOrderId: item.deliveryOrderId,
                productId: item.productId,
                requestedQuantity: item.requestedQuantity,
                updatedAt: jakartaTime,
              },
            });
          } else {
            // Get warehouseId from product - product is validated in controller
            const product = await tx.product.findUnique({
              where: {
                id: item.productId,
              },
              select: {
                id: true,
                warehouseId: true,
              },
            });

            // Create new item with the warehouse ID from the product
            await tx.shipmentItem.create({
              data: {
                shipmentId: id,
                deliveryOrderId: item.deliveryOrderId,
                productId: item.productId,
                requestedQuantity: item.requestedQuantity,
                status: SHIPMENT_ITEM_STATUS.PENDING,
                warehouseId: product!.warehouseId!,
                createdAt: jakartaTime,
                updatedAt: jakartaTime,
              },
            });
          }
        }
      }

      // Update the shipment
      const updatedShipment = await tx.shipment.update({
        where: {
          id,
        },
        data: updateData,
        include: {
          armada: data.armadaId ? true : false,
          shipmentItems: {
            include: {
              product: {
                select: {
                  name: true,
                  satuan: true,
                },
              },
              deliveryOrder: {
                select: {
                  customer: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
              warehouse: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      // Prepare log data - only include changed fields
      const logOldData: Record<string, any> = {};
      const logNewData: Record<string, any> = {};

      // Compare fields and collect only what changed
      for (const key of Object.keys(data)) {
        // Only include fields that were in the update request
        if (
          key !== 'armadaId' && // We'll handle armada separately
          key in existingShipment &&
          key in updatedShipment &&
          existingShipment[key as keyof typeof existingShipment] !==
            updatedShipment[key as keyof typeof updatedShipment]
        ) {
          logOldData[key] = existingShipment[key as keyof typeof existingShipment];
          logNewData[key] = updatedShipment[key as keyof typeof updatedShipment];
        }
      }

      // Handle armada separately to capture relation changes
      if (existingShipment.armada?.id !== updatedShipment.armada?.id) {
        const oldArmada = existingShipment.armada;
        const newArmada = updatedShipment.armada;

        logOldData.armada = oldArmada
          ? {
            id: oldArmada.id,
            model: oldArmada.model,
            plateNumber: oldArmada.plateNumber,
          }
          : null;
        logNewData.armada = newArmada
          ? {
            id: newArmada.id,
            model: newArmada.model,
            plateNumber: newArmada.plateNumber,
          }
          : null;
      }

      // Log the update only if there are changes
      if (Object.keys(logNewData).length > 0) {
        await shipmentLogService.logShipmentUpdate(id, performedById, logOldData, logNewData, tx);
      }

      // If status changed, log separately
      if (data.status && existingShipment.status !== data.status) {
        await shipmentLogService.logShipmentStatusChange(
          id,
          performedById,
          existingShipment.status,
          data.status,
          tx,
        );
      }

      // If verification status changed, log separately
      if (data.isVerified === true && !existingShipment.isVerified) {
        await shipmentLogService.logShipmentVerification(
          id,
          performedById,
          existingShipment.plateNumber || 'Unknown',
          tx,
        );
      }

      return updatedShipment;
    });
  },

  /**
   * Delete a shipment (soft delete)
   */
  async deleteShipment(id: string, performedById: string) {
    return prisma.$transaction(async (tx) => {
      // Get the current shipment data before deletion
      const existingShipment = await tx.shipment.findUnique({
        where: {
          id,
        },
        include: {
          armada: true,
          shipmentItems: true,
        },
      });

      if (!existingShipment) {
        return null;
      }

      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Soft delete the shipment
      const deletedShipment = await tx.shipment.update({
        where: {
          id,
        },
        data: {
          deletedAt: jakartaTime,
        },
        include: {
          armada: true,
        },
      });

      // Log the deletion
      await shipmentLogService.logShipmentDeletion(id, performedById, existingShipment, tx);

      return deletedShipment;
    });
  },

  /**
   * Restore a deleted shipment
   */
  async restoreShipment(id: string, performedById: string) {
    return prisma.$transaction(async (tx) => {
      // Get the current shipment data before restoration
      const existingShipment = await tx.shipment.findUnique({
        where: {
          id,
        },
      });

      if (!existingShipment || !existingShipment.deletedAt) {
        return null;
      }

      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Restore the shipment
      const restoredShipment = await tx.shipment.update({
        where: {
          id,
        },
        data: {
          deletedAt: null,
          updatedAt: jakartaTime,
        },
        include: {
          armada: true,
          shipmentItems: {
            include: {
              product: {
                select: {
                  name: true,
                  satuan: true,
                },
              },
            },
          },
        },
      });

      // Log the restoration
      await shipmentLogService.logShipmentRestoration(id, performedById, restoredShipment, tx);

      return restoredShipment;
    });
  },

  /**
   * Process a shipment item (weigh and update status)
   */
  async weighShipmentItem(data: ShipmentWeighInput, performedById: string) {
    return prisma.$transaction(async (tx) => {
      // Get the current shipment item
      const existingItem = await tx.shipmentItem.findUnique({
        where: {
          id: data.shipmentItemId,
        },
        include: {
          shipment: true,
          deliveryOrder: true,
          product: {
            select: {
              id: true,
              name: true,
              satuan: true,
            },
          },
        },
      });

      if (!existingItem) {
        return null;
      }

      // Check if item is already being weighed or completed
      if (existingItem.status !== SHIPMENT_ITEM_STATUS.PENDING) {
        throw new Error(`Item is already ${existingItem.status.toLowerCase()}`);
      }

      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Update the shipment item status to WEIGHING
      await tx.shipmentItem.update({
        where: {
          id: data.shipmentItemId,
        },
        data: {
          status: SHIPMENT_ITEM_STATUS.WEIGHING,
          updatedAt: jakartaTime,
        },
      });

      // Update the shipment status to PROSES if it's currently PENDING
      if (existingItem.shipment.status === STATUS.PENDING) {
        await tx.shipment.update({
          where: {
            id: existingItem.shipmentId,
          },
          data: {
            status: STATUS.PROSES,
            updatedAt: jakartaTime,
          },
        });

        // Log shipment status change
        await shipmentLogService.logShipmentStatusChange(
          existingItem.shipmentId,
          performedById,
          STATUS.PENDING,
          STATUS.PROSES,
          tx,
        );
      }

      // Complete the weighing process
      const completedItem = await tx.shipmentItem.update({
        where: {
          id: data.shipmentItemId,
        },
        data: {
          weightedQuantity: data.weightedQuantity,
          status: SHIPMENT_ITEM_STATUS.COMPLETED,
          weighedAt: jakartaTime,
          updatedAt: jakartaTime,
        },
        include: {
          shipment: true,
          deliveryOrder: true,
          product: {
            select: {
              id: true,
              name: true,
              satuan: true,
            },
          },
        },
      });

      // Update the delivery order item quantities
      const deliveryOrderItem = await tx.deliveryOrderItem.findFirst({
        where: {
          deliveryOrderId: existingItem.deliveryOrderId,
          productId: existingItem.productId,
        },
      });

      if (deliveryOrderItem) {
        const processingQuantity = Math.min(
          deliveryOrderItem.pendingQuantity,
          Math.floor(data.weightedQuantity),
        );

        await tx.deliveryOrderItem.update({
          where: {
            id: deliveryOrderItem.id,
          },
          data: {
            pendingQuantity: deliveryOrderItem.pendingQuantity - processingQuantity,
            processingQuantity: deliveryOrderItem.processingQuantity + processingQuantity,
            updatedAt: jakartaTime,
          },
        });
      }

      return completedItem;
    });
  },

  /**
   * Verify a shipment and mark it as completed
   */
  async verifyShipment(id: string, platePhoto: string, performedById: string) {
    return prisma.$transaction(async (tx) => {
      // Get the current shipment data
      const existingShipment = await tx.shipment.findUnique({
        where: {
          id,
        },
      });

      if (!existingShipment) {
        return null;
      }

      // Check if all items are completed
      const pendingItems = await tx.shipmentItem.count({
        where: {
          shipmentId: id,
          status: {
            not: SHIPMENT_ITEM_STATUS.COMPLETED,
          },
        },
      });

      if (pendingItems > 0) {
        throw new Error('Cannot verify shipment: Some items are still pending');
      }

      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Verify the shipment
      const verifiedShipment = await tx.shipment.update({
        where: {
          id,
        },
        data: {
          platePhoto,
          isVerified: true,
          verifiedAt: jakartaTime,
          status: STATUS.SELESAI,
          updatedAt: jakartaTime,
        },
        include: {
          armada: true,
          shipmentItems: {
            include: {
              product: true,
              deliveryOrder: true,
            },
          },
        },
      });

      // Update all SPMB records to COMPLETED
      await tx.sPMB.updateMany({
        where: {
          shipmentId: id,
        },
        data: {
          status: 'COMPLETED',
          updatedAt: jakartaTime,
        },
      });

      // Get all related delivery orders
      const deliveryOrderIds = verifiedShipment.shipmentItems.map((item) => item.deliveryOrderId);
      const uniqueDeliveryOrderIds = [...new Set(deliveryOrderIds)];

      // Update each delivery order
      for (const doId of uniqueDeliveryOrderIds) {
        // Check if all items in this DO are completed
        const doItems = await tx.deliveryOrderItem.findMany({
          where: {
            deliveryOrderId: doId,
          },
        });

        // Only mark delivery order as completed if all items are completed
        const allItemsComplete = doItems.every((item) => item.pendingQuantity === 0);

        if (allItemsComplete) {
          await tx.deliveryOrder.update({
            where: {
              id: doId,
            },
            data: {
              status: STATUS.SELESAI,
              updatedAt: jakartaTime,
            },
          });

          // Update delivery order items to set completedQuantity
          for (const item of doItems) {
            await tx.deliveryOrderItem.update({
              where: {
                id: item.id,
              },
              data: {
                completedQuantity: item.processingQuantity,
                processingQuantity: 0,
                updatedAt: jakartaTime,
              },
            });
          }
        }
      }

      // Log verification
      await shipmentLogService.logShipmentVerification(
        id,
        performedById,
        existingShipment.plateNumber || 'Unknown',
        tx,
      );

      // Log status change
      await shipmentLogService.logShipmentStatusChange(
        id,
        performedById,
        existingShipment.status,
        STATUS.SELESAI,
        tx,
      );

      return verifiedShipment;
    });
  },

  /**
   * Get all available items for weighing in a shipment
   */
  async getAvailableItemsForWeighing(shipmentId: string) {
    return prisma.shipmentItem.findMany({
      where: {
        shipmentId,
        status: SHIPMENT_ITEM_STATUS.PENDING,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            satuan: true,
          },
        },
        deliveryOrder: {
          select: {
            id: true,
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  },

  /**
   * Create a new SPMB document
   */
  async createSPMB(data: SPMBCreateInput) {
    return prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Create the SPMB
      const spmb = await tx.sPMB.create({
        data: {
          shipmentId: data.shipmentId,
          deliveryOrderId: data.deliveryOrderId,
          code: data.code,
          documentPath: data.documentPath,
          createdAt: jakartaTime,
          updatedAt: jakartaTime,
        },
        include: {
          shipment: true,
          deliveryOrder: {
            include: {
              customer: true,
            },
          },
        },
      });

      return spmb;
    });
  },

  /**
   * Choose a product for a shipment
   */
  async chooseProductForShipment(data: ShipmentChosenProductInput) {
    return prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Check if the product is already chosen for this shipment
      const existingChosenProduct = await tx.shipmentChosenProduct.findFirst({
        where: {
          shipmentId: data.shipmentId,
          deliveryOrderId: data.deliveryOrderId,
          productId: data.productId,
        },
      });

      if (existingChosenProduct) {
        // Return the existing record if found
        return existingChosenProduct;
      }

      // Create a new chosen product record
      const chosenProduct = await tx.shipmentChosenProduct.create({
        data: {
          shipmentId: data.shipmentId,
          deliveryOrderId: data.deliveryOrderId,
          productId: data.productId,
          createdAt: jakartaTime,
          updatedAt: jakartaTime,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              satuan: true,
              warehouseId: true,
              warehouse: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          deliveryOrder: {
            select: {
              id: true,
              customerId: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                },
              },
            },
          },
        },
      });

      return chosenProduct;
    });
  },

  /**
   * Get all chosen products for a shipment
   */
  async getChosenProductsForShipment(shipmentId: string) {
    return prisma.shipmentChosenProduct.findMany({
      where: {
        shipmentId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            satuan: true,
            warehouseId: true,
            warehouse: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        deliveryOrder: {
          select: {
            id: true,
            customerId: true,
            customer: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  },

  /**
   * Delete a chosen product from a shipment
   */
  async deleteChosenProduct(shipmentId: string, productId: string) {
    return prisma.shipmentChosenProduct.deleteMany({
      where: {
        shipmentId,
        productId,
      },
    });
  },
};
