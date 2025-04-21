import { Role } from '@prisma/client';
import Joi from 'joi';
import { createResourceIdSchema } from './base';

export type RoleCreateInput = Pick<Role, 'name' | 'description'>;
export type RoleUpdateInput = Partial<RoleCreateInput>;

export interface RoleWithUsers extends Role {
  users: {
    id: number;
    email: string;
    name: string | null;
  }[];
}

export const createRoleSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
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
});

export const updateRoleSchema = Joi.object({
  name: Joi.string().min(2).max(50).messages({
    'string.base': 'Name must be a text',
    'string.empty': 'Name cannot be empty',
    'string.min': 'Name must be at least {#limit} characters long',
    'string.max': 'Name cannot be more than {#limit} characters long',
  }),
  description: Joi.string().max(200).allow(null).messages({
    'string.base': 'Description must be a text',
    'string.max': 'Description cannot be more than {#limit} characters long',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

export const roleIdSchema = createResourceIdSchema('Role');
