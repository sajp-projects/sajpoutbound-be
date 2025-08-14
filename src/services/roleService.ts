import prisma from '../config/prisma';
import userLogService from './userLogService';

/**
 * Role service for handling role-related database operations
 */
export default {
  /**
   * Get all roles with optional pagination
   *
   * @param page The page number (1-based), or null to return all roles
   * @param limit The number of items per page, or null to return all roles
   * @param search Optional search term for role name or description
   * @returns Object containing roles array and total count
   */
  async getAllRoles(page: number | null = 1, limit: number | null = 10, search?: string) {
    // Build where conditions
    const whereConditions: any = {};

    // Add search condition if search parameter is provided
    if (search) {
      whereConditions.OR = [
        {
          name: {
            contains: search,
          },
        },
      ];
    }

    // Execute queries based on whether pagination is requested
    if (page === null || limit === null) {
      // Return all roles without pagination
      const roles = await prisma.role.findMany({
        where: whereConditions,
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        roles,
      };
    } else {
      // Calculate skip value for pagination
      const skip = (page - 1) * limit;

      // Execute both queries in parallel for efficiency
      const [roles, total] = await Promise.all([
        // Get paginated roles
        prisma.role.findMany({
          where: whereConditions,
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc',
          },
        }),

        // Get total count for pagination
        prisma.role.count({
          where: whereConditions,
        }),
      ]);

      return {
        roles,
        total,
      };
    }
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
    // Create a Jakarta timezone date (UTC+7)
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    return prisma.role.create({
      data: {
        ...data,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
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
    // Create a Jakarta timezone date (UTC+7)
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);
    return prisma.role.update({
      where: {
        id,
      },
      data: {
        ...data,
        updatedAt: jakartaTime,
      },
    });
  },

  /**
   * Get the number of active users associated with a role
   *
   * @param id Role ID
   * @returns Count of active users with this role
   */
  async getUsersWithRole(id: string) {
    return prisma.user.count({
      where: {
        roleId: id,
        deletedAt: null, // Only count active (non-archived) users
      },
    });
  },

  /**
   * Delete a role (hard delete)
   *
   * @param id Role ID
   * @param roleName The name of the role being deleted
   * @param performedById The ID of the user who is deleting the role
   * @returns Deleted role
   */
  async deleteRole(id: string, roleName: string, performedById: string) {
    // Use transaction to ensure all operations succeed or fail together
    return prisma.$transaction(async (tx) => {
      // Find all archived users with this role for logging
      const archivedUsers = await tx.user.findMany({
        where: {
          roleId: id,
          deletedAt: {
            not: null, // Only find archived users
          },
        },
        select: {
          id: true,
        },
      });

      // Update any archived users that reference this role to have null roleId
      await tx.user.updateMany({
        where: {
          roleId: id,
          deletedAt: {
            not: null, // Only update archived users
          },
        },
        data: {
          roleId: null,
        },
      });

      // Create log entries for each user whose role was unassigned
      const logPromises = archivedUsers.map((user) =>
        userLogService.logRoleUnassignment(user.id, id, roleName, performedById, tx),
      );

      // Wait for all log entries to be created
      if (logPromises.length > 0) {
        await Promise.all(logPromises);
      }

      // Hard delete the role
      return tx.role.delete({
        where: {
          id,
        },
      });
    });
  },
};
