import prisma from '../config/prisma';
import { UserCreateInput, UserUpdateInput } from '../schemas/user';
import userLogService from './userLogService';

/**
 * User service for handling user-related database operations
 */
export default {
  /**
   * Get all users with their roles
   *
   * @returns List of all users
   */
  async getAllUsers() {
    return prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        role: true,
      },
      omit: {
        password: true,
      },
    });
  },

  /**
   * Get all archived users
   *
   * @returns List of all archived users
   */
  async getArchivedUsers() {
    return prisma.user.findMany({
      where: {
        deletedAt: {
          not: null,
        },
      },
      include: {
        role: true,
      },
      omit: {
        password: true,
      },
    });
  },

  /**
   * Get a user by ID that is archived (deletedAt not null) with role information
   *
   * @param id User ID
   * @returns User if found, null otherwise
   */
  async getArchivedUserById(id: string) {
    return prisma.user.findFirst({
      where: {
        id,
        deletedAt: {
          not: null,
        },
      },
      include: {
        role: true,
      },
      omit: {
        password: true,
      },
    });
  },

  /**
   * Get a user by ID with role information
   *
   * @param id User ID
   * @returns User if found, null otherwise
   */
  async getUserById(id: string) {
    return prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        role: true,
      },
      omit: {
        password: true,
      },
    });
  },

  /**
   * Create a new user in the database
   *
   * @param userData User data to create
   * @param performedById ID of the user who created this user
   * @returns Created user
   */
  async createUser(userData: UserCreateInput, performedById: string) {
    // Use transaction to ensure both operations succeed or fail together
    return prisma.$transaction(async (tx) => {
      // Create the user in the database
      console.log(userData, '-------');
      const createdUser = await tx.user.create({
        data: userData,
        include: {
          role: true,
        },
      });

      // Create log entry - don't include password in the log
      const userDataToLog = {
        email: userData.email,
        name: userData.name,
        roleId: userData.roleId,
      };
      await userLogService.logUserCreation(createdUser.id, performedById, userDataToLog, tx);

      // Return user without password
      const userWithoutPassword = {
        id: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
        roleId: createdUser.roleId,
        role: createdUser.role,
        createdAt: createdUser.createdAt,
        updatedAt: createdUser.updatedAt,
        deletedAt: createdUser.deletedAt,
      };
      return userWithoutPassword;
    });
  },

  /**
   * Find a user by email
   *
   * @param email User email
   * @returns User if found, null otherwise
   */
  async findUserByEmail(email: string) {
    return prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
      include: {
        role: true,
      },
    });
  },

  /**
   * Update user information
   *
   * @param id User ID
   * @param data User data to update
   * @param performedById ID of the user who updated this user
   * @returns Updated user
   */
  async updateUser(id: string, data: UserUpdateInput, performedById: string) {
    // Use transaction to ensure both operations succeed or fail together
    return prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Get the current user data for logging the changes
      const oldUserData = await tx.user.findUnique({
        where: {
          id,
        },
        select: {
          email: true,
          name: true,
          roleId: true,
        },
      });

      // Update the user in the database
      const updatedUser = await tx.user.update({
        where: {
          id,
        },
        data: {
          ...data,
          updatedAt: jakartaTime,
        },
        include: {
          role: true,
        },
      });

      // Create log entry - only include changed fields
      const changedFields: Record<string, any> = {};
      Object.keys(data).forEach((key) => {
        if (
          oldUserData &&
          oldUserData[key as keyof typeof oldUserData] !== data[key as keyof typeof data]
        ) {
          changedFields[key] = data[key as keyof typeof data];
        }
      });

      if (Object.keys(changedFields).length > 0) {
        await userLogService.logUserUpdate(id, performedById, oldUserData, changedFields, tx);
      }

      // Return user without password
      const userWithoutPassword = {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        roleId: updatedUser.roleId,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        deletedAt: updatedUser.deletedAt,
      };
      return userWithoutPassword;
    });
  },

  /**
   * Unarchive a user (undo soft-delete)
   *
   * @param id User ID
   * @param performedById ID of the user who unarchived this user
   * @returns Updated User
   */
  async unarchiveUser(id: string, performedById: string) {
    // Use transaction to ensure both operations succeed or fail together
    return prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Get the current user data for logging
      const archivedUserData = await tx.user.findUnique({
        where: {
          id,
        },
        select: {
          name: true,
          email: true,
          deletedAt: true,
        },
      });

      // Update the user in the database
      const updatedUser = await tx.user.update({
        where: {
          id,
        },
        data: {
          deletedAt: null,
          updatedAt: jakartaTime,
        },
        include: {
          role: true,
        },
      });

      await userLogService.logUserRestoration(id, performedById, archivedUserData, tx);

      // Return user without password
      const userWithoutPassword = {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        roleId: updatedUser.roleId,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        deletedAt: updatedUser.deletedAt,
      };
      return userWithoutPassword;
    });
  },

  /**
   * Delete a user (soft delete)
   *
   * @param id User ID
   * @param performedById ID of the user who deleted this user
   * @returns Deleted user
   */
  async deleteUser(id: string, performedById: string) {
    // Use transaction to ensure both operations succeed or fail together
    return prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      const userData = await tx.user.findUnique({
        where: {
          id,
        },
        select: {
          name: true,
          email: true,
        },
      });

      // Update the user in the database (soft delete)
      const deletedUser = await tx.user.update({
        where: {
          id,
        },
        data: {
          deletedAt: jakartaTime,
        },
        include: {
          role: true,
        },
      });

      await userLogService.logUserDeletion(id, performedById, userData, tx);

      // Return user without password
      const userWithoutPassword = {
        id: deletedUser.id,
        email: deletedUser.email,
        name: deletedUser.name,
        roleId: deletedUser.roleId,
        role: deletedUser.role,
        createdAt: deletedUser.createdAt,
        updatedAt: deletedUser.updatedAt,
        deletedAt: deletedUser.deletedAt,
      };
      return userWithoutPassword;
    });
  },
};
