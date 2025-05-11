import { Warehouse as WarehouseModel } from '@prisma/client';
import Joi from 'joi';
import { createResourceIdSchema } from './base';

export type WarehouseCreateInput = Pick<WarehouseModel, 'name' | 'description'>;

export type WarehouseUpdateInput = Partial<Pick<WarehouseModel, 'name' | 'description'>>;

export const createWarehouseSchema = Joi.object<WarehouseCreateInput>({
  name: Joi.string().required().min(3).max(100).messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least {#limit} characters long',
    'string.max': 'Name cannot exceed {#limit} characters',
    'any.required': 'Name is required',
  }),
  description: Joi.string().optional().allow('').max(500).messages({
    'string.max': 'Description cannot exceed {#limit} characters',
  }),
});

export const updateWarehouseSchema = Joi.object<WarehouseUpdateInput>({
  name: Joi.string().min(3).max(100).messages({
    'string.min': 'Name must be at least {#limit} characters long',
    'string.max': 'Name cannot exceed {#limit} characters',
  }),
  description: Joi.string().allow('').max(500).messages({
    'string.max': 'Description cannot exceed {#limit} characters',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

// Schema for warehouse user assignment
export interface WarehouseUserAssignmentInput {
  userId: string;
}

export const warehouseUserAssignmentSchema = Joi.object<WarehouseUserAssignmentInput>({
  userId: Joi.string().uuid().required().messages({
    'string.empty': 'User ID is required',
    'string.uuid': 'User ID must be a valid UUID',
    'any.required': 'User ID is required',
  }),
});

// Using createResourceIdSchema for warehouse ID validation
export const warehouseIdSchema = createResourceIdSchema('Warehouse');
