import {
  NextFunction, Request, Response, 
} from 'express';
import bcrypt from '../lib/bcrypt';
import jwt from '../lib/jwt';
import { CustomError } from '../middlewares/error';
import { loginUserSchema, UserLoginInput } from '../schemas/user';
import userService from '../services/userService';
import { success } from '../types/response';

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
        id: user.id,
        email: user.email,
        roleId: user.roleId,
      });

      // Generate refresh token
      const refreshToken = jwt.generateRefreshToken({
        id: user.id,
        email: user.email,
        roleId: user.roleId,
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

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      // Check if refresh token exists
      if (!refreshToken) {
        throw new CustomError({
          message: 'Refresh token is required',
          errorCode: 'REFRESH_TOKEN_REQUIRED',
          status: 400,
        });
      }

      // Verify the refresh token
      const decoded = jwt.verifyToken(refreshToken);

      if (!decoded || decoded.type !== 'refresh') {
        throw new CustomError({
          message: 'Invalid refresh token',
          errorCode: 'INVALID_REFRESH_TOKEN',
          status: 401,
        });
      }

      // Find user by id from the token
      const user = await userService.getUserById(decoded.id);

      if (!user) {
        throw new CustomError({
          message: 'User not found',
          errorCode: 'USER_NOT_FOUND',
          status: 404,
        });
      }

      // Generate new access token
      const newAccessToken = jwt.generateToken({
        id: user.id,
        email: user.email,
        roleId: user.roleId,
      });

      // Return success with new access token
      res.status(200).json(
        success({
          tokens: {
            accessToken: newAccessToken,
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  },
};
