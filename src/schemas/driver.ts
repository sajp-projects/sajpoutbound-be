import Joi from 'joi';

export const driverIdSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'ID supir harus berupa UUID yang valid',
    'any.required': 'ID supir diperlukan',
  }),
});

export const createDriverSchema = Joi.object({
  name: Joi.string().min(1).max(255).required().messages({
    'string.empty': 'Nama supir tidak boleh kosong',
    'string.min': 'Nama supir harus memiliki minimal 1 karakter',
    'string.max': 'Nama supir tidak boleh lebih dari 255 karakter',
    'any.required': 'Nama supir diperlukan',
  }),
});

export const updateDriverSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional().messages({
    'string.empty': 'Nama supir tidak boleh kosong',
    'string.min': 'Nama supir harus memiliki minimal 1 karakter',
    'string.max': 'Nama supir tidak boleh lebih dari 255 karakter',
  }),
});

export interface DriverCreateInput {
  name: string;
}

export interface DriverUpdateInput {
  name?: string;
}
