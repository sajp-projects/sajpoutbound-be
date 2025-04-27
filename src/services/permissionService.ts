import { PERMISSION_ACTION } from '@prisma/client';
import prisma from '../config/prisma';
import { PermissionCreateInput, PermissionUpdateInput } from '../schemas/permission';

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
        where: {
          deletedAt: null,
        },
        skip,
        take: limit,
        orderBy: {
          resource: 'asc',
        },
      }),

      // Get total count for pagination
      prisma.permission.count({
        where: {
          deletedAt: null,
        },
      }),
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
        deletedAt: null,
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
   * Get permissions by resource
   *
   * @param resource Resource name
   * @returns Array of permissions for the specified resource
   */
  async getPermissionsByResource(resource: string) {
    return prisma.permission.findMany({
      where: {
        resource,
        deletedAt: null,
      },
      orderBy: {
        action: 'asc',
      },
    });
  },

  /**
   * Create a new permission
   *
   * @param data Permission data
   * @returns Created permission
   */
  async createPermission(data: PermissionCreateInput) {
    return prisma.permission.create({
      data,
    });
  },

  /**
   * Update a permission
   *
   * @param id Permission ID
   * @param data Updated permission data
   * @returns Updated permission
   */
  async updatePermission(id: string, data: PermissionUpdateInput) {
    return prisma.permission.update({
      where: {
        id,
      },
      data,
    });
  },

  /**
   * Soft delete a permission
   *
   * @param id Permission ID
   * @returns Deleted permission
   */
  async deletePermission(id: string) {
    return prisma.permission.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  },

  /**
   * Check if a permission with given resource and action exists
   *
   * @param resource Resource name
   * @param action Permission action
   * @returns Boolean indicating if permission exists
   */
  async hasPermission(resource: string, action: PERMISSION_ACTION) {
    const count = await prisma.permission.count({
      where: {
        resource,
        action,
        deletedAt: null,
      },
    });

    return count > 0;
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
        deletedAt: null,
      },
    });
  },

  /**
   * Get count of roles using a specific permission
   *
   * @param permissionId Permission ID
   * @returns Count of roles using the permission
   */
  async getRolesWithPermission(permissionId: string) {
    return prisma.rolePermission.count({
      where: {
        permissionId,
        role: {
          deletedAt: null,
        },
      },
    });
  },
};
