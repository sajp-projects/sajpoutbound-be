import { NextFunction, Request, Response } from 'express';
import { CustomError } from '../middlewares/error';
import { rolePermissionIdSchema } from '../schemas/rolePermission';
import permissionService from '../services/permissionService';
import rolePermissionService from '../services/rolePermissionService';
import roleService from '../services/roleService';
import { success } from '../types/response';

export default {
  async updateRolePermissions(
    req: Request<{ roleId: string }, unknown, { permissionIds: string[] }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { roleId: id } = req.params;
      const { permissionIds } = req.body;

      await rolePermissionIdSchema.validateAsync({
        id,
      });

      // Check if role exists
      const role = await roleService.getRoleById(id);
      if (!role) {
        throw new CustomError({
          message: 'Peran tidak ditemukan',
          errorCode: 'PERAN_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      // Check if all permissionIds exist
      if (permissionIds.length > 0) {
        const permissions = await Promise.all(
          permissionIds.map((id) => permissionService.getPermissionById(id)),
        );

        const missingPermissions = permissionIds.filter((_, index) => !permissions[index]);

        if (missingPermissions.length > 0) {
          throw new CustomError({
            message: `Beberapa izin tidak ditemukan: ${missingPermissions.join(', ')}`,
            errorCode: 'IZIN_TIDAK_DITEMUKAN',
            status: 404,
          });
        }
      }

      // Use the service to toggle each provided permission
      // (add if not already assigned, remove if already assigned)
      const rolePermissions = await rolePermissionService.differentialUpdateRolePermissions({
        roleId: id,
        permissionIds,
      });

      res.status(200).json(success(rolePermissions));
    } catch (error) {
      next(error);
    }
  },

  async getRolePermissions(req: Request<{ roleId: string }>, res: Response, next: NextFunction) {
    try {
      const { roleId: id } = req.params;

      await rolePermissionIdSchema.validateAsync({
        id,
      });

      // Check if role exists
      const role = await roleService.getRoleById(id);
      if (!role) {
        throw new CustomError({
          message: 'Peran tidak ditemukan',
          errorCode: 'PERAN_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      // Get role permissions
      const permissions = await rolePermissionService.getRolePermissions(id);

      res.status(200).json(success(permissions));
    } catch (error) {
      next(error);
    }
  },
};
