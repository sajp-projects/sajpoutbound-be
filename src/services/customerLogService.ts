import {
  ACTION, CustomerLog, ENTITY_TYPE, 
} from '@prisma/client';
import prisma from '../config/prisma';
import { CustomerLogCreateInput } from '../schemas/customerLog';

interface RawCustomerLog extends CustomerLog {
  customer: {
    id: string | null;
    name: string | null;
    id_sl: string | null;
    address: string | null;
  };
  performedBy: {
    id: string | null;
    name: string | null;
    email: string | null;
  };
}

export default {
  /**
   * Log a customer creation event
   *
   * @param customerId The ID of the newly created customer
   * @param performedById The ID of the user who created the customer
   * @param customerData The data of the created customer
   * @param tx Optional transaction client
   * @returns The created log entry
   */
  async logCustomerCreation(
    customerId: string,
    performedById: string,
    customerData: any,
    tx?: any,
  ): Promise<CustomerLog> {
    const client = tx || prisma;
    // Create a Jakarta timezone date (UTC+7)
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    const logData: CustomerLogCreateInput = {
      customerId,
      performedById,
      action: ACTION.CREATE,
      entityType: ENTITY_TYPE.CUSTOMER,
      newData: customerData,
      description: `Membuat pelanggan baru: ${customerData.name}`,
    };

    return client.customerLog.create({
      data: {
        ...logData,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
    });
  },

  /**
   * Log a customer update event
   *
   * @param customerId The ID of the updated customer
   * @param performedById The ID of the user who performed the update
   * @param oldData The previous state of the data
   * @param newData The new state of the data
   * @param tx Optional transaction client
   * @param description Optional custom description
   * @returns The created log entry
   */
  async logCustomerUpdate(
    customerId: string,
    performedById: string,
    oldData: any,
    newData: any,
    tx?: any,
    description?: string,
  ): Promise<CustomerLog> {
    const client = tx || prisma;
    // Create a Jakarta timezone date (UTC+7)
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    const logData: CustomerLogCreateInput = {
      customerId,
      performedById,
      action: ACTION.UPDATE,
      entityType: ENTITY_TYPE.CUSTOMER,
      oldData,
      newData,
      description: description || 'Mengubah informasi pelanggan',
    };

    return client.customerLog.create({
      data: {
        ...logData,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
    });
  },

  /**
   * Log a customer deletion event
   *
   * @param performedById The ID of the user who performed the deletion
   * @param customerData The data of the customer being deleted
   * @param tx Optional transaction client
   * @returns The created log entry
   */
  async logCustomerDeletion(
    performedById: string,
    customerData: any,
    tx?: any,
  ): Promise<CustomerLog> {
    const client = tx || prisma;
    // Create a Jakarta timezone date (UTC+7)
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    const logData: CustomerLogCreateInput = {
      customerId: customerData.id,
      performedById,
      action: ACTION.DELETE,
      entityType: ENTITY_TYPE.CUSTOMER,
      oldData: customerData,
      description: `Menghapus pelanggan: ${customerData.name}`,
    };

    return client.customerLog.create({
      data: {
        ...logData,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
    });
  },

  /**
   * Get all customer logs with pagination
   *
   * @param page The page number (1-based)
   * @param limit The number of items per page
   * @returns Object containing logs array and total count
   */
  async getAllCustomerLogs(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.$queryRaw<RawCustomerLog[]>`
        SELECT
          cl.*,
          JSON_OBJECT(
            'id', c.id,
            'name', c.name,
            'id_sl', c.id_sl,
            'address', c.address
          ) as customer,
          JSON_OBJECT(
            'id', u.id,
            'name', u.name,
            'email', u.email
          ) as performedBy
        FROM CustomerLog cl
        LEFT JOIN Customer c ON cl.customerId = c.id
        LEFT JOIN User u ON cl.performedById = u.id
        ORDER BY cl.createdAt DESC
        LIMIT ${skip}, ${limit}
      `,
      prisma.customerLog.count(),
    ]);

    return {
      logs: logs.map((log: RawCustomerLog) => ({
        ...log,
        customer: log.customer.id ? log.customer : null,
        performedBy: log.performedBy.id ? log.performedBy : null,
      })),
      total,
    };
  },

  /**
   * Get all logs for a specific customer
   *
   * @param customerId The ID of the customer to get logs for
   * @param page The page number (1-based)
   * @param limit The number of items per page
   * @returns Object containing logs array and total count
   */
  async getCustomerLogs(customerId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.$queryRaw<RawCustomerLog[]>`
        SELECT
          cl.*,
          JSON_OBJECT(
            'id', c.id,
            'name', c.name,
            'id_sl', c.id_sl,
            'address', c.address
          ) as customer,
          JSON_OBJECT(
            'id', u.id,
            'name', u.name,
            'email', u.email
          ) as performedBy
        FROM CustomerLog cl
        LEFT JOIN Customer c ON cl.customerId = c.id
        LEFT JOIN User u ON cl.performedById = u.id
        WHERE cl.customerId = ${customerId}
        ORDER BY cl.createdAt DESC
        LIMIT ${skip}, ${limit}
      `,
      prisma.customerLog.count({
        where: {
          customerId,
        },
      }),
    ]);

    return {
      logs: logs.map((log: RawCustomerLog) => ({
        ...log,
        customer: log.customer.id ? log.customer : null,
        performedBy: log.performedBy.id ? log.performedBy : null,
      })),
      total,
    };
  },
};
