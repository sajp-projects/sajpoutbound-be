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
          shipment: {
            select: {
              id: true,
              plateNumber: true,
              type: true,
              shipmentNumber: true,
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
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    return db.shipmentLog.create({
      data: {
        shipmentId,
        performedById,
        action: ACTION.CREATE,
        entityType: ENTITY_TYPE.SHIPMENT,
        newData: shipmentData,
        description: 'Pengiriman dibuat',
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
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
    description?: string,
  ) {
    const db = tx || prisma;
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    return db.shipmentLog.create({
      data: {
        shipmentId,
        performedById,
        action: ACTION.UPDATE,
        entityType: ENTITY_TYPE.SHIPMENT,
        oldData,
        newData,
        description: description || 'Pengiriman diperbarui',
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
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
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    return db.shipmentLog.create({
      data: {
        shipmentId,
        performedById,
        action: ACTION.DELETE,
        entityType: ENTITY_TYPE.SHIPMENT,
        oldData: shipmentData,
        description: 'Pengiriman dihapus',
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
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
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    return db.shipmentLog.create({
      data: {
        shipmentId,
        performedById,
        action: ACTION.RESTORE,
        entityType: ENTITY_TYPE.SHIPMENT,
        newData: shipmentData,
        description: 'Pengiriman dipulihkan',
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
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
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

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
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
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
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

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
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
    });
  },

  /**
   * Log customer change after weighing from shipment perspective
   */
  async logCustomerChangeAfterWeighing(
    shipmentId: string,
    performedById: string,
    oldCustomerName: string,
    newCustomerName: string,
    tx?: any,
  ) {
    const db = tx || prisma;
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    return db.shipmentLog.create({
      data: {
        shipmentId,
        performedById,
        action: ACTION.UPDATE,
        entityType: ENTITY_TYPE.SHIPMENT,
        oldData: {
          customerName: oldCustomerName,
        },
        newData: {
          customerName: newCustomerName,
        },
        description: `Customer pengiriman diubah dari ${oldCustomerName} ke ${newCustomerName}`,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
    });
  },

  /**
   * Log DO revision after weighing from shipment perspective
   */
  async logDORevisionAfterWeighing(
    shipmentId: string,
    performedById: string,
    doId: string,
    affectedItems: any[],
    tx?: any,
  ) {
    const db = tx || prisma;
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    return db.shipmentLog.create({
      data: {
        shipmentId,
        performedById,
        action: ACTION.UPDATE,
        entityType: ENTITY_TYPE.SHIPMENT,
        oldData: {
          doId,
          revisedItems: affectedItems.map(
            (item) =>
              `${item.productName}: ${item.oldProcessedQuantity} processed, ${item.oldPendingQuantity} pending, ${item.oldWeighing}kg`,
          ),
        },
        newData: {
          doId,
          revisedItems: affectedItems.map(
            (item) =>
              `${item.productName}: ${item.newProcessedQuantity} processed, ${item.newPendingQuantity} pending, ${item.newWeighing}kg`,
          ),
        },
        description: `DO direvisi - Item yang terdampak: ${affectedItems.map((item) => item.productName).join(', ')}`,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
    });
  },

  /**
   * Log product selection for shipment
   */
  async logProductChosen(
    shipmentId: string,
    performedById: string,
    productData: any,
    weighingMethod: string,
    itemsAffected: number,
    tx?: any,
  ) {
    const db = tx || prisma;
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    return db.shipmentLog.create({
      data: {
        shipmentId,
        performedById,
        action: ACTION.UPDATE,
        entityType: ENTITY_TYPE.SHIPMENT,
        newData: {
          productId: productData.id,
          productName: productData.name,
          weighingMethod,
          itemsAffected,
          status: 'CHOSEN',
        },
        description: `Produk ${productData.name} dipilih untuk pengiriman (${weighingMethod}, ${itemsAffected} item)`,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
    });
  },

  /**
   * Log individual item weighing
   */
  async logItemWeighed(
    shipmentId: string,
    performedById: string,
    itemData: any,
    weightData: any,
    tx?: any,
  ) {
    const db = tx || prisma;
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    return db.shipmentLog.create({
      data: {
        shipmentId,
        performedById,
        action: ACTION.UPDATE,
        entityType: ENTITY_TYPE.SHIPMENT,
        oldData: {
          itemId: itemData.id,
          productName: itemData.product?.name,
          status: 'CHOSEN',
        },
        newData: {
          itemId: itemData.id,
          productName: itemData.product?.name,
          status: 'COMPLETED',
          grossWeight: weightData.grossWeight,
          netWeight: weightData.netWeight,
          tareWeight: weightData.tareWeight,
          requestedQuantity: itemData.requestedQuantity,
        },
        description: `Item ${itemData.product?.name} ditimbang - Berat: ${weightData.grossWeight}kg`,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
    });
  },

  /**
   * Log bulk weighing of items
   */
  async logBulkItemsWeighed(
    shipmentId: string,
    performedById: string,
    productData: any,
    weightData: any,
    itemsProcessed: number,
    weighingMethod: string,
    tx?: any,
  ) {
    const db = tx || prisma;
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    return db.shipmentLog.create({
      data: {
        shipmentId,
        performedById,
        action: ACTION.UPDATE,
        entityType: ENTITY_TYPE.SHIPMENT,
        oldData: {
          productName: productData.name,
          itemsCount: itemsProcessed,
          status: 'CHOSEN',
        },
        newData: {
          productName: productData.name,
          itemsCount: itemsProcessed,
          status: 'COMPLETED',
          grossWeight: weightData.grossWeight,
          netWeight: weightData.netWeight,
          tareWeight: weightData.tareWeight,
          weighingMethod,
        },
        description: `${itemsProcessed} item ${productData.name} ditimbang massal (${weighingMethod}) - Total: ${weightData.grossWeight}kg`,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
    });
  },

  /**
   * Log plate photo upload
   */
  async logPlatePhotoUploaded(
    shipmentId: string,
    performedById: string,
    platePhotoPath: string,
    tx?: any,
  ) {
    const db = tx || prisma;
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    return db.shipmentLog.create({
      data: {
        shipmentId,
        performedById,
        action: ACTION.UPDATE,
        entityType: ENTITY_TYPE.SHIPMENT,
        newData: {
          platePhoto: platePhotoPath,
        },
        description: 'Foto plat diunggah ke pengiriman',
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
    });
  },

  /**
   * Log chosen product deletion
   */
  async logChosenProductDeleted(
    shipmentId: string,
    performedById: string,
    productData: any,
    itemsAffected: number,
    tx?: any,
  ) {
    const db = tx || prisma;
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    return db.shipmentLog.create({
      data: {
        shipmentId,
        performedById,
        action: ACTION.UPDATE,
        entityType: ENTITY_TYPE.SHIPMENT,
        oldData: {
          productId: productData.id,
          productName: productData.name,
          itemsAffected,
          status: 'CHOSEN',
        },
        newData: {
          productId: productData.id,
          productName: productData.name,
          itemsAffected,
          status: 'PENDING',
        },
        description: `Produk ${productData.name} dihapus dari pengiriman (${itemsAffected} item kembali ke PENDING)`,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
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
              shipmentNumber: true,
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

  /**
   * Create a log entry for SPMB updates/deletions
   */
  async logSPMBChanges(
    shipmentId: string,
    performedById: string,
    spmbChanges: Array<{
      spmbId: string;
      spmbCode: string;
      action: 'UPDATED' | 'DELETED';
      reason: string;
    }>,
    tx?: any,
  ) {
    const client = tx || prisma;

    // Create Jakarta timezone date (UTC+7)
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    const description = `SPMB changes: ${spmbChanges
      .map((change) => `${change.spmbCode} (${change.action})`)
      .join(', ')}`;

    return client.shipmentLog.create({
      data: {
        shipmentId,
        performedById,
        action: ACTION.UPDATE,
        entityType: ENTITY_TYPE.SHIPMENT,
        description,
        newData: {
          spmbChanges,
        },
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
    });
  },

  /**
   * Log quantity reduction for shipment items
   */
  async logQuantityReduction(
    shipmentId: string,
    performedById: string,
    reductionData: {
      shipmentItemId: string;
      deliveryOrderNumber: string;
      productName: string;
      customerName: string;
      oldQuantity: number;
      newQuantity: number;
      reductionAmount: number;
      reason: string;
    },
    tx?: any,
  ) {
    const db = tx || prisma;
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    return db.shipmentLog.create({
      data: {
        shipmentId,
        performedById,
        action: ACTION.UPDATE,
        entityType: ENTITY_TYPE.SHIPMENT,
        oldData: {
          shipmentItemId: reductionData.shipmentItemId,
          deliveryOrderNumber: reductionData.deliveryOrderNumber,
          productName: reductionData.productName,
          customerName: reductionData.customerName,
          quantity: reductionData.oldQuantity,
        },
        newData: {
          shipmentItemId: reductionData.shipmentItemId,
          deliveryOrderNumber: reductionData.deliveryOrderNumber,
          productName: reductionData.productName,
          customerName: reductionData.customerName,
          quantity: reductionData.newQuantity,
          reductionAmount: reductionData.reductionAmount,
        },
        description: `${reductionData.reason}: ${reductionData.productName} untuk ${reductionData.customerName} (DO: ${reductionData.deliveryOrderNumber}) dikurangi dari ${reductionData.oldQuantity} ke ${reductionData.newQuantity} (-${reductionData.reductionAmount})`,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
    });
  },

  /**
   * Log shipment item quantity updates (used during transfers)
   */
  async logShipmentItemQuantityUpdate(
    shipmentId: string,
    performedById: string,
    updates: Array<{
      shipmentItemId: string;
      productName: string;
      oldQuantity: number;
      newQuantity: number;
      reason: string;
    }>,
    tx?: any,
  ) {
    const db = tx || prisma;
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    const description = `Shipment item quantity updates: ${updates
      .map((update) => `${update.productName} (${update.oldQuantity} → ${update.newQuantity})`)
      .join(', ')}`;

    return db.shipmentLog.create({
      data: {
        shipmentId,
        performedById,
        action: ACTION.UPDATE,
        entityType: ENTITY_TYPE.SHIPMENT,
        oldData: {
          updates: updates.map((u) => ({
            shipmentItemId: u.shipmentItemId,
            productName: u.productName,
            quantity: u.oldQuantity,
          })),
        },
        newData: {
          updates: updates.map((u) => ({
            shipmentItemId: u.shipmentItemId,
            productName: u.productName,
            quantity: u.newQuantity,
            reason: u.reason,
          })),
        },
        description,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
    });
  },
};
