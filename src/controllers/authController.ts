import {
  NextFunction, Request, Response, 
} from 'express';
import bcrypt from '../lib/bcrypt';
import jwt from '../lib/jwt';
import { CustomError } from '../middlewares/error';
import { loginUserSchema, UserLoginInput } from '../schemas/user';
import userService from '../services/userService';
import { success } from '../utils/response';

/**
 * Authentication controller for handling user login and related operations
 */
export default {
  async login(
    req: Request<Record<string, never>, unknown, UserLoginInput>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      // Validate request body against login schema
      const validated = await loginUserSchema.validateAsync(req.body);

      // Find user by email
      const user = await userService.findUserByEmail(validated.email);

      // If user not found, throw authentication error
      if (!user) {
        throw new CustomError({
          message: 'Invalid email or password',
          errorCode: 'INVALID_CREDENTIALS',
          status: 401,
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.comparePassword(validated.password, user.password);

      // If password is invalid, throw authentication error
      if (!isPasswordValid) {
        throw new CustomError({
          message: 'Invalid email or password',
          errorCode: 'INVALID_CREDENTIALS',
          status: 401,
        });
      }

      // Generate JWT token
      const token = jwt.generateToken({
        userId: user.id,
        email: user.email,
      });

      // Generate refresh token
      const refreshToken = jwt.generateRefreshToken({
        userId: user.id,
        email: user.email,
      });

      // Return success with tokens
      res.status(200).json(
        success({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          tokens: {
            accessToken: token,
            refreshToken,
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  },
};
