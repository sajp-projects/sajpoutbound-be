import Joi from 'joi';

export const truckWeighingSchema = Joi.object({
  shipmentId: Joi.string().uuid().required().messages({
    'string.guid': 'shipmentId harus berupa UUID yang valid',
    'any.required': 'shipmentId wajib diisi'
  }),
  type: Joi.string().valid('PRE', 'POST').required().messages({
    'any.only': 'type harus PRE atau POST',
    'any.required': 'type wajib diisi'
  }),
  weight: Joi.number().positive().required().messages({
    'number.positive': 'Berat harus lebih dari 0',
    'any.required': 'weight wajib diisi'
  })
});
