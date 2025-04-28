import { RolePermission } from '@prisma/client';
import { createResourceIdSchema } from './base';

export type RolePermissionCreateDeleteInput = Pick<RolePermission, 'roleId' | 'permissionId'>;
export type RolePermissionsAssignInput = {
  roleId: string;
  permissionIds: string[];
};

export const rolePermissionIdSchema = createResourceIdSchema('RolePermission');
