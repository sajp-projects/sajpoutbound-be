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
process.on('unhandledRejection', (error) => {
  // Force convert error to string to ensure we capture something
  const errorStr =
    error instanceof Error
      ? error.stack || error.message || String(error)
      : String(error || 'Unknown rejection error');

  logger.error(`Unhandled Rejection: ${errorStr}`);

  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  logger.info('Disconnected from database');
  process.exit(0);
});

export default app;
