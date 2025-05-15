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
    return client.deliveryOrderLog.create({
      data: {
        deliveryOrderId,
        performedById,
        action: ACTION.CREATE,
        entityType: ENTITY_TYPE.DELIVERY_ORDER,
        newData: deliveryOrderData,
        description: 'Delivery Order created',
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
    return client.deliveryOrderLog.create({
      data: {
        deliveryOrderId,
        performedById,
        action: ACTION.UPDATE,
        entityType: ENTITY_TYPE.DELIVERY_ORDER,
        oldData,
        newData,
        description: 'Delivery Order updated',
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
    return client.deliveryOrderLog.create({
      data: {
        performedById,
        action: ACTION.DELETE,
        entityType: ENTITY_TYPE.DELIVERY_ORDER,
        oldData: deliveryOrderData,
        description: 'Delivery Order deleted',
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
};
