import { ACTION, ENTITY_TYPE } from '@prisma/client';
import prisma from '../config/prisma';

export default {
  /**
   * Log a warehouse creation event
   *
   * @param warehouseId The ID of the newly created warehouse
   * @param performedById The ID of the user who created the warehouse
   * @param warehouseData The data of the created warehouse
   * @param tx Optional transaction client
   * @returns The created log entry
   */
  async logWarehouseCreation(
    warehouseId: string,
    performedById: string,
    warehouseData: any,
    tx?: any,
  ) {
    const client = tx || prisma;
    return client.warehouseLog.create({
      data: {
        warehouseId,
        performedById,
        action: ACTION.CREATE,
        entityType: ENTITY_TYPE.WAREHOUSE,
        newData: warehouseData,
        description: `Membuat gudang baru: ${warehouseData.name}`,
      },
    });
  },

  /**
   * Log a warehouse update event
   *
   * @param warehouseId The ID of the updated warehouse
   * @param performedById The ID of the user who performed the update
   * @param oldData The previous state of the data
   * @param newData The new state of the data
   * @param tx Optional transaction client
   * @param description Optional custom description
   * @returns The created log entry
   */
  async logWarehouseUpdate(
    warehouseId: string,
    performedById: string,
    oldData: any,
    newData: any,
    tx?: any,
    description?: string,
  ) {
    const client = tx || prisma;
    return client.warehouseLog.create({
      data: {
        warehouseId,
        performedById,
        action: ACTION.UPDATE,
        entityType: ENTITY_TYPE.WAREHOUSE,
        oldData,
        newData,
        description: description || 'Mengubah informasi gudang',
      },
    });
  },

  /**
   * Get all warehouse logs with pagination
   *
   * @param page The page number (1-based)
   * @param limit The number of items per page
   * @returns Object containing logs array and total count
   */
  async getAllWarehouseLogs(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.warehouseLog.findMany({
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          warehouse: true,
          performedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.warehouseLog.count(),
    ]);

    return {
      logs,
      total,
    };
  },

  /**
   * Get all logs for a specific warehouse
   *
   * @param warehouseId The ID of the warehouse to get logs for
   * @param page The page number (1-based)
   * @param limit The number of items per page
   * @returns Object containing logs array and total count
   */
  async getWarehouseLogs(warehouseId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.warehouseLog.findMany({
        where: {
          warehouseId,
        },
        include: {
          warehouse: true,
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
      prisma.warehouseLog.count({
        where: {
          warehouseId,
        },
      }),
    ]);

    return {
      logs,
      total,
    };
  },
};
