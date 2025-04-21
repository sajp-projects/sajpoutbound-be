import prisma from '../config/prisma';
import { UserCreateInput, UserUpdateInput } from '../schemas/user';

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
        role: {
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
   * Get a user by ID with role information
   *
   * @param id User ID
   * @returns User if found, null otherwise
   */
  async getUserById(id: number) {
    return prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        role: {
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
   * Create a new user in the database
   *
   * @param userData User data to create
   * @returns Created user
   */
  async createUser(userData: UserCreateInput) {
    return prisma.user.create({
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
   * @returns Updated user
   */
  async updateUser(id: number, data: UserUpdateInput) {
    return prisma.user.update({
      where: {
        id,
      },
      data,
      include: {
        role: {
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
   * Delete a user (soft delete)
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
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });
  },
};
