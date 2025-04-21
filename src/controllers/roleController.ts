import { Prisma } from '@prisma/client';
import {
  NextFunction, Request, Response, 
} from 'express';
import { CustomError } from '../middlewares/error';
import {
  createRoleSchema, roleIdSchema, updateRoleSchema, 
} from '../schemas/role';
import roleService from '../services/roleService';
import { success } from '../types/response';

export default {
  async getAllRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const roles = await roleService.getAllRoles();
      res.status(200).json(success(roles));
    } catch (error) {
      next(error);
    }
  },

  async getRoleById(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      // Validate ID parameter
      const { id: paramId } = req.params;
      const id = parseInt(paramId, 10);

      await roleIdSchema.validateAsync({
        id,
      });

      const role = await roleService.getRoleById(id);

      if (!role) {
        throw new CustomError({
          message: 'Role not found',
          errorCode: 'ROLE_NOT_FOUND',
          status: 404,
        });
      }

      res.status(200).json(success(role));
    } catch (error) {
      next(error);
    }
  },

  async createRole(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = await createRoleSchema.validateAsync(req.body);

      const role = await roleService.createRole({
        name: validated.name,
        description: validated.description === null ? undefined : validated.description,
      });

      res.status(201).json(success(role));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = (error.meta?.target as string[]) || [];
          if (target.includes('name')) {
            throw new CustomError({
              message: `Role with name: ${req.body.name}, already exists`,
              errorCode: 'ROLE_NAME_DUPLICATE',
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

  async updateRole(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      // Validate ID parameter
      const { id: paramId } = req.params;
      const id = parseInt(paramId, 10);

      await roleIdSchema.validateAsync({
        id,
      });

      // Check if role exists
      const existingRole = await roleService.getRoleById(id);

      if (!existingRole) {
        throw new CustomError({
          message: 'Role not found',
          errorCode: 'ROLE_NOT_FOUND',
          status: 404,
        });
      }

      // Validate request body
      const validated = await updateRoleSchema.validateAsync(req.body);

      // Update the role with validated data
      const updatedRole = await roleService.updateRole(id, {
        name: validated.name,
        description: validated.description === null ? undefined : validated.description,
      });

      res.status(200).json(success(updatedRole));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = (error.meta?.target as string[]) || [];
          if (target.includes('name')) {
            throw new CustomError({
              message: `Role with name: ${req.body.name}, already exists`,
              errorCode: 'ROLE_NAME_DUPLICATE',
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

  async deleteRole(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      // Validate ID parameter
      const { id: paramId } = req.params;
      const id = parseInt(paramId, 10);

      await roleIdSchema.validateAsync({
        id,
      });

      // Check if role exists
      const existingRole = await roleService.getRoleById(id);

      if (!existingRole) {
        throw new CustomError({
          message: 'Role not found',
          errorCode: 'ROLE_NOT_FOUND',
          status: 404,
        });
      }

      // Check if role is being used by any users
      const usersWithRole = await roleService.getUsersWithRole(id);

      if (usersWithRole > 0) {
        throw new CustomError({
          message: `Role is associated with ${usersWithRole} users and cannot be deleted`,
          errorCode: 'ROLE_IN_USE',
          status: 409,
        });
      }

      const deletedRole = await roleService.deleteRole(id);

      res.status(200).json(success(deletedRole));
    } catch (error) {
      next(error);
    }
  },
};
