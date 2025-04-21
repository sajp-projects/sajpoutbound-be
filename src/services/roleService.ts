import prisma from '../config/prisma';

/**
 * Role service for handling role-related database operations
 */
export default {
  /**
   * Get all roles
   *
   * @returns List of all roles
   */
  async getAllRoles() {
    return prisma.role.findMany({
      where: {
        deletedAt: null,
      },
    });
  },

  /**
   * Get a role by ID
   *
   * @param id Role ID
   * @returns Role if found, null otherwise
   */
  async getRoleById(id: number) {
    return prisma.role.findFirst({
      where: {
        id,
        deletedAt: null,
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
  async updateRole(id: number, data: { name?: string; description?: string }) {
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
  async deleteRole(id: number) {
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
  async getUsersWithRole(roleId: number) {
    return prisma.user.count({
      where: {
        roleId,
        deletedAt: null,
      },
    });
  },
};
