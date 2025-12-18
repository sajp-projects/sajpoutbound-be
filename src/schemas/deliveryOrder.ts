import Joi from 'joi';
import { createResourceIdSchema } from './base';

export type DeliveryOrderCreateInput = {
  customerId: string;
  address?: string;
  internalNote?: string;
  deliverySchedule?: Date;
  items: {
    productId: string;
    quantity: number;
  }[];
};

export type DeliveryOrderUpdateInput = {
  customerId?: string;
  address?: string;
  internalNote?: string;
  deliverySchedule?: Date;
  items?: {
    id?: string;
    productId: string;
    quantity: number;
  }[];
};

export type DeliveryOrderTransferItemsInput = {
  targetCustomerId: string;
  sourceShipmentId: string;
  transferItems: {
    deliveryOrderId: string;
    productId: string;
    quantity: number;
  }[];
};

export type ReduceShipmentItemQuantityInput = {
  shipmentItemId: string;
  newQuantity: number;
};

export type ReviseShipmentItemInput = {
  shipmentId: string;
  shipmentItemId: string;
  newQuantity: number;
  decreaseMode?: 'to_cancelled' | 'to_pending';
};

export const createDeliveryOrderSchema = Joi.object<DeliveryOrderCreateInput>({
  customerId: Joi.string().required().uuid().messages({
    'string.empty': 'Customer ID is required',
    'string.guid': 'Customer ID must be a valid UUID',
    'any.required': 'Customer ID is required',
  }),
  address: Joi.string().optional().allow('').max(500).messages({
    'string.max': 'Address cannot exceed {#limit} characters',
  }),
  internalNote: Joi.string().optional().allow('').max(1000).messages({
    'string.max': 'Internal note cannot exceed {#limit} characters',
  }),
  deliverySchedule: Joi.date().optional().messages({
    'date.base': 'Delivery schedule must be a valid date',
  }),
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required().uuid().messages({
          'string.empty': 'Product ID is required',
          'string.guid': 'Product ID must be a valid UUID',
          'any.required': 'Product ID is required',
        }),
        quantity: Joi.number().required().positive().messages({
          'number.base': 'Quantity must be a number',
          'number.positive': 'Quantity must be greater than 0',
          'any.required': 'Quantity is required',
        }),
      }),
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one item is required',
      'any.required': 'Items are required',
    }),
});

export const updateDeliveryOrderSchema = Joi.object<DeliveryOrderUpdateInput>({
  customerId: Joi.string().uuid().messages({
    'string.empty': 'Customer ID is required',
    'string.guid': 'Customer ID must be a valid UUID',
  }),
  address: Joi.string().allow('').max(500).messages({
    'string.max': 'Address cannot exceed {#limit} characters',
  }),
  internalNote: Joi.string().allow('').max(1000).messages({
    'string.max': 'Internal note cannot exceed {#limit} characters',
  }),
  deliverySchedule: Joi.date().optional().messages({
    'date.base': 'Delivery schedule must be a valid date',
  }),
  items: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().uuid().optional().messages({
          'string.guid': 'Item ID must be a valid UUID',
        }),
        productId: Joi.string().required().uuid().messages({
          'string.empty': 'Product ID is required',
          'string.guid': 'Product ID must be a valid UUID',
          'any.required': 'Product ID is required',
        }),
        quantity: Joi.number().required().positive().messages({
          'number.base': 'Quantity must be a number',
          'number.positive': 'Quantity must be greater than 0',
          'any.required': 'Quantity is required',
        }),
      }),
    )
    .min(1)
    .messages({
      'array.min': 'At least one item is required',
    }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

export const transferItemsSchema = Joi.object<DeliveryOrderTransferItemsInput>({
  targetCustomerId: Joi.string().required().uuid().messages({
    'string.empty': 'Target customer ID is required',
    'string.guid': 'Target customer ID must be a valid UUID',
    'any.required': 'Target customer ID is required',
  }),
  sourceShipmentId: Joi.string().required().uuid().messages({
    'string.empty': 'Source shipment ID is required',
    'string.guid': 'Source shipment ID must be a valid UUID',
    'any.required': 'Source shipment ID is required',
  }),
  transferItems: Joi.array()
    .items(
      Joi.object({
        deliveryOrderId: Joi.string().required().uuid().messages({
          'string.empty': 'Delivery order ID is required',
          'string.guid': 'Delivery order ID must be a valid UUID',
          'any.required': 'Delivery order ID is required',
        }),
        productId: Joi.string().required().uuid().messages({
          'string.empty': 'Product ID is required',
          'string.guid': 'Product ID must be a valid UUID',
          'any.required': 'Product ID is required',
        }),
        quantity: Joi.number().required().positive().messages({
          'number.base': 'Quantity must be a number',
          'number.positive': 'Quantity must be greater than 0',
          'any.required': 'Quantity is required',
        }),
      }),
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one item to transfer is required',
      'any.required': 'Transfer items are required',
    }),
});

export const reduceShipmentItemQuantitySchema = Joi.object<ReduceShipmentItemQuantityInput>({
  shipmentItemId: Joi.string().required().uuid().messages({
    'string.empty': 'Shipment item ID is required',
    'string.guid': 'Shipment item ID must be a valid UUID',
    'any.required': 'Shipment item ID is required',
  }),
  newQuantity: Joi.number().required().positive().messages({
    'number.base': 'New quantity must be a number',
    'number.positive': 'New quantity must be greater than 0',
    'any.required': 'New quantity is required',
  }),
});

export const reviseShipmentItemSchema = Joi.object<ReviseShipmentItemInput>({
  shipmentId: Joi.string().required().uuid().messages({
    'string.empty': 'Shipment ID is required',
    'string.guid': 'Shipment ID must be a valid UUID',
    'any.required': 'Shipment ID is required',
  }),
  shipmentItemId: Joi.string().required().uuid().messages({
    'string.empty': 'Shipment item ID is required',
    'string.guid': 'Shipment item ID must be a valid UUID',
    'any.required': 'Shipment item ID is required',
  }),
  newQuantity: Joi.number().required().min(0).messages({
    'number.base': 'New quantity must be a number',
    'number.min': 'New quantity must be greater than or equal to 0',
    'any.required': 'New quantity is required',
  }),
  decreaseMode: Joi.string().valid('to_cancelled', 'to_pending').optional().messages({
    'any.only': 'decreaseMode must be one of: to_cancelled, to_pending',
  }),
});

// Using createResourceIdSchema for deliveryOrder ID validation
export const deliveryOrderIdSchema = createResourceIdSchema('DeliveryOrder');
