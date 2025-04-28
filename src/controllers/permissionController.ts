import {
  NextFunction, Request, Response, 
} from 'express';
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
};
