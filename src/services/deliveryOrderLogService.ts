import { ACTION, ENTITY_TYPE } from '@prisma/client';
import prisma from '../config/prisma';

/**
 * Service for handling delivery order logs
 */
export default {
  /**
   * Create a log entry for delivery order creation
   */
  async logDeliveryOrderCreation(
    deliveryOrderId: string,
    performedById: string,
    deliveryOrderData: Record<string, any>,
    tx?: any,
  ) {
    const client = tx || prisma;

    // Create a Jakarta timezone date (UTC+7)
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    return client.deliveryOrderLog.create({
      data: {
        deliveryOrderId,
        performedById,
        action: ACTION.CREATE,
        entityType: ENTITY_TYPE.DELIVERY_ORDER,
        newData: deliveryOrderData,
        description: 'Pesanan pengiriman dibuat',
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
    });
  },

  /**
   * Create a log entry for delivery order update
   */
  async logDeliveryOrderUpdate(
    deliveryOrderId: string,
    performedById: string,
    oldData: Record<string, any>,
    newData: Record<string, any>,
    tx?: any,
  ) {
    const client = tx || prisma;

    // Create a Jakarta timezone date (UTC+7)
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    return client.deliveryOrderLog.create({
      data: {
        deliveryOrderId,
        performedById,
        action: ACTION.UPDATE,
        entityType: ENTITY_TYPE.DELIVERY_ORDER,
        oldData,
        newData,
        description: 'Pesanan pengiriman diperbarui',
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
    });
  },

  /**
   * Create a log entry for delivery order deletion
   */
  async logDeliveryOrderDeletion(
    performedById: string,
    deliveryOrderData: Record<string, any>,
    tx?: any,
  ) {
    const client = tx || prisma;

    // Create a Jakarta timezone date (UTC+7)
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    return client.deliveryOrderLog.create({
      data: {
        performedById,
        action: ACTION.DELETE,
        entityType: ENTITY_TYPE.DELIVERY_ORDER,
        oldData: deliveryOrderData,
        description: 'Pesanan pengiriman dihapus',
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
    });
  },

  /**
   * Get logs for a specific delivery order
   */
  async getDeliveryOrderLogs(deliveryOrderId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.deliveryOrderLog.findMany({
        where: {
          deliveryOrderId,
        },
        include: {
          performedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.deliveryOrderLog.count({
        where: {
          deliveryOrderId,
        },
      }),
    ]);

    return {
      logs,
      total,
    };
  },

  /**
   * Get all delivery order logs
   */
  async getAllLogs(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.deliveryOrderLog.findMany({
        include: {
          performedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          deliveryOrder: {
            select: {
              id: true,
              customer: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.deliveryOrderLog.count(),
    ]);

    return {
      logs,
      total,
    };
  },

  /**
   * Create a log entry for customer change after weighing
   */
  async logCustomerChangeAfterWeighing(
    deliveryOrderId: string,
    performedById: string,
    oldCustomerId: string,
    newCustomerId: string,
    oldCustomerName?: string,
    newCustomerName?: string,
    tx?: any,
  ) {
    const client = tx || prisma;

    // Create a Jakarta timezone date (UTC+7)
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    return client.deliveryOrderLog.create({
      data: {
        deliveryOrderId,
        performedById,
        action: ACTION.UPDATE,
        entityType: ENTITY_TYPE.DELIVERY_ORDER,
        oldData: {
          customerId: oldCustomerId,
          customerName: oldCustomerName,
        },
        newData: {
          customerId: newCustomerId,
          customerName: newCustomerName,
        },
        description: `Pelanggan diubah dari "${oldCustomerName || 'Unknown'}" ke "${newCustomerName || 'Unknown'}" setelah penimbangan`,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
    });
  },

  /**
   * Create a log entry for DO revision after weighing
   */
  async logDORevisionAfterWeighing(
    deliveryOrderId: string,
    performedById: string,
    oldData: Record<string, any>,
    newData: Record<string, any>,
    tx?: any,
  ) {
    const client = tx || prisma;

    // Create a Jakarta timezone date (UTC+7)
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    // Create a detailed description of changes
    const changedItems = newData.items
      .map((newItem: any) => {
        const oldItem = oldData.items.find((old: any) => old.id === newItem.id);
        const oldQuantity = oldItem ? oldItem.quantity : 0;
        const newQuantity = newItem.quantity;
        return {
          productName: newItem.productName,
          oldQuantity,
          newQuantity,
        };
      })
      .filter((item: any) => item.oldQuantity !== item.newQuantity);

    const description = `DO direvisi setelah penimbangan. Item yang diubah: ${changedItems
      .map((item: any) => `${item.productName} (${item.oldQuantity} → ${item.newQuantity})`)
      .join(', ')}`;

    return client.deliveryOrderLog.create({
      data: {
        deliveryOrderId,
        performedById,
        action: ACTION.UPDATE,
        entityType: ENTITY_TYPE.DELIVERY_ORDER,
        oldData,
        newData,
        description,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
    });
  },
};
