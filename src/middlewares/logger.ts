import {
  NextFunction, Request, Response, 
} from 'express';
import winston from 'winston';
import { Logger } from './error';

// Create Winston logger
export const createLogger = () => {
  return winston.createLogger({
    format: winston.format.combine(
      winston.format.timestamp({
        format: () => {
          // Use Asia/Jakarta timezone
          return new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Jakarta',
            hour12: false,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
        },
      }),
      winston.format.json(),
    ),
    transports: [new winston.transports.Console()],
  });
};

// Initialize logger
export const logger: Logger = (() => {
  const winstonLogger = createLogger();

  // Add error event handler
  winstonLogger.on('error', (error: Error) => {
    console.error('Error in logger caught', error);
  });

  // Implement Logger interface for compatibility with existing code
  return {
    error: (message: any) => winstonLogger.error(message),
    warn: (message: any) => winstonLogger.warn(message),
    info: (message: any) => winstonLogger.info(message),
    debug: (message: any) => winstonLogger.debug(message),
  };
})();

// Logging Middleware
export const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 400) {
      logger.info({
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        requestID: (req as any).requestID,
      });
    }
  });

  next();
};

// Export default middleware function for app.use
export default loggingMiddleware;
