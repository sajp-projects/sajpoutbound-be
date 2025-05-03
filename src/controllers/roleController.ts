import { Prisma } from '@prisma/client';
import {
  NextFunction, Request, Response, 
} from 'express';
import { CustomError } from '../middlewares/error';
import {
  RoleCreateInput,
  RoleUpdateInput,
  createRoleSchema,
  roleIdSchema,
  updateRoleSchema,
} from '../schemas/role';
import roleService from '../services/roleService';
import { success } from '../types/response';

export default {
  async getAllRoles(req: Request, res: Response, next: NextFunction) {
    try {
      // Extract pagination parameters from query
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const search = req.query.search as string | undefined;

      if (isNaN(page) || page < 1) {
        throw new CustomError({
          message: 'Page must be a positive integer',
          errorCode: 'INVALID_PAGINATION',
          status: 400,
        });
      }

      if (isNaN(limit) || limit < 1 || limit > 100) {
        throw new CustomError({
          message: 'Limit must be a positive integer between 1 and 100',
          errorCode: 'INVALID_PAGINATION',
          status: 400,
        });
      }

      // Get paginated roles with search
      const result = await roleService.getAllRoles(page, limit, search);
      const total = result.total || 0;

      res.status(200).json(
        success({
          roles: result.roles,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  async getRoleById(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      // Validate ID parameter
      const { id } = req.params;

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

  async createRole(
    req: Request<unknown, unknown, RoleCreateInput>,
    res: Response,
    next: NextFunction,
  ) {
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

  async updateRole(
    req: Request<{ id: string }, unknown, RoleUpdateInput>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      // Validate ID parameter
      const { id } = req.params;

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
      const { id } = req.params;

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

      // Check if role is being used by any active users
      const activeUsersWithRole = await roleService.getUsersWithRole(id);

      if (activeUsersWithRole > 0) {
        throw new CustomError({
          message: `Cannot delete role. It is currently assigned to ${activeUsersWithRole} active users. Please reassign or archive these users first.`,
          errorCode: 'ROLE_IN_USE',
          status: 409,
        });
      }

      // Get the ID of the user performing the deletion
      const performedById = req.user.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      // Perform hard delete of the role and update archived users' roleId to null
      const deletedRole = await roleService.deleteRole(id, existingRole.name, performedById);

      res.status(200).json(success(deletedRole));
    } catch (error) {
      next(error);
    }
  },
};
