import { PrismaClient } from '@prisma/client';
import { logger } from './logger';
import { config } from './env';

export const prisma = new PrismaClient({
  log:
    config.app.env === 'development'
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ]
      : [{ emit: 'event', level: 'error' }],
});

if (config.app.env === 'development') {
  prisma.$on('query' as never, (e: any) => {
    logger.debug({ query: e.query, params: e.params, duration: e.duration }, 'prisma:query');
  });
}

prisma.$on('error' as never, (e: any) => {
  logger.error({ message: e.message, target: e.target }, 'prisma:error');
});

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info('database connected');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('database disconnected');
}
