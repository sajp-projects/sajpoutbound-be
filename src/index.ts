import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import comprehensiveSwaggerSpec from '../comprehensive-swagger-api.json';
import prisma from './config/prisma';
import swaggerSpec from './config/swagger';
import { createErrorMiddleware } from './middlewares/error';
import { logger, loggingMiddleware } from './middlewares/logger';
import routes from './routes';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;
const server = http.createServer(app);

if (process.env.NODE_ENV !== 'production') {
  app.use(
    cors({
      origin: [
        'https://www.outmanage.vercel.app',
        'https://outmanage.vercel.app',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://31.97.105.79:5173',
        'https://demo.benzeta.shop',
        'https://benzeta.shop',
        'https://www.demo.benzeta.shop',
        'https://www.benzeta.shop',
      ],
      credentials: true,
    }),
  );
}
app.use(express.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  }),
);

app.use(loggingMiddleware);

app.use('/public', express.static(path.join(__dirname, 'public')));

// Comprehensive API documentation (complete documentation)
app.use('/api-docs', swaggerUi.serveFiles(comprehensiveSwaggerSpec));
app.get(
  '/api-docs',
  swaggerUi.setup(comprehensiveSwaggerSpec, {
    customSiteTitle: 'Outmanage API - Comprehensive Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
  }),
);

// Auto-generated documentation (JSDoc-based, limited coverage)
app.use('/weighing-docs', swaggerUi.serveFiles(swaggerSpec));

app.get(
  '/weighing-docs',
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Outmanage API - Weighings Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
  }),
);

// JSON endpoints for both documentation versions
app.get('/api-docs.json', (_, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(comprehensiveSwaggerSpec);
});

app.get('/weighing-docs.json', (_, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.get('/health', (_, res) => {
  const jakartaTime = new Date();
  jakartaTime.setHours(jakartaTime.getHours() + 7);

  res.status(200).json({
    status: 'ok',
    timestamp: jakartaTime.toISOString(),
  });
});

app.use('/api', routes);
app.use(createErrorMiddleware(logger));

process.on('uncaughtException', (error: Error) => {
  logger.error(`Uncaught Exception: ${error.stack || error.message || error}`);
  // Perform any necessary cleanup here
  process.exit(1);
});

process.on('unhandledRejection', (error: Error) => {
  logger.error(`Unhandled Rejection: ${error.stack || error.message || error}`);

  process.exit(1);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  logger.info('Disconnected from database');
  process.exit(0);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
  console.log('📚 Comprehensive API Documentation: /api-docs');
  console.log('🔧 Weighing-generated Documentation: /weighing-docs');
  console.log('📄 JSON Specs: /api-docs.json & /weighing-docs.json');
});

export default app;
