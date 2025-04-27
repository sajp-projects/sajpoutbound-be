import { RolePermission } from '@prisma/client';
import Joi from 'joi';
import { createResourceIdSchema } from './base';

export type RolePermissionCreateInput = Pick<RolePermission, 'roleId' | 'permissionId'>;
export type RolePermissionsAssignInput = {
  roleId: string;
  permissionIds: string[];
};

export const rolePermissionIdSchema = createResourceIdSchema('RolePermission');

export const assignPermissionsToRoleSchema = Joi.object({
  roleId: Joi.string().uuid().required().messages({
    'string.base': 'Role ID must be a text',
    'string.empty': 'Role ID cannot be empty',
    'string.uuid': 'Role ID must be a valid UUID',
    'any.required': 'Role ID is required',
  }),
  permissionIds: Joi.array()
    .items(
      Joi.string().uuid().messages({
        'string.base': 'Permission ID must be a text',
        'string.empty': 'Permission ID cannot be empty',
        'string.uuid': 'Permission ID must be a valid UUID',
      }),
    )
    .min(1)
    .required()
    .messages({
      'array.base': 'Permission IDs must be an array',
      'array.min': 'At least one permission ID is required',
      'any.required': 'Permission IDs are required',
    }),
});
