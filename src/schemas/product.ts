import { Product as ProductModel } from '@prisma/client';
import Joi from 'joi';
import { createResourceIdSchema } from './base';

export type ProductCreateInput = Pick<
  ProductModel,
  'name' | 'sku' | 'description' | 'price' | 'quantity'
> & {
  warehouseId?: string | null;
};

export type ProductUpdateInput = Partial<
  Pick<ProductModel, 'name' | 'sku' | 'description' | 'price' | 'quantity'>
> & {
  warehouseId?: string | null;
};

export const createProductSchema = Joi.object<ProductCreateInput>({
  name: Joi.string().required().min(3).max(100).messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least {#limit} characters long',
    'string.max': 'Name cannot exceed {#limit} characters',
    'any.required': 'Name is required',
  }),
  sku: Joi.string().required().max(50).messages({
    'string.empty': 'SKU is required',
    'string.max': 'SKU cannot exceed {#limit} characters',
    'any.required': 'SKU is required',
  }),
  description: Joi.string().optional().allow('').max(500).messages({
    'string.max': 'Description cannot exceed {#limit} characters',
  }),
  price: Joi.number().precision(2).optional().allow(null).messages({
    'number.base': 'Price must be a number',
    'number.precision': 'Price cannot have more than 2 decimal places',
  }),
  quantity: Joi.number().integer().min(0).default(0).messages({
    'number.base': 'Quantity must be a number',
    'number.integer': 'Quantity must be an integer',
    'number.min': 'Quantity cannot be negative',
  }),
  warehouseId: Joi.string().uuid().allow(null).optional().messages({
    'string.uuid': 'Warehouse ID must be a valid UUID',
  }),
});

export const updateProductSchema = Joi.object<ProductUpdateInput>({
  name: Joi.string().min(3).max(100).messages({
    'string.min': 'Name must be at least {#limit} characters long',
    'string.max': 'Name cannot exceed {#limit} characters',
  }),
  sku: Joi.string().max(50).messages({
    'string.max': 'SKU cannot exceed {#limit} characters',
  }),
  description: Joi.string().allow('').max(500).messages({
    'string.max': 'Description cannot exceed {#limit} characters',
  }),
  price: Joi.number().precision(2).allow(null).messages({
    'number.base': 'Price must be a number',
    'number.precision': 'Price cannot have more than 2 decimal places',
  }),
  quantity: Joi.number().integer().min(0).messages({
    'number.base': 'Quantity must be a number',
    'number.integer': 'Quantity must be an integer',
    'number.min': 'Quantity cannot be negative',
  }),
  warehouseId: Joi.string().uuid().allow(null).optional().messages({
    'string.uuid': 'Warehouse ID must be a valid UUID',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

// Using createResourceIdSchema for product ID validation
export const productIdSchema = createResourceIdSchema('Product');
