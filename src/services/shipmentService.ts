import { SHIPMENT_ITEM_STATUS, SHIPMENT_TYPE, STATUS } from '@prisma/client';
import { customAlphabet } from 'nanoid';
import prisma from '../config/prisma';
import {
  ShipmentBulkWeighInput,
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
  async getAllShipments(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: STATUS,
    type?: SHIPMENT_TYPE,
  ) {
    const skip = (page - 1) * limit;

    const whereConditions: any = {
      deletedAt: null,
    };

    if (status) {
      whereConditions.status = status;
    }

    if (type) {
      whereConditions.type = type;
    }

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
          shipmentNumber: {
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
    const shipment = await prisma.shipment.findUnique({
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
        spmbs: {
          include: {
            deliveryOrder: {
              select: {
                doNumber: true,
              },
            },
          },
        },
      },
    });

    if (!shipment) return null;

    // Collect all (deliveryOrderId, productId) pairs
    const doProductPairs = shipment.shipmentItems.map((item) => ({
      deliveryOrderId: item.deliveryOrderId,
      productId: item.productId,
    }));

    // Remove duplicates
    const uniquePairs = Array.from(
      new Set(doProductPairs.map((p) => p.deliveryOrderId + '-' + p.productId)),
    ).map((key) => {
      const [deliveryOrderId, productId] = key.split('-');
      return {
        deliveryOrderId,
        productId,
      };
    });

    // Fetch all relevant DeliveryOrderItems
    const doItems = await prisma.deliveryOrderItem.findMany({
      where: {
        OR: uniquePairs.map((pair) => ({
          deliveryOrderId: pair.deliveryOrderId,
          productId: pair.productId,
        })),
      },
      select: {
        deliveryOrderId: true,
        productId: true,
        quantity: true,
      },
    });

    // Attach originalDOQuantity to each shipmentItem
    shipment.shipmentItems = shipment.shipmentItems.map((item) => {
      const doItem = doItems.find(
        (d) => d.deliveryOrderId === item.deliveryOrderId && d.productId === item.productId,
      );
      return {
        ...item,
        originalDOQuantity: doItem ? doItem.quantity : null,
      };
    });

    return shipment;
  },

  /**
   * Get shipment with items and check if all items are complete
   */
  async getShipmentWithItems(id: string) {
    return prisma.shipment.findUnique({
      where: {
        id,
      },
      include: {
        armada: true,
        shipmentItems: true,
      },
    });
  },

  /**
   * Validate that all shipment items are in COMPLETED status
   * Returns null if all items are complete, otherwise returns an array of incomplete items
   * Returns false if shipment not found
   */
  async validateAllItemsComplete(shipmentId: string) {
    const shipment = await this.getShipmentWithItems(shipmentId);

    if (!shipment) {
      return false;
    }

    const pendingItems = shipment.shipmentItems.filter((item) => item.status !== 'COMPLETED');

    return pendingItems.length > 0 ? pendingItems : null;
  },

  /**
   * Get a shipment item by ID with related data
   */
  async getShipmentItemById(shipmentItemId: string) {
    return prisma.shipmentItem.findUnique({
      where: {
        id: shipmentItemId,
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
  },

  /**
   * Get a specific chosen product for a shipment
   */
  async getShipmentChosenProduct(shipmentId: string, productId: string) {
    const chosenProduct = await prisma.shipmentChosenProduct.findFirst({
      where: {
        shipmentId,
        productId,
      },
      include: {
        weighings: true,
      },
    });

    if (!chosenProduct) {
      return null;
    }

    // Get product details
    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
      include: {
        warehouse: true,
      },
    });

    if (!product) {
      return null;
    }

    // Get all delivery orders for this product in this shipment
    const shipmentItems = await prisma.shipmentItem.findMany({
      where: {
        shipmentId,
        productId,
        chosenProduct: true,
      },
      include: {
        deliveryOrder: {
          include: {
            customer: true,
          },
        },
      },
    });

    // Extract unique delivery orders and customers
    const deliveryOrders: any[] = [];
    const customers: any[] = [];

    for (const item of shipmentItems) {
      const existingDO = deliveryOrders.find((d) => d.id === item.deliveryOrder.id);
      if (!existingDO) {
        deliveryOrders.push(item.deliveryOrder);

        if (
          item.deliveryOrder.customer &&
          !customers.some((c) => c.id === item.deliveryOrder.customer.id)
        ) {
          customers.push(item.deliveryOrder.customer);
        }
      }
    }

    // Build combined result
    return {
      id: chosenProduct.id,
      shipmentId,
      productId,
      product,
      deliveryOrders,
      customers,
      weighings: chosenProduct.weighings,
      createdAt: chosenProduct.createdAt,
      updatedAt: chosenProduct.updatedAt,
    };
  },

  /**
   * Create a new shipment with items
   */
  async createShipment(data: ShipmentCreateInput, performedById: string, shipmentNumber: string) {
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
        data: {
          ...shipmentData,
          shipmentNumber,
        },
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
        if (!product || !product.warehouseId) continue;

        const shipmentItem = await tx.shipmentItem.create({
          data: {
            shipmentId: shipment.id,
            deliveryOrderId: item.deliveryOrderId,
            productId: item.productId,
            requestedQuantity: item.requestedQuantity,
            locationType: item.locationType,
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

        // Update delivery order item quantities
        const deliveryOrderItem = await tx.deliveryOrderItem.findFirst({
          where: {
            deliveryOrderId: item.deliveryOrderId,
            productId: item.productId,
          },
        });

        if (deliveryOrderItem) {
          const processingQuantity = Math.min(
            deliveryOrderItem.pendingQuantity,
            item.requestedQuantity,
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

          await tx.deliveryOrder.update({
            where: {
              id: item.deliveryOrderId,
            },
            data: {
              status: STATUS.PROSES,
            },
          });
        }
      }

      // Generate SPMB for each unique delivery order
      const uniqueDeliveryOrderIds = [...new Set(data.items.map((item) => item.deliveryOrderId))];
      const spmbs = [];

      for (const doId of uniqueDeliveryOrderIds) {
        // Generate a unique SPMB code
        const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);
        const spmbCode = `SPMB-${nanoid()}`;

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

      // Remove armadaId and items from direct update as Prisma doesn't allow it
      if ('armadaId' in updateData) {
        delete updateData.armadaId;
      }
      if ('items' in updateData) {
        delete updateData.items;
      }

      if (data.armadaId === null || data.armadaId === undefined || data.armadaId === '') {
        updateData.armada = {
          disconnect: true,
        };
      } else if (data.armadaId) {
        updateData.armada = {
          connect: {
            id: data.armadaId,
          },
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

        // Delete items that are not in the update (only PENDING items can be deleted)
        const itemsToDelete = existingItems
          .filter((item) => !updatedItemIds.includes(item.id) && item.status === 'PENDING')
          .map((item) => item.id);

        // Get the items to delete for quantity restoration
        const itemsToDeleteData = existingItems.filter((item) => itemsToDelete.includes(item.id));

        if (itemsToDelete.length > 0) {
          // First, restore quantities to delivery orders
          for (const item of itemsToDeleteData) {
            const deliveryOrderItem = await tx.deliveryOrderItem.findFirst({
              where: {
                deliveryOrderId: item.deliveryOrderId,
                productId: item.productId,
              },
            });

            if (deliveryOrderItem) {
              await tx.deliveryOrderItem.update({
                where: {
                  id: deliveryOrderItem.id,
                },
                data: {
                  processingQuantity: deliveryOrderItem.processingQuantity - item.requestedQuantity,
                  pendingQuantity: deliveryOrderItem.pendingQuantity + item.requestedQuantity,
                  updatedAt: jakartaTime,
                },
              });
            }
          }

          // Then delete the items
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
          console.log('Processing shipment item:', item);
          if (item.shipmentItemId) {
            // Check if the shipment item actually exists
            const existingItem = existingItems.find((ei) => ei.id === item.shipmentItemId);
            if (existingItem) {
              // Check if requestedQuantity changed
              if (item.requestedQuantity !== existingItem.requestedQuantity) {
                // Find the related deliveryOrderItem
                const deliveryOrderItem = await tx.deliveryOrderItem.findFirst({
                  where: {
                    deliveryOrderId: item.deliveryOrderId,
                    productId: item.productId,
                  },
                });
                if (deliveryOrderItem) {
                  const diff = item.requestedQuantity - existingItem.requestedQuantity;

                  if (diff < 0) {
                    // Quantity decreased: move from processing to pending
                    await tx.deliveryOrderItem.update({
                      where: {
                        id: deliveryOrderItem.id,
                      },
                      data: {
                        processingQuantity: deliveryOrderItem.processingQuantity + diff, // diff is negative
                        pendingQuantity: deliveryOrderItem.pendingQuantity - diff, // -diff is positive
                        updatedAt: jakartaTime,
                      },
                    });
                  } else if (diff > 0) {
                    // Quantity increased: move from pending to processing (if enough pending)
                    if (deliveryOrderItem.pendingQuantity >= diff) {
                      await tx.deliveryOrderItem.update({
                        where: {
                          id: deliveryOrderItem.id,
                        },
                        data: {
                          processingQuantity: deliveryOrderItem.processingQuantity + diff,
                          pendingQuantity: deliveryOrderItem.pendingQuantity - diff,
                          updatedAt: jakartaTime,
                        },
                      });
                    } else {
                      // Not enough pending quantity, throw error
                      throw new Error(
                        'Not enough pending quantity in DO to increase shipment item quantity',
                      );
                    }
                  }
                }
              }

              // Update existing item
              await tx.shipmentItem.update({
                where: {
                  id: item.shipmentItemId,
                },
                data: {
                  deliveryOrderId: item.deliveryOrderId,
                  productId: item.productId,
                  requestedQuantity: item.requestedQuantity,
                  locationType: item.locationType,
                  updatedAt: jakartaTime,
                },
              });
            } else {
              // shipmentItemId provided but item doesn't exist, treat as new item

              const product = await tx.product.findUnique({
                where: {
                  id: item.productId,
                },
                select: {
                  id: true,
                  warehouseId: true,
                },
              });

              if (!product || !product.warehouseId) {
                throw new Error(`Product ${item.productId} not found or has no warehouse assigned`);
              }

              // Find the related deliveryOrderItem to update quantities
              const deliveryOrderItem = await tx.deliveryOrderItem.findFirst({
                where: {
                  deliveryOrderId: item.deliveryOrderId,
                  productId: item.productId,
                },
              });

              if (deliveryOrderItem) {
                // Check if there's enough pending quantity
                if (deliveryOrderItem.pendingQuantity >= item.requestedQuantity) {
                  await tx.deliveryOrderItem.update({
                    where: {
                      id: deliveryOrderItem.id,
                    },
                    data: {
                      processingQuantity:
                        deliveryOrderItem.processingQuantity + item.requestedQuantity,
                      pendingQuantity: deliveryOrderItem.pendingQuantity - item.requestedQuantity,
                      updatedAt: jakartaTime,
                    },
                  });
                } else {
                  throw new Error(
                    `Not enough pending quantity for product ${item.productId} in DO ${item.deliveryOrderId}. Available: ${deliveryOrderItem.pendingQuantity}, Requested: ${item.requestedQuantity}`,
                  );
                }
              }

              // Create new item
              await tx.shipmentItem.create({
                data: {
                  shipmentId: id,
                  deliveryOrderId: item.deliveryOrderId,
                  productId: item.productId,
                  requestedQuantity: item.requestedQuantity,
                  locationType: item.locationType,
                  status: SHIPMENT_ITEM_STATUS.PENDING,
                  warehouseId: product.warehouseId,
                  createdAt: jakartaTime,
                  updatedAt: jakartaTime,
                },
              });
            }
          } else {
            // No shipmentItemId provided, create new item
            const product = await tx.product.findUnique({
              where: {
                id: item.productId,
              },
              select: {
                id: true,
                warehouseId: true,
              },
            });

            if (!product || !product.warehouseId) {
              throw new Error(`Product ${item.productId} not found or has no warehouse assigned`);
            }

            // Find the related deliveryOrderItem to update quantities
            const deliveryOrderItem = await tx.deliveryOrderItem.findFirst({
              where: {
                deliveryOrderId: item.deliveryOrderId,
                productId: item.productId,
              },
            });

            if (deliveryOrderItem) {
              // Check if there's enough pending quantity
              if (deliveryOrderItem.pendingQuantity >= item.requestedQuantity) {
                await tx.deliveryOrderItem.update({
                  where: {
                    id: deliveryOrderItem.id,
                  },
                  data: {
                    processingQuantity:
                      deliveryOrderItem.processingQuantity + item.requestedQuantity,
                    pendingQuantity: deliveryOrderItem.pendingQuantity - item.requestedQuantity,
                    updatedAt: jakartaTime,
                  },
                });
              } else {
                throw new Error(
                  `Not enough pending quantity for product ${item.productId} in DO ${item.deliveryOrderId}. Available: ${deliveryOrderItem.pendingQuantity}, Requested: ${item.requestedQuantity}`,
                );
              }
            }

            // Create new item with the warehouse ID from the product
            await tx.shipmentItem.create({
              data: {
                shipmentId: id,
                deliveryOrderId: item.deliveryOrderId,
                productId: item.productId,
                requestedQuantity: item.requestedQuantity,
                locationType: item.locationType,
                status: SHIPMENT_ITEM_STATUS.PENDING,
                warehouseId: product.warehouseId,
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
  async deleteShipment(id: string, performedById: string, existingShipment: any) {
    return prisma.$transaction(async (tx) => {
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

      // --- Begin revert logic ---
      // Fetch all shipment items for this shipment
      const shipmentItems = await tx.shipmentItem.findMany({
        where: {
          shipmentId: id,
        },
      });

      // Track affected delivery orders
      const affectedDOIds = new Set<string>();

      for (const item of shipmentItems) {
        // Update the related DeliveryOrderItem
        const deliveryOrderItem = await tx.deliveryOrderItem.findFirst({
          where: {
            deliveryOrderId: item.deliveryOrderId,
            productId: item.productId,
          },
        });
        if (deliveryOrderItem) {
          await tx.deliveryOrderItem.update({
            where: {
              id: deliveryOrderItem.id,
            },
            data: {
              processingQuantity: deliveryOrderItem.processingQuantity - item.requestedQuantity,
              pendingQuantity: deliveryOrderItem.pendingQuantity + item.requestedQuantity,
            },
          });
          affectedDOIds.add(item.deliveryOrderId);
        }
      }

      // For each affected delivery order, check if all items have processingQuantity == 0
      for (const doId of affectedDOIds) {
        const doItems = await tx.deliveryOrderItem.findMany({
          where: {
            deliveryOrderId: doId,
          },
        });
        if (doItems.every((d) => d.processingQuantity === 0)) {
          await tx.deliveryOrder.update({
            where: {
              id: doId,
            },
            data: {
              status: STATUS.PENDING,
            },
          });
        }
      }
      // --- End revert logic ---

      return deletedShipment;
    });
  },

  /**
   * Process a shipment item (weigh and update status)
   */
  async weighShipmentItem(
    data: ShipmentWeighInput,
    performedById: string,
    existingItem: any,
    shipmentChosenProduct: any,
  ) {
    return prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)a
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

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

      const completedItem = await tx.shipmentItem.update({
        where: {
          id: data.shipmentItemId,
        },
        data: {
          weightedQuantity: data.grossWeight,
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

      // Create shipment chosen product weighing record
      await tx.shipmentChosenProductWeighing.create({
        data: {
          shipmentChosenProductId: shipmentChosenProduct.id,
          grossWeight: data.grossWeight,
          netWeight: data.netWeight || 0,
          tareWeight: data.tareWeight || 0,
          createdAt: jakartaTime,
          updatedAt: jakartaTime,
        },
      });

      return completedItem;
    });
  },

  /**
   * Get all available items for weighing in a shipment
   */
  async getAvailableItemsForWeighing() {
    // Get all items from the database
    const items = await prisma.shipmentItem.findMany({
      where: {
        status: SHIPMENT_ITEM_STATUS.CHOSEN,
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

    // Create a map to group items by product ID
    const productMap = new Map();

    // Process each item and combine those with the same product ID
    for (const item of items) {
      const productId = item.product.id;

      if (!productMap.has(productId)) {
        productMap.set(productId, {
          shipmentId: item.shipmentId,
          product: item.product,
          warehouse: item.warehouse,
          // Create arrays to track all related delivery orders and their info
          deliveryOrders: [item.deliveryOrder],
          requestedQuantity: item.requestedQuantity,
          // Track all shipment item IDs for reference if needed
          shipmentItemIds: [item.id],
        });
      } else {
        // Product already exists in our map, update the entry
        const existingItem = productMap.get(productId);

        // Add to the total quantity
        existingItem.requestedQuantity += item.requestedQuantity;

        // Add this item's ID to the list
        existingItem.shipmentItemIds.push(item.id);

        // Add this delivery order if it's not already included
        // Define type for the delivery order object
        const doExists = existingItem.deliveryOrders.some(
          (do1: { id: string; customer?: { id: string; name: string } }) =>
            do1.id === item.deliveryOrder.id,
        );

        if (!doExists) {
          existingItem.deliveryOrders.push(item.deliveryOrder);
        }
      }
    }

    // Convert the map back to an array, but only include products that are not already chosen
    const combinedItems = Array.from(productMap.values());

    return {
      availableItems: combinedItems,
    };
  },

  async getAvailableItemsForWeighingByShipmentId(shipmentId: string) {
    const items = await prisma.shipmentItem.findMany({
      where: {
        status: SHIPMENT_ITEM_STATUS.CHOSEN,
        shipmentId,
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

    // Create a map to group items by product ID
    const productMap = new Map();

    // Process each item and combine those with the same product ID
    for (const item of items) {
      const productId = item.product.id;

      if (!productMap.has(productId)) {
        productMap.set(productId, {
          shipmentId: item.shipmentId,
          product: item.product,
          warehouse: item.warehouse,
          // Create arrays to track all related delivery orders and their info
          deliveryOrders: [item.deliveryOrder],
          requestedQuantity: item.requestedQuantity,
          // Track all shipment item IDs for reference if needed
          shipmentItemIds: [item.id],
        });
      } else {
        // Product already exists in our map, update the entry
        const existingItem = productMap.get(productId);

        // Add to the total quantity
        existingItem.requestedQuantity += item.requestedQuantity;

        // Add this item's ID to the list
        existingItem.shipmentItemIds.push(item.id);

        // Add this delivery order if it's not already included
        // Define type for the delivery order object
        const doExists = existingItem.deliveryOrders.some(
          (do1: { id: string; customer?: { id: string; name: string } }) =>
            do1.id === item.deliveryOrder.id,
        );

        if (!doExists) {
          existingItem.deliveryOrders.push(item.deliveryOrder);
        }
      }
    }

    // Convert the map back to an array, but only include products that are not already chosen
    const combinedItems = Array.from(productMap.values());

    return {
      availableItems: combinedItems,
    };
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
  async chooseProductForShipment(data: ShipmentChosenProductInput, product: any) {
    return prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Find all matching shipment items with this product
      const shipmentItems = await tx.shipmentItem.findMany({
        where: {
          shipmentId: data.shipmentId,
          productId: data.productId,
          status: SHIPMENT_ITEM_STATUS.PENDING, // Only update PENDING items
        },
        include: {
          deliveryOrder: true,
          product: {
            select: {
              id: true,
              name: true,
              satuan: true,
              warehouseId: true,
              warehouse: true,
            },
          },
        },
      });

      // If items found, update each one to chosen status
      if (shipmentItems.length > 0) {
        // Update each shipment item to mark it as chosen
        for (const item of shipmentItems) {
          await tx.shipmentItem.update({
            where: {
              id: item.id,
            },
            data: {
              status: SHIPMENT_ITEM_STATUS.CHOSEN, // Update status to CHOSEN
              chosenProduct: true,
              updatedAt: jakartaTime,
            },
          });
        }

        // Check if a chosen product record already exists for this product
        const existingChosen = await tx.shipmentChosenProduct.findFirst({
          where: {
            shipmentId: data.shipmentId,
            productId: data.productId,
          },
        });

        // Only create if it doesn't exist yet
        if (!existingChosen) {
          await tx.shipmentChosenProduct.create({
            data: {
              shipmentId: data.shipmentId,
              productId: data.productId,
              createdAt: jakartaTime,
              updatedAt: jakartaTime,
            },
          });
        }
      }

      // Get all delivery orders related to this product in this shipment
      const deliveryOrders = await tx.deliveryOrder.findMany({
        where: {
          shipmentItems: {
            some: {
              shipmentId: data.shipmentId,
              productId: data.productId,
              chosenProduct: true,
            },
          },
        },
        include: {
          customer: true,
        },
      });

      // Get the chosen product record
      const chosenProduct = await tx.shipmentChosenProduct.findFirst({
        where: {
          shipmentId: data.shipmentId,
          productId: data.productId,
        },
        include: {
          weighings: true,
        },
      });

      // If we don't have a product or chosen product record, something went wrong
      if (!product || !chosenProduct) {
        return null;
      }

      // Build a combined response
      const result = {
        id: chosenProduct.id,
        shipmentId: data.shipmentId,
        productId: data.productId,
        product: {
          id: product.id,
          name: product.name,
          satuan: product.satuan,
          warehouseId: product.warehouseId,
          warehouse: product.warehouse,
        },
        deliveryOrders,
        customers: deliveryOrders.map((d) => d.customer).filter(Boolean),
        weighings: chosenProduct.weighings,
        createdAt: chosenProduct.createdAt,
        updatedAt: chosenProduct.updatedAt,
      };

      return result;
    });
  },

  /**
   * Get all chosen products for a shipment
   */
  async getChosenProductsForShipment(shipmentId: string) {
    // Get all chosen products for this shipment
    const chosenProducts = await prisma.shipmentChosenProduct.findMany({
      where: {
        shipmentId,
      },
      include: {
        weighings: {
          select: {
            id: true,
            grossWeight: true,
            netWeight: true,
            tareWeight: true,
          },
        },
      },
    });

    // For each chosen product, get additional details
    const result = await Promise.all(
      chosenProducts.map(async (chosenProduct) => {
        // Get product details
        const product = await prisma.product.findUnique({
          where: {
            id: chosenProduct.productId,
          },
          include: {
            warehouse: true,
          },
        });

        if (!product) {
          return null; // Skip if product not found
        }

        // Get all delivery orders for this product in this shipment
        const shipmentItems = await prisma.shipmentItem.findMany({
          where: {
            shipmentId,
            productId: chosenProduct.productId,
            chosenProduct: true,
          },
          include: {
            deliveryOrder: {
              include: {
                customer: true,
              },
            },
          },
        });

        // Extract unique delivery orders and customers
        type DeliveryOrder = {
          id: string;
          customer: {
            id: string;
            name: string;
            [key: string]: any;
          };
          [key: string]: any;
        };
        type Customer = {
          id: string;
          name: string;
          [key: string]: any;
        };
        const deliveryOrders: DeliveryOrder[] = [];
        const customers: Customer[] = [];
        const locationTypes: string[] = [];
        let totalRequestedQuantity = 0;

        for (const item of shipmentItems) {
          totalRequestedQuantity += item.requestedQuantity;

          if (item.locationType && !locationTypes.includes(item.locationType)) {
            locationTypes.push(item.locationType);
          }

          const existingDO = deliveryOrders.find((d) => d.id === item.deliveryOrder.id);
          if (!existingDO) {
            deliveryOrders.push(item.deliveryOrder);

            if (
              item.deliveryOrder.customer &&
              !customers.some((c) => c.id === item.deliveryOrder.customer.id)
            ) {
              customers.push(item.deliveryOrder.customer);
            }
          }
        }

        // Build combined result
        return {
          id: chosenProduct.id,
          shipmentId,
          productId: chosenProduct.productId,
          product: {
            id: product.id,
            name: product.name,
            satuan: product.satuan,
            warehouseId: product.warehouseId,
            warehouse: product.warehouse,
          },
          deliveryOrders,
          customers,
          shipmentItems: shipmentItems.map((si) => ({
            id: si.id,
            status: si.status,
            requestedQuantity: si.requestedQuantity,
            weightedQuantity: si.weightedQuantity,
            locationType: si.locationType,
            weighedAt: si.weighedAt,
          })),
          weighings: chosenProduct.weighings,
          totalGrossWeight:
            chosenProduct.weighings.length > 0 ? chosenProduct.weighings[0].grossWeight : 0,
          totalNetWeight:
            chosenProduct.weighings.length > 0 ? chosenProduct.weighings[0].netWeight || 0 : 0,
          totalTareWeight:
            chosenProduct.weighings.length > 0 ? chosenProduct.weighings[0].tareWeight || 0 : 0,
          totalRequestedQuantity,
          locationType: locationTypes.join(', '),
          createdAt: chosenProduct.createdAt,
          updatedAt: chosenProduct.updatedAt,
        };
      }),
    );

    // Filter out nulls and return
    return result.filter(Boolean);
  },

  /**
   * Delete a chosen product from a shipment
   */
  async deleteChosenProduct(shipmentId: string, productId: string) {
    return prisma.$transaction(async (tx) => {
      // Find all chosen products with this shipment and product ID
      const chosenProducts = await tx.shipmentChosenProduct.findMany({
        where: {
          shipmentId,
          productId,
        },
      });

      // Delete the chosen products
      const result = await tx.shipmentChosenProduct.deleteMany({
        where: {
          shipmentId,
          productId,
        },
      });

      // For each delivery order that had this product chosen, update the shipment item
      for (const _ of chosenProducts) {
        // Find the matching shipment item
        const shipmentItem = await tx.shipmentItem.findFirst({
          where: {
            shipmentId,
            productId,
          },
        });

        // Update the shipment item if found to mark it as not chosen
        if (shipmentItem) {
          await tx.shipmentItem.update({
            where: {
              id: shipmentItem.id,
            },
            data: {
              chosenProduct: false,
              updatedAt: new Date(),
            },
          });
        }
      }

      return result;
    });
  },

  /**
   * Update plate photo for a shipment
   */
  async updatePlatePhoto(id: string, platePhotoPath: string, performedById: string) {
    return prisma.$transaction(async (tx) => {
      // Get the current shipment data before update
      const existingShipment = await tx.shipment.findUnique({
        where: {
          id,
        },
      });

      if (!existingShipment) {
        return null;
      }

      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Update the shipment with the plate photo path
      const updatedShipment = await tx.shipment.update({
        where: {
          id,
        },
        data: {
          platePhoto: platePhotoPath,
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

      // Log the update
      await shipmentLogService.logShipmentUpdate(
        id,
        performedById,
        {
          platePhoto: existingShipment.platePhoto || null,
        },
        {
          platePhoto: platePhotoPath,
        },
        tx,
      );

      return updatedShipment;
    });
  },

  /**
   * Verify shipment with plate number and photo
   */
  async verifyPlateNumberAndPhoto(
    id: string,
    performedById: string,
    existingShipment: NonNullable<Awaited<ReturnType<typeof this.getShipmentById>>>,
  ) {
    return prisma.$transaction(async (tx) => {
      // Get the current shipment data

      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Update the shipment to mark plate number as verified
      const updatedShipment = await tx.shipment.update({
        where: {
          id,
        },
        data: {
          isVerified: true,
          verifiedAt: jakartaTime,
          status: STATUS.SELESAI,
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

      // Update all shipment items to COMPLETED
      await tx.shipmentItem.updateMany({
        where: {
          shipmentId: id,
        },
        data: {
          status: SHIPMENT_ITEM_STATUS.COMPLETED,
          updatedAt: jakartaTime,
        },
      });

      // Track delivery orders to check their completion status
      const processedDeliveryOrderIds = new Set<string>();

      // Process each shipment item to update related delivery order item quantities
      for (const item of existingShipment!.shipmentItems) {
        // Get the corresponding delivery order item
        const deliveryOrderItem = await tx.deliveryOrderItem.findFirst({
          where: {
            deliveryOrderId: item.deliveryOrderId,
            productId: item.productId,
          },
        });

        if (deliveryOrderItem) {
          // Calculate quantity to move from processing to completed
          const quantityToComplete = Math.min(
            deliveryOrderItem.processingQuantity,
            item.requestedQuantity,
          );

          // Update the delivery order item quantities
          await tx.deliveryOrderItem.update({
            where: {
              id: deliveryOrderItem.id,
            },
            data: {
              processingQuantity: deliveryOrderItem.processingQuantity - quantityToComplete,
              completedQuantity: deliveryOrderItem.completedQuantity + quantityToComplete,
              updatedAt: jakartaTime,
            },
          });

          // Add this delivery order ID to the set of processed orders
          processedDeliveryOrderIds.add(item.deliveryOrderId);
        }
      }

      // Now check if each affected delivery order should be marked as completed
      for (const doId of processedDeliveryOrderIds) {
        // Get all items for this delivery order
        const doItems = await tx.deliveryOrderItem.findMany({
          where: {
            deliveryOrderId: doId,
          },
        });

        // Check if any items still have pending or processing quantity
        const hasIncompleteItems = doItems.some(
          (doItem) => doItem.pendingQuantity > 0 || doItem.processingQuantity > 0,
        );

        // If all items are completed, update the delivery order status
        if (!hasIncompleteItems) {
          await tx.deliveryOrder.update({
            where: {
              id: doId,
            },
            data: {
              status: STATUS.SELESAI,
              updatedAt: jakartaTime,
            },
          });
        }
      }

      // Log the verification
      await shipmentLogService.logShipmentVerification(
        id,
        performedById,
        existingShipment.plateNumber || existingShipment.armada?.plateNumber || 'Unknown',
        tx,
      );

      // Log the status change to SELESAI
      await shipmentLogService.logShipmentStatusChange(
        id,
        performedById,
        existingShipment.status,
        STATUS.SELESAI,
        tx,
      );

      return updatedShipment;
    });
  },

  /**
   * Process multiple shipment items with the same product at once (bulk weighing)
   */
  async bulkWeighShipmentItems(data: ShipmentBulkWeighInput, performedById: string) {
    return prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Find all chosen items for this product in the shipment
      const items = await tx.shipmentItem.findMany({
        where: {
          shipmentId: data.shipmentId,
          productId: data.productId,
          status: SHIPMENT_ITEM_STATUS.CHOSEN,
        },
        include: {
          shipment: true,
          deliveryOrder: {
            include: {
              customer: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              satuan: true,
            },
          },
          warehouse: true,
        },
      });

      if (items.length === 0) {
        return null;
      }

      const totalRequestedQuantity = items.reduce((sum, item) => sum + item.requestedQuantity, 0);

      if (items[0].shipment.status === STATUS.PENDING) {
        await tx.shipment.update({
          where: {
            id: data.shipmentId,
          },
          data: {
            status: STATUS.PROSES,
            updatedAt: jakartaTime,
          },
        });

        // Log shipment status change
        await shipmentLogService.logShipmentStatusChange(
          data.shipmentId,
          performedById,
          STATUS.PENDING,
          STATUS.PROSES,
          tx,
        );
      }

      // TODO: NEED CHORE cleaning code
      const updatedItems = [];
      type DeliveryOrder = {
        id: string;
        customer: {
          id: string;
          name: string;
          [key: string]: any;
        };
        [key: string]: any;
      };
      type Customer = {
        id: string;
        name: string;
        [key: string]: any;
      };
      const deliveryOrders: DeliveryOrder[] = [];
      const customers: Customer[] = [];

      for (const item of items) {
        console.log('Processing shipment item:', item);
        // Calculate proportional weight based on requested quantity
        const proportion = item.requestedQuantity / totalRequestedQuantity;
        const itemGrossWeight = data.grossWeight * proportion;

        // Update the item
        const updatedItem = await tx.shipmentItem.update({
          where: {
            id: item.id,
          },
          data: {
            weightedQuantity: itemGrossWeight, // Keep this proportional for inventory purposes
            status: SHIPMENT_ITEM_STATUS.COMPLETED,
            weighedAt: jakartaTime,
            updatedAt: jakartaTime,
          },
          include: {
            shipment: true,
            deliveryOrder: {
              include: {
                customer: true,
              },
            },
            product: {
              select: {
                id: true,
                name: true,
                satuan: true,
              },
            },
            warehouse: true,
          },
        });

        updatedItems.push(updatedItem);

        // Add unique delivery orders and customers
        if (!deliveryOrders.some((do1) => do1.id === item.deliveryOrder.id)) {
          deliveryOrders.push(item.deliveryOrder);
        }

        if (!customers.some((c) => c.id === item.deliveryOrder.customer.id)) {
          customers.push(item.deliveryOrder.customer);
        }
      }

      // Find or create ShipmentChosenProduct for this product in this shipment
      let shipmentChosenProduct = await tx.shipmentChosenProduct.findFirst({
        where: {
          shipmentId: data.shipmentId,
          productId: data.productId,
        },
      });

      // If no chosen product record exists yet, create one
      if (!shipmentChosenProduct) {
        shipmentChosenProduct = await tx.shipmentChosenProduct.create({
          data: {
            shipmentId: data.shipmentId,
            productId: data.productId,
            createdAt: jakartaTime,
            updatedAt: jakartaTime,
          },
        });
      }

      // Delete any existing weighing records for this chosen product
      await tx.shipmentChosenProductWeighing.deleteMany({
        where: {
          shipmentChosenProductId: shipmentChosenProduct.id,
        },
      });

      // Create a new weighing record with the total weight
      await tx.shipmentChosenProductWeighing.create({
        data: {
          shipmentChosenProductId: shipmentChosenProduct.id,
          grossWeight: data.grossWeight,
          netWeight: data.netWeight || 0,
          tareWeight: data.tareWeight || 0,
          createdAt: jakartaTime,
          updatedAt: jakartaTime,
        },
      });

      // Create a combined view of the data
      const combinedData = {
        shipmentId: data.shipmentId,
        shipment: items[0].shipment,
        product: items[0].product,
        warehouse: items[0].warehouse,
        totalRequestedQuantity,
        deliveryOrders,
        customers,
        itemIds: updatedItems.map((item) => item.id),
        status: SHIPMENT_ITEM_STATUS.COMPLETED,
        locationType: updatedItems
          .map((item) => item.locationType)
          .filter(Boolean)
          .join(', '),
        weighedAt: jakartaTime,
        // Weights are now a single record
        weights: {
          gross: data.grossWeight,
          net: data.netWeight || 0,
          tare: data.tareWeight || 0,
        },
        // Only include individual items if needed for reference
        individualItems: updatedItems,
      };

      // Fetch the updated shipment with all includes
      const updatedShipment = await tx.shipment.findUnique({
        where: {
          id: data.shipmentId,
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
            omit: {
              chosenProduct: true,
              weightedQuantity: true,
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
                  doNumber: true,
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
      });

      // Replace the shipment in the result with the updated one if found
      if (updatedShipment) {
        combinedData.shipment = updatedShipment;
      }

      return combinedData;
    });
  },

  /**
   * Get all shipments that have at least one shipmentItem with status CHOSEN (not yet weighed)
   */
  async getPendingShipments() {
    return prisma.shipment.findMany({
      where: {
        deletedAt: null,
        shipmentItems: {
          some: {
            status: SHIPMENT_ITEM_STATUS.CHOSEN,
          },
        },
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
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  async getShipmentByShipmentNumber(shipmentNumber: string) {
    return prisma.shipment.findUnique({
      where: {
        shipmentNumber,
      },
    });
  },
};
