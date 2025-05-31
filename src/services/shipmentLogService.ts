import { ACTION, ENTITY_TYPE } from '@prisma/client';
import prisma from '../config/prisma';

/**
 * Service for handling shipment log operations
 */
export default {
  /**
   * Get all shipment logs for a shipment
   */
  async getShipmentLogs(shipmentId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.shipmentLog.findMany({
        where: {
          shipmentId,
        },
        include: {
          performedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.shipmentLog.count({
        where: {
          shipmentId,
        },
      }),
    ]);

    return {
      logs,
      total,
    };
  },

  /**
   * Log shipment creation
   */
  async logShipmentCreation(
    shipmentId: string,
    performedById: string,
    shipmentData: any,
    tx?: any,
  ) {
    const db = tx || prisma;

    return db.shipmentLog.create({
      data: {
        shipmentId,
        performedById,
        action: ACTION.CREATE,
        entityType: ENTITY_TYPE.SHIPMENT,
        newData: shipmentData,
        description: 'Shipment created',
      },
    });
  },

  /**
   * Log shipment update
   */
  async logShipmentUpdate(
    shipmentId: string,
    performedById: string,
    oldData: any,
    newData: any,
    tx?: any,
  ) {
    const db = tx || prisma;

    return db.shipmentLog.create({
      data: {
        shipmentId,
        performedById,
        action: ACTION.UPDATE,
        entityType: ENTITY_TYPE.SHIPMENT,
        oldData,
        newData,
        description: 'Shipment updated',
      },
    });
  },

  /**
   * Log shipment deletion
   */
  async logShipmentDeletion(
    shipmentId: string,
    performedById: string,
    shipmentData: any,
    tx?: any,
  ) {
    const db = tx || prisma;

    return db.shipmentLog.create({
      data: {
        shipmentId,
        performedById,
        action: ACTION.DELETE,
        entityType: ENTITY_TYPE.SHIPMENT,
        oldData: shipmentData,
        description: 'Shipment deleted',
      },
    });
  },

  /**
   * Log shipment restoration
   */
  async logShipmentRestoration(
    shipmentId: string,
    performedById: string,
    shipmentData: any,
    tx?: any,
  ) {
    const db = tx || prisma;

    return db.shipmentLog.create({
      data: {
        shipmentId,
        performedById,
        action: ACTION.RESTORE,
        entityType: ENTITY_TYPE.SHIPMENT,
        newData: shipmentData,
        description: 'Shipment restored',
      },
    });
  },

  /**
   * Log shipment status change
   */
  async logShipmentStatusChange(
    shipmentId: string,
    performedById: string,
    oldStatus: string,
    newStatus: string,
    tx?: any,
  ) {
    const db = tx || prisma;

    return db.shipmentLog.create({
      data: {
        shipmentId,
        performedById,
        action: ACTION.UPDATE,
        entityType: ENTITY_TYPE.SHIPMENT,
        oldData: {
          status: oldStatus,
        },
        newData: {
          status: newStatus,
        },
        description: `Shipment status changed from ${oldStatus} to ${newStatus}`,
      },
    });
  },

  /**
   * Log shipment verification
   */
  async logShipmentVerification(
    shipmentId: string,
    performedById: string,
    plateNumber: string,
    tx?: any,
  ) {
    const db = tx || prisma;

    return db.shipmentLog.create({
      data: {
        shipmentId,
        performedById,
        action: ACTION.UPDATE,
        entityType: ENTITY_TYPE.SHIPMENT,
        newData: {
          isVerified: true,
          plateNumber,
        },
        description: `Shipment verified with plate number ${plateNumber}`,
      },
    });
  },
};
