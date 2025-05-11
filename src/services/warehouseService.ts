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
          users: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          products: true,
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
    const warehouse = await prisma.warehouse.findFirst({
      where: {
        id,
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        products: true,
      },
    });

    if (!warehouse) return null;

    return warehouse;
  },

  /**
   * Get count of products associated with a warehouse
   */
  async getWarehouseProductsCount(warehouseId: string): Promise<number> {
    const result = await prisma.product.count({
      where: {
        warehouseId,
      },
    });

    return result;
  },

  /**
   * Create a new warehouse
   */
  async createWarehouse(data: WarehouseCreateInput, performedById: string) {
    return prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      const warehouse = await tx.warehouse.create({
        data: {
          ...data,
          createdAt: jakartaTime,
        },
        include: {
          users: {
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
          users: {
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
          ...data,
          updatedAt: jakartaTime,
        },
        include: {
          users: {
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
      Object.keys(data).forEach((key) => {
        if (
          oldWarehouse &&
          oldWarehouse[key as keyof typeof oldWarehouse] !== data[key as keyof typeof data]
        ) {
          changedFields[key] = data[key as keyof typeof data];
        }
      });

      if (Object.keys(changedFields).length > 0) {
        const oldDataForLog = {
          name: oldWarehouse.name,
          description: oldWarehouse.description,
          users: oldWarehouse.users,
        };

        await warehouseLogService.logWarehouseUpdate(
          warehouse.id,
          performedById,
          oldDataForLog,
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
          users: {
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

      if (oldWarehouse.users.length > 0) {
        throw new Error('Cannot delete warehouse as it is still assigned to users');
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

  /**
   * Assign a user to a warehouse
   */
  async assignUserToWarehouse(warehouseId: string, userId: string, performedById: string) {
    return prisma.$transaction(async (tx) => {
      // Check if warehouse exists
      const warehouse = await tx.warehouse.findUnique({
        where: {
          id: warehouseId,
        },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!warehouse) {
        throw new Error('Warehouse not found');
      }

      // Check if user exists
      const user = await tx.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Update user's warehouse
      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          warehouseId: warehouseId,
        },
      });

      // Get updated warehouse
      const updatedWarehouse = await tx.warehouse.findUnique({
        where: {
          id: warehouseId,
        },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Log the update
      const oldData = {
        users: warehouse.users,
      };

      const newData = {
        users: updatedWarehouse?.users,
      };

      await warehouseLogService.logWarehouseUpdate(
        warehouseId,
        performedById,
        oldData,
        newData,
        tx,
      );

      return updatedWarehouse;
    });
  },

  /**
   * Unassign a user from a warehouse
   */
  async unassignUserFromWarehouse(warehouseId: string, userId: string, performedById: string) {
    return prisma.$transaction(async (tx) => {
      // Check if warehouse exists
      const warehouse = await tx.warehouse.findUnique({
        where: {
          id: warehouseId,
        },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!warehouse) {
        throw new Error('Warehouse not found');
      }

      // Check if user exists and is assigned to this warehouse
      const user = await tx.user.findFirst({
        where: {
          id: userId,
          warehouseId: warehouseId,
        },
      });

      if (!user) {
        throw new Error('User not found or not assigned to this warehouse');
      }

      // Update user's warehouse to null
      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          warehouse: {
            disconnect: true,
          },
        },
      });

      // Get updated warehouse
      const updatedWarehouse = await tx.warehouse.findUnique({
        where: {
          id: warehouseId,
        },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Log the update
      const oldData = {
        users: warehouse.users,
      };

      const newData = {
        users: updatedWarehouse?.users,
      };

      await warehouseLogService.logWarehouseUpdate(
        warehouseId,
        performedById,
        oldData,
        newData,
        tx,
      );

      return updatedWarehouse;
    });
  },
};
