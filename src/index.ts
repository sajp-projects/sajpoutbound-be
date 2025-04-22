import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import prisma from './config/prisma';
import { createErrorMiddleware } from './middlewares/error';
import { logger, loggingMiddleware } from './middlewares/logger';
import routes from './routes';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  }),
);

app.use(loggingMiddleware);

app.get('/health', (req, res) => {
  const jakartaTime = new Date();
  jakartaTime.setHours(jakartaTime.getHours() + 7);

  res.status(200).json({
    status: 'ok',
    timestamp: jakartaTime.toISOString(),
  });
});

// API routes
app.use('/api', routes);

// Error handling middleware - use our custom error middleware with Winston logger
app.use(createErrorMiddleware(logger));

// Start the server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.stack || error.message || error}`);
  // Perform any necessary cleanup here
  process.exit(1); // It's safer to exit and let the process manager restart the app
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, _promise) => {
  // Force convert reason to string to ensure we capture something
  const reasonStr =
    reason instanceof Error
      ? reason.stack || reason.message || String(reason)
      : String(reason || 'Unknown rejection reason');

  logger.error(`Unhandled Rejection: ${reasonStr}`);
  console.error('CRITICAL: Unhandled Promise Rejection:', reasonStr);

  // Use a more aggressive approach to force the process to exit in a way Docker will detect
  console.error('Server crashing due to unhandled promise rejection...');

  // This will cause the Node.js process to crash with an uncaught exception
  // Docker should detect this and restart the container based on restart policy
  throw new Error(`FORCED CRASH DUE TO UNHANDLED REJECTION: ${reasonStr}`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  logger.info('Disconnected from database');
  process.exit(0);
});

export default app;
