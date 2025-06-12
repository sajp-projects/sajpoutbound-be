import { PERMISSION_ACTION } from '@prisma/client';
import {
  NextFunction, Request, Response, 
} from 'express';
import permissionService from '../services/permissionService';
import productService from '../services/productService';
import rolePermissionService from '../services/rolePermissionService';
import userService from '../services/userService';
import { CustomError } from './error';

/**
 * Middleware to check if a user has a specific permission
 *
 * @param resource - The resource being accessed (e.g., 'user', 'role', 'permission')
 * @param action - The action being performed (CREATE, READ, UPDATE, DELETE)
 * @returns Express middleware function
 */
export const checkPermission = (resource: string, action: PERMISSION_ACTION) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user exists in request (authenticateToken middleware should have set this)
      if (!req.user || !req.user.id) {
        throw new CustomError({
          message: 'Autentikasi diperlukan',
          errorCode: 'PERLU_AUTENTIKASI',
          status: 401,
        });
      }

      // Get user's roleId from the request
      const { roleId } = req.user;

      // If roleId is missing, user doesn't have any role assigned
      if (!roleId) {
        throw new CustomError({
          message: 'Tidak ada peran yang ditugaskan kepada pengguna',
          errorCode: 'TIDAK_ADA_PERAN_DITUGASKAN',
          status: 403,
        });
      }

      // Find the permission ID for the given resource and action
      const permission = await permissionService.findPermissionByResourceAndAction(
        resource,
        action,
      );

      // If permission doesn't exist, configuration error
      if (!permission) {
        throw new CustomError({
          message: `Izin tidak dikonfigurasi untuk ${resource}:${action}`,
          errorCode: 'IZIN_TIDAK_DIKONFIGURASI',
          status: 500,
        });
      }

      // Check if the user's role has this permission
      const hasPermission = await rolePermissionService.hasPermission(roleId, permission.id);

      if (!hasPermission) {
        throw new CustomError({
          message: 'Anda tidak memiliki izin untuk melakukan tindakan ini',
          errorCode: 'IZIN_DITOLAK',
          status: 403,
        });
      }

      // If we reach here, user has the required permission
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Higher-order middleware that checks if a user has any of the specified permissions
 * Useful for actions that can be performed with different permissions
 *
 * @param permissionChecks - Array of resource/action pairs
 * @returns Express middleware function
 */
export const checkAnyPermission = (
  permissionChecks: { resource: string; action: PERMISSION_ACTION }[],
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user exists in request (authenticateToken middleware should have set this)
      if (!req.user || !req.user.id) {
        throw new CustomError({
          message: 'Autentikasi diperlukan',
          errorCode: 'PERLU_AUTENTIKASI',
          status: 401,
        });
      }

      // Get user's roleId from the request
      const { roleId } = req.user;

      // If roleId is missing, user doesn't have any role assigned
      if (!roleId) {
        throw new CustomError({
          message: 'Tidak ada peran yang ditugaskan kepada pengguna',
          errorCode: 'TIDAK_ADA_PERAN_DITUGASKAN',
          status: 403,
        });
      }

      // For each permission check, see if the user has any of the required permissions
      const permissionPromises = permissionChecks.map(async ({ resource, action }) => {
        // Find the permission ID for the given resource and action
        const permission = await permissionService.findPermissionByResourceAndAction(
          resource,
          action,
        );

        // If permission doesn't exist, skip this check
        if (!permission) {
          return false;
        }

        // Check if the user's role has this permission
        return rolePermissionService.hasPermission(roleId, permission.id);
      });

      // Wait for all permission checks to complete
      const permissionResults = await Promise.all(permissionPromises);

      // If user has any of the required permissions, allow access
      if (permissionResults.some((result) => result === true)) {
        return next();
      }

      // If we reach here, user doesn't have any of the required permissions
      throw new CustomError({
        message: 'Anda tidak memiliki izin untuk melakukan tindakan ini',
        errorCode: 'IZIN_DITOLAK',
        status: 403,
      });
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Higher-order middleware that checks if a user has warehouse access for a specific product
 * This ensures users can only access products from their assigned warehouse
 * @returns Express middleware function
 */
export const checkWarehouseAccess = () => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user exists in request (authenticateToken middleware should have set this)
      if (!req.user || !req.user.id) {
        throw new CustomError({
          message: 'Autentikasi diperlukan',
          errorCode: 'PERLU_AUTENTIKASI',
          status: 401,
        });
      }

      // Get product ID from request body or params
      const productId = req.body.productId || req.params.productId;

      // If no product ID is provided, throw an error
      if (!productId) {
        throw new CustomError({
          message: 'ID produk diperlukan untuk pemeriksaan akses gudang',
          errorCode: 'ID_PRODUK_DIPERLUKAN',
          status: 400,
        });
      }

      // Get user's full details from database
      const user = await userService.getUserById(req.user.id);

      // If user doesn't exist, throw error
      if (!user) {
        throw new CustomError({
          message: 'Pengguna tidak ditemukan',
          errorCode: 'PENGGAUNA_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      // If user has no warehouse association, they have global access (likely admin)
      if (!user.warehouseId) {
        return next();
      }

      // Get product details to check warehouse association
      const product = await productService.getProductById(productId);

      // If product doesn't exist, throw error
      if (!product) {
        throw new CustomError({
          message: 'Produk tidak ditemukan',
          errorCode: 'PRODUK_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      // If product has no warehouse, throw error
      if (!product.warehouseId) {
        throw new CustomError({
          message: 'Produk tidak memiliki gudang yang ditugaskan',
          errorCode: 'PRODUK_TIDAK_MEMILIKI_GUDANG_DITUGASKAN',
          status: 400,
        });
      }

      // Check if user's warehouse matches product's warehouse
      if (user.warehouseId !== product.warehouseId) {
        throw new CustomError({
          message: 'Anda tidak memiliki izin untuk mengakses produk dari gudang ini',
          errorCode: 'IZIN_DITOLAK',
          status: 403,
        });
      }

      // If we reach here, user has access to the product
      next();
    } catch (error) {
      next(error);
    }
  };
};
