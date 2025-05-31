import { SPMB_STATUS } from '@prisma/client';
import Joi from 'joi';
import { createResourceIdSchema } from './base';

export type SPMBCreateInput = {
  shipmentId: string;
  deliveryOrderId: string;
  code: string;
  documentPath?: string;
};

export type SPMBUpdateInput = {
  status?: SPMB_STATUS;
  documentPath?: string;
};

export const createSPMBSchema = Joi.object<SPMBCreateInput>({
  shipmentId: Joi.string().required().uuid().messages({
    'string.empty': 'Shipment ID is required',
    'string.guid': 'Shipment ID must be a valid UUID',
    'any.required': 'Shipment ID is required',
  }),
  deliveryOrderId: Joi.string().required().uuid().messages({
    'string.empty': 'Delivery Order ID is required',
    'string.guid': 'Delivery Order ID must be a valid UUID',
    'any.required': 'Delivery Order ID is required',
  }),
  code: Joi.string().required().max(50).messages({
    'string.empty': 'SPMB Code is required',
    'string.max': 'SPMB Code cannot exceed {#limit} characters',
    'any.required': 'SPMB Code is required',
  }),
  documentPath: Joi.string().allow('', null).max(500).messages({
    'string.max': 'Document path cannot exceed {#limit} characters',
  }),
});

export const updateSPMBSchema = Joi.object<SPMBUpdateInput>({
  status: Joi.string()
    .valid(...Object.values(SPMB_STATUS))
    .messages({
      'any.only': 'Invalid SPMB status',
    }),
  documentPath: Joi.string().allow('', null).max(500).messages({
    'string.max': 'Document path cannot exceed {#limit} characters',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

// Using createResourceIdSchema for SPMB ID validation
export const spmbIdSchema = createResourceIdSchema('SPMB');
