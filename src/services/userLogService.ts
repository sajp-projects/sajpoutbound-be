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
    // Create a Jakarta timezone date (UTC+7)
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    return client.userLog.create({
      data: {
        userId,
        performedById,
        action: ACTION.CREATE,
        entityType: ENTITY_TYPE.USER,
        newData: userData,
        description: `Membuat akun pengguna baru: ${userData.name || userData.email}`,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
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

    return client.userLog.create({
      data: {
        userId,
        performedById,
        action: ACTION.UPDATE,
        entityType: ENTITY_TYPE.USER,
        oldData: changedOldData,
        newData,
        description: description || 'Memperbarui informasi pengguna',
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
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
        description: `Mengarsipkan akun pengguna: ${userData.name || userData.email}`,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
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
    // Create a Jakarta timezone date (UTC+7)
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

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
        description: `Memulihkan akun pengguna: ${userData.name || userData.email}`,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
    });
  },

  /**
   * Get all user logs with pagination
   *
   * @param page The page number (1-based)
   * @param limit The number of items per page
   * @returns Object containing logs array and total count
   */
  async getAllUserLogs(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.userLog.findMany({
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          performedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.userLog.count(),
    ]);

    return {
      logs,
      total,
    };
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
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.userLog.findMany({
        where: {
          userId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
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
    // Create a Jakarta timezone date (UTC+7)
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

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
        description: `Peran '${roleName}' dihapus dari pengguna ${user?.name || user?.email} karena peran tersebut telah dihapus`,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
    });
  },
};
