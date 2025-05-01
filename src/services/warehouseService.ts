import prisma from '../config/prisma';
import { WarehouseCreateInput, WarehouseUpdateInput } from '../schemas/warehouse';
import warehouseLogService from './warehouseLogService';

/**
 * Warehouse service for handling warehouse-related database operations
 */
export default {
  /**
   * Get all warehouses with pagination
   *
   * @param page The page number (1-based)
   * @param limit The number of items per page
   * @param search Optional search term
   * @returns Object containing warehouses array and total count
   */
  async getAllWarehouses(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;

    const whereConditions: any = {};

    if (search) {
      whereConditions.OR = [
        {
          name: {
            contains: search,
          },
        },
        {
          description: {
            contains: search,
          },
        },
      ];
    }

    const [warehouses, total] = await Promise.all([
      prisma.warehouse.findMany({
        where: whereConditions,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.warehouse.count({
        where: whereConditions,
      }),
    ]);

    return {
      warehouses,
      total,
    };
  },

  /**
   * Get a warehouse by ID
   */
  async getWarehouseById(id: string) {
    return prisma.warehouse.findFirst({
      where: {
        id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  },

  /**
   * Create a new warehouse
   */
  async createWarehouse(data: WarehouseCreateInput, performedById: string) {
    const { userId, ...warehouseData } = data;

    return prisma.$transaction(async (tx) => {
      const warehouse = await tx.warehouse.create({
        data: {
          ...warehouseData,
          user: userId
            ? {
              connect: {
                id: userId,
              },
            }
            : undefined,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      await warehouseLogService.logWarehouseCreation(warehouse.id, performedById, warehouse, tx);

      return warehouse;
    });
  },

  /**
   * Update warehouse information
   */
  async updateWarehouse(id: string, data: WarehouseUpdateInput, performedById: string) {
    const { userId, ...warehouseData } = data;

    return prisma.$transaction(async (tx) => {
      const oldWarehouse = await tx.warehouse.findUnique({
        where: {
          id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!oldWarehouse) {
        throw new Error('Warehouse not found');
      }

      const warehouse = await tx.warehouse.update({
        where: {
          id,
        },
        data: {
          ...warehouseData,
          user:
            userId === null
              ? {
                disconnect: true,
              }
              : userId
                ? {
                  connect: {
                    id: userId,
                  },
                }
                : undefined,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      await warehouseLogService.logWarehouseUpdate(
        warehouse.id,
        performedById,
        oldWarehouse,
        warehouse,
        tx,
      );

      return warehouse;
    });
  },

  /**
   * Delete a warehouse (hard delete)
   * This will also delete all associated warehouse logs
   */
  async deleteWarehouse(id: string) {
    return prisma.$transaction(async (tx) => {
      const oldWarehouse = await tx.warehouse.findUnique({
        where: {
          id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!oldWarehouse) {
        throw new Error('Warehouse not found');
      }

      if (oldWarehouse.user) {
        throw new Error('Cannot delete warehouse as it is still assigned to a user');
      }

      // Delete all warehouse logs first
      await tx.warehouseLog.deleteMany({
        where: {
          warehouseId: id,
        },
      });

      // Then delete the warehouse
      await tx.warehouse.delete({
        where: {
          id,
        },
      });

      return oldWarehouse;
    });
  },
};
