import { Prisma } from '@prisma/client';
import {
  NextFunction, Request, Response, 
} from 'express';
import bcrypt from '../lib/bcrypt';
import { CustomError } from '../middlewares/error';
import {
  createUserSchema,
  updateUserSchema,
  UserCreateInput,
  userIdSchema,
  UserUpdateInput,
} from '../schemas/user';
import userService from '../services/userService';
import { success } from '../types/response';

export default {
  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      // Extract pagination parameters from query
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const search = req.query.search as string | undefined;
      const roleId = req.query.roleId as string | undefined;

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

      // Get paginated users with search and filter
      const result = await userService.getAllUsers(page, limit, search, roleId);

      res.status(200).json(
        success({
          users: result.users,
          pagination: {
            total: result.total,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit),
            hasNext: page * limit < result.total,
            hasPrev: page > 1,
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  async getArchivedUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await userService.getArchivedUsers();
      res.status(200).json(success(users));
    } catch (error) {
      next(error);
    }
  },

  async getUserById(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await userIdSchema.validateAsync({
        id,
      });

      const user = await userService.getUserById(id);

      if (!user) {
        throw new CustomError({
          message: 'User not found',
          errorCode: 'USER_NOT_FOUND',
          status: 404,
        });
      }

      res.status(200).json(success(user));
    } catch (error) {
      next(error);
    }
  },

  async createUser(
    req: Request<Record<string, never>, unknown, UserCreateInput>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      // Validate the request body
      const validated = await createUserSchema.validateAsync(req.body);

      // Hash the password before storing it
      const hashedPassword = await bcrypt.hashPassword(validated.password);

      const performedById = req.user.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      // Create the user with the hashed password
      const user = await userService.createUser(
        {
          ...validated,
          password: hashedPassword,
        },
        performedById,
      );

      res.status(201).json(success(user));
    } catch (error) {
      // Handle Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = (error.meta?.target as string[]) || [];
          if (target.includes('email')) {
            throw new CustomError({
              message: `User with email: ${req.body.email}, already exists`,
              errorCode: 'USER_EMAIL_DUPLICATE',
              status: 409,
            });
          }
        } else if (error.code === 'P2003') {
          // Foreign key constraint violation (typically roleId not found)
          const fieldName = ((error.meta?.field_name as string) || '').includes('roleId')
            ? 'Role ID'
            : 'Foreign key';

          throw new CustomError({
            message: `${fieldName} not found: ${req.body.roleId}`,
            errorCode: 'FOREIGN_KEY_NOT_FOUND',
            status: 404,
          });
        }

        // For other Prisma errors
        throw new CustomError({
          message: error.message || 'Database error occurred',
          errorCode: `PRISMA_ERROR_${error.code}`,
          status: 400,
        });
      }

      next(error);
    }
  },

  async updateUser(
    req: Request<{ id: string }, unknown, UserUpdateInput>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;

      await userIdSchema.validateAsync({
        id,
      });

      // Check if user exists
      const existingUser = await userService.getUserById(id);

      if (!existingUser) {
        throw new CustomError({
          message: 'User not found',
          errorCode: 'USER_NOT_FOUND',
          status: 404,
        });
      }

      // Validate the request body
      const validated = await updateUserSchema.validateAsync(req.body);

      if (Object.keys(validated).length === 0) {
        throw new CustomError({
          message: 'At least one field is required for update',
          errorCode: 'VALIDATION_ERROR',
          status: 400,
        });
      }

      const performedById = req.user.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      const updatedUser = await userService.updateUser(id, validated, performedById);

      res.status(200).json(success(updatedUser));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = (error.meta?.target as string[]) || [];
          if (target.includes('email')) {
            throw new CustomError({
              message: `User with email: ${req.body.email}, already exists`,
              errorCode: 'USER_EMAIL_DUPLICATE',
              status: 409,
            });
          }
        } else if (error.code === 'P2003') {
          // Foreign key constraint violation for roleId
          const fieldName = ((error.meta?.field_name as string) || '').includes('roleId')
            ? 'Role'
            : 'Referenced record';

          throw new CustomError({
            message: `${fieldName} not found`,
            errorCode: 'ROLE_NOT_FOUND',
            status: 404,
          });
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

  async unarchiveUser(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await userIdSchema.validateAsync({
        id,
      });

      // Check if user exists
      const existingUser = await userService.getArchivedUserById(id);

      if (!existingUser) {
        throw new CustomError({
          message: 'User not found',
          errorCode: 'USER_NOT_FOUND',
          status: 404,
        });
      }

      const performedById = req.user.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      const updatedUser = await userService.unarchiveUser(id, performedById);

      res.status(200).json(success(updatedUser));
    } catch (error) {
      next(error);
    }
  },

  async deleteUser(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await userIdSchema.validateAsync({
        id,
      });

      // Check if user exists
      const existingUser = await userService.getUserById(id);

      if (!existingUser) {
        throw new CustomError({
          message: 'User not found',
          errorCode: 'USER_NOT_FOUND',
          status: 404,
        });
      }

      const performedById = req.user.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      const deletedUser = await userService.deleteUser(id, performedById);

      res.status(200).json(
        success({
          user: deletedUser,
        }),
      );
    } catch (error) {
      next(error);
    }
  },
};
