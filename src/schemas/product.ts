import { Product as ProductModel } from '@prisma/client';
import Joi from 'joi';
import { createResourceIdSchema } from './base';

export type ProductCreateInput = Pick<
  ProductModel,
  'name' | 'id_sl' | 'description' | 'warehouseId' | 'satuan'
>;

export type ProductUpdateInput = Partial<
  Pick<ProductModel, 'name' | 'id_sl' | 'description' | 'warehouseId' | 'satuan'>
>;

export const createProductSchema = Joi.object<ProductCreateInput>({
  name: Joi.string().required().min(3).max(100).messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least {#limit} characters long',
    'string.max': 'Name cannot exceed {#limit} characters',
    'any.required': 'Name is required',
  }),
  id_sl: Joi.string().required().max(50).messages({
    'string.empty': 'ID SL is required',
    'string.max': 'ID SL cannot exceed {#limit} characters',
    'any.required': 'ID SL is required',
  }),
  description: Joi.string().optional().allow('').max(500).messages({
    'string.max': 'Description cannot exceed {#limit} characters',
  }),
  satuan: Joi.string().required().max(20).messages({
    'string.empty': 'Satuan is required',
    'string.max': 'Satuan cannot exceed {#limit} characters',
    'any.required': 'Satuan is required',
  }),
  warehouseId: Joi.string().uuid().required().messages({
    'string.empty': 'Warehouse ID is required',
    'string.uuid': 'Warehouse ID must be a valid UUID',
    'any.required': 'Warehouse ID is required',
  }),
});

export const updateProductSchema = Joi.object<ProductUpdateInput>({
  name: Joi.string().min(3).max(100).messages({
    'string.min': 'Name must be at least {#limit} characters long',
    'string.max': 'Name cannot exceed {#limit} characters',
  }),
  id_sl: Joi.string().max(50).messages({
    'string.max': 'ID SL cannot exceed {#limit} characters',
  }),
  description: Joi.string().allow('').max(500).messages({
    'string.max': 'Description cannot exceed {#limit} characters',
  }),
  satuan: Joi.string().allow('').max(20).messages({
    'string.max': 'Unit of measurement cannot exceed {#limit} characters',
  }),
  warehouseId: Joi.string().uuid().messages({
    'string.uuid': 'Warehouse ID must be a valid UUID',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

// Using createResourceIdSchema for product ID validation
export const productIdSchema = createResourceIdSchema('Product');
