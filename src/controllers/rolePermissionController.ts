import {
  NextFunction, Request, Response, 
} from 'express';
import { CustomError } from '../middlewares/error';
import {
  RolePermissionsAssignInput,
  assignPermissionsToRoleSchema,
} from '../schemas/rolePermission';
import permissionService from '../services/permissionService';
import rolePermissionService from '../services/rolePermissionService';
import roleService from '../services/roleService';
import { success } from '../types/response';

export default {
  async assignPermissions(
    req: Request<unknown, unknown, RolePermissionsAssignInput>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const validated = await assignPermissionsToRoleSchema.validateAsync(req.body);

      // Check if role exists
      const role = await roleService.getRoleById(validated.roleId);
      if (!role) {
        throw new CustomError({
          message: 'Role not found',
          errorCode: 'ROLE_NOT_FOUND',
          status: 404,
        });
      }

      // Check if all permissions exist
      const permissions = await Promise.all(
        validated.permissionIds.map((id: string) => permissionService.getPermissionById(id)),
      );

      const missingPermissions = validated.permissionIds.filter(
        (id: string, index: number) => !permissions[index],
      );

      if (missingPermissions.length > 0) {
        throw new CustomError({
          message: `Some permissions not found: ${missingPermissions.join(', ')}`,
          errorCode: 'PERMISSIONS_NOT_FOUND',
          status: 404,
        });
      }

      // Assign permissions to role
      const rolePermissions = await rolePermissionService.assignPermissions({
        roleId: validated.roleId,
        permissionIds: validated.permissionIds,
      });

      res.status(201).json(success(rolePermissions));
    } catch (error) {
      next(error);
    }
  },

  async removePermission(
    req: Request<{ roleId: string; permissionId: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { roleId, permissionId } = req.params;

      // Check if role exists
      const role = await roleService.getRoleById(roleId);
      if (!role) {
        throw new CustomError({
          message: 'Role not found',
          errorCode: 'ROLE_NOT_FOUND',
          status: 404,
        });
      }

      // Check if permission exists
      const permission = await permissionService.getPermissionById(permissionId);
      if (!permission) {
        throw new CustomError({
          message: 'Permission not found',
          errorCode: 'PERMISSION_NOT_FOUND',
          status: 404,
        });
      }

      // Remove permission from role
      const removed = await rolePermissionService.removePermission(roleId, permissionId);

      if (removed === 0) {
        throw new CustomError({
          message: 'Permission not assigned to role',
          errorCode: 'PERMISSION_NOT_ASSIGNED',
          status: 404,
        });
      }

      res.status(200).json(
        success({
          removed,
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  async updateRolePermissions(
    req: Request<{ roleId: string }, unknown, { permissionIds: string[] }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { roleId } = req.params;
      const validated = await assignPermissionsToRoleSchema.validateAsync({
        roleId,
        permissionIds: req.body.permissionIds,
      });

      // Check if role exists
      const role = await roleService.getRoleById(roleId);
      if (!role) {
        throw new CustomError({
          message: 'Role not found',
          errorCode: 'ROLE_NOT_FOUND',
          status: 404,
        });
      }

      // Check if all permissions exist
      const permissions = await Promise.all(
        validated.permissionIds.map((id: string) => permissionService.getPermissionById(id)),
      );

      const missingPermissions = validated.permissionIds.filter(
        (id: string, index: number) => !permissions[index],
      );

      if (missingPermissions.length > 0) {
        throw new CustomError({
          message: `Some permissions not found: ${missingPermissions.join(', ')}`,
          errorCode: 'PERMISSIONS_NOT_FOUND',
          status: 404,
        });
      }

      // Update role permissions
      const rolePermissions = await rolePermissionService.updateRolePermissions({
        roleId: validated.roleId,
        permissionIds: validated.permissionIds,
      });

      res.status(200).json(success(rolePermissions));
    } catch (error) {
      next(error);
    }
  },

  async getRolePermissions(req: Request<{ roleId: string }>, res: Response, next: NextFunction) {
    try {
      const { roleId } = req.params;

      // Check if role exists
      const role = await roleService.getRoleById(roleId);
      if (!role) {
        throw new CustomError({
          message: 'Role not found',
          errorCode: 'ROLE_NOT_FOUND',
          status: 404,
        });
      }

      // Get role permissions
      const permissions = await rolePermissionService.getRolePermissions(roleId);

      res.status(200).json(success(permissions));
    } catch (error) {
      next(error);
    }
  },
};
