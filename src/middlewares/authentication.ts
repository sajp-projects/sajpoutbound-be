import {
  NextFunction, Request, Response, 
} from 'express';
import jwt from 'jsonwebtoken';
import { error } from './error';

// Token Authentication Middleware
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['x-outmanage-token'] || req.headers.authorization;

  // Extract token regardless of whether it's "Bearer <token>" or just "<token>"
  const token =
    typeof authHeader === 'string'
      ? authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader
      : null;

  if (!token) {
    res.status(401).json(error('Invalid authentication token format', 'INVALID_TOKEN_FORMAT'));
    return;
  }

  const tokenSecret = process.env.JWT_SECRET;

  if (!tokenSecret) {
    console.error('JWT_SECRET is not defined in environment variables');
    res.status(500).json({
      success: false,
      code: 'SERVER_CONFIGURATION_ERROR',
      message: 'Server configuration error',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token as string, tokenSecret as string) as JwtPayload;

    // Check for either id or userId field, and ensure email exists
    if ((!decoded.id && !decoded.userId) || !decoded.email) {
      res.status(403).json({
        success: false,
        code: 'INVALID_TOKEN_PAYLOAD',
        message: 'Token payload missing required fields',
      });
      return;
    }

    // If only userId exists, map it to id for consistency in the application
    if (!decoded.id && decoded.userId) {
      decoded.id = decoded.userId;
    }

    // Set user data in request object
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(403).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired',
      });
    } else if (err instanceof jwt.JsonWebTokenError) {
      res.status(403).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
      });
    } else {
      // Handle other unexpected errors
      res.status(403).json({
        success: false,
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication failed',
      });
    }
  }
};
