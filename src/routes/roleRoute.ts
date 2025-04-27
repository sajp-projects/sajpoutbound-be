import { PERMISSION_ACTION } from '@prisma/client';
import express from 'express';
import roleController from '../controllers/roleController';
import { checkPermission } from '../middlewares/permission';

const router = express.Router();

router.get('/', checkPermission('role', PERMISSION_ACTION.READ), roleController.getAllRoles);

router.get('/:id', checkPermission('role', PERMISSION_ACTION.READ), roleController.getRoleById);

router.post('/', checkPermission('role', PERMISSION_ACTION.CREATE), roleController.createRole);

router.put('/:id', checkPermission('role', PERMISSION_ACTION.UPDATE), roleController.updateRole);

router.delete('/:id', checkPermission('role', PERMISSION_ACTION.DELETE), roleController.deleteRole);

export default router;
