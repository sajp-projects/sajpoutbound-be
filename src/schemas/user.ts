import { User as UserModel } from '@prisma/client';
import Joi from 'joi';
import { createResourceIdSchema } from './base';

export type UserCreateInput = Pick<UserModel, 'email' | 'name' | 'roleId' | 'password'>;
export type UserUpdateInput = Partial<Pick<UserModel, 'email' | 'name' | 'roleId'>>;
export type UserLoginInput = Pick<UserModel, 'email' | 'password'>;

export const createUserSchema = Joi.object<UserCreateInput>({
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required',
  }),
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Name must be at least {#limit} characters long',
    'string.max': 'Name cannot exceed {#limit} characters',
    'any.required': 'Name is required',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least {#limit} characters long',
    'any.required': 'Password is required',
  }),
  roleId: Joi.string().required().messages({
    'string.base': 'Role ID must be a valid type',
    'any.required': 'Role ID is required',
  }),
});

export const updateUserSchema = Joi.object<UserUpdateInput>({
  email: Joi.string().email().messages({
    'string.email': 'Email must be a valid email address',
  }),
  name: Joi.string().min(2).max(100).messages({
    'string.min': 'Name must be at least {#limit} characters long',
    'string.max': 'Name cannot exceed {#limit} characters',
  }),
  roleId: Joi.string().required().messages({
    'string.base': 'Role ID must be a valid type',
    'any.required': 'Role ID is required',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

export const loginUserSchema = Joi.object<UserLoginInput>({
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

// Using createResourceIdSchema for user ID validation
export const userIdSchema = createResourceIdSchema('User');
