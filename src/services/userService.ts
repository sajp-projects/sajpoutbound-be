import prisma from '../config/prisma';
import { UserCreateInput, UserUpdateInput } from '../schemas/user';
import userLogService from './userLogService';

/**
 * User service for handling user-related database operations
 */
export default {
  /**
   * Get all users with their roles, with pagination
   *
   * @param page The page number (1-based)
   * @param limit The number of items per page
   * @param search Optional search term
   * @param roleId Optional role ID
   * @returns Object containing users array and total count
   */
  async getAllUsers(page: number = 1, limit: number = 10, search?: string, roleId?: string) {
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Build where conditions
    const whereConditions: any = {
      deletedAt: null,
    };

    // Add search by name condition if search parameter is provided
    if (search) {
      whereConditions.OR = [
        {
          name: {
            contains: search,
          },
        },
        {
          email: {
            contains: search,
          },
        },
      ];
    }

    // Add roleId filter if provided
    if (roleId) {
      whereConditions.roleId = roleId;
    }

    // Execute both queries in parallel for efficiency
    const [users, total] = await Promise.all([
      // Get paginated users
      prisma.user.findMany({
        where: whereConditions,
        include: {
          role: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          warehouse: true,
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),

      // Get total count for pagination
      prisma.user.count({
        where: whereConditions,
      }),
    ]);

    // Transform users to exclude password
    const sanitizedUsers = users.map(
      ({ password: _password, ...userWithoutPassword }) => userWithoutPassword,
    );

    return {
      users: sanitizedUsers,
      total,
    };
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
        warehouse: true,
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
        warehouse: true,
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
      },
      include: {
        role: true,
        warehouse: true,
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
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Create the user with the provided data
      const createdUser = await tx.user.create({
        data: {
          ...userData,
          refreshToken: '',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 6),
          createdAt: jakartaTime,
          updatedAt: jakartaTime,
        },
        include: {
          role: true,
          warehouse: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      });

      // Create log entry - don't include password in the log
      const userDataToLog = {
        email: userData.email,
        name: userData.name,
        roleId: userData.roleId,
        warehouseId: userData.warehouseId,
      };
      await userLogService.logUserCreation(createdUser.id, performedById, userDataToLog, tx);

      // Return user without password
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = createdUser;
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
  async updateUser(
    id: string,
    data: UserUpdateInput,
    performedById: string,
    oldUserData: NonNullable<Awaited<ReturnType<typeof this.getUserById>>>,
  ) {
    // Use transaction to ensure both operations succeed or fail together
    return prisma.$transaction(async (tx) => {
      // Create a Jakarta timezone date (UTC+7)
      const jakartaTime = new Date();
      jakartaTime.setHours(jakartaTime.getHours() + 7);

      // Extract relationship IDs and basic fields
      const {
        roleId, warehouseId, ...basicFields 
      } = data;

      // Update the user in the database
      const updatedUser = await tx.user.update({
        where: {
          id,
        },
        data: {
          ...basicFields,
          updatedAt: jakartaTime,

          // Handle role relationship if provided - using direct ternary
          role:
            roleId !== undefined
              ? {
                connect: {
                  id: roleId as string,
                },
              }
              : undefined,

          // Handle warehouse relationship - three cases with direct ternary
          warehouse:
            warehouseId === null
              ? {
                disconnect: true,
              }
              : warehouseId
                ? {
                  connect: {
                    id: warehouseId,
                  },
                }
                : undefined,
        },
        include: {
          role: true,
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
      const oldChangedFields: Record<string, any> = {};

      Object.keys(data).forEach((key) => {
        if (
          oldUserData &&
          oldUserData[key as keyof typeof oldUserData] !== data[key as keyof typeof data]
        ) {
          changedFields[key] = data[key as keyof typeof data];
          oldChangedFields[key] = oldUserData[key as keyof typeof oldUserData];
        }
      });

      if (Object.keys(changedFields).length > 0) {
        await userLogService.logUserUpdate(id, performedById, oldChangedFields, changedFields, tx);
      }

      // Return user without password
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = updatedUser;
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
      });

      await userLogService.logUserDeletion(id, performedById, userData, tx);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _password, ...userWithoutPassword } = deletedUser;

      return userWithoutPassword;
    });
  },

  async getUserByEmail(email: string) {
    return prisma.user.findFirst({
      where: {
        email,
      },
    });
  },

  async updateUserRefreshToken(id: string, refreshToken: string, expiresAt: Date) {
    return prisma.user.update({
      where: {
        id,
      },
      data: {
        refreshToken,
        expiresAt,
      },
    });
  },
};
