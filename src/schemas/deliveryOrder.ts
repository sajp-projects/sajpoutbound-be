import Joi from 'joi';
import { createResourceIdSchema } from './base';

export type DeliveryOrderCreateInput = {
  customerId: string;
  address?: string;
  internalNote?: string;
  items: {
    productId: string;
    quantity: number;
  }[];
};

export type DeliveryOrderUpdateInput = {
  customerId?: string;
  address?: string;
  internalNote?: string;
  items?: {
    id?: string;
    productId: string;
    quantity: number;
  }[];
};

export const createDeliveryOrderSchema = Joi.object<DeliveryOrderCreateInput>({
  customerId: Joi.string().required().uuid().messages({
    'string.empty': 'Customer ID is required',
    'string.guid': 'Customer ID must be a valid UUID',
    'any.required': 'Customer ID is required',
  }),
  address: Joi.string().optional().allow('').max(500).messages({
    'string.max': 'Address cannot exceed {#limit} characters',
  }),
  internalNote: Joi.string().optional().allow('').max(1000).messages({
    'string.max': 'Internal note cannot exceed {#limit} characters',
  }),
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required().uuid().messages({
          'string.empty': 'Product ID is required',
          'string.guid': 'Product ID must be a valid UUID',
          'any.required': 'Product ID is required',
        }),
        quantity: Joi.number().required().integer().min(1).messages({
          'number.base': 'Quantity must be a number',
          'number.integer': 'Quantity must be an integer',
          'number.min': 'Quantity must be at least 1',
          'any.required': 'Quantity is required',
        }),
      }),
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one item is required',
      'any.required': 'Items are required',
    }),
});

export const updateDeliveryOrderSchema = Joi.object<DeliveryOrderUpdateInput>({
  customerId: Joi.string().uuid().messages({
    'string.empty': 'Customer ID is required',
    'string.guid': 'Customer ID must be a valid UUID',
  }),
  address: Joi.string().allow('').max(500).messages({
    'string.max': 'Address cannot exceed {#limit} characters',
  }),
  internalNote: Joi.string().allow('').max(1000).messages({
    'string.max': 'Internal note cannot exceed {#limit} characters',
  }),
  items: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().uuid().optional().messages({
          'string.guid': 'Item ID must be a valid UUID',
        }),
        productId: Joi.string().required().uuid().messages({
          'string.empty': 'Product ID is required',
          'string.guid': 'Product ID must be a valid UUID',
          'any.required': 'Product ID is required',
        }),
        quantity: Joi.number().required().integer().min(1).messages({
          'number.base': 'Quantity must be a number',
          'number.integer': 'Quantity must be an integer',
          'number.min': 'Quantity must be at least 1',
          'any.required': 'Quantity is required',
        }),
      }),
    )
    .min(1)
    .messages({
      'array.min': 'At least one item is required',
    }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

// Using createResourceIdSchema for deliveryOrder ID validation
export const deliveryOrderIdSchema = createResourceIdSchema('DeliveryOrder');
