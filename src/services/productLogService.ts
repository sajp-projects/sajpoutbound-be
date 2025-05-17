import {
  ACTION, ENTITY_TYPE, ProductLog, 
} from '@prisma/client';
import prisma from '../config/prisma';
import { ProductLogCreateInput } from '../schemas/productLog';

interface RawProductLog extends ProductLog {
  product: {
    id: string | null;
    name: string | null;
    id_sl: string | null;
    description: string | null;
  };
  performedBy: {
    id: string | null;
    name: string | null;
    email: string | null;
  };
}

export default {
  /**
   * Log a product creation event
   *
   * @param productId The ID of the newly created product
   * @param performedById The ID of the user who created the product
   * @param productData The data of the created product
   * @param tx Optional transaction client
   * @returns The created log entry
   */
  async logProductCreation(
    productId: string,
    performedById: string,
    productData: any,
    tx?: any,
  ): Promise<ProductLog> {
    const client = tx || prisma;
    // Create a Jakarta timezone date (UTC+7)
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    const logData: ProductLogCreateInput = {
      productId,
      performedById,
      action: ACTION.CREATE,
      entityType: ENTITY_TYPE.PRODUCT,
      newData: productData,
      description: `Membuat produk baru: ${productData.name}`,
    };

    return client.productLog.create({
      data: {
        ...logData,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
    });
  },

  /**
   * Log a product update event
   *
   * @param productId The ID of the updated product
   * @param performedById The ID of the user who performed the update
   * @param oldData The previous state of the data
   * @param newData The new state of the data
   * @param tx Optional transaction client
   * @param description Optional custom description
   * @returns The created log entry
   */
  async logProductUpdate(
    productId: string,
    performedById: string,
    oldData: any,
    newData: any,
    tx?: any,
    description?: string,
  ): Promise<ProductLog> {
    const client = tx || prisma;
    // Create a Jakarta timezone date (UTC+7)
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    // Filter oldData to only include fields that changed
    const changedOldData: Record<string, any> = {};
    Object.keys(newData).forEach((key) => {
      if (oldData[key] !== undefined) {
        changedOldData[key] = oldData[key];
      }
    });

    const logData: ProductLogCreateInput = {
      productId,
      performedById,
      action: ACTION.UPDATE,
      entityType: ENTITY_TYPE.PRODUCT,
      oldData: changedOldData,
      newData,
      description: description || 'Mengubah informasi produk',
    };

    return client.productLog.create({
      data: {
        ...logData,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
    });
  },

  /**
   * Log a product deletion event
   *
   * @param performedById The ID of the user who performed the deletion
   * @param productData The data of the product being deleted
   * @param tx Optional transaction client
   * @returns The created log entry
   */
  async logProductDeletion(performedById: string, productData: any, tx?: any): Promise<ProductLog> {
    const client = tx || prisma;
    // Create a Jakarta timezone date (UTC+7)
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    const logData: ProductLogCreateInput = {
      productId: productData.id,
      performedById,
      action: ACTION.DELETE,
      entityType: ENTITY_TYPE.PRODUCT,
      oldData: productData,
      description: `Menghapus produk: ${productData.name}`,
    };

    return client.productLog.create({
      data: {
        ...logData,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
    });
  },

  /**
   * Get all product logs with pagination
   *
   * @param page The page number (1-based)
   * @param limit The number of items per page
   * @returns Object containing logs array and total count
   */
  async getAllProductLogs(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.$queryRaw<RawProductLog[]>`
        SELECT
          pl.*,
          JSON_OBJECT(
            'id', p.id,
            'name', p.name,
            'id_sl', p.id_sl,
            'description', p.description
          ) as product,
          JSON_OBJECT(
            'id', u.id,
            'name', u.name,
            'email', u.email
          ) as performedBy
        FROM ProductLog pl
        LEFT JOIN Product p ON pl.productId = p.id
        LEFT JOIN User u ON pl.performedById = u.id
        ORDER BY pl.createdAt DESC
        LIMIT ${skip}, ${limit}
      `,
      prisma.productLog.count(),
    ]);

    return {
      logs: logs.map((log: RawProductLog) => ({
        ...log,
        product: log.product.id ? log.product : null,
        performedBy: log.performedBy.id ? log.performedBy : null,
      })),
      total,
    };
  },

  /**
   * Get all logs for a specific product
   *
   * @param productId The ID of the product to get logs for
   * @param page The page number (1-based)
   * @param limit The number of items per page
   * @returns Object containing logs array and total count
   */
  async getProductLogs(productId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.$queryRaw<RawProductLog[]>`
        SELECT
          pl.*,
          JSON_OBJECT(
            'id', p.id,
            'name', p.name,
            'id_sl', p.id_sl,
            'description', p.description
          ) as product,
          JSON_OBJECT(
            'id', u.id,
            'name', u.name,
            'email', u.email
          ) as performedBy
        FROM ProductLog pl
        LEFT JOIN Product p ON pl.productId = p.id
        LEFT JOIN User u ON pl.performedById = u.id
        WHERE pl.productId = ${productId}
        ORDER BY pl.createdAt DESC
        LIMIT ${skip}, ${limit}
      `,
      prisma.productLog.count({
        where: {
          productId,
        },
      }),
    ]);

    return {
      logs: logs.map((log: RawProductLog) => ({
        ...log,
        product: log.product.id ? log.product : null,
        performedBy: log.performedBy.id ? log.performedBy : null,
      })),
      total,
    };
  },
};
