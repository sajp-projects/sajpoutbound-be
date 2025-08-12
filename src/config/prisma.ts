import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma =
  process.env.NODE_ENV === 'production'
    ? new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
      })
    : new PrismaClient();

export default prisma;
