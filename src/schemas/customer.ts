import { Customer as CustomerModel } from '@prisma/client';
import Joi from 'joi';
import { createResourceIdSchema } from './base';

export type CustomerCreateInput = Pick<CustomerModel, 'name' | 'id_sl' | 'address'>;

export type CustomerUpdateInput = Partial<Pick<CustomerModel, 'name' | 'id_sl' | 'address'>>;

export const createCustomerSchema = Joi.object<CustomerCreateInput>({
  name: Joi.string().required().min(3).max(100).messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least {#limit} characters long',
    'string.max': 'Name cannot exceed {#limit} characters',
    'any.required': 'Name is required',
  }),
  id_sl: Joi.string().optional().max(50).messages({
    'string.max': 'ID SL cannot exceed {#limit} characters',
  }),
  address: Joi.string().optional().allow('').max(500).messages({
    'string.max': 'Address cannot exceed {#limit} characters',
  }),
});

export const updateCustomerSchema = Joi.object<CustomerUpdateInput>({
  name: Joi.string().min(3).max(100).messages({
    'string.min': 'Name must be at least {#limit} characters long',
    'string.max': 'Name cannot exceed {#limit} characters',
  }),
  id_sl: Joi.string().max(50).messages({
    'string.max': 'ID SL cannot exceed {#limit} characters',
  }),
  address: Joi.string().allow('').max(500).messages({
    'string.max': 'Address cannot exceed {#limit} characters',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

// Using createResourceIdSchema for customer ID validation
export const customerIdSchema = createResourceIdSchema('Customer');
