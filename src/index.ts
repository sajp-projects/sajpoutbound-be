import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import path from 'path';
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
app.use(
  cors({
    origin: [
      'https://www.outmanage.vercel.app',
      'https://outmanage.vercel.app',
      'http://localhost:5173',
    ],
    credentials: true,
  }),
);
app.use(express.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  }),
);

app.use(loggingMiddleware);

// Serve static files from the public directory
app.use('/public', express.static(path.join(__dirname, 'public')));

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

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error(`Uncaught Exception: ${error.stack || error.message || error}`);
  // Perform any necessary cleanup here
  process.exit(1); // It's safer to exit and let the process manager restart the app
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error: Error) => {
  logger.error(`Unhandled Rejection: ${error.stack || error.message || error}`);

  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  logger.info('Disconnected from database');
  process.exit(0);
});

// Start the server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
