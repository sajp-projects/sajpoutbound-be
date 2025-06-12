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
        description: 'Pengiriman dibuat',
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
        description: 'Pengiriman diperbarui',
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
        description: 'Pengiriman dihapus',
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
        description: 'Pengiriman dipulihkan',
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
        description: 'Barang sudah ditimbang',
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
        description: `Pengiriman diverifikasi dengan nomor plat ${plateNumber}`,
      },
    });
  },

  /**
   * Get all shipment logs across all shipments
   */
  async getAllShipmentLogs(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;

    const whereConditions: any = {};

    if (search) {
      whereConditions.OR = [
        {
          description: {
            contains: search,
          },
        },
        {
          performedBy: {
            name: {
              contains: search,
            },
          },
        },
        {
          shipment: {
            plateNumber: {
              contains: search,
            },
          },
        },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.shipmentLog.findMany({
        where: whereConditions,
        include: {
          performedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          shipment: {
            select: {
              id: true,
              plateNumber: true,
              type: true,
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
        where: whereConditions,
      }),
    ]);

    return {
      logs,
      total,
    };
  },
};
