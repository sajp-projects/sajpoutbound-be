import { Armada } from '@prisma/client';
import prisma from '../config/prisma';
import { ArmadaCreateInput, ArmadaUpdateInput } from '../schemas/armada';
import armadaLogService from './armadaLogService';

export default {
  /**
   * Get all armadas with pagination
   *
   * @param page The page number (1-based)
   * @param limit The number of items per page
   * @param search Optional search term for model or plateNumber
   * @returns Object containing armadas array and total count
   */
  async getAllArmadas(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;

    const whereConditions: any = {};

    if (search) {
      whereConditions.OR = [
        {
          model: {
            contains: search,
          },
        },
        {
          plateNumber: {
            contains: search,
          },
        },
        {
          id_sl: {
            contains: search,
          },
        },
      ];
    }

    const [armadas, total] = await Promise.all([
      prisma.armada.findMany({
        where: whereConditions,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.armada.count({
        where: whereConditions,
      }),
    ]);

    return {
      armadas,
      total,
    };
  },

  /**
   * Get armada by ID
   *
   * @param id The ID of the armada to retrieve
   * @returns The armada or null if not found
   */
  async getArmadaById(id: string): Promise<Armada | null> {
    return prisma.armada.findUnique({
      where: {
        id,
      },
    });
  },

  /**
   * Create a new armada
   *
   * @param data The armada data
   * @param performedById The ID of the user who performed the action
   * @returns The created armada
   */
  async createArmada(data: ArmadaCreateInput, performedById: string): Promise<Armada> {
    return prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Create the armada using Prisma with the correct type handling
      const armada = await tx.armada.create({
        data: {
          ...data,
          createdAt: jakartaTime,
          updatedAt: jakartaTime,
        },
      });

      const armadaDataToLog = {
        id: armada.id,
        model: armada.model,
        id_sl: armada.id_sl,
        plateNumber: armada.plateNumber,
        description: armada.description,
      };

      await armadaLogService.logArmadaCreation(armada.id, performedById, armadaDataToLog, tx);

      return armada;
    });
  },

  /**
   * Update an armada
   *
   * @param existingArmada The existing armada object (already fetched)
   * @param data The new armada data
   * @param performedById The ID of the user who performed the action
   * @returns The updated armada
   */
  async updateArmada(
    existingArmada: Armada,
    data: ArmadaUpdateInput,
    performedById: string,
  ): Promise<Armada> {
    return prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      const armada = await tx.armada.update({
        where: {
          id: existingArmada.id,
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
          existingArmada &&
          existingArmada[key as keyof typeof existingArmada] !== data[key as keyof typeof data]
        ) {
          changedFields[key] = data[key as keyof typeof data];
          oldDataChanges[key] = existingArmada[key as keyof typeof existingArmada];
        }
      });

      if (Object.keys(changedFields).length > 0) {
        await armadaLogService.logArmadaUpdate(
          armada.id,
          performedById,
          oldDataChanges,
          changedFields,
          tx,
        );
      }

      return armada;
    });
  },

  /**
   * Delete an armada
   *
   * @param existingArmada The existing armada object (already fetched)
   * @param performedById The ID of the user who performed the action
   * @returns The deleted armada
   */
  async deleteArmada(existingArmada: Armada, performedById: string): Promise<Armada> {
    return prisma.$transaction(async (tx) => {
      // Create minimal armada data for logging
      const armadaDataToLog = {
        id: existingArmada.id,
        model: existingArmada.model,
        id_sl: existingArmada.id_sl,
        plateNumber: existingArmada.plateNumber,
        description: existingArmada.description,
      };

      // Log the deletion before actually deleting
      await armadaLogService.logArmadaDeletion(performedById, armadaDataToLog, tx);

      // Disconnect all armada logs from the armada before deletion
      // This preserves the logs but removes their reference to the armada
      await tx.armadaLog.updateMany({
        where: {
          armadaId: existingArmada.id,
        },
        data: {
          armadaId: null,
        },
      });

      // Delete the armada
      await tx.armada.delete({
        where: {
          id: existingArmada.id,
        },
      });

      return existingArmada;
    });
  },
};
