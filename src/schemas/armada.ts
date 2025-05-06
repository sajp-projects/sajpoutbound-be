import { Armada as ArmadaModel } from '@prisma/client';
import Joi from 'joi';
import { createResourceIdSchema } from './base';

export type ArmadaCreateInput = Pick<
  ArmadaModel,
  'model' | 'id_sl' | 'plateNumber' | 'description'
>;

export type ArmadaUpdateInput = Partial<
  Pick<ArmadaModel, 'model' | 'id_sl' | 'plateNumber' | 'description'>
>;

export const createArmadaSchema = Joi.object<ArmadaCreateInput>({
  model: Joi.string().required().min(3).max(100).messages({
    'string.empty': 'Model is required',
    'string.min': 'Model must be at least {#limit} characters long',
    'string.max': 'Model cannot exceed {#limit} characters',
    'any.required': 'Model is required',
  }),
  id_sl: Joi.string().optional().allow('').max(50).messages({
    'string.max': 'ID SL cannot exceed {#limit} characters',
  }),
  plateNumber: Joi.string().required().max(20).messages({
    'string.empty': 'Plate number is required',
    'string.max': 'Plate number cannot exceed {#limit} characters',
    'any.required': 'Plate number is required',
  }),
  description: Joi.string().optional().allow('').max(500).messages({
    'string.max': 'Description cannot exceed {#limit} characters',
  }),
});

export const updateArmadaSchema = Joi.object<ArmadaUpdateInput>({
  model: Joi.string().min(3).max(100).messages({
    'string.min': 'Model must be at least {#limit} characters long',
    'string.max': 'Model cannot exceed {#limit} characters',
  }),
  id_sl: Joi.string().allow('').max(50).messages({
    'string.max': 'ID SL cannot exceed {#limit} characters',
  }),
  plateNumber: Joi.string().max(20).messages({
    'string.max': 'Plate number cannot exceed {#limit} characters',
  }),
  description: Joi.string().allow('').max(500).messages({
    'string.max': 'Description cannot exceed {#limit} characters',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

// Using createResourceIdSchema for armada ID validation
export const armadaIdSchema = createResourceIdSchema('Armada');
