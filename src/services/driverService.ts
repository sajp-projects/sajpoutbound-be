import { Driver } from '@prisma/client';
import prisma from '../config/prisma';
import { DriverCreateInput, DriverUpdateInput } from '../schemas/driver';

export default {
  /**
   * Get all drivers with pagination and search
   */
  async getAllDrivers(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;

    const where = search
      ? {
          deletedAt: null,
          name: {
            contains: search,
            mode: 'insensitive' as const,
          },
        }
      : {
          deletedAt: null,
        };

    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.driver.count({ where }),
    ]);

    return {
      drivers,
      total,
    };
  },

  /**
   * Get driver by ID
   */
  async getDriverById(id: string): Promise<Driver | null> {
    return prisma.driver.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  },

  /**
   * Create a new driver
   */
  async createDriver(data: DriverCreateInput): Promise<Driver> {
    return prisma.driver.create({
      data: {
        name: data.name,
      },
    });
  },

  /**
   * Update a driver
   */
  async updateDriver(id: string, data: DriverUpdateInput): Promise<Driver | null> {
    return prisma.driver.update({
      where: {
        id,
        deletedAt: null,
      },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  },

  /**
   * Soft delete a driver
   */
  async deleteDriver(id: string): Promise<Driver | null> {
    return prisma.driver.delete({
      where: {
        id,
      },
    });
  },

  /**
   * Get all active drivers (for dropdown/selection)
   */
  async getActiveDrivers(): Promise<Driver[]> {
    return prisma.driver.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        name: 'asc',
      },
    });
  },
};
