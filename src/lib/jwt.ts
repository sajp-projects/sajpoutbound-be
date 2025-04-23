import * as dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

// Get JWT secret key from environment variables with fallback
const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_for_development';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

interface TokenPayload {
  id: string;
  email: string;
  [key: string]: any; // Allow additional custom fields
}

/**
 * JWT utilities for token generation and verification
 */
export default {
  /**
   * Generate a JWT token
   *
   * @param payload - Data to include in the token
   * @param expiresIn - Token expiration time (default: from env or 1 day)
   * @returns JWT token string
   */
  generateToken(payload: TokenPayload, expiresIn = JWT_EXPIRES_IN): string {
    // @ts-expect-error - Ignoring type issues with jsonwebtoken
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn,
    });
  },

  /**
   * Verify and decode a JWT token
   *
   * @param token - JWT token to verify
   * @returns Decoded token payload or null if invalid
   */
  verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (error) {
      return null;
    }
  },

  /**
   * Decode a token without verifying its signature
   * This is useful for getting token information without validation
   *
   * @param token - JWT token to decode
   * @returns Decoded token payload or null if invalid format
   */
  decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch (error) {
      return null;
    }
  },

  /**
   * Generate a refresh token (longer lived than access token)
   *
   * @param payload - Data to include in the token
   * @param expiresIn - Token expiration time (default: 7 days)
   * @returns JWT token string
   */
  generateRefreshToken(payload: TokenPayload, expiresIn = '7d'): string {
    // Remove any unnecessary data from refresh token
    const refreshPayload = {
      userId: payload.userId,
      email: payload.email,
      type: 'refresh',
    };
    // @ts-expect-error - Ignoring type issues with jsonwebtoken
    return jwt.sign(refreshPayload, JWT_SECRET, {
      expiresIn,
    });
  },
};
