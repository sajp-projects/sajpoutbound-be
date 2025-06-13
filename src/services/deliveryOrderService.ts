import { ACTION, ENTITY_TYPE, STATUS } from '@prisma/client';
import prisma from '../config/prisma';
import { DeliveryOrderCreateInput, DeliveryOrderUpdateInput } from '../schemas/deliveryOrder';
import deliveryOrderLogService from './deliveryOrderLogService';

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
   * @returns Object containing delivery orders array and total count
   */
  async getAllDeliveryOrders(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: STATUS,
  ) {
    const skip = (page - 1) * limit;

    const whereConditions: any = {
      deletedAt: null,
    };

    if (status) {
      whereConditions.status = status;
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
  async getDeliveryOrderById(id: string) {
    return prisma.deliveryOrder.findUnique({
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
            await tx.deliveryOrderItem.update({
              where: {
                id: item.id,
              },
              data: {
                productId: item.productId,
                quantity: item.quantity,
                pendingQuantity: item.quantity,
                updatedAt: jakartaTime,
              },
            });
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
};
