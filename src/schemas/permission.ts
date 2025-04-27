import { Permission } from '@prisma/client';
import Joi from 'joi';
import { createResourceIdSchema } from './base';

export type PermissionCreateInput = Pick<
  Permission,
  'name' | 'description' | 'resource' | 'action'
>;
export type PermissionUpdateInput = Partial<PermissionCreateInput>;

export const permissionIdSchema = createResourceIdSchema('Permission');

export const createPermissionSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.base': 'Name must be a text',
    'string.empty': 'Name cannot be empty',
    'string.min': 'Name must be at least {#limit} characters long',
    'string.max': 'Name cannot be more than {#limit} characters long',
    'any.required': 'Name is required',
  }),
  description: Joi.string().max(200).allow(null).messages({
    'string.base': 'Description must be a text',
    'string.max': 'Description cannot be more than {#limit} characters long',
  }),
  resource: Joi.string().min(2).max(50).required().messages({
    'string.base': 'Resource must be a text',
    'string.empty': 'Resource cannot be empty',
    'string.min': 'Resource must be at least {#limit} characters long',
    'string.max': 'Resource cannot be more than {#limit} characters long',
    'any.required': 'Resource is required',
  }),
  action: Joi.string().valid('CREATE', 'READ', 'UPDATE', 'DELETE').required().messages({
    'string.base': 'Action must be a text',
    'string.empty': 'Action cannot be empty',
    'any.only': 'Action must be one of: CREATE, READ, UPDATE, DELETE',
    'any.required': 'Action is required',
  }),
});

export const updatePermissionSchema = Joi.object({
  name: Joi.string().min(2).max(100).messages({
    'string.base': 'Name must be a text',
    'string.empty': 'Name cannot be empty',
    'string.min': 'Name must be at least {#limit} characters long',
    'string.max': 'Name cannot be more than {#limit} characters long',
  }),
  description: Joi.string().max(200).allow(null).messages({
    'string.base': 'Description must be a text',
    'string.max': 'Description cannot be more than {#limit} characters long',
  }),
  resource: Joi.string().min(2).max(50).messages({
    'string.base': 'Resource must be a text',
    'string.empty': 'Resource cannot be empty',
    'string.min': 'Resource must be at least {#limit} characters long',
    'string.max': 'Resource cannot be more than {#limit} characters long',
  }),
  action: Joi.string().valid('CREATE', 'READ', 'UPDATE', 'DELETE').messages({
    'string.base': 'Action must be a text',
    'string.empty': 'Action cannot be empty',
    'any.only': 'Action must be one of: CREATE, READ, UPDATE, DELETE',
  }),
});
