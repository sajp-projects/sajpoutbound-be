import { PERMISSION_ACTION } from '@prisma/client';
import prisma from '../config/prisma';

/**
 * Permission service for handling permission-related database operations
 */
export default {
  /**
   * Get all permissions with pagination
   *
   * @param page The page number (1-based)
   * @param limit The number of items per page
   * @returns Object containing permissions array and total count
   */
  async getAllPermissions(page: number = 1, limit: number = 10) {
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Execute both queries in parallel for efficiency
    const [permissions, total] = await Promise.all([
      // Get paginated permissions
      prisma.permission.findMany({
        skip,
        take: limit,
        orderBy: {
          resource: 'asc',
        },
      }),

      // Get total count for pagination
      prisma.permission.count(),
    ]);

    return {
      permissions,
      total,
    };
  },

  /**
   * Get a permission by ID
   *
   * @param id Permission ID
   * @returns Permission if found, null otherwise
   */
  async getPermissionById(id: string) {
    return prisma.permission.findFirst({
      where: {
        id,
      },
      include: {
        rolePermissions: {
          include: {
            role: true,
          },
        },
      },
    });
  },

  /**
   * Find a permission by resource and action
   *
   * @param resource Resource name
   * @param action Permission action
   * @returns Permission if found, null otherwise
   */
  async findPermissionByResourceAndAction(resource: string, action: PERMISSION_ACTION) {
    return prisma.permission.findFirst({
      where: {
        resource,
        action,
      },
    });
  },
};
