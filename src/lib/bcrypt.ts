import bcrypt from 'bcryptjs';

/**
 * Bcrypt utilities for password hashing and verification
 */
export default {
  /**
   * Hash a password with bcrypt
   *
   * @param password - Plain text password to hash
   * @param saltRounds - Number of salt rounds (default: 10)
   * @returns Hashed password
   */
  async hashPassword(password: string, saltRounds = 10): Promise<string> {
    const salt = await bcrypt.genSalt(saltRounds);
    return bcrypt.hash(password, salt);
  },

  /**
   * Compare a plain text password with a hashed password
   *
   * @param password - Plain text password to verify
   * @param hashedPassword - Hashed password to compare against
   * @returns True if passwords match, false otherwise
   */
  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  },
};
