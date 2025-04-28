import prisma from '../config/prisma';
import {
  RolePermissionCreateDeleteInput,
  RolePermissionsAssignInput,
} from '../schemas/rolePermission';

export default {
  /**
   * Assign a single permission to a role
   *
   * @param data Object containing roleId and permissionId
   * @returns Created role-permission association
   */
  async assignRolePermission(data: RolePermissionCreateDeleteInput) {
    const { roleId, permissionId } = data;
    return prisma.rolePermission.create({
      data: {
        roleId,
        permissionId,
      },
      include: {
        permission: true,
      },
    });
  },

  /**
   * Remove a permission from a role
   *
   * @param data Object containing roleId and permissionId
   * @returns Removed role-permission association or null if not found
   */
  async removeRolePermission(data: RolePermissionCreateDeleteInput) {
    const { roleId, permissionId } = data;
    // Use a transaction to find and delete the role permission
    return await prisma.$transaction(async (tx) => {
      // Find the role-permission by the composite of roleId and permissionId
      const rolePermission = await tx.rolePermission.findFirst({
        where: {
          roleId,
          permissionId,
        },
      });

      if (!rolePermission) {
        return null;
      }

      // Delete by ID which is guaranteed to be unique
      return tx.rolePermission.delete({
        where: {
          id: rolePermission.id,
        },
      });
    });
  },

  /**
   * Toggle permissions for a role based on provided IDs
   * For each permission ID, add it if it doesn't exist or remove it if it already exists
   *
   * @param data Object containing roleId and array of permissionIds to toggle
   * @returns Array of permissions for the role after update
   */
  async differentialUpdateRolePermissions(data: RolePermissionsAssignInput) {
    const { roleId, permissionIds } = data;

    // Start a transaction to ensure data consistency
    return prisma.$transaction(async () => {
      // Get existing role permissions
      const existingPermissions = await this.getRolePermissions(roleId);
      const existingPermissionIds = existingPermissions.map((permission) => permission.id);

      // For each permissionId in the input:
      // - If it exists: remove it
      // - If it doesn't exist: add it
      const operations = permissionIds.map(async (permissionId) => {
        const hasPermission = existingPermissionIds.includes(permissionId);

        if (hasPermission) {
          // Permission exists, so remove it
          return this.removeRolePermission({
            roleId,
            permissionId,
          });
        } else {
          // Permission doesn't exist, so add it
          return this.assignRolePermission({
            roleId,
            permissionId,
          });
        }
      });

      // Execute all operations
      await Promise.all(operations);

      // Get updated permissions
      return this.getRolePermissions(roleId);
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
