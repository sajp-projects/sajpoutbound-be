import {
  ACTION, ENTITY_TYPE, STATUS, 
} from '@prisma/client';
import fs from 'fs';
import { customAlphabet } from 'nanoid';
import path from 'path';
import prisma from '../config/prisma';
import { DeliveryOrderCreateInput, DeliveryOrderUpdateInput } from '../schemas/deliveryOrder';
import deliveryOrderLogService from './deliveryOrderLogService';
import notaTimbanganPdfService from './notaTimbanganPdfService';
import shipmentLogService from './shipmentLogService';
import spmbPdfService from './spmbPdfService';

/**
 * Service for handling delivery order operations
 */
export default {
  /**
   * Get all delivery orders with pagination and search
   *
   * @param page The page number (1-based)
   * @param limit The number of items per page
   * @param search Optional search term
   * @param status Optional status filter
   * @param availableOnly Optional filter to only show DOs with available items (pendingQuantity > 0)
   * @returns Object containing delivery orders array and total count
   */
  async getAllDeliveryOrders(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: STATUS,
    availableOnly?: boolean,
  ) {
    const skip = (page - 1) * limit;

    const whereConditions: any = {
      deletedAt: null,
    };

    if (status) {
      whereConditions.status = status;
    }

    // Filter untuk DO yang masih memiliki barang dengan pendingQuantity > 0
    if (availableOnly) {
      whereConditions.items = {
        some: {
          pendingQuantity: {
            gt: 0,
          },
        },
      };
    }

    if (search) {
      whereConditions.OR = [
        {
          customer: {
            name: {
              contains: search,
            },
          },
        },
        {
          address: {
            contains: search,
          },
        },
        {
          internalNote: {
            contains: search,
          },
        },
        {
          doNumber: {
            contains: search,
          },
        },
      ];
    }

    const [deliveryOrders, total] = await Promise.all([
      prisma.deliveryOrder.findMany({
        where: whereConditions,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  satuan: true,
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
      prisma.deliveryOrder.count({
        where: whereConditions,
      }),
    ]);

    return {
      deliveryOrders,
      total,
    };
  },

  /**
   * Get a delivery order by ID
   */
  async getDeliveryOrderById(id: string, shipmentId?: string) {
    const deliveryOrder = await prisma.deliveryOrder.findUnique({
      where: {
        id,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                satuan: true,
              },
            },
          },
        },
      },
    });

    if (!deliveryOrder) return null;

    // If shipmentId is provided, filter items to only include those that are part of the shipment
    if (shipmentId) {
      // Get shipment items for this DO
      const shipmentItems = await prisma.shipmentItem.findMany({
        where: {
          shipmentId,
          deliveryOrderId: id,
        },
        select: {
          productId: true,
        },
      });

      // Create a set of product IDs that are part of the shipment
      const shipmentProductIds = new Set(shipmentItems.map((item) => item.productId));

      // Filter DO items to only include those that are part of the shipment
      deliveryOrder.items = deliveryOrder.items.filter((item) =>
        shipmentProductIds.has(item.productId),
      );
    }

    return deliveryOrder;
  },

  /**
   * Create a new delivery order with items
   */
  async createDeliveryOrder(
    data: DeliveryOrderCreateInput,
    performedById: string,
    doNumber: string,
  ) {
    return prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Create the delivery order
      const deliveryOrder = await tx.deliveryOrder.create({
        data: {
          customerId: data.customerId,
          address: data.address,
          internalNote: data.internalNote,
          doNumber,
          createdAt: jakartaTime,
          updatedAt: jakartaTime,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              pendingQuantity: item.quantity,
              processingQuantity: 0,
              completedQuantity: 0,
              createdAt: jakartaTime,
              updatedAt: jakartaTime,
            })),
          },
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  satuan: true,
                },
              },
            },
          },
        },
      });

      // Prepare data for logging
      const deliveryOrderDataToLog = {
        id: deliveryOrder.id,
        customerId: deliveryOrder.customerId,
        customerName: deliveryOrder.customer.name,
        address: deliveryOrder.address,
        doNumber: deliveryOrder.doNumber,
        internalNote: deliveryOrder.internalNote,
        items: deliveryOrder.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
        })),
      };

      // Create log entry
      await deliveryOrderLogService.logDeliveryOrderCreation(
        deliveryOrder.id,
        performedById,
        deliveryOrderDataToLog,
        tx,
      );

      return deliveryOrder;
    });
  },

  /**
   * Update a delivery order
   */
  async updateDeliveryOrder(
    id: string,
    data: DeliveryOrderUpdateInput,
    performedById: string,
    oldDeliveryOrder: NonNullable<Awaited<ReturnType<typeof this.getDeliveryOrderById>>>,
  ) {
    return prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Prepare update data and track changes
      const updateData: any = {
        updatedAt: jakartaTime,
      };

      const oldDataChanges: Record<string, any> = {};
      const newDataChanges: Record<string, any> = {};

      // Update simple fields if provided
      if (data.customerId) {
        updateData.customerId = data.customerId;
        oldDataChanges.customerId = oldDeliveryOrder.customerId;
        oldDataChanges.customerName = oldDeliveryOrder.customer.name;
        newDataChanges.customerId = data.customerId;
      }

      if (data.address) {
        updateData.address = data.address;
        oldDataChanges.address = oldDeliveryOrder.address;
        newDataChanges.address = data.address;
      }

      if (data.internalNote) {
        updateData.internalNote = data.internalNote;
        oldDataChanges.internalNote = oldDeliveryOrder.internalNote;
        newDataChanges.internalNote = data.internalNote;
      }

      // Handle items update if provided
      if (data.items && data.items.length > 0) {
        // Track old items for logging
        oldDataChanges.items = oldDeliveryOrder.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
        }));

        // Items with IDs to update
        const itemsToUpdate = data.items.filter((item) => item.id);

        // Items without IDs to create
        const itemsToCreate = data.items.filter((item) => !item.id);

        // Get all item IDs in the update data
        const updatedItemIds = itemsToUpdate.map((item) => item.id).filter(Boolean) as string[];

        // Find items to delete (ones in the DB but not in the update data)
        const itemsToDeleteIds = oldDeliveryOrder.items
          .filter((item) => !updatedItemIds.includes(item.id))
          .map((item) => item.id);

        // Delete items that are no longer needed
        if (itemsToDeleteIds.length > 0) {
          await tx.deliveryOrderItem.deleteMany({
            where: {
              id: {
                in: itemsToDeleteIds,
              },
            },
          });
        }

        // Update existing items
        for (const item of itemsToUpdate) {
          if (item.id) {
            // Fetch the current item state
            const currentItem = oldDeliveryOrder.items.find((i) => i.id === item.id);
            if (currentItem) {
              const diff = item.quantity - currentItem.quantity;
              const newPending = Math.max(currentItem.pendingQuantity + diff, 0);

              await tx.deliveryOrderItem.update({
                where: {
                  id: item.id,
                },
                data: {
                  productId: item.productId,
                  quantity: item.quantity,
                  pendingQuantity: newPending,
                  updatedAt: jakartaTime,
                },
              });
            }
          }
        }

        // Create new items
        if (itemsToCreate.length > 0) {
          await tx.deliveryOrderItem.createMany({
            data: itemsToCreate.map((item) => ({
              deliveryOrderId: id,
              productId: item.productId,
              quantity: item.quantity,
              pendingQuantity: item.quantity,
              processingQuantity: 0,
              completedQuantity: 0,
              createdAt: jakartaTime,
              updatedAt: jakartaTime,
            })),
          });
        }

        // Track new items for logging - improved to include product names
        const updatedItems = await tx.deliveryOrderItem.findMany({
          where: {
            deliveryOrderId: id,
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

        newDataChanges.items = updatedItems.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
        }));
      }

      // Update the delivery order
      const updatedDeliveryOrder = await tx.deliveryOrder.update({
        where: {
          id,
        },
        data: updateData,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  satuan: true,
                },
              },
            },
          },
        },
      });

      // Only log if there were changes
      if (Object.keys(oldDataChanges).length > 0) {
        await deliveryOrderLogService.logDeliveryOrderUpdate(
          id,
          performedById,
          oldDataChanges,
          newDataChanges,
          tx,
        );
      }

      return updatedDeliveryOrder;
    });
  },

  /**
   * Delete a delivery order
   */
  async deleteDeliveryOrder(existingDeliveryOrder: any, performedById: string) {
    return prisma.$transaction(async (tx) => {
      // Prepare data for logging
      const deliveryOrderDataToLog = {
        id: existingDeliveryOrder.id,
        customerId: existingDeliveryOrder.customerId,
        customerName: existingDeliveryOrder.customer.name,
        address: existingDeliveryOrder.address,
        internalNote: existingDeliveryOrder.internalNote,
        items: existingDeliveryOrder.items.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
        })),
      };

      // Log the deletion before actually deleting
      await deliveryOrderLogService.logDeliveryOrderDeletion(
        performedById,
        deliveryOrderDataToLog,
        tx,
      );

      // Delete all items first
      await tx.deliveryOrderItem.deleteMany({
        where: {
          deliveryOrderId: existingDeliveryOrder.id,
        },
      });

      // Then delete the delivery order
      return tx.deliveryOrder.delete({
        where: {
          id: existingDeliveryOrder.id,
        },
      });
    });
  },

  /**
   * Get all archived (soft-deleted) delivery orders with pagination and search
   *
   * @param page The page number (1-based)
   * @param limit The number of items per page
   * @param search Optional search term
   * @returns Object containing archived delivery orders array and total count
   */
  async getArchivedDeliveryOrders(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;

    const whereConditions: any = {
      deletedAt: {
        not: null,
      }, // Only get deleted delivery orders
    };

    if (search) {
      whereConditions.OR = [
        {
          customer: {
            name: {
              contains: search,
            },
          },
        },
        {
          address: {
            contains: search,
          },
        },
        {
          internalNote: {
            contains: search,
          },
        },
      ];
    }

    const [deliveryOrders, total] = await Promise.all([
      prisma.deliveryOrder.findMany({
        where: whereConditions,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  satuan: true,
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
      prisma.deliveryOrder.count({
        where: whereConditions,
      }),
    ]);

    return {
      deliveryOrders,
      total,
    };
  },

  /**
   * Soft delete a delivery order
   */
  async softDeleteDeliveryOrder(existingDeliveryOrder: any, performedById: string) {
    return prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Prepare data for logging
      const deliveryOrderDataToLog = {
        id: existingDeliveryOrder.id,
        customerId: existingDeliveryOrder.customerId,
        customerName: existingDeliveryOrder.customer.name,
        address: existingDeliveryOrder.address,
        doNumber: existingDeliveryOrder.doNumber,
        internalNote: existingDeliveryOrder.internalNote,
        items: existingDeliveryOrder.items.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
        })),
      };

      // Log the soft deletion
      await deliveryOrderLogService.logDeliveryOrderDeletion(
        performedById,
        deliveryOrderDataToLog,
        tx,
      );

      // Update the delivery order with deletedAt timestamp
      return tx.deliveryOrder.update({
        where: {
          id: existingDeliveryOrder.id,
        },
        data: {
          deletedAt: jakartaTime,
          updatedAt: jakartaTime,
        },
      });
    });
  },

  /**
   * Restore (unarchive) a delivery order
   */
  async restoreDeliveryOrder(existingDeliveryOrder: any, performedById: string) {
    return prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Prepare data for logging
      const deliveryOrderDataToLog = {
        id: existingDeliveryOrder.id,
        customerId: existingDeliveryOrder.customerId,
        customerName: existingDeliveryOrder.customer.name,
        address: existingDeliveryOrder.address,
        internalNote: existingDeliveryOrder.internalNote,
        items: existingDeliveryOrder.items.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
        })),
      };

      // Create log entry for restoration
      await tx.deliveryOrderLog.create({
        data: {
          deliveryOrderId: existingDeliveryOrder.id,
          performedById,
          action: ACTION.RESTORE,
          entityType: ENTITY_TYPE.DELIVERY_ORDER,
          oldData: {
            deletedAt: existingDeliveryOrder.deletedAt,
          },
          newData: deliveryOrderDataToLog,
          description: 'Delivery Order restored',
        },
      });

      // Update the delivery order to remove deletedAt
      return tx.deliveryOrder.update({
        where: {
          id: existingDeliveryOrder.id,
        },
        data: {
          deletedAt: null,
          updatedAt: jakartaTime,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  satuan: true,
                },
              },
            },
          },
        },
      });
    });
  },

  /**
   * Get all delivery orders for a specific customer
   *
   * @param customerId The ID of the customer
   * @returns Array of active delivery orders for the customer
   */
  async getCustomerDeliveryOrders(customerId: string) {
    return prisma.deliveryOrder.findMany({
      where: {
        customerId,
        deletedAt: null,
      },
      take: 1,
    });
  },

  /**
   * Get all delivery order items for a specific product
   *
   * @param productId The ID of the product
   * @returns Array of delivery order items containing the product
   */
  async getProductDeliveryOrderItems(productId: string) {
    return prisma.deliveryOrderItem.findMany({
      where: {
        productId,
        deliveryOrder: {
          deletedAt: null,
        },
      },
      take: 1,
    });
  },

  /**
   * Get multiple delivery orders by their IDs
   */
  async getDeliveryOrdersByIds(ids: string[]) {
    return prisma.deliveryOrder.findMany({
      where: {
        id: {
          in: ids,
        },
        deletedAt: null,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                satuan: true,
              },
            },
          },
        },
      },
    });
  },

  async getDeliveryOrderByDoNumber(doNumber: string) {
    return prisma.deliveryOrder.findUnique({
      where: {
        doNumber,
      },
    });
  },

  /**
   * Get all shipments that use items from a given delivery order
   */
  async getShipmentsByDeliveryOrderId(deliveryOrderId: string) {
    return prisma.shipment.findMany({
      where: {
        shipmentItems: {
          some: {
            deliveryOrderId,
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
            deliveryOrderId,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                satuan: true,
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
   * Change customer of a delivery order
   * Pure business logic - no validation/error throwing
   *
   * @param deliveryOrderId The delivery order ID
   * @param customerId The new customer ID
   * @returns Updated delivery order or null if not found
   */
  async changeCustomerAfterWeighing(
    deliveryOrderId: string,
    customerId: string,
    performedById: string,
  ) {
    return await prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Get the current delivery order
      const deliveryOrder = await tx.deliveryOrder.findFirst({
        where: {
          id: deliveryOrderId,
          deletedAt: null,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!deliveryOrder) {
        return null; // Let controller handle error
      }

      // Get old customer name for better logging
      const oldCustomer = await tx.customer.findUnique({
        where: {
          id: deliveryOrder.customerId,
        },
        select: {
          name: true,
        },
      });

      // Update the delivery order
      const updatedDeliveryOrder = await tx.deliveryOrder.update({
        where: {
          id: deliveryOrderId,
        },
        data: {
          customerId,
          updatedAt: jakartaTime,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  satuan: true,
                },
              },
            },
          },
        },
      });

      // Find and regenerate SPMBs for this delivery order
      const existingSpmbs = await tx.sPMB.findMany({
        where: {
          deliveryOrderId,
        },
        select: {
          id: true,
          documentPath: true,
          shipmentId: true,
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
              console.log(`Deleted old SPMB file during customer change: ${filePath}`);
            }
          } catch (error) {
            console.error(`Failed to delete SPMB file during customer change ${filePath}:`, error);
            // Continue with regeneration even if file deletion fails
          }
        }
      }

      // Regenerate SPMBs with new customer information
      for (const existingSpmb of existingSpmbs) {
        // Generate a unique SPMB code
        const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);
        const spmbCode = `SPMB-${nanoid()}`;

        // Update the SPMB with new code
        const spmb = await tx.sPMB.update({
          where: {
            id: existingSpmb.id,
          },
          data: {
            code: spmbCode,
            documentPath: null, // Will be updated after PDF generation
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
                shipmentItems: {
                  include: {
                    product: true,
                  },
                },
              },
            },
          },
        });

        // Get the complete shipment data for PDF generation
        const shipmentForPdf = await tx.shipment.findUnique({
          where: {
            id: existingSpmb.shipmentId,
          },
          include: {
            armada: true,
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
          await tx.sPMB.update({
            where: {
              id: spmb.id,
            },
            data: {
              documentPath: pdfPath,
            },
          });
        }
      }

      // Also regenerate nota timbangan documents since they contain customer information
      const existingWeighings = await tx.shipmentChosenProductWeighing.findMany({
        where: {
          shipmentChosenProduct: {
            shipment: {
              shipmentItems: {
                some: {
                  deliveryOrderId,
                },
              },
            },
          },
        },
        include: {
          notaTimbangan: {
            select: {
              id: true,
              documentPath: true,
              ticketNumber: true,
            },
          },
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

      // Regenerate nota timbangan for weighings related to this delivery order
      for (const weighing of existingWeighings) {
        if (weighing.notaTimbangan) {
          // Delete old nota timbangan file
          if (weighing.notaTimbangan.documentPath) {
            const filePath = path.join(PUBLIC_DIR, weighing.notaTimbangan.documentPath);
            try {
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Deleted old nota timbangan file during customer change: ${filePath}`);
              }
            } catch (error) {
              console.error(
                `Failed to delete nota timbangan file during customer change ${filePath}:`,
                error,
              );
              // Continue with regeneration even if file deletion fails
            }
          }

          // Generate new nota timbangan PDF with updated customer
          const nanoid = customAlphabet('1234567890', 6);
          const ticketNumber = nanoid();
          const pdfPath = await notaTimbanganPdfService.generateNotaTimbangan(
            weighing,
            ticketNumber,
          );

          // Update nota timbangan record
          await tx.notaTimbangan.update({
            where: {
              id: weighing.notaTimbangan.id,
            },
            data: {
              ticketNumber,
              documentPath: pdfPath,
              updatedAt: jakartaTime,
            },
          });
        }
      }

      // Log the customer change with enhanced logging
      await deliveryOrderLogService.logCustomerChangeAfterWeighing(
        deliveryOrderId,
        performedById,
        deliveryOrder.customerId,
        customerId,
        oldCustomer?.name,
        updatedDeliveryOrder.customer.name,
        tx,
      );

      // Also log to related shipments
      const relatedShipments = await tx.shipment.findMany({
        where: {
          shipmentItems: {
            some: {
              deliveryOrderId,
            },
          },
        },
        include: {
          shipmentItems: {
            where: {
              deliveryOrderId,
            },
            include: {
              product: true,
            },
          },
        },
      });

      // Log to each related shipment
      for (const shipment of relatedShipments) {
        await shipmentLogService.logCustomerChangeAfterWeighing(
          shipment.id,
          performedById,
          oldCustomer?.name || 'Unknown',
          updatedDeliveryOrder.customer.name,
          tx,
        );
      }

      return updatedDeliveryOrder;
    });
  },

  /**
   * Revise delivery order items with weight recalculation
   * Pure business logic - no validation/error throwing
   *
   * @param deliveryOrderId The delivery order ID
   * @param revisedItems Array of revised items with new quantities
   * @returns Updated delivery order or null if not found
   */
  async reviseDeliveryOrderAfterWeighing(
    deliveryOrderId: string,
    revisedItems: any[],
    performedById: string,
  ) {
    return await prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Get the current delivery order with weighing data
      const deliveryOrder = await tx.deliveryOrder.findFirst({
        where: {
          id: deliveryOrderId,
          deletedAt: null,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!deliveryOrder) {
        return null; // Let controller handle error
      }

      // Get weighing data for weight recalculation
      const shipmentItems = await tx.shipmentItem.findMany({
        where: {
          deliveryOrderId: deliveryOrder.id,
        },
        include: {
          shipment: {
            include: {
              chosenProducts: {
                where: {
                  productId: {
                    in: deliveryOrder.items.map((item) => item.productId),
                  },
                },
                include: {
                  weighings: {
                    include: {
                      notaTimbangan: {
                        select: {
                          id: true,
                          documentPath: true,
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

      // Store old data for logging
      const oldData = deliveryOrder.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        productId: item.productId,
        productName: item.product.name,
      }));

      // Track weighings that need to be updated for nota timbangan regeneration
      const weighingsToUpdate: any[] = [];

      // Process each revised item
      for (const revisedItem of revisedItems) {
        const existingItem = deliveryOrder.items.find((item) => item.id === revisedItem.id);

        if (!existingItem) {
          return {
            error: `Item dengan ID ${revisedItem.id} tidak ditemukan`,
          };
        }

        // Calculate weight per unit from original weighing if available
        let weightPerUnit = 0;
        const relatedShipmentItem = shipmentItems.find(
          (si) => si.productId === existingItem.productId,
        );

        if (relatedShipmentItem?.shipment?.chosenProducts) {
          const chosenProduct = relatedShipmentItem.shipment.chosenProducts.find(
            (cp) => cp.productId === existingItem.productId,
          );

          if (chosenProduct && chosenProduct.weighings.length > 0) {
            const totalWeight = chosenProduct.weighings[0].grossWeight || 0;
            // Use shipment requested quantity, not DO quantity for weight per unit calculation
            const originalShipmentQuantity = relatedShipmentItem.requestedQuantity;
            weightPerUnit =
              originalShipmentQuantity > 0 ? totalWeight / originalShipmentQuantity : 0;
          }
        }

        // Calculate the ratio for proportional recalculation
        const originalQuantity = existingItem.quantity;
        const newQuantity = revisedItem.quantity;
        const ratio = originalQuantity > 0 ? newQuantity / originalQuantity : 1;

        // Recalculate all status quantities proportionally
        const newCompletedQuantity = Math.round(existingItem.completedQuantity * ratio);
        const newProcessingQuantity = Math.round(existingItem.processingQuantity * ratio);
        const newPendingQuantity = Math.max(
          0,
          newQuantity - newCompletedQuantity - newProcessingQuantity,
        );

        await tx.deliveryOrderItem.update({
          where: {
            id: revisedItem.id,
          },
          data: {
            quantity: newQuantity,
            completedQuantity: newCompletedQuantity,
            processingQuantity: newProcessingQuantity,
            pendingQuantity: newPendingQuantity,
            updatedAt: jakartaTime,
          },
        });

        // Update related shipment items with recalculated quantities if they exist
        if (relatedShipmentItem) {
          // Recalculate the shipment item quantities proportionally
          const newRequestedQuantity = Math.round(relatedShipmentItem.requestedQuantity * ratio);
          let newWeightedQuantity = relatedShipmentItem.weightedQuantity;

          // If item was previously weighed, recalculate based on weight per unit
          if (weightPerUnit > 0) {
            newWeightedQuantity = newRequestedQuantity * weightPerUnit;
          } else {
            // If no weighing data, scale the weighted quantity proportionally
            newWeightedQuantity = relatedShipmentItem.weightedQuantity
              ? Math.round(relatedShipmentItem.weightedQuantity * ratio)
              : null;
          }

          await tx.shipmentItem.update({
            where: {
              id: relatedShipmentItem.id,
            },
            data: {
              requestedQuantity: newRequestedQuantity,
              weightedQuantity: newWeightedQuantity,
              updatedAt: jakartaTime,
            },
          });

          // Update weighing records if they exist
          if (relatedShipmentItem.shipment?.chosenProducts) {
            const chosenProduct = relatedShipmentItem.shipment.chosenProducts.find(
              (cp) => cp.productId === existingItem.productId,
            );

            if (chosenProduct && chosenProduct.weighings.length > 0 && weightPerUnit > 0) {
              // Update the weighing record with recalculated weight based on new requested quantity
              const newGrossWeight = newRequestedQuantity * weightPerUnit;

              // Also scale net weight proportionally if it exists
              const currentWeighing = chosenProduct.weighings[0];
              const newNetWeight = currentWeighing.netWeight
                ? Math.round(currentWeighing.netWeight * ratio)
                : null;

              await tx.shipmentChosenProductWeighing.updateMany({
                where: {
                  shipmentChosenProductId: chosenProduct.id,
                },
                data: {
                  grossWeight: newGrossWeight,
                  netWeight: newNetWeight,
                  updatedAt: jakartaTime,
                },
              });

              // Track this weighing for nota timbangan regeneration
              weighingsToUpdate.push({
                weighingId: currentWeighing.id,
                shipmentChosenProductId: chosenProduct.id,
                grossWeight: newGrossWeight,
                netWeight: newNetWeight,
                tareWeight: currentWeighing.tareWeight || 0,
                timeIn: currentWeighing.timeIn,
                timeOut: currentWeighing.timeOut,
                notaTimbangan: currentWeighing.notaTimbangan,
              });
            }
          }
        }
      }

      // Delete old nota timbangan files and regenerate them
      const isProd = process.env.NODE_ENV === 'production';
      const PUBLIC_DIR = isProd
        ? '/var/www/sajpoutbound.com/public'
        : path.join(process.cwd(), 'src', 'public');

      for (const weighingUpdate of weighingsToUpdate) {
        // Delete old nota timbangan file if it exists
        if (weighingUpdate.notaTimbangan?.documentPath) {
          const filePath = path.join(PUBLIC_DIR, weighingUpdate.notaTimbangan.documentPath);
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`Deleted old nota timbangan file during DO revision: ${filePath}`);
            }
          } catch (error) {
            console.error(
              `Failed to delete nota timbangan file during DO revision ${filePath}:`,
              error,
            );
            // Continue with regeneration even if file deletion fails
          }
        }

        // Get updated weighing data for PDF generation
        const updatedWeighing = await tx.shipmentChosenProductWeighing.findUnique({
          where: {
            id: weighingUpdate.weighingId,
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

        if (updatedWeighing) {
          // Generate new nota timbangan PDF
          const nanoid = customAlphabet('1234567890', 6);
          const ticketNumber = nanoid();
          const pdfPath = await notaTimbanganPdfService.generateNotaTimbangan(
            updatedWeighing,
            ticketNumber,
          );

          // Update nota timbangan record
          if (weighingUpdate.notaTimbangan?.id) {
            await tx.notaTimbangan.update({
              where: {
                id: weighingUpdate.notaTimbangan.id,
              },
              data: {
                ticketNumber,
                documentPath: pdfPath,
                updatedAt: jakartaTime,
              },
            });
          } else {
            // Create new nota timbangan if it doesn't exist
            await tx.notaTimbangan.create({
              data: {
                ticketNumber,
                documentPath: pdfPath,
                shipmentChosenProductWeighingId: weighingUpdate.weighingId,
                createdAt: jakartaTime,
                updatedAt: jakartaTime,
              },
            });
          }
        }
      }

      // Regenerate SPMBs for this delivery order
      const existingSpmbs = await tx.sPMB.findMany({
        where: {
          deliveryOrderId,
        },
        select: {
          id: true,
          documentPath: true,
          shipmentId: true,
        },
      });

      // Delete existing SPMB PDF files from file system
      for (const spmb of existingSpmbs) {
        if (spmb.documentPath) {
          const filePath = path.join(PUBLIC_DIR, spmb.documentPath);
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`Deleted old SPMB file during DO revision: ${filePath}`);
            }
          } catch (error) {
            console.error(`Failed to delete SPMB file during DO revision ${filePath}:`, error);
            // Continue with regeneration even if file deletion fails
          }
        }
      }

      // Regenerate SPMBs with updated quantities
      for (const existingSpmb of existingSpmbs) {
        // Generate a unique SPMB code
        const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);
        const spmbCode = `SPMB-${nanoid()}`;

        // Update the SPMB with new code
        const spmb = await tx.sPMB.update({
          where: {
            id: existingSpmb.id,
          },
          data: {
            code: spmbCode,
            documentPath: null, // Will be updated after PDF generation
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
                shipmentItems: {
                  include: {
                    product: true,
                  },
                },
              },
            },
          },
        });

        // Get the complete shipment data for PDF generation
        const shipmentForPdf = await tx.shipment.findUnique({
          where: {
            id: existingSpmb.shipmentId,
          },
          include: {
            armada: true,
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
          await tx.sPMB.update({
            where: {
              id: spmb.id,
            },
            data: {
              documentPath: pdfPath,
            },
          });
        }
      }

      // Get updated delivery order
      const updatedDeliveryOrder = await tx.deliveryOrder.findFirst({
        where: {
          id: deliveryOrderId,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  satuan: true,
                },
              },
            },
          },
        },
      });

      // Prepare old and new data for logging
      const oldDataForLog = {
        items: oldData,
      };

      const newDataForLog = {
        items: updatedDeliveryOrder?.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
        })),
      };

      // Log the revision with enhanced logging
      await deliveryOrderLogService.logDORevisionAfterWeighing(
        deliveryOrderId,
        performedById,
        oldDataForLog,
        newDataForLog,
        tx,
      );

      // Also log to related shipments - fetch UPDATED shipment data after calculations
      const relatedShipmentsForLog = await tx.shipment.findMany({
        where: {
          shipmentItems: {
            some: {
              deliveryOrderId,
            },
          },
        },
        include: {
          shipmentItems: {
            where: {
              deliveryOrderId,
            },
            include: {
              product: true,
            },
          },
          chosenProducts: {
            include: {
              weighings: true,
              product: true,
            },
          },
        },
      });

      // Log to each related shipment
      for (const shipment of relatedShipmentsForLog) {
        // Only include items that were actually revised and are used in this shipment
        const affectedItems = shipment.shipmentItems
          .filter((item) => {
            // Check if this item was revised by comparing with revisedItems
            const wasRevised = revisedItems.some((revisedItem) => {
              const doItem = deliveryOrder.items.find((doItem) => doItem.id === revisedItem.id);
              return doItem && doItem.productId === item.productId;
            });
            return wasRevised;
          })
          .map((item) => {
            // Find the original quantities from the old delivery order data
            const oldItem = deliveryOrder.items.find(
              (doItem) => doItem.productId === item.productId,
            );
            const newItem = updatedDeliveryOrder?.items.find(
              (doItem) => doItem.productId === item.productId,
            );
            const chosenProduct = shipment.chosenProducts.find(
              (cp) => cp.productId === item.productId,
            );

            const oldDoQuantity = oldItem?.quantity || 0;
            const newDoQuantity = newItem?.quantity || 0;
            const ratio = oldDoQuantity > 0 ? newDoQuantity / oldDoQuantity : 1;

            // Find the original shipment item data from the shipmentItems we fetched earlier
            const originalShipmentItem = shipmentItems.find((si) => si.id === item.id);
            const oldRequestedQuantity =
              originalShipmentItem?.requestedQuantity || item.requestedQuantity;

            // Calculate the new quantities (this mirrors the calculation logic above)
            const newRequestedQuantity = Math.round(oldRequestedQuantity * ratio);

            // Get weighing data - calculate the new weight based on the ratio and weight per unit
            const oldWeighing = chosenProduct?.weighings?.[0]?.grossWeight || 0;

            // Calculate the new weight based on the new requested quantity and weight per unit
            let newWeighing = oldWeighing;
            if (oldRequestedQuantity > 0) {
              const weightPerUnitFromOld = oldWeighing / oldRequestedQuantity;
              newWeighing = newRequestedQuantity * weightPerUnitFromOld;
            }

            return {
              productName: item.product.name,
              oldProcessedQuantity: oldRequestedQuantity,
              oldPendingQuantity: oldDoQuantity - oldRequestedQuantity,
              oldWeighing: oldWeighing,
              newProcessedQuantity: newRequestedQuantity,
              newPendingQuantity: newDoQuantity - newRequestedQuantity,
              newWeighing: newWeighing,
            };
          });

        // Only log if there are actually affected items
        if (affectedItems.length > 0) {
          await shipmentLogService.logDORevisionAfterWeighing(
            shipment.id,
            performedById,
            deliveryOrderId,
            affectedItems,
            tx,
          );
        }
      }

      return updatedDeliveryOrder;
    });
  },
};
