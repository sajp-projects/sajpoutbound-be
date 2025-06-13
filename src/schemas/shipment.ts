import { SHIPMENT_TYPE, STATUS } from '@prisma/client';
import Joi from 'joi';
import { createResourceIdSchema } from './base';

export type ShipmentCreateInput = {
  type: SHIPMENT_TYPE;
  armadaId?: string;
  internalNote?: string;
  plateNumber?: string;

  items: {
    deliveryOrderId: string;
    productId: string;
    requestedQuantity: number;
    locationType?: string;
  }[];
};

export type ShipmentUpdateInput = {
  type?: SHIPMENT_TYPE;
  armadaId?: string;
  internalNote?: string;
  plateNumber?: string;
  platePhoto?: string;
  isVerified?: boolean;
  status?: STATUS;
};

export type ShipmentItemUpdateInput = {
  shipmentItemId?: string; // Optional for existing items
  deliveryOrderId: string;
  productId: string;
  requestedQuantity: number;
  locationType?: string;
};

export type ShipmentFullUpdateInput = ShipmentUpdateInput & {
  items?: ShipmentItemUpdateInput[];
};

export type ShipmentWeighInput = {
  shipmentItemId: string;
  grossWeight: number;
  netWeight?: number;
  tareWeight?: number;
};

export type ShipmentBulkWeighInput = {
  shipmentId: string;
  productId: string;
  grossWeight: number;
  netWeight?: number;
  tareWeight?: number;
};

export type ShipmentChosenProductInput = {
  shipmentId: string;
  productId: string;
};

