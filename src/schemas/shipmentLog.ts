import Joi from 'joi';
import { createResourceIdSchema } from './base';

export const shipmentLogIdSchema = createResourceIdSchema('ShipmentLog');

export type ShipmentLogCreateInput = {
  shipmentId: string;
  performedById: string;
  action: string;
  entityType: string;
  oldData?: any;
  newData?: any;
  description?: string;
};

export const createShipmentLogSchema = Joi.object<ShipmentLogCreateInput>({
  shipmentId: Joi.string().required().uuid().messages({
    'string.empty': 'Shipment ID is required',
    'string.guid': 'Shipment ID must be a valid UUID',
    'any.required': 'Shipment ID is required',
  }),
  performedById: Joi.string().required().uuid().messages({
    'string.empty': 'Performed By ID is required',
    'string.guid': 'Performed By ID must be a valid UUID',
    'any.required': 'Performed By ID is required',
  }),
  action: Joi.string().required().messages({
    'string.empty': 'Action is required',
    'any.required': 'Action is required',
  }),
  entityType: Joi.string().required().messages({
    'string.empty': 'Entity Type is required',
    'any.required': 'Entity Type is required',
  }),
  oldData: Joi.any(),
  newData: Joi.any(),
  description: Joi.string().allow('').max(500).messages({
    'string.max': 'Description cannot exceed {#limit} characters',
  }),
});
