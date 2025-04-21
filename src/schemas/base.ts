import Joi from 'joi';

/**
 * Base validation schema for ID parameters used across resources
 */
export const idSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'ID must be a number',
    'number.integer': 'ID must be an integer',
    'number.positive': 'ID must be a positive number',
    'any.required': 'ID is required',
  }),
});

/**
 * Utility function to create resource-specific ID schemas
 * @param resourceName - Name of the resource (e.g., 'User', 'Role')
 * @returns Resource-specific ID schema
 */
export const createResourceIdSchema = (resourceName: string) =>
  Joi.object({
    id: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.base': `${resourceName} ID must be a number`,
        'number.integer': `${resourceName} ID must be an integer`,
        'number.positive': `${resourceName} ID must be a positive number`,
        'any.required': `${resourceName} ID is required`,
      }),
  });