export const createShipmentSchema = Joi.object<ShipmentCreateInput>({
  type: Joi.string()
    .valid(...Object.values(SHIPMENT_TYPE))
    .required()
    .messages({
      'string.empty': 'Shipment type is required',
      'any.only': 'Invalid shipment type. Must be ANTAR or JEMPUT',
      'any.required': 'Shipment type is required',
    }),
  armadaId: Joi.string().uuid().allow(null).messages({
    'string.guid': 'Armada ID must be a valid UUID',
  }),
  internalNote: Joi.string().allow('', null).max(1000).messages({
    'string.max': 'Internal note cannot exceed {#limit} characters',
  }),
  plateNumber: Joi.string().allow('', null).max(20).messages({
    'string.max': 'Plate number cannot exceed {#limit} characters',
  }),
  items: Joi.array()
    .items(
      Joi.object({
        deliveryOrderId: Joi.string().required().uuid().messages({
          'string.empty': 'Delivery Order ID is required',
          'string.guid': 'Delivery Order ID must be a valid UUID',
          'any.required': 'Delivery Order ID is required',
        }),
        productId: Joi.string().required().uuid().messages({
          'string.empty': 'Product ID is required',
          'string.guid': 'Product ID must be a valid UUID',
          'any.required': 'Product ID is required',
        }),
        requestedQuantity: Joi.number().required().integer().min(1).messages({
          'number.base': 'Requested quantity must be a number',
          'number.integer': 'Requested quantity must be an integer',
          'number.min': 'Requested quantity must be at least 1',
          'any.required': 'Requested quantity is required',
        }),
        locationType: Joi.string().allow('', null).max(100).messages({
          'string.max': 'Location type cannot exceed {#limit} characters',
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

export const updateShipmentSchema = Joi.object<ShipmentUpdateInput>({
  type: Joi.string()
    .valid(...Object.values(SHIPMENT_TYPE))
    .messages({
      'any.only': 'Invalid shipment type. Must be ANTAR or JEMPUT',
    }),
  armadaId: Joi.string().uuid().allow(null, '').messages({
    'string.guid': 'Armada ID must be a valid UUID',
  }),
  internalNote: Joi.string().allow('', null).max(1000).messages({
    'string.max': 'Internal note cannot exceed {#limit} characters',
  }),
  plateNumber: Joi.string().allow('', null).max(20).messages({
    'string.max': 'Plate number cannot exceed {#limit} characters',
  }),
  platePhoto: Joi.string().allow('', null).max(500).messages({
    'string.max': 'Plate photo URL cannot exceed {#limit} characters',
  }),
  isVerified: Joi.boolean(),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

export const shipmentWeighSchema = Joi.object<ShipmentWeighInput>({
  shipmentItemId: Joi.string().required().uuid().messages({
    'string.empty': 'Shipment Item ID is required',
    'string.guid': 'Shipment Item ID must be a valid UUID',
    'any.required': 'Shipment Item ID is required',
  }),
  grossWeight: Joi.number().required().min(0).messages({
    'number.base': 'Gross weight must be a number',
    'number.min': 'Gross weight must be at least 0',
    'any.required': 'Gross weight is required',
  }),
  netWeight: Joi.number().optional().min(0).messages({
    'number.base': 'Net weight must be a number',
    'number.min': 'Net weight must be at least 0',
  }),
  tareWeight: Joi.number().optional().min(0).messages({
    'number.base': 'Tare weight must be a number',
    'number.min': 'Tare weight must be at least 0',
  }),
});

export const shipmentBulkWeighSchema = Joi.object<ShipmentBulkWeighInput>({
  shipmentId: Joi.string().required().uuid().messages({
    'string.empty': 'Shipment ID is required',
    'string.guid': 'Shipment ID must be a valid UUID',
    'any.required': 'Shipment ID is required',
  }),
  productId: Joi.string().required().uuid().messages({
    'string.empty': 'Product ID is required',
    'string.guid': 'Product ID must be a valid UUID',
    'any.required': 'Product ID is required',
  }),
  grossWeight: Joi.number().required().min(0).messages({
    'number.base': 'Gross weight must be a number',
    'number.min': 'Gross weight must be at least 0',
    'any.required': 'Gross weight is required',
  }),
  netWeight: Joi.number().optional().min(0).messages({
    'number.base': 'Net weight must be a number',
    'number.min': 'Net weight must be at least 0',
  }),
  tareWeight: Joi.number().optional().min(0).messages({
    'number.base': 'Tare weight must be a number',
    'number.min': 'Tare weight must be at least 0',
  }),
});

export const shipmentFullUpdateSchema = Joi.object<ShipmentFullUpdateInput>({
  type: Joi.string()
    .valid(...Object.values(SHIPMENT_TYPE))
    .messages({
      'any.only': 'Invalid shipment type. Must be ANTAR or JEMPUT',
    }),
  armadaId: Joi.string().uuid().allow(null, '').messages({
    'string.guid': 'Armada ID must be a valid UUID',
  }),
  internalNote: Joi.string().allow('', null).max(1000).messages({
    'string.max': 'Internal note cannot exceed {#limit} characters',
  }),
  plateNumber: Joi.string().allow('', null).max(20).messages({
    'string.max': 'Plate number cannot exceed {#limit} characters',
  }),
  items: Joi.array()
    .items(
      Joi.object({
        shipmentItemId: Joi.string().uuid().allow('', null).optional().messages({
          'string.guid': 'Shipment Item ID must be a valid UUID',
        }),
        deliveryOrderId: Joi.string().required().uuid().messages({
          'string.empty': 'Delivery Order ID is required',
          'string.guid': 'Delivery Order ID must be a valid UUID',
          'any.required': 'Delivery Order ID is required',
        }),
        productId: Joi.string().required().uuid().messages({
          'string.empty': 'Product ID is required',
          'string.guid': 'Product ID must be a valid UUID',
          'any.required': 'Product ID is required',
        }),
        requestedQuantity: Joi.number().required().integer().min(1).messages({
          'number.base': 'Requested quantity must be a number',
          'number.integer': 'Requested quantity must be an integer',
          'number.min': 'Requested quantity must be at least 1',
          'any.required': 'Requested quantity is required',
        }),
        locationType: Joi.string().allow('', null).max(100).messages({
          'string.max': 'Location type cannot exceed {#limit} characters',
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

export const shipmentChosenProductSchema = Joi.object<ShipmentChosenProductInput>({
  shipmentId: Joi.string().required().uuid().messages({
    'string.empty': 'Shipment ID is required',
    'string.guid': 'Shipment ID must be a valid UUID',
    'any.required': 'Shipment ID is required',
  }),
  productId: Joi.string().required().uuid().messages({
    'string.empty': 'Product ID is required',
    'string.guid': 'Product ID must be a valid UUID',
    'any.required': 'Product ID is required',
  }),
});

// Using createResourceIdSchema for shipment ID validation
export const shipmentIdSchema = createResourceIdSchema('Shipment');
