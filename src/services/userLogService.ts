import { ACTION, ENTITY_TYPE } from '@prisma/client';
import prisma from '../config/prisma';

export default {
  /**
   * Log a user creation event
   *
   * @param userId The ID of the newly created user
   * @param performedById The ID of the user who created the user
   * @param userData The data of the created user
   * @param tx Optional transaction client
   * @returns The created log entry
   */
  async logUserCreation(userId: string, performedById: string, userData: any, tx?: any) {
    const client = tx || prisma;
    return client.userLog.create({
      data: {
        userId,
        performedById,
        action: ACTION.CREATE,
        entityType: ENTITY_TYPE.USER,
        newData: userData,
        description: `Created new user account: ${userData.name || userData.email}`,
      },
    });
  },

  /**
   * Log a user update event
   *
   * @param userId The ID of the updated user
   * @param performedById The ID of the user who performed the update
   * @param oldData The previous state of the data
   * @param newData The new state of the data
   * @param tx Optional transaction client
   * @param description Optional custom description
   * @returns The created log entry
   */
  async logUserUpdate(
    userId: string,
    performedById: string,
    oldData: any,
    newData: any,
    tx?: any,
    description?: string,
  ) {
    const client = tx || prisma;
    return client.userLog.create({
      data: {
        userId,
        performedById,
        action: ACTION.UPDATE,
        entityType: ENTITY_TYPE.USER,
        oldData,
        newData,
        description: description || 'Updated user information',
      },
    });
  },

  /**
   * Log a user deletion (soft delete/archive) event
   *
   * @param userId The ID of the deleted user
   * @param performedById The ID of the user who performed the deletion
   * @param userData The data of the user being deleted
   * @param tx Optional transaction client
   * @returns The created log entry
   */
  async logUserDeletion(userId: string, performedById: string, userData: any, tx?: any) {
    // Create a Jakarta timezone date (UTC+7)
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    const client = tx || prisma;
    return client.userLog.create({
      data: {
        userId,
        performedById,
        action: ACTION.DELETE,
        entityType: ENTITY_TYPE.USER,
        oldData: {
          deletedAt: null,
        },
        newData: {
          deletedAt: jakartaTime,
        },
        description: `Archived user account: ${userData.name || userData.email}`,
      },
    });
  },

  /**
   * Log a user restoration (unarchive) event
   *
   * @param userId The ID of the restored user
   * @param performedById The ID of the user who performed the restoration
   * @param userData The data of the user being restored
   * @param tx Optional transaction client
   * @returns The created log entry
   */
  async logUserRestoration(userId: string, performedById: string, userData: any, tx?: any) {
    const client = tx || prisma;
    return client.userLog.create({
      data: {
        userId,
        performedById,
        action: ACTION.RESTORE,
        entityType: ENTITY_TYPE.USER,
        oldData: {
          deletedAt: userData.deletedAt,
        },
        newData: {
          deletedAt: null,
        },
        description: `Restored user account: ${userData.name || userData.email}`,
      },
    });
  },

  /**
   * Get all logs for a specific user
   *
   * @param userId The ID of the user to get logs for
   * @returns List of log entries
   */
  async getUserLogs(userId: string) {
    return prisma.userLog.findMany({
      where: {
        userId,
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
    });
  },

  /**
   * Get all logs performed by a specific user
   *
   * @param performedById The ID of the user who performed the actions
   * @returns List of log entries
   */
  async getLogsByPerformer(performedById: string) {
    return prisma.userLog.findMany({
      where: {
        performedById,
      },
      include: {
        user: {
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
    });
  },
};
