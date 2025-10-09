import { SHIPMENT_ITEM_STATUS, SHIPMENT_TYPE, STATUS, WEIGHING_METHOD } from '@prisma/client';
import fs from 'fs';
import moment from 'moment-timezone';
import { customAlphabet } from 'nanoid';
import path from 'path';
import prisma from '../config/prisma';
import { CustomError } from '../middlewares/error';
import {
  ShipmentBulkWeighInput,
  ShipmentChosenProductInput,
  ShipmentCreateInput,
  ShipmentItemUpdateInput,
  ShipmentSelectiveChosenProductInput,
  ShipmentUpdateInput,
  ShipmentWeighInput,
  WeighingType,
} from '../schemas/shipment';
import { SPMBCreateInput } from '../schemas/spmb';
import armadaService from './armadaService';
import notaTimbanganPdfService from './notaTimbanganPdfService';
import shipmentLogService from './shipmentLogService';
import spmbPdfService from './spmbPdfService';

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
    unverifiedOnly?: boolean,
    startDate?: string,
    endDate?: string,
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

    if (startDate || endDate) {
      console.log(startDate, 'startDate');
      console.log(endDate, 'endDate');
      whereConditions.createdAt = {};
      if (startDate) {
        // Since DB stores Jakarta time with +7 offset, create date with same offset
        const startMoment = moment.tz(startDate, 'Asia/Jakarta').startOf('day');
        const startDate7Plus = new Date(startMoment.toDate());
        startDate7Plus.setHours(startDate7Plus.getHours() + 7);
        whereConditions.createdAt.gte = startDate7Plus;
      }
      if (endDate) {
        // Since DB stores Jakarta time with +7 offset, create date with same offset
        const endMoment = moment.tz(endDate, 'Asia/Jakarta').endOf('day');
        const endDate7Plus = new Date(endMoment.toDate());
        endDate7Plus.setHours(endDate7Plus.getHours() + 7);
        whereConditions.createdAt.lte = endDate7Plus;
      }
    }

    // Filter for unverified shipments (have platePhoto but no verifiedAt)
    if (unverifiedOnly) {
      whereConditions.platePhoto = {
        not: null,
      };
      whereConditions.verifiedAt = null;
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
          driver: {
            select: {
              id: true,
              name: true,
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
          tally: {
            contains: search,
          },
        },
        {
          driver: {
            name: {
              contains: search,
            },
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
          driver: {
            select: {
              id: true,
              name: true,
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
        driver: {
          select: {
            id: true,
            name: true,
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
                doNumber: true,
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
        warehouse: true,
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
      weighingMethod: chosenProduct.weighingMethod,
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
        kenek: data.kenek,
        internalNote: data.internalNote,
        plateNumber: plateNumberToUse,
        status: STATUS.PENDING,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      };

      if (data.driverId) {
        shipmentData.driver = {
          connect: {
            id: data.driverId,
          },
        };
      }

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
          driver: true,
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

      const touchedDOs = new Set<string>();

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

          // Use atomic operations to prevent race conditions
          const updatedItem = await tx.deliveryOrderItem.updateMany({
            where: {
              id: deliveryOrderItem.id,
              pendingQuantity: {
                gte: processingQuantity,
              }, // Ensure sufficient pending quantity
            },
            data: {
              pendingQuantity: {
                decrement: processingQuantity,
              },
              processingQuantity: {
                increment: processingQuantity,
              },
              updatedAt: jakartaTime,
            },
          });

          if (updatedItem.count > 0) {
            // ✅ Only mark DO as "touched" if item quantities really updated
            touchedDOs.add(item.deliveryOrderId);
          } else {
            throw new CustomError({
              message: 'Insufficient pending quantity or concurrent modification detected',
              errorCode: 'INSUFFICIENT_PENDING_QUANTITY',
              status: 409,
            });
          }
        }
      }

      // ✅ After all items processed, update statuses in batch
      for (const doId of touchedDOs) {
        await tx.deliveryOrder.update({
          where: { id: doId },
          data: { status: STATUS.PROSES },
        });
      }

      // Generate SPMB for each unique delivery order and warehouse combination
      const doWarehouseCombinations = new Map();

      // Group shipment items by DO-Warehouse combination
      for (const shipmentItem of shipmentItems) {
        const key = `${shipmentItem.deliveryOrderId}-${shipmentItem.warehouseId}`;
        if (!doWarehouseCombinations.has(key)) {
          doWarehouseCombinations.set(key, {
            deliveryOrderId: shipmentItem.deliveryOrderId,
            warehouseId: shipmentItem.warehouseId,
          });
        }
      }

      const spmbs = [];

      for (const combination of doWarehouseCombinations.values()) {
        // Get warehouse code for SPMB numbering
        const warehouse = await tx.warehouse.findUnique({
          where: { id: combination.warehouseId },
          select: { code: true },
        });

        // Generate a unique SPMB code with warehouse prefix
        const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);
        const spmbCode = `${warehouse?.code || 'WH'}-${nanoid()}`;

        const spmb = await tx.sPMB.create({
          data: {
            shipmentId: shipment.id,
            deliveryOrderId: combination.deliveryOrderId,
            warehouseId: combination.warehouseId,
            code: spmbCode,
            createdAt: jakartaTime,
            generatedById: performedById,
            updatedAt: jakartaTime,
          },
          include: {
            deliveryOrder: {
              include: {
                customer: true,
                items: {
                  include: {
                    product: true,
                  },
                },
              },
            },
            shipment: {
              include: {
                armada: true,
                driver: true,
                shipmentItems: {
                  include: {
                    product: true,
                  },
                },
              },
            },
            warehouse: true,
            generatedBy: true,
          },
        });

        const shipmentForPdf = await tx.shipment.findUnique({
          where: {
            id: shipment.id,
          },
          include: {
            armada: true,
            driver: true,
            shipmentItems: {
              include: {
                product: true,
                deliveryOrder: {
                  include: {
                    customer: true,
                  },
                },
              },
            },
          },
        });

        if (shipmentForPdf) {
          const pdfPath = await spmbPdfService.generateSPMB(spmb, shipmentForPdf);
          const updatedSpmb = await tx.sPMB.update({
            where: {
              id: spmb.id,
            },
            data: {
              documentPath: pdfPath,
            },
          });
          spmbs.push(updatedSpmb);
        } else {
          spmbs.push(spmb);
        }
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

      // Remove armadaId, driverId and items from direct update as Prisma doesn't allow it
      if ('armadaId' in updateData) {
        delete updateData.armadaId;
      }
      if ('driverId' in updateData) {
        delete updateData.driverId;
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

      if (data.driverId) {
        updateData.driver = {
          connect: {
            id: data.driverId,
          },
        };
      }

      // Track if we need to regenerate SPMBs
      let shouldRegenerateSpmbs = false;

      // --- Begin compute item-level diffs for logging ---
      type ItemKey = string;
      type SimpleItem = { deliveryOrderId: string; productId: string; requestedQuantity: number };
      const itemDiff = {
        added: [] as SimpleItem[],
        removed: [] as SimpleItem[],
        updated: [] as {
          deliveryOrderId: string;
          productId: string;
          oldQuantity: number;
          newQuantity: number;
        }[],
      };

      const makeKey = (deliveryOrderId: string, productId: string): ItemKey =>
        `${deliveryOrderId}-${productId}`;

      const existingItemsMap = new Map<ItemKey, SimpleItem & { status: string }>();
      for (const si of existingShipment.shipmentItems) {
        existingItemsMap.set(makeKey(si.deliveryOrderId, si.productId), {
          deliveryOrderId: si.deliveryOrderId,
          productId: si.productId,
          requestedQuantity: si.requestedQuantity,
          status: si.status,
        });
      }

      const itemsFromPayload =
        'items' in data && Array.isArray(data.items)
          ? (data.items as ShipmentItemUpdateInput[])
          : [];

      const updatedItemsMap = new Map<ItemKey, SimpleItem>();
      for (const it of itemsFromPayload) {
        updatedItemsMap.set(makeKey(it.deliveryOrderId, it.productId), {
          deliveryOrderId: it.deliveryOrderId,
          productId: it.productId,
          requestedQuantity: it.requestedQuantity,
        });
      }

      // Added: keys present in updated but not in existing
      for (const [key, v] of updatedItemsMap.entries()) {
        if (!existingItemsMap.has(key)) {
          itemDiff.added.push({
            ...v,
          });
        }
      }

      // Removed: keys present in existing but not in updated (only if status PENDING per business logic)
      for (const [key, v] of existingItemsMap.entries()) {
        if (!updatedItemsMap.has(key) && v.status === 'PENDING') {
          itemDiff.removed.push({
            deliveryOrderId: v.deliveryOrderId,
            productId: v.productId,
            requestedQuantity: v.requestedQuantity,
          });
        }
      }

      // Updated quantities: keys present in both with different requestedQuantity
      for (const [key, v] of updatedItemsMap.entries()) {
        const ex = existingItemsMap.get(key);
        if (ex && ex.requestedQuantity !== v.requestedQuantity) {
          itemDiff.updated.push({
            deliveryOrderId: v.deliveryOrderId,
            productId: v.productId,
            oldQuantity: ex.requestedQuantity,
            newQuantity: v.requestedQuantity,
          });
        }
      }
      // --- End compute item-level diffs for logging ---

      // If this is a full update with items, make sure the shipment is in PENDING status
      if ('items' in data && Array.isArray(data.items)) {
        shouldRegenerateSpmbs = true;
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

        // Update DO status to PROSES for newly added DOs
        const newlyAddedDOs = new Set<string>();
        for (const addedItem of itemDiff.added) {
          newlyAddedDOs.add(addedItem.deliveryOrderId);
        }

        // Update status for each newly added DO
        for (const deliveryOrderId of newlyAddedDOs) {
          await tx.deliveryOrder.update({
            where: { id: deliveryOrderId },
            data: {
              status: STATUS.PROSES,
              updatedAt: jakartaTime,
            },
          });
        }

        // Check and update DO status to PENDING for DOs that were removed or no longer processing
        const removedDOs = new Set<string>();
        for (const removedItem of itemDiff.removed) {
          removedDOs.add(removedItem.deliveryOrderId);
        }

        // For each potentially affected DO (both removed and existing), check if all items are pending
        const affectedDOs = new Set([...removedDOs]);

        // Also check existing DOs in case quantities were reduced to zero
        for (const item of itemsFromPayload) {
          affectedDOs.add(item.deliveryOrderId);
        }

        for (const deliveryOrderId of affectedDOs) {
          // Get all delivery order items for this DO
          const deliveryOrderItems = await tx.deliveryOrderItem.findMany({
            where: { deliveryOrderId },
          });

          // Check if all items have processingQuantity = 0
          const allItemsPending = deliveryOrderItems.every((item) => item.processingQuantity === 0);

          if (allItemsPending) {
            // Update DO status back to PENDING
            await tx.deliveryOrder.update({
              where: { id: deliveryOrderId },
              data: {
                status: STATUS.PENDING,
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

      // Regenerate SPMBs if items were modified
      if (shouldRegenerateSpmbs) {
        // Get existing SPMBs to delete their PDF files
        const existingSpmbs = await tx.sPMB.findMany({
          where: {
            shipmentId: id,
          },
          select: {
            documentPath: true,
          },
        });

        // Delete existing SPMB PDF files from file system
        const isProd = process.env.NODE_ENV === 'production';
        const PUBLIC_DIR = isProd
          ? '/var/www/sajpoutbound.com/public'
          : path.join(process.cwd(), 'src', 'public');

        for (const spmb of existingSpmbs) {
          if (spmb.documentPath) {
            const filePath = path.join(PUBLIC_DIR, spmb.documentPath);
            try {
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Deleted old SPMB file: ${filePath}`);
              }
            } catch (error) {
              console.error(`Failed to delete SPMB file ${filePath}:`, error);
              // Continue with regeneration even if file deletion fails
            }
          }
        }

        // Delete existing SPMBs from database
        await tx.sPMB.deleteMany({
          where: {
            shipmentId: id,
          },
        });

        // Get updated shipment items to determine new delivery orders
        const updatedShipmentItems = await tx.shipmentItem.findMany({
          where: {
            shipmentId: id,
          },
        });

        // Generate new SPMBs for each unique delivery order and warehouse combination
        const doWarehouseCombinations = new Map();

        // Group shipment items by DO-Warehouse combination
        for (const shipmentItem of updatedShipmentItems) {
          const key = `${shipmentItem.deliveryOrderId}-${shipmentItem.warehouseId}`;
          if (!doWarehouseCombinations.has(key)) {
            doWarehouseCombinations.set(key, {
              deliveryOrderId: shipmentItem.deliveryOrderId,
              warehouseId: shipmentItem.warehouseId,
            });
          }
        }

        const newSpmbs = [];

        for (const combination of doWarehouseCombinations.values()) {
          // Get warehouse code for SPMB numbering
          const warehouse = await tx.warehouse.findUnique({
            where: { id: combination.warehouseId },
            select: { code: true },
          });

          // Generate a unique SPMB code with warehouse prefix
          const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);
          const spmbCode = `${warehouse?.code || 'WH'}-${nanoid()}`;

          const spmb = await tx.sPMB.create({
            data: {
              shipmentId: id,
              deliveryOrderId: combination.deliveryOrderId,
              warehouseId: combination.warehouseId,
              code: spmbCode,
              generatedById: performedById,
              createdAt: jakartaTime,
              updatedAt: jakartaTime,
            },
            include: {
              deliveryOrder: {
                include: {
                  customer: true,
                  items: {
                    include: {
                      product: true,
                    },
                  },
                },
              },
              shipment: {
                include: {
                  armada: true,
                  driver: true,
                  shipmentItems: {
                    include: {
                      product: true,
                    },
                  },
                },
              },
              warehouse: true,
              generatedBy: true,
            },
          });

          // Get the complete shipment data for PDF generation
          const shipmentForPdf = await tx.shipment.findUnique({
            where: {
              id,
            },
            include: {
              armada: true,
              driver: true,
              shipmentItems: {
                include: {
                  product: true,
                  deliveryOrder: {
                    include: {
                      customer: true,
                    },
                  },
                },
              },
            },
          });

          if (shipmentForPdf) {
            const pdfPath = await spmbPdfService.generateSPMB(spmb, shipmentForPdf);
            const updatedSpmb = await tx.sPMB.update({
              where: {
                id: spmb.id,
              },
              data: {
                documentPath: pdfPath,
              },
            });
            newSpmbs.push(updatedSpmb);
          } else {
            newSpmbs.push(spmb);
          }
        }
      }

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

        const oldArmadaSnapshot = oldArmada
          ? {
              id: oldArmada.id,
              model: oldArmada.model,
              plateNumber: oldArmada.plateNumber,
            }
          : null;
        const newArmadaSnapshot = newArmada
          ? {
              id: newArmada.id,
              model: newArmada.model,
              plateNumber: newArmada.plateNumber,
            }
          : null;

        logOldData.armada = oldArmadaSnapshot;
        logNewData.armada = newArmadaSnapshot;
      }

      // Attach item-level diffs to log if present
      if (
        'items' in data &&
        (itemDiff.added.length || itemDiff.removed.length || itemDiff.updated.length)
      ) {
        // Enrich with DO numbers and product names for readability
        const doIds = Array.from(
          new Set([
            ...itemDiff.added.map((i) => i.deliveryOrderId),
            ...itemDiff.updated.map((i) => i.deliveryOrderId),
            ...itemDiff.removed.map((i) => i.deliveryOrderId),
          ]),
        );
        const productIds = Array.from(
          new Set([
            ...itemDiff.added.map((i) => i.productId),
            ...itemDiff.updated.map((i) => i.productId),
            ...itemDiff.removed.map((i) => i.productId),
          ]),
        );

        const [dos, products] = await Promise.all([
          doIds.length
            ? tx.deliveryOrder.findMany({
                where: { id: { in: doIds } },
                select: { id: true, doNumber: true },
              })
            : Promise.resolve([]),
          productIds.length
            ? tx.product.findMany({
                where: { id: { in: productIds } },
                select: { id: true, name: true },
              })
            : Promise.resolve([]),
        ]);

        const doIdToNumber = new Map(dos.map((d) => [d.id, d.doNumber] as const));
        const productIdToName = new Map(products.map((p) => [p.id, p.name] as const));

        const enrichedAdded = itemDiff.added.map((a) => ({
          ...a,
          deliveryOrderNumber: doIdToNumber.get(a.deliveryOrderId) || null,
          productName: productIdToName.get(a.productId) || null,
        }));

        const enrichedRemoved = itemDiff.removed.map((r) => ({
          ...r,
          deliveryOrderNumber: doIdToNumber.get(r.deliveryOrderId) || null,
          productName: productIdToName.get(r.productId) || null,
        }));

        const enrichedUpdatedOld = itemDiff.updated.map((u) => ({
          deliveryOrderId: u.deliveryOrderId,
          deliveryOrderNumber: doIdToNumber.get(u.deliveryOrderId) || null,
          productId: u.productId,
          productName: productIdToName.get(u.productId) || null,
          requestedQuantity: u.oldQuantity,
        }));

        const enrichedUpdatedNew = itemDiff.updated.map((u) => ({
          deliveryOrderId: u.deliveryOrderId,
          deliveryOrderNumber: doIdToNumber.get(u.deliveryOrderId) || null,
          productId: u.productId,
          productName: productIdToName.get(u.productId) || null,
          requestedQuantity: u.newQuantity,
        }));

        if (enrichedRemoved.length || enrichedUpdatedOld.length) {
          logOldData.items = {
            removed: enrichedRemoved,
            updated: enrichedUpdatedOld,
          };
        }
        if (enrichedAdded.length || enrichedUpdatedNew.length) {
          logNewData.items = {
            added: enrichedAdded,
            updated: enrichedUpdatedNew,
          };
        }

        // Build a descriptive message for added DOs
        const addedByDo = new Map<string | null, { productName: string | null; qty: number }[]>();
        for (const a of enrichedAdded) {
          const key = a.deliveryOrderNumber || a.deliveryOrderId;
          const list = addedByDo.get(key) || [];
          list.push({ productName: a.productName, qty: a.requestedQuantity });
          addedByDo.set(key, list);
        }
        let addedDesc = '';
        if (addedByDo.size > 0) {
          const parts: string[] = [];
          for (const [doNumOrId, items] of addedByDo.entries()) {
            const itemsStr = items
              .map((it) => `${it.productName || 'Produk'} x ${it.qty}`)
              .join(', ');
            parts.push(`DO ${doNumOrId}: ${itemsStr}`);
          }
          addedDesc = `Penambahan item pada ${parts.join(' ; ')}`;
        }

        // Attach description hint if any
        if (addedDesc) {
          (updateData as any).__logDescription = addedDesc;
        }
      }

      // Log the update only if there are changes
      if (Object.keys(logNewData).length > 0) {
        const description = (updateData as any).__logDescription || undefined;
        await shipmentLogService.logShipmentUpdate(
          id,
          performedById,
          logOldData,
          logNewData,
          tx,
          description,
        );
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

      // Get existing SPMBs to delete their PDF files before soft deleting the shipment
      const existingSpmbs = await tx.sPMB.findMany({
        where: {
          shipmentId: id,
        },
        select: {
          documentPath: true,
        },
      });

      // Delete existing SPMB PDF files from file system
      const isProd = process.env.NODE_ENV === 'production';
      const PUBLIC_DIR = isProd
        ? '/var/www/sajpoutbound.com/public'
        : path.join(process.cwd(), 'src', 'public');

      for (const spmb of existingSpmbs) {
        if (spmb.documentPath) {
          const filePath = path.join(PUBLIC_DIR, spmb.documentPath);
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`Deleted SPMB file during shipment deletion: ${filePath}`);
            }
          } catch (error) {
            console.error(
              `Failed to delete SPMB file during shipment deletion ${filePath}:`,
              error,
            );
            // Continue with deletion even if file deletion fails
          }
        }
      }

      // Delete existing SPMBs from database (this will cascade delete due to foreign key)
      await tx.sPMB.deleteMany({
        where: {
          shipmentId: id,
        },
      });

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
   * !! LEGACY LOGIC
   * Process a shipment item (weigh and update status)
   */
  async weighShipmentItem(
    data: ShipmentWeighInput,
    performedById: string,
    existingItem: any,
    shipmentChosenProduct: any,
    shipment: NonNullable<Awaited<ReturnType<typeof this.getShipmentById>>>,
  ) {
    return prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)a
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Update the shipment status to PROSES if it's currently PENDING
      if (shipment.status === STATUS.PENDING) {
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

      // Create shipment chosen product weighing record first
      const weighing = await tx.shipmentChosenProductWeighing.create({
        data: {
          shipmentChosenProductId: shipmentChosenProduct.id,
          grossWeight: data.grossWeight,
          netWeight: data.netWeight || 0,
          tareWeight: data.tareWeight || 0,
          timeIn: shipmentChosenProduct.createdAt,
          createdAt: jakartaTime,
          updatedAt: jakartaTime,
        },
      });

      // Then update shipment item with weighing link
      const completedItem = await tx.shipmentItem.update({
        where: {
          id: data.shipmentItemId,
        },
        data: {
          weightedQuantity: data.grossWeight,
          status: SHIPMENT_ITEM_STATUS.COMPLETED,
          weighedAt: jakartaTime,
          shipmentChosenProductWeighingId: weighing.id,
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

      // Generate Nota Timbangan PDF for individual weighing
      const { customAlphabet } = await import('nanoid');
      const nanoid = customAlphabet('1234567890', 6);
      const ticketNumber = nanoid();

      // Fetch the weighing record with all necessary includes for PDF generation
      const weighingWithIncludes = await tx.shipmentChosenProductWeighing.findUnique({
        where: { id: weighing.id },
        include: {
          shipmentChosenProduct: {
            include: {
              product: true,
              shipment: {
                include: {
                  armada: true,
                  shipmentItems: {
                    include: {
                      deliveryOrder: {
                        include: {
                          customer: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!weighingWithIncludes) {
        throw new Error('Weighing record not found for PDF generation');
      }

      const pdfPath = await notaTimbanganPdfService.generateNotaTimbangan(
        {
          ...weighingWithIncludes,
          timeOut: weighingWithIncludes.createdAt,
        },
        ticketNumber,
        existingItem.requestedQuantity, // Use the individual item's requested quantity
      );

      // Save Nota Timbangan to database
      await tx.notaTimbangan.create({
        data: {
          ticketNumber,
          documentPath: pdfPath,
          shipmentChosenProductWeighingId: weighing.id,
          createdAt: jakartaTime,
          updatedAt: jakartaTime,
        },
      });

      // Log the individual item weighing
      await shipmentLogService.logItemWeighed(
        existingItem.shipmentId,
        performedById,
        existingItem,
        {
          grossWeight: data.grossWeight,
          netWeight: data.netWeight || 0,
          tareWeight: data.tareWeight || 0,
        },
        tx,
      );

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

    // Get chosen product codes for this shipment
    const chosenProducts = await prisma.shipmentChosenProduct.findMany({
      where: {
        shipmentId,
      },
      select: {
        productId: true,
        code: true,
      },
    });

    const codeMap = new Map(chosenProducts.map((cp) => [cp.productId, cp.code]));

    // Create a map to group items by product ID
    const productMap = new Map();

    // Process each item and combine those with the same product ID
    for (const item of items) {
      const productId = item.product.id;

      if (!productMap.has(productId)) {
        productMap.set(productId, {
          shipmentId: item.shipmentId,
          product: {
            ...item.product,
            code: codeMap.get(productId) || null,
          },
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
          warehouseId: data.warehouseId,
          code: data.code,
          documentPath: data.documentPath,
          generatedById: data.generatedById,
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
  async chooseProductForShipment(
    data: ShipmentChosenProductInput,
    product: any,
    code: string,
    performedById?: string,
  ) {
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
        // Generate a unique loading group ID for all items chosen together
        const loadingGroupId = `${data.shipmentId}-${data.productId}-${Date.now()}`;

        // Update each shipment item to mark it as chosen with the same loading group ID
        for (const item of shipmentItems) {
          await tx.shipmentItem.update({
            where: {
              id: item.id,
            },
            data: {
              status: SHIPMENT_ITEM_STATUS.CHOSEN, // Update status to CHOSEN
              chosenProduct: true,
              loadingGroupId,
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
              code,
              shipmentId: data.shipmentId,
              productId: data.productId,
              weighingMethod: data.weighingMethod,
              createdAt: jakartaTime,
              updatedAt: jakartaTime,
            },
          });
        } else if (existingChosen.weighingMethod !== data.weighingMethod) {
          // If it exists, align weighingMethod with the latest selection
          await tx.shipmentChosenProduct.update({
            where: {
              id: existingChosen.id,
            },
            data: {
              weighingMethod: data.weighingMethod,
              updatedAt: jakartaTime,
            },
          });
        }

        // Log the product selection
        if (performedById) {
          await shipmentLogService.logProductChosen(
            data.shipmentId,
            performedById,
            product,
            data.weighingMethod,
            shipmentItems.length,
            tx,
          );
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
          weighings: {
            select: {
              id: true,
              grossWeight: true,
              netWeight: true,
              tareWeight: true,
              notaTimbangan: {
                select: {
                  id: true,
                  ticketNumber: true,
                  documentPath: true,
                },
              },
            },
          },
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
   * Choose specific delivery orders for a product (selective loading)
   */
  async chooseProductSelectiveForShipment(
    data: ShipmentSelectiveChosenProductInput,
    product: any,
    code: string,
    performedById: string,
  ) {
    return prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Find only the specified shipment items for this product and specific delivery orders
      // FIXED: Removed status filter to ensure we only select items from the specified DOs
      // Previously, status: PENDING was causing items from other DOs to be included incorrectly
      const shipmentItems = await tx.shipmentItem.findMany({
        where: {
          shipmentId: data.shipmentId,
          productId: data.productId,
          deliveryOrderId: {
            in: data.deliveryOrderIds,
          },
          // Status filter removed - we want to select items based on DO selection, not status
          // Status will be updated to CHOSEN anyway
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

      if (shipmentItems.length === 0) {
        return null;
      }

      // Filter out items that are already chosen to avoid double-selection
      const unchosenItems = shipmentItems.filter((item) => !item.chosenProduct);

      if (unchosenItems.length === 0) {
        throw new Error('Semua item untuk DO yang dipilih sudah dimuat sebelumnya');
      }

      // Generate a unique loading group ID for this batch of DOs chosen together
      const loadingGroupId = `${data.shipmentId}-${data.productId}-${Date.now()}`;

      // Update each selected shipment item to mark it as chosen with the same loading group ID
      for (const item of unchosenItems) {
        await tx.shipmentItem.update({
          where: {
            id: item.id,
          },
          data: {
            status: SHIPMENT_ITEM_STATUS.CHOSEN,
            chosenProduct: true,
            loadingGroupId,
            updatedAt: jakartaTime,
          },
        });
      }

      // Check if a chosen product record already exists for this product
      let chosenProduct = await tx.shipmentChosenProduct.findFirst({
        where: {
          shipmentId: data.shipmentId,
          productId: data.productId,
        },
      });

      // Create or update the chosen product record
      if (!chosenProduct) {
        chosenProduct = await tx.shipmentChosenProduct.create({
          data: {
            code,
            shipmentId: data.shipmentId,
            productId: data.productId,
            weighingMethod: data.weighingMethod,
            createdAt: jakartaTime,
            updatedAt: jakartaTime,
          },
        });
      } else {
        // Enforce that the weighing method must match the first selection
        if (chosenProduct.weighingMethod !== data.weighingMethod) {
          throw new Error(
            `Produk ini sudah dipilih dengan metode ${chosenProduct.weighingMethod}. ` +
              `Anda harus menggunakan metode yang sama untuk semua item dari produk ini.`,
          );
        }
        // Just update the timestamp, weighing method stays the same
        chosenProduct = await tx.shipmentChosenProduct.update({
          where: { id: chosenProduct.id },
          data: {
            updatedAt: jakartaTime,
          },
        });
      }

      // Log the selective loading for each chosen item
      for (const item of unchosenItems) {
        await shipmentLogService.logShipmentUpdate(
          data.shipmentId,
          performedById,
          {},
          { chosenProduct: true },
          tx,
          `Barang "${product.name}" dari DO ${item.deliveryOrder.doNumber} dimuat secara selektif`,
        );
      }

      // Get unique delivery orders from the selected items
      const uniqueDOIds = [...new Set(unchosenItems.map((item) => item.deliveryOrderId))];
      const deliveryOrders = await tx.deliveryOrder.findMany({
        where: {
          id: {
            in: uniqueDOIds,
          },
        },
        include: {
          customer: true,
        },
      });

      // Build response
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
        weighings: [],
        selectedItems: unchosenItems.length,
        selectedDeliveryOrders: deliveryOrders.length,
        createdAt: chosenProduct.createdAt,
        updatedAt: chosenProduct.updatedAt,
      };

      return result;
    });
  },

  /**
   * Get all chosen products for a shipment, optionally filtered by weighing method
   */
  async getChosenProductsForShipment(shipmentId: string, weighingMethod?: WEIGHING_METHOD) {
    // Get all chosen products for this shipment
    const whereCondition: any = {
      shipmentId,
    };

    // Add weighing method filter if provided
    if (weighingMethod) {
      whereCondition.weighingMethod = weighingMethod;
    }

    const chosenProducts = await prisma.shipmentChosenProduct.findMany({
      where: whereCondition,
      include: {
        weighings: {
          select: {
            id: true,
            grossWeight: true,
            netWeight: true,
            tareWeight: true,
            createdAt: true,
            notaTimbangan: {
              select: {
                id: true,
                ticketNumber: true,
                documentPath: true,
              },
            },
          },
        },
      },
    });

    // Group chosen products by product ID to aggregate weighings
    const productMap = new Map();

    for (const chosenProduct of chosenProducts) {
      if (!productMap.has(chosenProduct.productId)) {
        productMap.set(chosenProduct.productId, {
          chosenProducts: [chosenProduct],
          allWeighings: [...chosenProduct.weighings],
        });
      } else {
        const existing = productMap.get(chosenProduct.productId);
        existing.chosenProducts.push(chosenProduct);
        // Aggregate weighings from all chosen product records for the same product
        existing.allWeighings.push(...chosenProduct.weighings);
      }
    }

    // For each unique product, get additional details
    const result = await Promise.all(
      Array.from(productMap.entries()).map(
        async ([productId, { chosenProducts: productChosenProducts, allWeighings }]) => {
          // Use the first chosen product for basic info
          const chosenProduct = productChosenProducts[0];

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
            return null; // Skip if product not found
          }

          // Get all delivery orders for this product in this shipment
          const shipmentItems = await prisma.shipmentItem.findMany({
            where: {
              shipmentId,
              productId: productId,
              chosenProduct: true,
              status: {
                not: SHIPMENT_ITEM_STATUS.CANCELLED,
              },
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

          // Sort weighings by creation date (newest first)
          const sortedWeighings = allWeighings.sort(
            (a: WeighingType, b: WeighingType) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );

          // Calculate total weights from all weighings
          const totalGrossWeight = sortedWeighings.reduce(
            (sum: number, w: WeighingType) => sum + w.grossWeight,
            0,
          );
          const totalNetWeight = sortedWeighings.reduce(
            (sum: number, w: WeighingType) => sum + (w.netWeight || 0),
            0,
          );
          const totalTareWeight = sortedWeighings.reduce(
            (sum: number, w: WeighingType) => sum + (w.tareWeight || 0),
            0,
          );

          // Build combined result
          return {
            id: chosenProduct.id,
            code: chosenProduct.code,
            shipmentId,
            productId: productId,
            weighingMethod: chosenProduct.weighingMethod,
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
            weighings: sortedWeighings, // Now includes ALL weighings for this product
            totalGrossWeight,
            totalNetWeight,
            totalTareWeight,
            totalRequestedQuantity,
            locationType: locationTypes.join(', '),
            createdAt: chosenProduct.createdAt,
            updatedAt: chosenProduct.updatedAt,
          };
        },
      ),
    );

    // Filter out nulls and return
    return result.filter(Boolean);
  },

  /**
   * Delete a chosen product from a shipment
   */
  async deleteChosenProduct(shipmentId: string, productId: string, performedById?: string) {
    return prisma.$transaction(async (tx) => {
      // Find all chosen products with this shipment and product ID
      const chosenProducts = await tx.shipmentChosenProduct.findMany({
        where: {
          shipmentId,
          productId,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Delete the chosen products
      const result = await tx.shipmentChosenProduct.deleteMany({
        where: {
          shipmentId,
          productId,
        },
      });

      // Count affected shipment items for logging
      const affectedItems = await tx.shipmentItem.count({
        where: {
          shipmentId,
          productId,
          status: 'CHOSEN',
        },
      });

      // Update all matching shipment items to revert status from CHOSEN to PENDING
      await tx.shipmentItem.updateMany({
        where: {
          shipmentId,
          productId,
          status: 'CHOSEN',
        },
        data: {
          status: 'PENDING',
          chosenProduct: false,
          shipmentChosenProductWeighingId: null,
          updatedAt: new Date(),
        },
      });

      // Log the chosen product deletion
      if (performedById && chosenProducts.length > 0) {
        await shipmentLogService.logChosenProductDeleted(
          shipmentId,
          performedById,
          chosenProducts[0].product,
          affectedItems,
          tx,
        );
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

      // Log specific plate photo upload event
      await shipmentLogService.logPlatePhotoUploaded(id, performedById, platePhotoPath, tx);

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
  async bulkWeighShipmentItems(data: ShipmentBulkWeighInput, performedById: string, code: string) {
    return prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      console.log('🎯 Weighing loading group:', data.loadingGroupId);

      // Find all chosen items for this product in the specific loading group
      const items = await tx.shipmentItem.findMany({
        where: {
          shipmentId: data.shipmentId,
          productId: data.productId,
          loadingGroupId: data.loadingGroupId,
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
        throw new Error(
          `Tidak ada item yang ditemukan untuk loading group ${data.loadingGroupId}. ` +
            'Pastikan item sudah dipilih (CHOSEN) dan belum selesai ditimbang.',
        );
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
            code,
            shipmentId: data.shipmentId,
            productId: data.productId,
            createdAt: jakartaTime,
            updatedAt: jakartaTime,
          },
        });
      }

      // Note: We don't delete existing weighing records to preserve multiple weighing sessions
      // This allows for multiple weighings of the same product (e.g., when DOs are added via editing)

      // Create a new weighing record with the total weight FIRST
      const weighing = await tx.shipmentChosenProductWeighing.create({
        data: {
          shipmentChosenProductId: shipmentChosenProduct.id,
          grossWeight: data.grossWeight,
          netWeight: data.netWeight || 0,
          tareWeight: data.tareWeight || 0,
          timeIn: shipmentChosenProduct.createdAt,
          createdAt: jakartaTime,
          updatedAt: jakartaTime,
        },
        include: {
          shipmentChosenProduct: {
            include: {
              product: true,
              shipment: {
                include: {
                  armada: true,
                  shipmentItems: {
                    include: {
                      deliveryOrder: {
                        include: {
                          customer: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Now update all items with the weighing link
      for (const item of items) {
        // Calculate proportional weight based on requested quantity
        const proportion = item.requestedQuantity / totalRequestedQuantity;
        const itemGrossWeight = data.grossWeight * proportion;

        // Update the item with weighing link
        const updatedItem = await tx.shipmentItem.update({
          where: {
            id: item.id,
          },
          data: {
            weightedQuantity: itemGrossWeight, // Keep this proportional for inventory purposes
            status: SHIPMENT_ITEM_STATUS.COMPLETED,
            weighedAt: jakartaTime,
            shipmentChosenProductWeighingId: weighing.id,
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

      // Set timeOut to weighing.createdAt
      await tx.shipmentChosenProductWeighing.update({
        where: {
          id: weighing.id,
        },
        data: {
          timeOut: weighing.createdAt,
        },
      });

      // Generate Nota Timbangan PDF and save to DB
      const nanoid = customAlphabet('1234567890', 6);
      const ticketNumber = nanoid();
      const pdfPath = await notaTimbanganPdfService.generateNotaTimbangan(
        {
          ...weighing,
          timeOut: weighing.createdAt,
        },
        ticketNumber,
        totalRequestedQuantity, // Pass the actual quantity being weighed
      );
      await tx.notaTimbangan.create({
        data: {
          ticketNumber,
          documentPath: pdfPath,
          shipmentChosenProductWeighingId: weighing.id,
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

      // Log the bulk weighing operation
      await shipmentLogService.logBulkItemsWeighed(
        data.shipmentId,
        performedById,
        items[0].product,
        {
          grossWeight: data.grossWeight,
          netWeight: data.netWeight || 0,
          tareWeight: data.tareWeight || 0,
        },
        items.length,
        shipmentChosenProduct.weighingMethod || 'VENDOR',
        tx,
      );

      return combinedData;
    });
  },

  /**
   * Get all shipments that have vendor-marked chosen products with CHOSEN status
   */
  async getVendorPendingShipments() {
    return prisma.shipment.findMany({
      where: {
        deletedAt: null,
        chosenProducts: {
          some: {
            weighingMethod: WEIGHING_METHOD.VENDOR,
          },
        },
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
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  /**
   * Get all Nota Timbangan documents for a product in a shipment
   */
  async getNotaTimbanganForProduct(shipmentId: string, productId: string) {
    // Get all weighings for this product in the shipment with proper DO correlation
    const weighings = await prisma.shipmentChosenProductWeighing.findMany({
      where: {
        shipmentChosenProduct: {
          shipmentId,
          productId,
        },
        notaTimbangan: {
          isNot: null,
        },
      },
      include: {
        notaTimbangan: {
          select: {
            id: true,
            ticketNumber: true,
            documentPath: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        shipmentChosenProduct: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                satuan: true,
              },
            },
            shipment: {
              select: {
                id: true,
                shipmentNumber: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (weighings.length === 0) {
      return {
        notaTimbanganList: [],
        totalCount: 0,
      };
    }

    // Get all delivery orders related to this product in the shipment for context
    const shipmentItems = await prisma.shipmentItem.findMany({
      where: {
        shipmentId,
        productId,
      },
      include: {
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
      },
    });

    // Map weighings to include delivery order context
    const notaTimbanganList = weighings.map((weighing) => {
      const chosenProduct = weighing.shipmentChosenProduct;

      // Find related DOs for this specific weighing based on timing or other logic
      // For now, include all DOs for this product as context
      const relatedDOs = shipmentItems.map((item) => ({
        id: item.deliveryOrder.id,
        doNumber: item.deliveryOrder.doNumber,
        customer: item.deliveryOrder.customer,
      }));

      return {
        id: weighing.notaTimbangan!.id,
        ticketNumber: weighing.notaTimbangan!.ticketNumber,
        documentPath: weighing.notaTimbangan!.documentPath,
        createdAt: weighing.notaTimbangan!.createdAt,
        updatedAt: weighing.notaTimbangan!.updatedAt,
        weighing: {
          id: weighing.id,
          grossWeight: weighing.grossWeight,
          netWeight: weighing.netWeight,
          tareWeight: weighing.tareWeight,
          timeIn: weighing.timeIn,
          timeOut: weighing.timeOut,
        },
        product: chosenProduct.product,
        shipment: chosenProduct.shipment,
        deliveryOrders: relatedDOs,
        // Add primary DO number for display purposes (first DO as fallback)
        primaryDoNumber: relatedDOs.length > 0 ? relatedDOs[0].doNumber : 'N/A',
      };
    });

    return {
      notaTimbanganList,
      totalCount: notaTimbanganList.length,
    };
  },

  /**
   * Get vendor-marked available items for weighing by shipment ID
   * Groups items by product AND loading group to match manual weighing behavior
   */
  async getVendorAvailableItemsForWeighingByShipmentId(shipmentId: string) {
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
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Get chosen products for this shipment that are marked for vendor weighing
    const vendorChosenProducts = await prisma.shipmentChosenProduct.findMany({
      where: {
        shipmentId,
        weighingMethod: WEIGHING_METHOD.VENDOR,
      },
      select: {
        productId: true,
        code: true,
      },
    });

    const vendorProductIds = new Set(vendorChosenProducts.map((cp) => cp.productId));
    const codeMap = new Map(vendorChosenProducts.map((cp) => [cp.productId, cp.code]));

    // Filter items to only include those that are marked for vendor weighing
    const vendorItems = items.filter((item) => vendorProductIds.has(item.productId));

    // Group items by both product ID AND loading group ID (similar to frontend logic)
    const productLoadingGroupMap = new Map();

    for (const item of vendorItems) {
      const productId = item.product.id;
      const loadingGroupId = item.loadingGroupId || 'no-group';
      const groupKey = `${productId}-${loadingGroupId}`;

      if (!productLoadingGroupMap.has(groupKey)) {
        productLoadingGroupMap.set(groupKey, {
          shipmentId: item.shipmentId,
          productId: productId,
          loadingGroupId: item.loadingGroupId,
          product: {
            ...item.product,
            code: codeMap.get(productId) || null,
          },
          warehouse: item.warehouse,
          deliveryOrders: [
            {
              id: item.deliveryOrder.id,
              doNumber: item.deliveryOrder.doNumber,
              customer: item.deliveryOrder.customer,
            },
          ],
          deliveryOrderIds: [item.deliveryOrderId],
          doNumbers: [item.deliveryOrder.doNumber],
          customers: [item.deliveryOrder.customer.name],
          requestedQuantity: item.requestedQuantity,
          shipmentItemIds: [item.id],
        });
      } else {
        const existingGroup = productLoadingGroupMap.get(groupKey);

        // Add to the total quantity
        existingGroup.requestedQuantity += item.requestedQuantity;

        // Add this item's ID to the list
        existingGroup.shipmentItemIds.push(item.id);

        // Add delivery order if not already included
        if (!existingGroup.deliveryOrderIds.includes(item.deliveryOrderId)) {
          existingGroup.deliveryOrders.push({
            id: item.deliveryOrder.id,
            doNumber: item.deliveryOrder.doNumber,
            customer: item.deliveryOrder.customer,
          });
          existingGroup.deliveryOrderIds.push(item.deliveryOrderId);
          existingGroup.doNumbers.push(item.deliveryOrder.doNumber);
        }

        // Add customer name if not already included
        if (!existingGroup.customers.includes(item.deliveryOrder.customer.name)) {
          existingGroup.customers.push(item.deliveryOrder.customer.name);
        }
      }
    }

    // Convert the map to an array and format as loading groups
    const loadingGroups = Array.from(productLoadingGroupMap.values()).map((group) => ({
      id: group.loadingGroupId || 'no-group',
      productId: group.productId,
      productName: group.product.name,
      productUnit: group.product.satuan,
      productCode: group.product.code,
      warehouse: group.warehouse,
      doNumbers: group.doNumbers,
      deliveryOrderIds: group.deliveryOrderIds,
      customers: group.customers,
      requestedQuantity: group.requestedQuantity,
      shipmentItemIds: group.shipmentItemIds,
      itemCount: group.shipmentItemIds.length,
    }));

    return {
      loadingGroups,
    };
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

  async getShipmentChosenProductByCode(code: string) {
    return prisma.shipmentChosenProduct.findUnique({
      where: {
        code,
      },
    });
  },

  async updateTally(
    id: string,
    tally: string,
    performedById: string,
    shipment: NonNullable<Awaited<ReturnType<typeof this.getShipmentById>>>,
  ) {
    return prisma.$transaction(async (tx) => {
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      const updatedShipment = await tx.shipment.update({
        where: { id },
        data: {
          tally,
          updatedAt: jakartaTime,
        },
      });

      // Regenerate SPMBs
      const existingSpmbs = await tx.sPMB.findMany({
        where: { shipmentId: id },
        include: {
          deliveryOrder: {
            include: {
              customer: true,
              items: {
                include: {
                  product: true,
                },
              },
            },
          },
          shipment: {
            include: {
              armada: true,
              driver: true,
              shipmentItems: {
                include: {
                  product: true,
                },
              },
            },
          },
          warehouse: true,
          generatedBy: true,
        },
      });

      if (existingSpmbs.length > 0) {
        const shipmentForPdf = await tx.shipment.findUnique({
          where: { id },
          include: {
            armada: true,
            driver: true,
            shipmentItems: {
              include: {
                product: true,
                deliveryOrder: {
                  include: {
                    customer: true,
                  },
                },
              },
            },
          },
        });

        if (shipmentForPdf) {
          const isProd = process.env.NODE_ENV === 'production';
          const PUBLIC_DIR = isProd
            ? '/var/www/sajpoutbound.com/public'
            : path.join(process.cwd(), 'src', 'public');

          for (const spmb of existingSpmbs) {
            // Delete old PDF file
            if (spmb.documentPath) {
              const filePath = path.join(PUBLIC_DIR, spmb.documentPath);
              try {
                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath);
                }
              } catch (error) {
                console.error(`Failed to delete old SPMB file ${filePath}:`, error);
              }
            }

            // Regenerate PDF with updated shipment data (which includes new tally)
            const pdfPath = await spmbPdfService.generateSPMB(spmb, shipmentForPdf);

            // Update SPMB with new path
            await tx.sPMB.update({
              where: { id: spmb.id },
              data: {
                documentPath: pdfPath,
                updatedAt: jakartaTime,
              },
            });
          }
        }
      }

      // Log the update
      await shipmentLogService.logShipmentUpdate(
        id,
        performedById,
        { tally: shipment.tally },
        { tally: updatedShipment.tally },
        tx,
        `Tally diubah dari "${shipment.tally || ''}" menjadi "${updatedShipment.tally || ''}"`,
      );

      return updatedShipment;
    });
  },

  /**
   * Process individual shipment item weighing (vendor endpoint)
   */
  async individualWeighShipmentItem(
    shipmentItemId: string,
    weights: {
      grossWeight: number;
      netWeight?: number;
      tareWeight?: number;
    },
    performedById: string,
    code: string,
  ) {
    return prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Get the shipment item with all necessary relations
      const shipmentItem = await tx.shipmentItem.findUnique({
        where: {
          id: shipmentItemId,
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

      if (!shipmentItem) {
        return null;
      }

      // Update shipment status to PROSES if it's PENDING
      if (shipmentItem.shipment.status === STATUS.PENDING) {
        await tx.shipment.update({
          where: {
            id: shipmentItem.shipmentId,
          },
          data: {
            status: STATUS.PROSES,
            updatedAt: jakartaTime,
          },
        });
      }

      // Find or create ShipmentChosenProduct for this product in this shipment
      let shipmentChosenProduct = await tx.shipmentChosenProduct.findFirst({
        where: {
          shipmentId: shipmentItem.shipmentId,
          productId: shipmentItem.productId,
        },
      });

      // If no chosen product record exists yet, create one
      if (!shipmentChosenProduct) {
        shipmentChosenProduct = await tx.shipmentChosenProduct.create({
          data: {
            code,
            shipmentId: shipmentItem.shipmentId,
            productId: shipmentItem.productId,
            createdAt: jakartaTime,
            updatedAt: jakartaTime,
          },
        });
      }

      // Create a new weighing record FIRST
      const weighing = await tx.shipmentChosenProductWeighing.create({
        data: {
          shipmentChosenProductId: shipmentChosenProduct.id,
          grossWeight: weights.grossWeight,
          netWeight: weights.netWeight || 0,
          tareWeight: weights.tareWeight || 0,
          timeIn: shipmentChosenProduct.createdAt,
          timeOut: jakartaTime,
          createdAt: jakartaTime,
          updatedAt: jakartaTime,
        },
        include: {
          shipmentChosenProduct: {
            include: {
              product: true,
              shipment: {
                include: {
                  armada: true,
                  shipmentItems: {
                    include: {
                      deliveryOrder: {
                        include: {
                          customer: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Then update the shipment item with weight data and weighing link
      const updatedItem = await tx.shipmentItem.update({
        where: {
          id: shipmentItemId,
        },
        data: {
          weightedQuantity: weights.grossWeight,
          status: SHIPMENT_ITEM_STATUS.COMPLETED,
          weighedAt: jakartaTime,
          shipmentChosenProductWeighingId: weighing.id,
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

      // Generate Nota Timbangan PDF and save to DB
      const nanoid = customAlphabet('1234567890', 6);
      const ticketNumber = nanoid();
      const pdfPath = await notaTimbanganPdfService.generateNotaTimbangan(
        weighing,
        ticketNumber,
        shipmentItem.requestedQuantity,
      );

      await tx.notaTimbangan.create({
        data: {
          ticketNumber,
          documentPath: pdfPath,
          shipmentChosenProductWeighingId: weighing.id,
          createdAt: jakartaTime,
          updatedAt: jakartaTime,
        },
      });

      // Log the individual weighing operation
      await shipmentLogService.logItemWeighed(
        shipmentItem.shipmentId,
        performedById,
        shipmentItem,
        {
          grossWeight: weights.grossWeight,
          netWeight: weights.netWeight || 0,
          tareWeight: weights.tareWeight || 0,
        },
        tx,
      );

      // Return the formatted result
      return {
        shipmentItem: updatedItem,
        product: updatedItem.product,
        weights: {
          gross: weights.grossWeight,
          net: weights.netWeight || 0,
          tare: weights.tareWeight || 0,
        },
        weighedAt: jakartaTime,
      };
    });
  },

  /**
   * Get shipment item with shipment for validation
   */
  async getShipmentItemWithShipment(shipmentItemId: string) {
    return prisma.shipmentItem.findUnique({
      where: { id: shipmentItemId },
      include: {
        shipment: true,
      },
    });
  },

  /**
   * Cancel shipment item - Mode 1: Reflected to DO
   * This will cancel the item in shipment and reflect the cancellation to the delivery order
   * Note: Validation (existence, status) is done in controller
   */
  async cancelItemReflectedToDO(shipmentItemId: string) {
    return prisma.$transaction(async (tx) => {
      // Create Jakarta timezone date
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Get shipment item with all related data
      const shipmentItem = await tx.shipmentItem.findUnique({
        where: { id: shipmentItemId },
        include: {
          shipment: true,
          deliveryOrder: true,
          product: true,
        },
      });

      const { shipmentId, deliveryOrderId, productId, requestedQuantity, shipment, warehouseId } =
        shipmentItem!;

      // 1. Nota Timbangan - DO NOTHING (keep as historical record)

      // 2. Update DeliveryOrderItem quantities
      const deliveryOrderItem = await tx.deliveryOrderItem.findFirst({
        where: {
          deliveryOrderId,
          productId,
        },
      });

      if (deliveryOrderItem) {
        // Determine which quantity to reduce based on shipment status
        const isShipmentCompleted = shipment.status === STATUS.SELESAI;

        if (isShipmentCompleted) {
          // Shipment completed - move from completedQuantity to cancelledQuantity
          await tx.deliveryOrderItem.update({
            where: { id: deliveryOrderItem.id },
            data: {
              completedQuantity: Math.max(
                0,
                deliveryOrderItem.completedQuantity - requestedQuantity,
              ),
              cancelledQuantity: deliveryOrderItem.cancelledQuantity + requestedQuantity,
              updatedAt: jakartaTime,
            },
          });
        } else {
          // Shipment not completed - move from processingQuantity to cancelledQuantity
          await tx.deliveryOrderItem.update({
            where: { id: deliveryOrderItem.id },
            data: {
              processingQuantity: Math.max(
                0,
                deliveryOrderItem.processingQuantity - requestedQuantity,
              ),
              cancelledQuantity: deliveryOrderItem.cancelledQuantity + requestedQuantity,
              updatedAt: jakartaTime,
            },
          });
        }
      }

      // 3. Mark shipment item as CANCELLED (do this BEFORE SPMB regeneration so PDF sees the status)
      await tx.shipmentItem.update({
        where: { id: shipmentItemId },
        data: {
          status: SHIPMENT_ITEM_STATUS.CANCELLED,
          updatedAt: jakartaTime,
        },
      });

      // 4. Handle SPMB - Regenerate with cancelled item marked
      const spmb = await tx.sPMB.findFirst({
        where: {
          shipmentId,
          deliveryOrderId,
          warehouseId,
        },
      });

      if (spmb) {
        // Regenerate SPMB including the cancelled item (it will be marked as CANCELLED in PDF)
        const spmbData = await tx.sPMB.findUnique({
          where: { id: spmb.id },
          include: {
            shipment: {
              include: {
                armada: true,
                driver: true,
                shipmentItems: {
                  where: {
                    deliveryOrderId,
                    warehouseId,
                  },
                  include: {
                    product: true,
                    deliveryOrder: {
                      include: {
                        customer: true,
                      },
                    },
                  },
                },
              },
            },
            deliveryOrder: {
              include: {
                customer: true,
                items: {
                  include: {
                    product: true,
                  },
                },
              },
            },
            warehouse: true,
            generatedBy: true,
          },
        });

        if (spmbData && spmbData.shipment) {
          await spmbPdfService.generateSPMB(spmbData, spmbData.shipment);
        }
      }

      // 5. Check if all DO items are cancelled/completed
      const allDOItems = await tx.deliveryOrderItem.findMany({
        where: { deliveryOrderId },
      });

      const allItemsCancelled = allDOItems.every(
        (item) =>
          item.pendingQuantity === 0 &&
          item.processingQuantity === 0 &&
          item.completedQuantity === 0,
      );

      if (allItemsCancelled) {
        await tx.deliveryOrder.update({
          where: { id: deliveryOrderId },
          data: {
            status: STATUS.CANCEL,
            updatedAt: jakartaTime,
          },
        });
      }

      // 6. Check if all shipment items are cancelled
      const remainingActiveShipmentItems = await tx.shipmentItem.findMany({
        where: {
          shipmentId,
          status: { not: SHIPMENT_ITEM_STATUS.CANCELLED },
        },
      });

      if (remainingActiveShipmentItems.length === 0) {
        await tx.shipment.update({
          where: { id: shipmentId },
          data: {
            status: STATUS.CANCEL,
            updatedAt: jakartaTime,
          },
        });
      }

      return {
        message: 'Item cancelled successfully and reflected to delivery order',
        shipmentItemId,
      };
    });
  },

  /**
   * Cancel shipment item - Mode 2: Shipment Only
   * This will cancel the item only in shipment, returning quantity to pending in DO
   * Note: Validation (existence, status) is done in controller
   */
  async cancelItemShipmentOnly(shipmentItemId: string) {
    return prisma.$transaction(async (tx) => {
      // Create Jakarta timezone date
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Get shipment item with all related data
      const shipmentItem = await tx.shipmentItem.findUnique({
        where: { id: shipmentItemId },
        include: {
          shipment: true,
          deliveryOrder: true,
          product: true,
        },
      });

      const { shipmentId, deliveryOrderId, productId, requestedQuantity, shipment, warehouseId } =
        shipmentItem!;

      // 1. Nota Timbangan - DO NOTHING (keep as historical record)

      // 2. Return quantity to pending in DeliveryOrderItem
      const deliveryOrderItem = await tx.deliveryOrderItem.findFirst({
        where: {
          deliveryOrderId,
          productId,
        },
      });

      if (deliveryOrderItem) {
        const isShipmentCompleted = shipment.status === STATUS.SELESAI;

        if (isShipmentCompleted) {
          // Return from completedQuantity to pendingQuantity
          await tx.deliveryOrderItem.update({
            where: { id: deliveryOrderItem.id },
            data: {
              completedQuantity: Math.max(
                0,
                deliveryOrderItem.completedQuantity - requestedQuantity,
              ),
              pendingQuantity: deliveryOrderItem.pendingQuantity + requestedQuantity,
              updatedAt: jakartaTime,
            },
          });
        } else {
          // Return from processingQuantity to pendingQuantity
          await tx.deliveryOrderItem.update({
            where: { id: deliveryOrderItem.id },
            data: {
              processingQuantity: Math.max(
                0,
                deliveryOrderItem.processingQuantity - requestedQuantity,
              ),
              pendingQuantity: deliveryOrderItem.pendingQuantity + requestedQuantity,
              updatedAt: jakartaTime,
            },
          });
        }
      }

      // 3. Mark shipment item as CANCELLED (do this BEFORE SPMB regeneration so PDF sees the status)
      await tx.shipmentItem.update({
        where: { id: shipmentItemId },
        data: {
          status: SHIPMENT_ITEM_STATUS.CANCELLED,
          updatedAt: jakartaTime,
        },
      });

      // 4. Handle SPMB - Regenerate with cancelled item marked
      const spmb = await tx.sPMB.findFirst({
        where: {
          shipmentId,
          deliveryOrderId,
          warehouseId: shipmentItem?.warehouseId,
        },
      });

      if (spmb) {
        // Regenerate SPMB including the cancelled item (it will be marked as CANCELLED in PDF)
        const spmbData = await tx.sPMB.findUnique({
          where: { id: spmb.id },
          include: {
            shipment: {
              include: {
                armada: true,
                driver: true,
                shipmentItems: {
                  where: {
                    deliveryOrderId,
                    warehouseId,
                  },
                  include: {
                    product: true,
                    deliveryOrder: {
                      include: {
                        customer: true,
                      },
                    },
                  },
                },
              },
            },
            deliveryOrder: {
              include: {
                customer: true,
                items: {
                  include: {
                    product: true,
                  },
                },
              },
            },
            warehouse: true,
            generatedBy: true,
          },
        });

        if (spmbData && spmbData.shipment) {
          await spmbPdfService.generateSPMB(spmbData, spmbData.shipment);
        }
      }

      // 5. Check if all shipment items are cancelled
      const remainingActiveShipmentItems = await tx.shipmentItem.findMany({
        where: {
          shipmentId,
          status: { not: SHIPMENT_ITEM_STATUS.CANCELLED },
        },
      });

      if (remainingActiveShipmentItems.length === 0) {
        await tx.shipment.update({
          where: { id: shipmentId },
          data: {
            status: STATUS.CANCEL,
            updatedAt: jakartaTime,
          },
        });
      }

      return {
        message: 'Item cancelled from shipment, quantity returned to delivery order pending',
        shipmentItemId,
      };
    });
  },
};
