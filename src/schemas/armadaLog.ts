import { ArmadaLog as ArmadaLogModel } from '@prisma/client';
import Joi from 'joi';
import { createResourceIdSchema } from './base';

/**
 * Type definition for creating an ArmadaLog
 * This omits system-generated fields like id, createdAt, etc.
 */
export type ArmadaLogCreateInput = Omit<
  ArmadaLogModel,
  'id' | 'createdAt' | 'updatedAt' | 'oldData' | 'newData'
> & {
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
};

/**
 * Schema for validating armada log ID
 */
export const armadaLogIdSchema = createResourceIdSchema('ArmadaLog');

/**
 * Schema for validating armada log creation
 */
export const createArmadaLogSchema = Joi.object({
  armadaId: Joi.string().uuid().required().messages({
    'string.empty': 'Armada ID is required',
    'string.uuid': 'Armada ID must be a valid UUID',
    'any.required': 'Armada ID is required',
  }),
  performedById: Joi.string().uuid().required().messages({
    'string.empty': 'Performed by user ID is required',
    'string.uuid': 'Performed by user ID must be a valid UUID',
    'any.required': 'Performed by user ID is required',
  }),
  action: Joi.string().valid('CREATE', 'UPDATE', 'DELETE').required().messages({
    'string.empty': 'Action is required',
    'any.only': 'Action must be one of: CREATE, UPDATE, DELETE',
    'any.required': 'Action is required',
  }),
  entityType: Joi.string()
    .valid('USER', 'ROLE', 'PERMISSION', 'WAREHOUSE', 'PRODUCT', 'CUSTOMER', 'ARMADA')
    .required()
    .messages({
      'string.empty': 'Entity type is required',
      'any.only': 'Entity type must be a valid type',
      'any.required': 'Entity type is required',
    }),
  description: Joi.string().required().messages({
    'string.empty': 'Description is required',
    'any.required': 'Description is required',
  }),
  oldData: Joi.object().optional(),
  newData: Joi.object().optional(),
});
