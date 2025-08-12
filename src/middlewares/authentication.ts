import { NextFunction, Request, Response } from 'express';
import jwt from '../lib/jwt';
import { JwtPayload } from '../types/jwt';
import { error } from './error';

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers['x-outmanage-token'];

  if (!token) {
    res.status(401).json(error('Invalid authentication token format', 'INVALID_TOKEN_FORMAT'));
    return;
  }

  const tokenSecret = process.env.JWT_SECRET;

  if (!tokenSecret) {
    console.error('JWT_SECRET is not defined in environment variables');
    res.status(500).json(error('Server configuration error', 'SERVER_CONFIGURATION_ERROR'));
    return;
  }

  // Use the custom JWT verify method that returns null on error
  const decoded = jwt.verifyToken(token as string);

  if (!decoded) {
    res.status(403).json(error('Invalid authentication token', 'INVALID_TOKEN'));
    return;
  }

  // Set user data in request object
  req.user = decoded as JwtPayload;
  next();
};
