import prisma from '../config/prisma';
import { ProductCreateInput, ProductUpdateInput } from '../schemas/product';
import productLogService from './productLogService';

/**
 * Product service for handling product-related database operations
 */
export default {
  /**
   * Get all products with pagination
   *
   * @param page The page number (1-based)
   * @param limit The number of items per page
   * @param search Optional search term
   * @returns Object containing products array and total count
   */
  async getAllProducts(page: number = 1, limit: number = 10, search?: string) {
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
          satuan: {
            contains: search,
          },
        },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereConditions,
        include: {
          warehouse: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.product.count({
        where: whereConditions,
      }),
    ]);

    // Debug: Log the query results
    console.log(`Found ${products.length} products out of ${total} total`);

    return {
      products,
      total,
    };
  },

  /**
   * Get a product by ID
   */
  async getProductById(id: string) {
    return prisma.product.findFirst({
      where: {
        id,
      },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });
  },

  /**
   * Create a new product
   */
  async createProduct(data: ProductCreateInput, performedById: string) {
    const { warehouseId, ...productData } = data;

    return prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Create the product using Prisma with the correct type handling
      const product = await tx.product.create({
        data: {
          ...productData,
          createdAt: jakartaTime,
          updatedAt: jakartaTime,
          warehouse: {
            connect: {
              id: warehouseId,
            },
          },
        },
        include: {
          warehouse: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      });

      const productDataToLog = {
        id: product.id,
        name: product.name,
        id_sl: product.id_sl,
        description: product.description,
        satuan: product.satuan,
        warehouseId: product.warehouseId,
      };

      await productLogService.logProductCreation(product.id, performedById, productDataToLog, tx);

      return product;
    });
  },

  /**
   * Update product information
   */
  async updateProduct(
    id: string,
    data: ProductUpdateInput,
    performedById: string,
    oldProduct: NonNullable<Awaited<ReturnType<typeof this.getProductById>>>,
  ) {
    const { warehouseId, ...productData } = data;

    return prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      const product = await tx.product.update({
        where: {
          id,
        },
        data: {
          ...productData,
          updatedAt: jakartaTime,
          warehouse: warehouseId
            ? {
              connect: {
                id: warehouseId,
              },
            }
            : undefined,
        },
        include: {
          warehouse: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      });

      // Create log entry - only include changed fields
      const changedFields: Record<string, any> = {};
      const oldDataChanges: Record<string, any> = {};

      Object.keys(productData).forEach((key) => {
        if (
          oldProduct &&
          oldProduct[key as keyof typeof oldProduct] !==
            productData[key as keyof typeof productData]
        ) {
          changedFields[key] = productData[key as keyof typeof productData];
          oldDataChanges[key] = oldProduct[key as keyof typeof oldProduct];
        }
      });

      // Add warehouseId changes if any
      if (warehouseId && oldProduct.warehouseId !== warehouseId) {
        changedFields.warehouseId = warehouseId;
        oldDataChanges.warehouseId = oldProduct.warehouseId;
      }

      if (Object.keys(changedFields).length > 0) {
        await productLogService.logProductUpdate(
          product.id,
          performedById,
          oldDataChanges,
          changedFields,
          tx,
        );
      }

      return product;
    });
  },

  /**
   * Get multiple products by their IDs in a single query
   *
   * @param ids Array of product IDs to retrieve
   * @returns Array of products matching the provided IDs
   */
  async getProductsByIds(ids: string[]) {
    if (!ids.length) return [];

    return prisma.product.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });
  },

  /**
   * Delete a product (hard delete)
   * The product logs will be kept with productId set to null
   */
  async deleteProduct(id: string, performedById: string) {
    return prisma.$transaction(async (tx) => {
      const oldProduct = await tx.product.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          name: true,
          id_sl: true,
          description: true,
          satuan: true,
          warehouseId: true,
          warehouse: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              productLogs: true,
            },
          },
        },
      });

      if (!oldProduct) {
        throw new Error('Product not found');
      }

      // Create minimal product data for logging
      const productDataToLog = {
        id: oldProduct.id,
        name: oldProduct.name,
        id_sl: oldProduct.id_sl,
        description: oldProduct.description,
        satuan: oldProduct.satuan,
        warehouseId: oldProduct.warehouseId,
        warehouseName: oldProduct.warehouse?.name,
      };

      // Log the deletion before actually deleting
      await productLogService.logProductDeletion(performedById, productDataToLog, tx);

      // Disconnect all product logs from the product before deletion
      // This preserves the logs but removes their reference to the product
      await tx.productLog.updateMany({
        where: {
          productId: id,
        },
        data: {
          productId: null,
        },
      });

      // Delete the product
      await tx.product.delete({
        where: {
          id,
        },
      });

      return oldProduct;
    });
  },
};
