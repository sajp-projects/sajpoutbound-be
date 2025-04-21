import prisma from '../config/prisma';
import { UserCreateInput } from '../schemas/user';

/**
 * User service for handling user-related database operations
 */
export default {
  /**
   * Create a new user in the database
   *
   * @param userData User data to create
   * @returns Created user
   */
  async createUser(userData: UserCreateInput) {
    return await prisma.user.create({
      data: userData,
    });
  },

  /**
   * Find a user by email
   *
   * @param email User email
   * @returns User if found, null otherwise
   */
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: {
        email,
      },
    });
  },

  /**
   * Update user information
   *
   * @param id User ID
   * @param data User data to update
   * @returns Updated user
   */
  async updateUser(id: number, data: Partial<UserCreateInput>) {
    return prisma.user.update({
      where: {
        id,
      },
      data,
    });
  },

  /**
   * Delete a user
   *
   * @param id User ID
   * @returns Deleted user
   */
  async deleteUser(id: number) {
    return prisma.user.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  },
};
