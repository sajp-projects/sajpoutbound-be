import Joi from 'joi';
import { createResourceIdSchema } from './base';

export const deliveryOrderLogIdSchema = createResourceIdSchema('DeliveryOrderLog');

export const getDeliveryOrderLogsSchema = Joi.object({
  deliveryOrderId: Joi.string().required().uuid().messages({
    'string.empty': 'Delivery Order ID is required',
    'string.guid': 'Delivery Order ID must be a valid UUID',
    'any.required': 'Delivery Order ID is required',
  }),
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1',
  }),
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 100',
  }),
});
