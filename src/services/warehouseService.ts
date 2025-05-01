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
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);
      const warehouse = await tx.warehouse.create({
        data: {
          ...warehouseData,
          createdAt: jakartaTime,
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

      const warehouseDataToLog = {
        id: warehouse.id,
        name: warehouse.name,
        description: warehouse.description,
      };

      await warehouseLogService.logWarehouseCreation(
        warehouse.id,
        performedById,
        warehouseDataToLog,
        tx,
      );

      return warehouse;
    });
  },

  /**
   * Update warehouse information
   */
  async updateWarehouse(id: string, data: WarehouseUpdateInput, performedById: string) {
    const { userId, ...warehouseData } = data;

    return prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      const oldWarehouse = await tx.warehouse.findUnique({
        where: {
          id,
        },
        select: {
          name: true,
          description: true,
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
          updatedAt: jakartaTime,
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

      // Create log entry - only include changed fields
      const changedFields: Record<string, any> = {};
      Object.keys(warehouseData).forEach((key) => {
        if (
          oldWarehouse &&
          oldWarehouse[key as keyof typeof oldWarehouse] !==
            warehouseData[key as keyof typeof warehouseData]
        ) {
          changedFields[key] = warehouseData[key as keyof typeof warehouseData];
        }
      });

      // Add userId changes if any
      if (userId === null && oldWarehouse.user) {
        changedFields.userId = null;
      } else if (userId && oldWarehouse.user?.id !== userId) {
        changedFields.userId = userId;
      }

      if (Object.keys(changedFields).length > 0) {
        await warehouseLogService.logWarehouseUpdate(
          warehouse.id,
          performedById,
          oldWarehouse,
          changedFields,
          tx,
        );
      }

      return warehouse;
    });
  },

  /**
   * Delete a warehouse (hard delete)
   * The warehouse logs will be kept with warehouseId set to null
   */
  async deleteWarehouse(id: string, performedById: string) {
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

      const warehouseDataToLog = {
        id: oldWarehouse.id,
        name: oldWarehouse.name,
        description: oldWarehouse.description,
      };

      // Log the deletion before actually deleting
      await warehouseLogService.logWarehouseDeletion(performedById, warehouseDataToLog, tx);

      // Delete the warehouse
      await tx.warehouse.delete({
        where: {
          id,
        },
      });

      return oldWarehouse;
    });
  },
};
