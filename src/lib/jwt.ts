import * as dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

// Get JWT secret key from environment variables - REQUIRED for security
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET environment variable is required and must be set to a secure random string',
  );
}
// Access tokens are short-lived (30 seconds by default) to minimize security risks
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '30s';
// Refresh tokens are longer-lived (6 hours by default) and stored in the database
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '6h';

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
   * Generate an access token (short-lived)
   *
   * These tokens are used for API authentication and expire quickly (30s by default).
   * When they expire, the frontend should use the refresh token to get a new access token.
   *
   * @param payload - Data to include in the token
   * @returns JWT token string
   */
  generateAccessToken(payload: TokenPayload): string {
    // @ts-expect-error - Ignoring type issues with jsonwebtoken
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
  },

  /**
   * Generate a refresh token (longer-lived)
   *
   * These tokens are stored in the database and used to generate new access tokens.
   * They last longer (6h by default) but are still secure because:
   * 1. They're stored in the database and can be invalidated
   * 2. The user still needs a valid access token to call the refresh endpoint
   *
   * @param payload - Data to include in the token
   * @returns JWT token string
   */
  generateRefreshToken(payload: TokenPayload): string {
    // @ts-expect-error - Ignoring type issues with jsonwebtoken
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });
  },

  /**
   * Generate a token with custom expiration
   *
   * @param payload - Data to include in the token
   * @param expiresIn - Token expiration time
   * @returns JWT token string
   */
  generateToken(payload: TokenPayload, expiresIn = ACCESS_TOKEN_EXPIRES_IN): string {
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
  verifyToken(token: string, options?: jwt.VerifyOptions): TokenPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET, options) as TokenPayload;
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
   * Calculate token expiry date
   *
   * @param hoursFromNow - Number of hours from now
   * @returns Date object representing expiry time
   */
  calculateExpiryDate(hoursFromNow = 6): Date {
    const date = new Date();
    date.setHours(date.getHours() + hoursFromNow);
    return date;
  },
};
