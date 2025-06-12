import prisma from '../config/prisma';
import { CustomerCreateInput, CustomerUpdateInput } from '../schemas/customer';
import customerLogService from './customerLogService';

/**
 * Customer service for handling customer-related database operations
 */
export default {
  /**
   * Get all customers with pagination
   *
   * @param page The page number (1-based)
   * @param limit The number of items per page
   * @param search Optional search term
   * @returns Object containing customers array and total count
   */
  async getAllCustomers(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;

    const whereConditions: any = {};

    if (search) {
      whereConditions.OR = [
        {
          name: {
            contains: search,
          },
        },
        {
          id_sl: {
            contains: search,
          },
        },
        {
          address: {
            contains: search,
          },
        },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where: whereConditions,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          deliveryOrders: {
            include: {
              items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      satuan: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.customer.count({
        where: whereConditions,
      }),
    ]);

    return {
      customers,
      total,
    };
  },

  /**
   * Get a customer by ID
   */
  async getCustomerById(id: string) {
    return prisma.customer.findFirst({
      where: {
        id,
      },
      include: {
        deliveryOrders: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    satuan: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  /**
   * Create a new customer
   */
  async createCustomer(data: CustomerCreateInput, performedById: string) {
    return prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Create the customer using Prisma with the correct type handling
      const customer = await tx.customer.create({
        data: {
          ...data,
          createdAt: jakartaTime,
          updatedAt: jakartaTime,
        },
      });

      const customerDataToLog = {
        id: customer.id,
        name: customer.name,
        id_sl: customer.id_sl,
        address: customer.address,
      };

      await customerLogService.logCustomerCreation(
        customer.id,
        performedById,
        customerDataToLog,
        tx,
      );

      return customer;
    });
  },

  /**
   * Update customer information
   */
  async updateCustomer(existingCustomer: any, data: CustomerUpdateInput, performedById: string) {
    return prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      const customer = await tx.customer.update({
        where: {
          id: existingCustomer.id,
        },
        data: {
          ...data,
          updatedAt: jakartaTime,
        },
      });

      // Create log entry - only include changed fields
      const changedFields: Record<string, any> = {};
      const oldDataChanges: Record<string, any> = {};

      Object.keys(data).forEach((key) => {
        if (
          existingCustomer &&
          existingCustomer[key as keyof typeof existingCustomer] !== data[key as keyof typeof data]
        ) {
          changedFields[key] = data[key as keyof typeof data];
          oldDataChanges[key] = existingCustomer[key as keyof typeof existingCustomer];
        }
      });

      if (Object.keys(changedFields).length > 0) {
        await customerLogService.logCustomerUpdate(
          customer.id,
          performedById,
          oldDataChanges,
          changedFields,
          tx,
        );
      }

      return customer;
    });
  },

  /**
   * Delete a customer (hard delete)
   * The customer logs will be kept with customerId set to null
   */
  async deleteCustomer(existingCustomer: any, performedById: string) {
    return prisma.$transaction(async (tx) => {
      // Create minimal customer data for logging
      const customerDataToLog = {
        id: existingCustomer.id,
        name: existingCustomer.name,
        id_sl: existingCustomer.id_sl,
        address: existingCustomer.address,
      };

      // Log the deletion before actually deleting
      await customerLogService.logCustomerDeletion(performedById, customerDataToLog, tx);

      // Disconnect all customer logs from the customer before deletion
      // This preserves the logs but removes their reference to the customer
      await tx.customerLog.updateMany({
        where: {
          customerId: existingCustomer.id,
        },
        data: {
          customerId: null,
        },
      });

      // Delete the customer
      await tx.customer.delete({
        where: {
          id: existingCustomer.id,
        },
      });

      return existingCustomer;
    });
  },
};
