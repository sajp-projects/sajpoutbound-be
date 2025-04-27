import prisma from '../config/prisma';
import { RolePermissionsAssignInput } from '../schemas/rolePermission';

export default {
  /**
   * Assign multiple permissions to a role
   *
   * @param data Object containing roleId and array of permissionIds
   * @returns Array of created role-permission associations
   */
  async assignPermissions(data: RolePermissionsAssignInput) {
    const { roleId, permissionIds } = data;

    // Start a transaction to ensure data consistency
    return prisma.$transaction(async (prisma) => {
      // Create role-permission associations for each permissionId
      const rolePermissions = await Promise.all(
        permissionIds.map((permissionId) =>
          prisma.rolePermission.create({
            data: {
              roleId,
              permissionId,
            },
            include: {
              permission: true,
            },
          }),
        ),
      );

      // Return the created associations
      return rolePermissions;
    });
  },

  /**
   * Remove a permission from a role
   *
   * @param roleId Role ID
   * @param permissionId Permission ID
   * @returns Number of removed associations
   */
  async removePermission(roleId: string, permissionId: string) {
    const result = await prisma.rolePermission.deleteMany({
      where: {
        roleId,
        permissionId,
      },
    });

    return result.count;
  },

  /**
   * Remove all permissions from a role
   *
   * @param roleId Role ID
   * @returns Number of removed associations
   */
  async removeAllPermissions(roleId: string) {
    const result = await prisma.rolePermission.deleteMany({
      where: {
        roleId,
      },
    });

    return result.count;
  },

  /**
   * Update a role's permissions by removing all existing ones and adding new ones
   *
   * @param data Object containing roleId and array of permissionIds
   * @returns Array of created role-permission associations
   */
  async updateRolePermissions(data: RolePermissionsAssignInput) {
    const { roleId, permissionIds } = data;

    // Start a transaction to ensure data consistency
    return prisma.$transaction(async (prisma) => {
      // First, remove all existing permissions for this role
      await prisma.rolePermission.deleteMany({
        where: {
          roleId,
        },
      });

      // Then create new role-permission associations
      const rolePermissions = await Promise.all(
        permissionIds.map((permissionId) =>
          prisma.rolePermission.create({
            data: {
              roleId,
              permissionId,
            },
            include: {
              permission: true,
            },
          }),
        ),
      );

      return rolePermissions;
    });
  },

  /**
   * Get all permissions for a specific role
   *
   * @param roleId Role ID
   * @returns Array of permissions for the role
   */
  async getRolePermissions(roleId: string) {
    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        roleId,
        permission: {
          deletedAt: null,
        },
      },
      include: {
        permission: true,
      },
    });

    return rolePermissions.map((rp) => rp.permission);
  },

  /**
   * Check if a role has a specific permission
   *
   * @param roleId Role ID
   * @param permissionId Permission ID
   * @returns Boolean indicating if the role has the permission
   */
  async hasPermission(roleId: string, permissionId: string) {
    const count = await prisma.rolePermission.count({
      where: {
        roleId,
        permissionId,
      },
    });

    return count > 0;
  },
};
