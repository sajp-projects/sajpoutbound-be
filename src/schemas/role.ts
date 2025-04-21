import { Role } from '@prisma/client';
import Joi from 'joi';

export type RoleCreateInput = Pick<Role, 'name' | 'description'>;
export type RoleUpdateInput = Partial<RoleCreateInput>;

export interface RoleWithUsers extends Role {
  users: {
    id: number;
    email: string;
    name: string | null;
  }[];
}

export const createRoleSchema = Joi.object<RoleCreateInput>({
  name: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'Role name is required',
    'string.min': 'Role name must be at least {#limit} characters long',
    'string.max': 'Role name cannot exceed {#limit} characters',
    'any.required': 'Role name is required',
  }),
  description: Joi.string().max(200).allow('').allow(null).optional().messages({
    'string.max': 'Description cannot exceed {#limit} characters',
  }),
});

export const updateRoleSchema = Joi.object<RoleUpdateInput>({
  name: Joi.string().min(2).max(50).optional().messages({
    'string.empty': 'Role name cannot be empty',
    'string.min': 'Role name must be at least {#limit} characters long',
    'string.max': 'Role name cannot exceed {#limit} characters',
  }),
  description: Joi.string().max(200).allow('').allow(null).optional().messages({
    'string.max': 'Description cannot exceed {#limit} characters',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

export const roleIdSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'Role ID must be a number',
    'number.integer': 'Role ID must be an integer',
    'number.positive': 'Role ID must be a positive number',
    'any.required': 'Role ID is required',
  }),
});
