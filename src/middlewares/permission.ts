import { PERMISSION_ACTION } from '@prisma/client';
import {
  NextFunction, Request, Response, 
} from 'express';
import permissionService from '../services/permissionService';
import rolePermissionService from '../services/rolePermissionService';
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
          message: 'Authentication required',
          errorCode: 'AUTHENTICATION_REQUIRED',
          status: 401,
        });
      }

      // Get user's roleId from the request
      const { roleId } = req.user;

      // If roleId is missing, user doesn't have any role assigned
      if (!roleId) {
        throw new CustomError({
          message: 'No role assigned to user',
          errorCode: 'NO_ROLE_ASSIGNED',
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
          message: `Permission not configured for ${resource}:${action}`,
          errorCode: 'PERMISSION_NOT_CONFIGURED',
          status: 500,
        });
      }

      // Check if the user's role has this permission
      const hasPermission = await rolePermissionService.hasPermission(roleId, permission.id);

      if (!hasPermission) {
        throw new CustomError({
          message: 'You do not have permission to perform this action',
          errorCode: 'PERMISSION_DENIED',
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
          message: 'Authentication required',
          errorCode: 'AUTHENTICATION_REQUIRED',
          status: 401,
        });
      }

      // Get user's roleId from the request
      const { roleId } = req.user;

      // If roleId is missing, user doesn't have any role assigned
      if (!roleId) {
        throw new CustomError({
          message: 'No role assigned to user',
          errorCode: 'NO_ROLE_ASSIGNED',
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
        message: 'You do not have permission to perform this action',
        errorCode: 'PERMISSION_DENIED',
        status: 403,
      });
    } catch (error) {
      next(error);
    }
  };
};
