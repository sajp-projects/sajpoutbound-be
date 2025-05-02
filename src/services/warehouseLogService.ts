import {
  ACTION, ENTITY_TYPE, WarehouseLog, 
} from '@prisma/client';
import prisma from '../config/prisma';

interface RawWarehouseLog extends WarehouseLog {
  warehouse: {
    id: string | null;
    name: string | null;
    description: string | null;
  };
  performedBy: {
    id: string | null;
    name: string | null;
    email: string | null;
  };
}

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
    // Create a Jakarta timezone date (UTC+7)
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    return client.warehouseLog.create({
      data: {
        warehouseId,
        performedById,
        action: ACTION.CREATE,
        entityType: ENTITY_TYPE.WAREHOUSE,
        newData: warehouseData,
        description: `Membuat gudang baru: ${warehouseData.name}`,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
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
    // Create a Jakarta timezone date (UTC+7)
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    return client.warehouseLog.create({
      data: {
        warehouseId,
        performedById,
        action: ACTION.UPDATE,
        entityType: ENTITY_TYPE.WAREHOUSE,
        oldData,
        newData,
        description: description || 'Mengubah informasi gudang',
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
    });
  },

  /**
   * Log a warehouse deletion event
   *
   * @param warehouseId The ID of the deleted warehouse
   * @param performedById The ID of the user who performed the deletion
   * @param warehouseData The data of the warehouse being deleted
   * @param tx Optional transaction client
   * @returns The created log entry
   */
  async logWarehouseDeletion(performedById: string, warehouseData: any, tx?: any) {
    const client = tx || prisma;
    // Create a Jakarta timezone date (UTC+7)
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    return client.warehouseLog.create({
      data: {
        warehouseId: warehouseData.id,
        performedById,
        action: ACTION.DELETE,
        entityType: ENTITY_TYPE.WAREHOUSE,
        oldData: warehouseData,
        description: `Menghapus gudang: ${warehouseData.name}`,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
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
      prisma.$queryRaw<RawWarehouseLog[]>`
        SELECT
          wl.*,
          JSON_OBJECT(
            'id', w.id,
            'name', w.name,
            'description', w.description
          ) as warehouse,
          JSON_OBJECT(
            'id', u.id,
            'name', u.name,
            'email', u.email
          ) as performedBy
        FROM WarehouseLog wl
        LEFT JOIN Warehouse w ON wl.warehouseId = w.id
        LEFT JOIN User u ON wl.performedById = u.id
        ORDER BY wl.createdAt DESC
        LIMIT ${skip}, ${limit}
      `,
      prisma.warehouseLog.count(),
    ]);

    return {
      logs: logs.map((log: RawWarehouseLog) => ({
        ...log,
        warehouse: log.warehouse.id ? log.warehouse : null,
        performedBy: log.performedBy.id ? log.performedBy : null,
      })),
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
      prisma.$queryRaw<RawWarehouseLog[]>`
        SELECT
          wl.*,
          JSON_OBJECT(
            'id', w.id,
            'name', w.name,
            'description', w.description
          ) as warehouse,
          JSON_OBJECT(
            'id', u.id,
            'name', u.name,
            'email', u.email
          ) as performedBy
        FROM WarehouseLog wl
        LEFT JOIN Warehouse w ON wl.warehouseId = w.id
        LEFT JOIN User u ON wl.performedById = u.id
        WHERE wl.warehouseId = ${warehouseId}
        ORDER BY wl.createdAt DESC
        LIMIT ${skip}, ${limit}
      `,
      prisma.warehouseLog.count({
        where: {
          warehouseId,
        },
      }),
    ]);

    return {
      logs: logs.map((log: RawWarehouseLog) => ({
        ...log,
        warehouse: log.warehouse.id ? log.warehouse : null,
        performedBy: log.performedBy.id ? log.performedBy : null,
      })),
      total,
    };
  },
};
