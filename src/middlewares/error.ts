import { Prisma } from '@prisma/client';
import * as dotenv from 'dotenv';
import {
  ErrorRequestHandler, Request, Response, 
} from 'express';
import Joi from 'joi';
import { ICustomError } from '../types/error';

dotenv.config();

/**
 * Custom error class for standardized API errors
 */
export class CustomError extends Error implements ICustomError {
  status: number;
  errorCode: string;
  details?: any;

  constructor(message: string, errorCode: string, status = 400, details?: any) {
    super(message);
    this.name = 'CustomError';
    this.errorCode = errorCode;
    this.status = status;
    this.details = details;
  }
}

/**
 * Creates an error object with a message and optional details
 */
export const error = ({
  err,
  message,
  errorType,
}: {
  message: string;
  errorType?: string;
  err?: unknown;
}) => {
  return {
    message,
    err,
    errorType,
  };
};

/**
 * Interface for the logger object with different log levels
 */
export interface Logger {
  error: (message: any) => void;
  warn: (message: any) => void;
  info: (message: any) => void;
  debug: (message: any) => void;
}

/**
 * Interface for metrics counter that tracks HTTP requests
 */
export interface HttpRequestCounter {
  inc: (labels: { method: string; path: string; status: number; namespace?: string }) => void;
}

/**
 * Generate and handle Express errors with proper status codes and logging
 */
export const generateError = (err: unknown, req: Request, res: Response, logger: Logger) => {
  let processedErr = err;
  let code = 500;
  let message = 'internal server error';
  let errorType = 'serverError';
  let computedErr;

  // Handle Joi validation errors
  if (err instanceof Joi.ValidationError) {
    code = 400;
    message = 'validation error';
    processedErr = err.details;
    computedErr = err.details.map((detail) => ({
      message: detail.message,
      path: detail.path,
      type: detail.type,
    }));
    errorType = 'joiValidationError';
  } else if (err instanceof CustomError) {
    // Handle our standardized custom errors
    code = err.status;
    message = err.message;
    errorType = err.errorCode;
    computedErr = err.details;
  } else if (err instanceof Error) {
    // Handle other types of errors
    const customError = err as ICustomError;

    if (customError.status) {
      code = customError.status;
    }

    // Check for Prisma-specific error properties
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (customError.errorCode) {
        errorType = customError.errorCode;
      } else {
        errorType = `prisma_${customError.code}`;
      }
      message = customError.message;
    } else if (customError.code) {
      errorType = customError.code;
      message = customError.message;
    } else if (customError.errorCode) {
      errorType = customError.errorCode;
      message = customError.message;
    }
  }

  let logLevel: keyof Logger = 'error';

  if (code >= 400 && code < 500) {
    logLevel = 'warn';
  }

  console.error(`HTTP request error at ${req.method}: ${req.originalUrl}:`, processedErr, {
    params: req.params,
    body: req.body,
  });

  logger[logLevel]({
    method: req.method,
    url: req.originalUrl,
    statusCode: code,
    err: processedErr,
    params: req.params,
    body: req.body,
    requestID: (req as any).requestID,
  });

  return res.status(code).json({
    message,
    errorType,
    details: computedErr,
  });
};

/**
 * Middleware factory that creates an error handler with the provided logger and request counter
 */
export const createErrorMiddleware = (logger: Logger): ErrorRequestHandler => {
  return (err, req, res, next) => {
    generateError(err, req, res, logger);
    // Don't return anything to match ErrorRequestHandler return type (void)
  };
};
