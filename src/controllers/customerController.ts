import { Prisma } from '@prisma/client';
import {
  NextFunction, Request, Response, 
} from 'express';
import { CustomError } from '../middlewares/error';
import {
  createCustomerSchema,
  CustomerCreateInput,
  customerIdSchema,
  CustomerUpdateInput,
  updateCustomerSchema,
} from '../schemas/customer';
import customerService from '../services/customerService';
import { success } from '../types/response';

export default {
  async getAllCustomers(req: Request, res: Response, next: NextFunction) {
    try {
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

      const result = await customerService.getAllCustomers(page, limit, search);

      res.status(200).json(
        success({
          customers: result.customers,
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

  async getCustomerById(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await customerIdSchema.validateAsync({
        id,
      });

      const customer = await customerService.getCustomerById(id);

      if (!customer) {
        throw new CustomError({
          message: 'Customer not found',
          errorCode: 'CUSTOMER_NOT_FOUND',
          status: 404,
        });
      }

      res.status(200).json(success(customer));
    } catch (error) {
      next(error);
    }
  },

  async createCustomer(
    req: Request<Record<string, never>, unknown, CustomerCreateInput>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const validated = await createCustomerSchema.validateAsync(req.body);

      const performedById = req.user?.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      const customer = await customerService.createCustomer(validated, performedById);

      res.status(201).json(success(customer));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new CustomError({
            message: 'Customer with this name or ID SL already exists',
            errorCode: 'CUSTOMER_DUPLICATE',
            status: 409,
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

  async updateCustomer(
    req: Request<{ id: string }, unknown, CustomerUpdateInput>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;

      await customerIdSchema.validateAsync({
        id,
      });

      const existingCustomer = await customerService.getCustomerById(id);

      if (!existingCustomer) {
        throw new CustomError({
          message: 'Customer not found',
          errorCode: 'CUSTOMER_NOT_FOUND',
          status: 404,
        });
      }

      const validated = await updateCustomerSchema.validateAsync(req.body);

      const performedById = req.user?.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      const updatedCustomer = await customerService.updateCustomer(id, validated, performedById);

      res.status(200).json(success(updatedCustomer));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new CustomError({
            message: 'Customer with this name or ID SL already exists',
            errorCode: 'CUSTOMER_DUPLICATE',
            status: 409,
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

  async deleteCustomer(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await customerIdSchema.validateAsync({
        id,
      });

      const existingCustomer = await customerService.getCustomerById(id);

      if (!existingCustomer) {
        throw new CustomError({
          message: 'Customer not found',
          errorCode: 'CUSTOMER_NOT_FOUND',
          status: 404,
        });
      }

      const performedById = req.user?.id;

      if (!performedById) {
        throw new CustomError({
          message: 'Authentication required for this action',
          errorCode: 'AUTH_REQUIRED',
          status: 401,
        });
      }

      const deletedCustomer = await customerService.deleteCustomer(id, performedById);

      res.status(200).json(success(deletedCustomer));
    } catch (error) {
      next(error);
    }
  },
};
