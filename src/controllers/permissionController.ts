import { Prisma } from '@prisma/client';
import {
  NextFunction, Request, Response, 
} from 'express';
import { CustomError } from '../middlewares/error';
import {
  PermissionCreateInput,
  PermissionUpdateInput,
  createPermissionSchema,
  permissionIdSchema,
  updatePermissionSchema,
} from '../schemas/permission';
import permissionService from '../services/permissionService';
import { success } from '../types/response';

export default {
  /**
   * Get all permissions with pagination
   */
  async getAllPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await permissionService.getAllPermissions(page, limit);

      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get a permission by ID
   */
  async getPermissionById(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await permissionIdSchema.validateAsync({
        id,
      });

      const permission = await permissionService.getPermissionById(id);

      if (!permission) {
        throw new CustomError({
          message: 'Permission not found',
          errorCode: 'PERMISSION_NOT_FOUND',
          status: 404,
        });
      }

      res.status(200).json(success(permission));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get permissions by resource
   */
  async getPermissionsByResource(
    req: Request<{ resource: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { resource } = req.params;

      const permissions = await permissionService.getPermissionsByResource(resource);

      res.status(200).json(success(permissions));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create a new permission
   */
  async createPermission(
    req: Request<unknown, unknown, PermissionCreateInput>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const validated = await createPermissionSchema.validateAsync(req.body);

      const permission = await permissionService.createPermission({
        name: validated.name,
        description: validated.description === null ? undefined : validated.description,
        resource: validated.resource,
        action: validated.action,
      });

      res.status(201).json(success(permission));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = (error.meta?.target as string[]) || [];
          if (target.includes('name')) {
            throw new CustomError({
              message: `Permission with name: ${req.body.name}, already exists`,
              errorCode: 'PERMISSION_NAME_DUPLICATE',
              status: 409,
            });
          }
          if (target.includes('resource') && target.includes('action')) {
            throw new CustomError({
              message: `Permission for resource: ${req.body.resource} with action: ${req.body.action}, already exists`,
              errorCode: 'PERMISSION_RESOURCE_ACTION_DUPLICATE',
              status: 409,
            });
          }
        }

        throw new CustomError({
          message: error.message || 'Database error occurred',
          errorCode: `PRISMA_ERROR_${error.code}`,
          status: 400,
        });
      }

      next(error);
    }
  },

  /**
   * Update a permission
   */
  async updatePermission(
    req: Request<{ id: string }, unknown, PermissionUpdateInput>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;

      await permissionIdSchema.validateAsync({
        id,
      });

      const validated = await updatePermissionSchema.validateAsync(req.body);

      // Check if permission exists
      const existingPermission = await permissionService.getPermissionById(id);

      if (!existingPermission) {
        throw new CustomError({
          message: 'Permission not found',
          errorCode: 'PERMISSION_NOT_FOUND',
          status: 404,
        });
      }

      // Update the permission
      const updatedPermission = await permissionService.updatePermission(id, {
        name: validated.name,
        description: validated.description,
        resource: validated.resource,
        action: validated.action,
      });

      res.status(200).json(success(updatedPermission));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = (error.meta?.target as string[]) || [];
          if (target.includes('name')) {
            throw new CustomError({
              message: `Permission with name: ${req.body.name}, already exists`,
              errorCode: 'PERMISSION_NAME_DUPLICATE',
              status: 409,
            });
          }
          if (target.includes('resource') && target.includes('action')) {
            throw new CustomError({
              message: `Permission for resource: ${req.body.resource} with action: ${req.body.action}, already exists`,
              errorCode: 'PERMISSION_RESOURCE_ACTION_DUPLICATE',
              status: 409,
            });
          }
        }

        throw new CustomError({
          message: error.message || 'Database error occurred',
          errorCode: `PRISMA_ERROR_${error.code}`,
          status: 400,
        });
      }

      next(error);
    }
  },

  /**
   * Delete a permission
   */
  async deletePermission(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await permissionIdSchema.validateAsync({
        id,
      });

      // Check if permission exists
      const existingPermission = await permissionService.getPermissionById(id);

      if (!existingPermission) {
        throw new CustomError({
          message: 'Permission not found',
          errorCode: 'PERMISSION_NOT_FOUND',
          status: 404,
        });
      }

      // Check if permission is being used by any active roles
      const rolesWithPermission = await permissionService.getRolesWithPermission(id);

      if (rolesWithPermission > 0) {
        throw new CustomError({
          message: `Cannot delete permission. It is currently assigned to ${rolesWithPermission} active roles. Please remove it from these roles first.`,
          errorCode: 'PERMISSION_IN_USE',
          status: 409,
        });
      }

      // Soft delete the permission
      const deletedPermission = await permissionService.deletePermission(id);

      res.status(200).json(success(deletedPermission));
    } catch (error) {
      next(error);
    }
  },
};
