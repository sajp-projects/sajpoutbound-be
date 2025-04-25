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
   * @param page The page number (1-based)
   * @param limit The number of items per page
   * @returns Object containing logs array and total count
   */
  async getUserLogs(userId: string, page: number = 1, limit: number = 10) {
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Execute both queries in parallel for efficiency
    const [logs, total] = await Promise.all([
      // Get paginated logs
      prisma.userLog.findMany({
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
        skip,
        take: limit,
      }),

      // Get total count for pagination
      prisma.userLog.count({
        where: {
          userId,
        },
      }),
    ]);

    return {
      logs,
      total,
    };
  },

  /**
   * Get all logs performed by a specific user
   *
   * @param performedById The ID of the user who performed the actions
   * @param page The page number (1-based)
   * @param limit The number of items per page
   * @returns Object containing logs array and total count
   */
  async getLogsByPerformer(performedById: string, page: number = 1, limit: number = 10) {
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Execute both queries in parallel for efficiency
    const [logs, total] = await Promise.all([
      // Get paginated logs
      prisma.userLog.findMany({
        where: {
          performedById,
        },
        include: {
          user: {
            omit: {
              password: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),

      // Get total count for pagination
      prisma.userLog.count({
        where: {
          performedById,
        },
      }),
    ]);

    return {
      logs,
      total,
    };
  },

  /**
   * Log when a user's role is unassigned due to role deletion
   *
   * @param userId The ID of the user whose role was unassigned
   * @param roleId The ID of the deleted role
   * @param roleName The name of the deleted role
   * @param performedById The ID of the user who deleted the role
   * @param tx Optional transaction client
   * @returns The created log entry
   */
  async logRoleUnassignment(
    userId: string,
    roleId: string,
    roleName: string,
    performedById: string,
    tx?: any,
  ) {
    const client = tx || prisma;

    // Get the user data for the log description
    const user = await client.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        name: true,
        email: true,
      },
    });

    return client.userLog.create({
      data: {
        userId,
        performedById,
        action: ACTION.UPDATE,
        entityType: ENTITY_TYPE.USER,
        oldData: {
          roleId,
          roleName,
        },
        newData: {
          roleId: null,
          roleName: null,
        },
        description: `Role '${roleName}' was removed from user ${user?.name || user?.email} because the role was deleted`,
      },
    });
  },
};
