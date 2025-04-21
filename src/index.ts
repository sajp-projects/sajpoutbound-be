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
  express.urlencoded({
    extended: true,
  }),
);

app.use(loggingMiddleware);

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Outmanage API',
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

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  logger.info('Disconnected from database');
  process.exit(0);
});

export default app;
