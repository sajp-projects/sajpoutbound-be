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
          message: 'Email atau password tidak valid',
          errorCode: 'EMAIL_ATAU_PASSWORD_TIDAK_VALID',
          status: 401,
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.comparePassword(validated.password, user.password);

      // If password is invalid, throw authentication error
      if (!isPasswordValid) {
        throw new CustomError({
          message: 'Email atau password tidak valid',
          errorCode: 'EMAIL_ATAU_PASSWORD_TIDAK_VALID',
          status: 401,
        });
      }

      // Generate JWT access token (short-lived, 30s)
      const accessToken = jwt.generateAccessToken({
        id: user.id,
        email: user.email,
        roleId: user.roleId,
      });

      // Generate refresh token (longer-lived, 6h)
      const refreshToken = jwt.generateRefreshToken({
        id: user.id,
        email: user.email,
        roleId: user.roleId,
      });

      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Calculate expiry date (6 hours from now)
      const expiryDate = new Date(jakartaTime);
      expiryDate.setHours(expiryDate.getHours() + 6);

      // Update refresh token in database
      await userService.updateUserRefreshToken(user.id, refreshToken, expiryDate);

      // Return success with tokens
      res.status(200).json(
        success({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            roleId: user.roleId,
            role: user.role,
          },
          tokens: {
            accessToken,
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.headers['x-outmanage-token'] as string;

      if (!token) {
        throw new CustomError({
          message: 'Token tidak ditemukan',
          errorCode: 'TOKEN_TIDAK_DITEMUKAN',
          status: 401,
        });
      }

      // Decode the token without verifying (it might be expired)
      const decoded = jwt.verifyToken(token, {
        ignoreExpiration: true,
      });

      if (!decoded || !decoded.id) {
        throw new CustomError({
          message: 'Format token tidak valid',
          errorCode: 'FORMAT_TOKEN_TIDAK_VALID',
          status: 401,
        });
      }

      const userId = decoded.id;

      // Get user from database
      const user = await userService.getUserById(userId);

      if (!user) {
        throw new CustomError({
          message: 'Pengguna tidak ditemukan',
          errorCode: 'PENGGAUNA_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      // Check if user has a valid refresh token in database
      if (!user.refreshToken) {
        throw new CustomError({
          message: 'Token refresh tidak ditemukan, silakan login kembali',
          errorCode: 'TOKEN_REFRESH_TIDAK_DITEMUKAN',
          status: 401,
        });
      }

      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Check if refresh token has expired
      if (user.expiresAt && user.expiresAt < jakartaTime) {
        throw new CustomError({
          message: 'Token refresh sudah kadaluarsa, silakan login kembali',
          errorCode: 'TOKEN_REFRESH_KADALUARSA',
          status: 401,
        });
      }

      // Generate new access token
      const accessToken = jwt.generateAccessToken({
        id: user.id,
        email: user.email,
        roleId: user.roleId,
      });

      res.status(200).json(
        success({
          accessToken,
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new CustomError({
          message: 'Autentikasi diperlukan',
          errorCode: 'PERLU_AUTENTIKASI',
          status: 401,
        });
      }

      // Invalidate the refresh token by setting it to empty and expiry to now
      await userService.updateUserRefreshToken(userId, '', new Date());

      res.status(200).json(
        success({
          message: 'Successfully logged out',
        }),
      );
    } catch (error) {
      next(error);
    }
  },
};
