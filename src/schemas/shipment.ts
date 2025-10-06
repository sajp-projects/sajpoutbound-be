import { SHIPMENT_TYPE, STATUS, WEIGHING_METHOD } from '@prisma/client';
import Joi from 'joi';
import { createResourceIdSchema } from './base';

export type ShipmentCreateInput = {
  type: SHIPMENT_TYPE;
  armadaId?: string;
  driverId: string;
  kenek: string;
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
  driverId?: string;
  kenek?: string;
  internalNote?: string;
  plateNumber?: string;
  platePhoto?: string;
  isVerified?: boolean;
  status?: STATUS;
};

export type WeighingType = {
  id: string;
  grossWeight: number;
  netWeight: number;
  tareWeight: number;
  createdAt: Date;
  notaTimbangan: {
    id: string;
    ticketNumber: string;
    documentPath: string;
  } | null;
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
  shipmentId: string;
  shipmentItemId: string;
  grossWeight: number;
  netWeight?: number;
  tareWeight?: number;
};

export type ShipmentBulkWeighInput = {
  shipmentId: string;
  productId: string;
  deliveryOrderIds?: string[]; // Optional: specific DOs to weigh together
  grossWeight: number;
  netWeight?: number;
  tareWeight?: number;
};

export type ShipmentChosenProductInput = {
  shipmentId: string;
  productId: string;
  weighingMethod: WEIGHING_METHOD;
};

export type ShipmentSelectiveChosenProductInput = {
  shipmentId: string;
  productId: string;
  weighingMethod: WEIGHING_METHOD;
  deliveryOrderIds: string[]; // Specific DOs to choose
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
  driverId: Joi.string().uuid().required().messages({
    'string.guid': 'Driver ID must be a valid UUID',
    'string.empty': 'Driver ID is required',
    'any.required': 'Driver ID is required',
  }),
  kenek: Joi.string().required().min(1).max(255).messages({
    'string.empty': 'Kenek is required',
    'string.min': 'Kenek cannot be empty',
    'string.max': 'Kenek cannot exceed {#limit} characters',
    'any.required': 'Kenek is required',
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
        requestedQuantity: Joi.number().required().positive().messages({
          'number.base': 'Requested quantity must be a number',
          'number.positive': 'Requested quantity must be greater than 0',
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
  driverId: Joi.string().uuid().messages({
    'string.guid': 'Driver ID must be a valid UUID',
  }),
  kenek: Joi.string().min(1).max(255).messages({
    'string.empty': 'Kenek cannot be empty when provided',
    'string.min': 'Kenek cannot be empty when provided',
    'string.max': 'Kenek cannot exceed {#limit} characters',
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
  shipmentId: Joi.string().required().uuid().messages({
    'string.empty': 'Shipment ID is required',
    'string.guid': 'Shipment ID must be a valid UUID',
    'any.required': 'Shipment ID is required',
  }),
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
  deliveryOrderIds: Joi.array().items(Joi.string().uuid()).optional().messages({
    'array.base': 'Delivery Order IDs must be an array',
    'string.guid': 'Each Delivery Order ID must be a valid UUID',
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
  driverId: Joi.string().uuid().messages({
    'string.guid': 'Driver ID must be a valid UUID',
  }),
  kenek: Joi.string().min(1).max(255).messages({
    'string.empty': 'Kenek cannot be empty when provided',
    'string.min': 'Kenek cannot be empty when provided',
    'string.max': 'Kenek cannot exceed {#limit} characters',
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
        requestedQuantity: Joi.number().required().positive().messages({
          'number.base': 'Requested quantity must be a number',
          'number.positive': 'Requested quantity must be greater than 0',
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
  weighingMethod: Joi.string()
    .valid(...Object.values(WEIGHING_METHOD))
    .required()
    .messages({
      'string.empty': 'Weighing method is required',
      'any.only': 'Invalid weighing method. Must be MANUAL or VENDOR',
      'any.required': 'Weighing method is required',
    }),
});

export const shipmentSelectiveChosenProductSchema = Joi.object<ShipmentSelectiveChosenProductInput>(
  {
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
    weighingMethod: Joi.string()
      .valid(...Object.values(WEIGHING_METHOD))
      .required()
      .messages({
        'string.empty': 'Weighing method is required',
        'any.only': 'Invalid weighing method. Must be MANUAL or VENDOR',
        'any.required': 'Weighing method is required',
      }),
    deliveryOrderIds: Joi.array()
      .items(
        Joi.string().uuid().messages({
          'string.guid': 'Delivery Order ID must be a valid UUID',
        }),
      )
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one delivery order must be selected',
        'any.required': 'Delivery order IDs are required',
      }),
  },
);

// Using createResourceIdSchema for shipment ID validation
export const shipmentIdSchema = createResourceIdSchema('Shipment');
