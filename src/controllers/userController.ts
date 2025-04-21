import { Prisma } from '@prisma/client';
import {
  NextFunction, Request, Response, 
} from 'express';
import { CustomError } from '../middlewares/error';
import { createUserSchema, UserCreateInput } from '../schemas/user';
import userService from '../services/userService';

export default {
  async createUser(
    req: Request<Record<string, never>, unknown, UserCreateInput>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const validated = await createUserSchema.validateAsync(req.body);

      const user = await userService.createUser(validated);

      res.status(201).json(user);
    } catch (error) {
      // Handle Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = (error.meta?.target as string[]) || [];
          if (target.includes('email')) {
            throw new CustomError(
              `User with email: ${req.body.email}, already exists`,
              'USER_EMAIL_DUPLICATE',
              409,
            );
          }
        }

        // For other Prisma errors
        throw new CustomError(
          error.message || 'Database error occurred',
          `PRISMA_ERROR_${error.code}`,
          400,
        );
      }

      // For all other errors (including Joi validation errors), pass to the error middleware
      next(error);
    }
  },
};
