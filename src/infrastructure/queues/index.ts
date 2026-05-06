import { Queue } from 'bullmq';
import { config } from '@/config/env';
import { logger } from '@/config/logger';

/**
 * Centralized registry of all BullMQ queues in the application.
 * Workers register themselves via their own files in src/infrastructure/queues/workers/.
 */
export const queues: Record<string, Queue> = {};

/**
 * Creates a queue and registers it in the central registry.
 * Use this when defining new queues in worker files.
 */
export function registerQueue(name: string): Queue {
  if (queues[name]) {
    return queues[name];
  }

  const queue = new Queue(name, {
    connection: {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 86400 },
    },
  });

  queues[name] = queue;
  logger.info({ queue: name }, 'queue registered');

  return queue;
}

export async function closeAllQueues(): Promise<void> {
  await Promise.all(Object.values(queues).map((q) => q.close()));
  logger.info('all queues closed');
}
