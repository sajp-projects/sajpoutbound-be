import prisma from '../config/prisma';

/**
 * Role service for handling role-related database operations
 */
export default {
  /**
   * Get all roles with pagination
   *
   * @param page The page number (1-based)
   * @param limit The number of items per page
   * @returns Object containing roles array and total count
   */
  async getAllRoles(page: number = 1, limit: number = 10) {
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Execute both queries in parallel for efficiency
    const [roles, total] = await Promise.all([
      // Get paginated roles
      prisma.role.findMany({
        where: {
          deletedAt: null,
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),

      // Get total count for pagination
      prisma.role.count({
        where: {
          deletedAt: null,
        },
      }),
    ]);

    return {
      roles,
      total,
    };
  },

  /**
   * Get a role by ID
   *
   * @param id Role ID
   * @returns Role if found with users associated, null otherwise
   */
  async getRoleById(id: string) {
    return prisma.role.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        users: true,
      },
    });
  },

  /**
   * Create a new role
   *
   * @param data Role data
   * @returns Created role
   */
  async createRole(data: { name: string; description?: string }) {
    return prisma.role.create({
      data,
    });
  },

  /**
   * Update a role
   *
   * @param id Role ID
   * @param data Role data to update
   * @returns Updated role
   */
  async updateRole(id: string, data: { name?: string; description?: string }) {
    return prisma.role.update({
      where: {
        id,
      },
      data,
    });
  },

  /**
   * Delete a role (soft delete)
   *
   * @param id Role ID
   * @returns Deleted role
   */
  async deleteRole(id: string) {
    return prisma.role.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  },

  /**
   * Count users with a specific role
   *
   * @param roleId Role ID
   * @returns Number of users with the role
   */
  async getUsersWithRole(roleId: string) {
    return prisma.user.count({
      where: {
        roleId,
        deletedAt: null,
      },
    });
  },
};
