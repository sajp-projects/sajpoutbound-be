import { ACTION, ENTITY_TYPE, ProductLog as ProductLogModel } from '@prisma/client';
import Joi from 'joi';
import { createResourceIdSchema } from './base';

export type ProductLogCreateInput = Omit<
  Pick<ProductLogModel, 'productId' | 'performedById' | 'action' | 'entityType' | 'description'>,
  'oldData' | 'newData'
> & {
  oldData?: any;
  newData?: any;
};

export const productLogIdSchema = createResourceIdSchema('ProductLog');

export const createProductLogSchema = Joi.object<ProductLogCreateInput>({
  productId: Joi.string().uuid().allow(null).optional().messages({
    'string.uuid': 'Product ID must be a valid UUID',
  }),
  performedById: Joi.string().uuid().required().messages({
    'string.uuid': 'Performed by ID must be a valid UUID',
    'any.required': 'Performed by ID is required',
  }),
  action: Joi.string()
    .valid(...Object.values(ACTION))
    .required()
    .messages({
      'any.only': 'Action must be a valid action type',
      'any.required': 'Action is required',
    }),
  entityType: Joi.string()
    .valid(...Object.values(ENTITY_TYPE))
    .required()
    .messages({
      'any.only': 'Entity type must be a valid entity type',
      'any.required': 'Entity type is required',
    }),
  oldData: Joi.object().allow(null).optional(),
  newData: Joi.object().allow(null).optional(),
  description: Joi.string().max(255).optional().messages({
    'string.max': 'Description cannot exceed {#limit} characters',
  }),
});
