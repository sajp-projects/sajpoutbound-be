import Joi from 'joi';

// Define our own User interface based on the Prisma schema
export interface User {
  id: number;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Type definitions based on Prisma schema
export type UserCreateInput = Pick<User, 'email' | 'name'> & {
  password: string;
};
export type UserUpdateInput = Partial<Pick<User, 'email' | 'name'>>;
export type UserLoginInput = { email: string; password: string };

/**
 * Validation schema for user creation
 * Based on Prisma User model
 */
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
});

/**
 * Validation schema for user update
 * Based on Prisma User model
 */
export const updateUserSchema = Joi.object<UserUpdateInput>({
  email: Joi.string().email().messages({
    'string.email': 'Email must be a valid email address',
  }),
  name: Joi.string().min(2).max(100).messages({
    'string.min': 'Name must be at least {#limit} characters long',
    'string.max': 'Name cannot exceed {#limit} characters',
  }),
});

/**
 * Validation schema for user login
 */
export const loginUserSchema = Joi.object<UserLoginInput>({
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});
